// Engine — IPL 2026 Trump Card game logic.
// Pure, dependency-free game engine. Randomness in selectMatchDeck uses the
// JS runtime RNG (allowed in app code).

import type { Card } from "@/lib/cards";
import { CARD_POOL, ANCHOR_ID } from "@/lib/cards";

export type Phase = "powerplay" | "normal" | "deathover";

export interface StatDef {
  key: string;
  label: string;
  group: "batting" | "bowling";
  lowerWins: boolean;
  get: (c: Card) => number;
}

// 5 batting (higher wins) + 4 bowling = 9 stats.
export const STATS: StatDef[] = [
  { key: "runs", label: "Runs", group: "batting", lowerWins: false, get: (c) => c.batting.runs },
  { key: "average", label: "Bat Avg", group: "batting", lowerWins: false, get: (c) => c.batting.average },
  { key: "strikeRate", label: "Strike Rate", group: "batting", lowerWins: false, get: (c) => c.batting.strikeRate },
  { key: "fours", label: "Fours", group: "batting", lowerWins: false, get: (c) => c.batting.fours },
  { key: "sixes", label: "Sixes", group: "batting", lowerWins: false, get: (c) => c.batting.sixes },
  { key: "wickets", label: "Wickets", group: "bowling", lowerWins: false, get: (c) => c.bowling.wickets },
  { key: "economy", label: "Economy", group: "bowling", lowerWins: true, get: (c) => c.bowling.economy },
  { key: "bowlAverage", label: "Bowl Avg", group: "bowling", lowerWins: true, get: (c) => c.bowling.average },
  { key: "bowlStrikeRate", label: "Bowl SR", group: "bowling", lowerWins: true, get: (c) => c.bowling.strikeRate },
];

export const TOTAL_ROUNDS = 8;
export const PHASE_BOOST = 0.25; // 25%
export const VIZAG_BONUS = 0.1; // 10%
export const TURN_SECONDS = 60; // attacker has 60s (1 min) to pick, else loses the ball

export function phaseForRound(roundIndex: number): Phase {
  if (roundIndex <= 2) return "powerplay"; // 0-2
  if (roundIndex <= 5) return "normal"; // 3-5
  return "deathover"; // 6-7
}

export function selectMatchDeck(pool: Card[] = CARD_POOL): Card[] {
  const anchor = pool.find((c) => c.id === ANCHOR_ID);
  if (!anchor) {
    throw new Error(`selectMatchDeck: anchor card '${ANCHOR_ID}' not found in pool`);
  }

  // Fill the other 15 by randomly sampling distinct cards (excluding the anchor).
  const others = pool.filter((c) => c.id !== anchor.id);
  const filler = shuffle(others).slice(0, 15);

  // Shuffle all 16. first 8 = Player 1 hand, next 8 = Player 2 hand.
  return shuffle([anchor, ...filler]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function effectiveValue(card: Card, stat: StatDef, phase: Phase): number {
  const v = stat.get(card);
  const inPhase =
    (phase === "powerplay" && stat.group === "batting") ||
    (phase === "deathover" && stat.group === "bowling");
  const boostFactor = inPhase ? (stat.lowerWins ? 1 - PHASE_BOOST : 1 + PHASE_BOOST) : 1;
  const vizagFactor = card.vizag ? (stat.lowerWins ? 1 - VIZAG_BONUS : 1 + VIZAG_BONUS) : 1;
  return v * boostFactor * vizagFactor;
}

/**
 * "Did not bowl" guard. A lower-wins bowling stat (economy / bowl avg / bowl SR)
 * of 0 means the player never bowled — that is NOT a perfect (lowest) value, so it
 * must never win a lower-wins comparison. A batsman's 0 economy should LOSE to a
 * real bowler's 7, not beat it. Higher-wins stats (e.g. wickets) keep 0 as the
 * legitimate worst, so they need no special handling.
 */
export function isMissing(card: Card, stat: StatDef): boolean {
  return stat.lowerWins && stat.get(card) === 0;
}

export interface RoundOutcome {
  attackerValue: number;
  defenderValue: number;
  attackerMissing: boolean; // attacker did not bowl → no real value for this stat
  defenderMissing: boolean;
  winner: "attacker" | "defender" | "tie";
}

export function resolveRound(
  attacker: Card,
  defender: Card,
  stat: StatDef,
  phase: Phase
): RoundOutcome {
  const attackerMissing = isMissing(attacker, stat);
  const defenderMissing = isMissing(defender, stat);

  const aRaw = round1(effectiveValue(attacker, stat, phase));
  const dRaw = round1(effectiveValue(defender, stat, phase));

  // Comparison values: a missing lower-wins stat is treated as the WORST possible,
  // so a non-bowler's 0 can never beat a real bowling figure.
  const a = attackerMissing ? Infinity : aRaw;
  const d = defenderMissing ? Infinity : dRaw;

  let winner: "attacker" | "defender" | "tie";
  if (a === d) {
    winner = "tie";
  } else if (stat.lowerWins) {
    winner = a < d ? "attacker" : "defender";
  } else {
    winner = a > d ? "attacker" : "defender";
  }

  return {
    attackerValue: aRaw,
    defenderValue: dRaw,
    attackerMissing,
    defenderMissing,
    winner,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---- Computer opponent ----
// Per-stat value range across the whole pool, used so the bot can judge how
// strong its card is on each stat relative to everyone else (a 0..1 "strength").
const POOL_RANGE: Map<string, { min: number; max: number }> = (() => {
  const m = new Map<string, { min: number; max: number }>();
  for (const s of STATS) {
    let min = Infinity;
    let max = -Infinity;
    for (const c of CARD_POOL) {
      if (isMissing(c, s)) continue; // skip "did not bowl" zeros
      const v = s.get(c);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    m.set(s.key, { min, max });
  }
  return m;
})();

/**
 * The computer's move when it is the attacker. It can't see the defender card,
 * so it plays its own strongest hand: the stat where its value ranks highest in
 * the pool, nudged toward whichever group the current phase boosts. A small dose
 * of randomness (it picks from its top two) keeps the bot from feeling robotic.
 */
export function pickBotStat(card: Card, phase: Phase): StatDef {
  const candidates = STATS.filter((s) => !isMissing(card, s));
  if (candidates.length === 0) return STATS[0]; // safety; shouldn't happen

  const scored = candidates
    .map((s) => {
      const range = POOL_RANGE.get(s.key)!;
      const span = range.max - range.min || 1;
      const v = s.get(card);
      // Higher-is-better strength on a 0..1 scale (invert for lower-wins stats).
      const strength = s.lowerWins
        ? (range.max - v) / span
        : (v - range.min) / span;
      const inPhase =
        (phase === "powerplay" && s.group === "batting") ||
        (phase === "deathover" && s.group === "bowling");
      return { stat: s, score: strength + (inPhase ? 0.1 : 0) };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(2, scored.length));
  return top[Math.floor(Math.random() * top.length)].stat;
}
