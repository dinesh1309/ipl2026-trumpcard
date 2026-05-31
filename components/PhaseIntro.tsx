"use client";

// PhaseIntro — broadcast-style takeover that slams in when a new phase begins
// (Powerplay at ball 1, Middle Overs at ball 4, Death Overs at ball 7). Auto-
// dismisses after ~1.6s; tap to skip. Used by both the pass-and-play and online
// match screens. Fires on the phase-start balls (rounds 0, 3, 6).

import { useEffect, useState } from "react";
import { phaseForRound, type Phase } from "@/lib/engine";

const META: Record<Phase, { label: string; sub: string; color: string; tag: string }> = {
  powerplay: {
    label: "Powerplay",
    sub: "Balls 1–3 · Batting +25%",
    color: "#3ddc84",
    tag: "Fielding restrictions",
  },
  normal: {
    label: "Middle Overs",
    sub: "Balls 4–6 · No boost",
    color: "#9fb0d0",
    tag: "Build the innings",
  },
  deathover: {
    label: "Death Overs",
    sub: "Balls 7–8 · Bowling +25%",
    color: "#ff6a6a",
    tag: "Bowlers strike back",
  },
};

const START_ROUNDS = new Set([0, 3, 6]);

export function PhaseIntro({ round }: { round: number }) {
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    if (!START_ROUNDS.has(round)) return;
    setPhase(phaseForRound(round));
    const t = setTimeout(() => setPhase(null), 1600);
    return () => clearTimeout(t);
  }, [round]);

  if (!phase) return null;
  const m = META[phase];
  const isDeath = phase === "deathover";

  return (
    <div
      className="phase-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[3px]"
      onClick={() => setPhase(null)}
      role="status"
      aria-live="polite"
    >
      {/* expanding ring in the phase colour */}
      <span
        className="phase-ring pointer-events-none absolute h-56 w-56 rounded-full border-2"
        style={{ borderColor: m.color }}
      />
      {isDeath && (
        <span
          className="phase-pulse pointer-events-none absolute h-72 w-72 rounded-full"
          style={{ background: `radial-gradient(circle, ${m.color}33, transparent 70%)` }}
        />
      )}

      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/55">
          IPL 2026
        </span>
        <h2
          className="phase-label font-display text-5xl font-bold uppercase"
          style={{ color: m.color, textShadow: `0 0 30px ${m.color}66` }}
        >
          {m.label}
        </h2>
        <span
          className="phase-underline h-[3px] w-28 rounded-full"
          style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }}
        />
        <span className="phase-sub mt-1 text-sm font-medium text-white/85">{m.sub}</span>
        <span className="phase-sub text-[11px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          {m.tag}
        </span>
        <span className="phase-sub mt-3 text-[10px] uppercase tracking-wider text-white/30">
          tap to skip
        </span>
      </div>
    </div>
  );
}
