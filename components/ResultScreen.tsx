"use client";

// ResultScreen — Screen 4 of the IPL 2026 Trump Cards pass-and-play flow.
// Declares the winner by most captures. A tie can be broken with a single
// sudden-death ball that reuses each player's first card on a random stat.

import { useState } from "react";
import type { Card } from "@/lib/cards";
import {
  STATS,
  phaseForRound,
  effectiveValue,
  resolveRound,
} from "@/lib/engine";

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function ResultScreen({
  p1Name,
  p2Name,
  scoreP1,
  scoreP2,
  p1FirstCard,
  p2FirstCard,
  onRematch,
  onNewPlayers,
}: {
  p1Name: string;
  p2Name: string;
  scoreP1: number;
  scoreP2: number;
  p1FirstCard: Card;
  p2FirstCard: Card;
  onRematch: () => void;
  onNewPlayers: () => void;
}) {
  // Sudden-death state (only used when scores are tied).
  const [sd, setSd] = useState<{
    stat: (typeof STATS)[number];
    winner: 1 | 2;
    p1Eff: number;
    p2Eff: number;
  } | null>(null);

  const tied = scoreP1 === scoreP2 && sd === null;

  // Effective winner after any sudden-death resolution.
  const winner: 1 | 2 | "tie" = sd
    ? sd.winner
    : scoreP1 > scoreP2
      ? 1
      : scoreP2 > scoreP1
        ? 2
        : "tie";

  const winnerName = winner === 1 ? p1Name : winner === 2 ? p2Name : null;

  function playSuddenDeath() {
    // Reuse first cards, pick a random stat. Phase = powerplay (ball 1).
    const phase = phaseForRound(0);
    const stat = STATS[Math.floor(Math.random() * STATS.length)];
    let res = resolveRound(p1FirstCard, p2FirstCard, stat, phase);
    // Keep drawing a stat until we get a decisive ball (avoid another tie).
    let guard = 0;
    let chosen = stat;
    while (res.winner === "tie" && guard < 20) {
      chosen = STATS[Math.floor(Math.random() * STATS.length)];
      res = resolveRound(p1FirstCard, p2FirstCard, chosen, phase);
      guard++;
    }
    const w: 1 | 2 = res.winner === "defender" ? 2 : 1; // attacker = P1
    setSd({
      stat: chosen,
      winner: w,
      p1Eff: round1(effectiveValue(p1FirstCard, chosen, phase)),
      p2Eff: round1(effectiveValue(p2FirstCard, chosen, phase)),
    });
  }

  return (
    <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <span className="font-display text-gold text-[10px] font-semibold uppercase tracking-[0.4em]">
        IPL 2026 · Vizag Edition
      </span>

      {tied ? (
        <>
          <div className="animate-reveal mt-5 text-5xl">🤝</div>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white">
            It&apos;s a Tie
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Both captured <span className="text-white">{scoreP1}</span> cards.
            Settle it with one sudden-death ball.
          </p>
        </>
      ) : (
        <>
          <div className="animate-reveal mt-5 text-5xl drop-shadow-[0_0_24px_rgba(245,197,24,0.55)]">
            🏆
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">
            Player of the Match
          </p>
          <h2 className="font-display animate-reveal mt-1 bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            {winnerName}
          </h2>
          {sd && (
            <p className="text-gold mt-2 text-[11px] font-semibold uppercase tracking-wider">
              ⚡ Won the sudden-death ball
            </p>
          )}
        </>
      )}

      {/* Scoreboard */}
      <div className="mt-7 w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[var(--hair)] bg-black/35 px-4 py-5">
          <FinalScore
            name={p1Name}
            score={scoreP1}
            won={winner === 1}
            align="right"
          />
          <span className="font-display text-sm font-black text-[var(--ink-dim)]/60">
            –
          </span>
          <FinalScore
            name={p2Name}
            score={scoreP2}
            won={winner === 2}
            align="left"
          />
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-dim)]/70">
          Cards captured across 8 balls
        </p>
      </div>

      {/* Sudden-death detail */}
      {sd && (
        <div className="animate-reveal mt-5 w-full rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/8 px-4 py-3 text-left">
          <p className="font-display text-center text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Sudden Death · {sd.stat.label}
          </p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-white/90">
              {p1Name}{" "}
              <span className="font-mono text-white">{fmt(sd.p1Eff)}</span>
            </span>
            <span className="text-[var(--ink-dim)]">
              {sd.stat.lowerWins ? "lower wins" : "higher wins"}
            </span>
            <span className="text-white/90">
              <span className="font-mono text-white">{fmt(sd.p2Eff)}</span>{" "}
              {p2Name}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 w-full space-y-3">
        {tied && (
          <button
            onClick={playSuddenDeath}
            className="font-display w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)] transition active:scale-[0.98]"
          >
            Sudden-Death Ball
          </button>
        )}
        <button
          onClick={onRematch}
          className={`font-display w-full rounded-2xl py-4 text-base font-bold uppercase tracking-widest transition active:scale-[0.98] ${
            tied
              ? "border border-[var(--hair)] bg-white/5 text-white"
              : "bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)]"
          }`}
        >
          Rematch
        </button>
        <button
          onClick={onNewPlayers}
          className="font-display w-full rounded-2xl border border-[var(--hair)] bg-transparent py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--ink-dim)] transition hover:text-white active:scale-[0.98]"
        >
          New Players
        </button>
      </div>
    </section>
  );
}

function FinalScore({
  name,
  score,
  won,
  align,
}: {
  name: string;
  score: number;
  won: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div
        className={`font-display text-4xl font-bold tabular-nums ${
          won ? "text-gold" : "text-white/85"
        }`}
      >
        {score}
      </div>
      <div className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-dim)]">
        {name}
      </div>
    </div>
  );
}
