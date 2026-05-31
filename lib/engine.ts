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
