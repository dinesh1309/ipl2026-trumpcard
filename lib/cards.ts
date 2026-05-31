// lib/cards.ts — DATA AGENT (IPL 2026 season)
// Builds CARD_POOL by cleaning + joining real IPL 2026 batting & bowling stats
// at module load. Source JSON is imported and transformed in code (no hand-transcription).

import batting from './data/batting.json';
import bowling from './data/bowling.json';

export type Role = 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';

export interface Card {
  id: string; // kebab slug
  name: string; // clean display name, NO '(TEAM)' suffix
  team: string; // franchise code, e.g. 'RCB','GT','SRH','MI','DC','LSG','PBKS','KKR','RR','CSK'
  role: Role;
  vizag: boolean; // TRUE only for the anchor (Nitish Kumar Reddy)
  accent: string; // hex colour used by the card face, picked from the team colour
  batting: { runs: number; average: number; strikeRate: number; fours: number; sixes: number };
  bowling: { wickets: number; economy: number; average: number; strikeRate: number };
}

export const ANCHOR_ID = 'nitish-reddy';

// ---- Raw row shapes (only the fields we read) ----
interface BattingRow {
  Player: string;
  Mat: number;
  Inns: number;
  NO: number;
  Runs: number;
  Ave: number | string; // may be 'battein' or '-'
  SR: number;
  '4s': number;
  '6s': number;
}

interface BowlingRow {
  Player: string;
  Mat: number;
  Wkts: number;
  Econ: number;
  Ave: number; // clean in source
  SR: number;
  // BBI is corrupted in source — IGNORED entirely.
}

// ---- Team colour accents per franchise ----
const TEAM_ACCENT: Record<string, string> = {
  RCB: '#c8102e',
  GT: '#1b2133',
  SRH: '#f26522',
  MI: '#004ba0',
  DC: '#17449b',
  LSG: '#0057b8',
  PBKS: '#d71920',
  KKR: '#3a225d',
  RR: '#ea1a85',
  CSK: '#f9cd05',
};

// ---- Helpers ----

/** Coerce a possibly-dirty numeric field to a finite number, else fallback. */
function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Strip the ' (TEAM)' suffix and trim → clean display name. */
function cleanName(player: string): string {
  return player.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Extract the team code from inside the parens for the 'team' field. */
function teamCode(player: string): string {
  const m = player.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : '';
}

/** kebab-case slug from a clean display name. */
function kebab(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Recompute batting average when the source value is dirty ('battein' / '-').
 * Coerce: Runs / (Inns - NO) when possible, else 0.
 */
function battingAverage(row: BattingRow): number {
  const direct = toNum(row.Ave, NaN);
  if (Number.isFinite(direct)) return direct;
  const dismissals = row.Inns - row.NO;
  if (dismissals > 0) return row.Runs / dismissals;
  return 0;
}

interface Unified {
  name: string;
  team: string;
  mat: number;
  batting: Card['batting'];
  bowling: Card['bowling'];
}

const ZERO_BAT: Card['batting'] = { runs: 0, average: 0, strikeRate: 0, fours: 0, sixes: 0 };
const ZERO_BOWL: Card['bowling'] = { wickets: 0, economy: 0, average: 0, strikeRate: 0 };

// ---- Join batting + bowling by clean name, zero-filling the missing side ----
function buildUnifiedPool(): Map<string, Unified> {
  const pool = new Map<string, Unified>();

  for (const raw of batting as BattingRow[]) {
    const name = cleanName(raw.Player);
    const team = teamCode(raw.Player);
    pool.set(name, {
      name,
      team,
      mat: toNum(raw.Mat),
      batting: {
        runs: toNum(raw.Runs),
        average: battingAverage(raw),
        strikeRate: toNum(raw.SR),
        fours: toNum(raw['4s']),
        sixes: toNum(raw['6s']),
      },
      bowling: { ...ZERO_BOWL },
    });
  }

  for (const raw of bowling as BowlingRow[]) {
    const name = cleanName(raw.Player);
    const team = teamCode(raw.Player);
    const bowl: Card['bowling'] = {
      wickets: toNum(raw.Wkts),
      economy: toNum(raw.Econ),
      average: toNum(raw.Ave),
      strikeRate: toNum(raw.SR),
    };
    const existing = pool.get(name);
    if (existing) {
      existing.bowling = bowl;
      // Use the larger Mat across both sides for the recognisability ranking.
      existing.mat = Math.max(existing.mat, toNum(raw.Mat));
    } else {
      pool.set(name, {
        name,
        team,
        mat: toNum(raw.Mat),
        batting: { ...ZERO_BAT },
        bowling: bowl,
      });
    }
  }

  return pool;
}

// ---- Role heuristic: Bowler if wickets high & runs low; Batsman if opposite;
// All-rounder if both sides are strong. ----
function assignRole(u: Unified): Role {
  const wkts = u.bowling.wickets;
  const runs = u.batting.runs;
  const battingStrong = runs >= 200;
  const bowlingStrong = wkts >= 8;
  if (battingStrong && bowlingStrong) return 'All-rounder';
  if (bowlingStrong) return 'Bowler';
  if (battingStrong) return 'Batsman';
  // Weak on both: lean to whichever side carries more signal.
  return wkts > 0 && runs < 100 ? 'Bowler' : 'Batsman';
}

function toCard(u: Unified): Card {
  return {
    id: kebab(u.name),
    name: u.name,
    team: u.team,
    role: assignRole(u),
    vizag: false,
    accent: TEAM_ACCENT[u.team] ?? '#888888',
    batting: u.batting,
    bowling: u.bowling,
  };
}

const ANCHOR_NAME = 'K Nitish Kumar Reddy';
const TOP_N = 55;

function buildCardPool(): Card[] {
  const unified = buildUnifiedPool();
  const all = Array.from(unified.values());

  // Recognisability guard: keep only the top ~55 players by Matches.
  const ranked = [...all].sort((a, b) => b.mat - a.mat);
  const kept = new Map<string, Unified>();
  for (const u of ranked.slice(0, TOP_N)) kept.set(u.name, u);

  // Force-include the anchor regardless of rank.
  const anchorUnified = unified.get(ANCHOR_NAME);
  if (anchorUnified && !kept.has(ANCHOR_NAME)) kept.set(ANCHOR_NAME, anchorUnified);

  const cards = Array.from(kept.values()).map(toCard);

  // Materialise the anchor card to the exact contract; every other card vizag:false.
  return cards.map((c) =>
    c.name === ANCHOR_NAME
      ? {
          ...c,
          id: ANCHOR_ID,
          name: 'Nitish Kumar Reddy',
          team: 'SRH',
          role: 'All-rounder' as Role,
          vizag: true,
          accent: '#7c3aed',
        }
      : c,
  );
}

export const CARD_POOL: Card[] = buildCardPool();
