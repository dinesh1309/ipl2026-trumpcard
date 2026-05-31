// Agent 3 (Game Engine) — deterministic Cricket War.
// Given a shared seed + mode, BOTH phones replay the identical match locally.
// No backend: the 8 cards are public and dealing is seeded, so each device can
// compute the full game and just render its own player's point of view.

import { CARDS, Card, Metric } from "./cards";

export type Mode = "powerplay" | "deathover";

export const MODE_POOLS: Record<Mode, Metric[]> = {
  powerplay: ["sixes", "fours", "strikeRate", "runs", "average"],
  deathover: ["wickets", "economy", "dotBallPct"],
};

// Lower-is-better metrics (only economy here).
const LOWER_WINS: Metric[] = ["economy"];

const ROUND_CAP = 50; // safety net so a demo can never hang
const VIZAG_BONUS = 0.1; // +10% favorable nudge

// --- seeded RNG (mulberry32): deterministic across devices ---
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn a short QR string seed ("8f3a2") into a 32-bit int, deterministically.
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function metricValue(card: Card, m: Metric): number {
  if (m === "wickets" || m === "economy" || m === "dotBallPct") return card.bowling[m];
  return card.batting[m];
}

// Apply the Vizag bonus in the favorable direction for the metric.
function effectiveValue(card: Card, m: Metric): number {
  const raw = metricValue(card, m);
  if (!card.vizag) return raw;
  return LOWER_WINS.includes(m) ? raw * (1 - VIZAG_BONUS) : raw * (1 + VIZAG_BONUS);
}

export interface RoundResult {
  index: number;
  metric: Metric;
  p1Card: Card;
  p2Card: Card;
  p1Value: number; // effective (post-bonus) value shown
  p2Value: number;
  winner: 1 | 2;
  p1Vizag: boolean;
  p2Vizag: boolean;
}

export interface MatchResult {
  mode: Mode;
  seed: string;
  rounds: RoundResult[];
  winner: 1 | 2;
  hitCap: boolean;
}

// Pick a metric that produces a decisive result; re-roll on tie.
function decisiveRound(
  p1: Card,
  p2: Card,
  pool: Metric[],
  rng: () => number
): { metric: Metric; winner: 1 | 2; v1: number; v2: number } {
  for (let attempt = 0; attempt < pool.length + 2; attempt++) {
    const metric = pool[Math.floor(rng() * pool.length)];
    const v1 = effectiveValue(p1, metric);
    const v2 = effectiveValue(p2, metric);
    const lower = LOWER_WINS.includes(metric);
    if (v1 === v2) continue; // tie → re-roll a different metric
    const p1Wins = lower ? v1 < v2 : v1 > v2;
    return { metric, winner: p1Wins ? 1 : 2, v1, v2 };
  }
  // Extremely unlikely fallback: pick first metric, P1 wins ties.
  const metric = pool[0];
  return { metric, winner: 1, v1: effectiveValue(p1, metric), v2: effectiveValue(p2, metric) };
}

export function playMatch(seedStr: string, mode: Mode): MatchResult {
  const rng = seededRng(hashSeed(seedStr));
  const dealt = shuffle(CARDS, rng);
  let deck1 = dealt.slice(0, 4).map((c) => c.id);
  let deck2 = dealt.slice(4, 8).map((c) => c.id);

  const pool = MODE_POOLS[mode];
  const rounds: RoundResult[] = [];
  let hitCap = false;
  const byId = (id: string) => CARDS.find((c) => c.id === id)!;

  let i = 0;
  while (deck1.length > 0 && deck2.length > 0) {
    if (i >= ROUND_CAP) {
      hitCap = true;
      break;
    }
    const c1 = byId(deck1[0]);
    const c2 = byId(deck2[0]);
    const { metric, winner, v1, v2 } = decisiveRound(c1, c2, pool, rng);

    rounds.push({
      index: i,
      metric,
      p1Card: c1,
      p2Card: c2,
      p1Value: Math.round(v1 * 100) / 100,
      p2Value: Math.round(v2 * 100) / 100,
      winner,
      p1Vizag: c1.vizag,
      p2Vizag: c2.vizag,
    });

    // Capture: winner takes both cards to the bottom of their deck.
    deck1 = deck1.slice(1);
    deck2 = deck2.slice(1);
    if (winner === 1) deck1 = [...deck1, c1.id, c2.id];
    else deck2 = [...deck2, c2.id, c1.id];
    i++;
  }

  let winner: 1 | 2;
  if (hitCap) winner = deck1.length >= deck2.length ? 1 : 2;
  else winner = deck1.length > 0 ? 1 : 2;

  return { mode, seed: seedStr, rounds, winner, hitCap };
}

export const METRIC_LABEL: Record<Metric, string> = {
  sixes: "Sixes",
  fours: "Fours",
  strikeRate: "Strike Rate",
  runs: "Runs",
  average: "Average",
  wickets: "Wickets",
  economy: "Economy",
  dotBallPct: "Dot Ball %",
};
