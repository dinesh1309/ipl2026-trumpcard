"use client";

// Lobby — Screen 2 of the IPL 2026 Trump Cards pass-and-play flow.
// Shows the two matched players, a collapsible How to Play, and Start Match.

import { useState } from "react";

export function Lobby({
  p1,
  p2,
  onStart,
  onBack,
}: {
  p1: string;
  p2: string;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-6 py-8">
      {/* Header */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="float-left -mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-dim)] transition hover:text-white"
        >
          ← Back
        </button>
        <span className="font-display text-gold text-[10px] font-semibold uppercase tracking-[0.4em]">
          IPL 2026 · Vizag Edition
        </span>
        <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white">
          The Toss
        </h2>
      </div>

      {/* Matchup */}
      <div className="mt-7 flex items-stretch gap-3">
        <PlayerPill name={p1} tag="Player 1" />
        <div className="flex shrink-0 flex-col items-center justify-center">
          <span className="font-display text-gold text-xl font-bold italic">VS</span>
        </div>
        <PlayerPill name={p2} tag="Player 2" />
      </div>

      {/* How to play */}
      <div className="mt-6">
        <HowToPlay defaultOpen />
      </div>

      <button
        onClick={onStart}
        className="font-display mt-auto w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)] transition active:scale-[0.98]"
      >
        Start Match
      </button>
    </section>
  );
}

/** Collapsible rules panel, shared by the pass-and-play lobby and the online flow. */
export function HowToPlay({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hair)] bg-black/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
          How to Play
        </span>
        <span
          className={`text-gold text-xs transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-5 pb-5 text-left text-sm leading-relaxed text-[var(--ink-dim)]">
            <Rule n="1">
              Each player is dealt <b className="text-white">8 cards</b>. The system
              fixes the order — no shuffling your own hand.
            </Rule>
            <Rule n="2">
              <b className="text-white">8 balls</b> across three phases:
              <span className="mt-2 block space-y-1.5">
                <PhaseLine range="Balls 1–3" name="Powerplay" note="Batting stats +25%" color="#3ddc84" />
                <PhaseLine range="Balls 4–6" name="Normal" note="No boost" color="#9fb0d0" />
                <PhaseLine range="Balls 7–8" name="Death Over" note="Bowling stats +25%" color="#ff6a6a" />
              </span>
            </Rule>
            <Rule n="3">
              Turns alternate — one player <b className="text-white">attacks</b> each
              ball and picks a stat. The opponent&apos;s card stays{" "}
              <b className="text-white">hidden</b> until the pick is locked.
            </Rule>
            <Rule n="4">
              Higher value wins —{" "}
              <b className="text-white">except Economy, Bowl Avg &amp; Bowl SR</b>, where
              lower wins.
            </Rule>
            <Rule n="5">
              <span className="text-gold">⚡ Vizag</span> cards get a{" "}
              <b className="text-white">+10%</b> edge on every stat.
            </Rule>
            <Rule n="6">
              Most cards <b className="text-white">captured</b> after 8 balls wins the
              match.
            </Rule>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerPill({ name, tag }: { name: string; tag: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[var(--hair)] bg-gradient-to-b from-white/[0.07] to-transparent px-3 py-5 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--ink-dim)]">
        {tag}
      </span>
      <span className="font-display mt-2 line-clamp-2 break-words text-lg font-bold leading-tight text-white">
        {name}
      </span>
    </div>
  );
}

function Rule({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="font-display text-gold mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--gold)]/12 text-[11px] font-bold ring-1 ring-[var(--gold)]/20">
        {n}
      </span>
      <p className="flex-1">{children}</p>
    </div>
  );
}

function PhaseLine({
  range,
  name,
  note,
  color,
}: {
  range: string;
  name: string;
  note: string;
  color: string;
}) {
  return (
    <span className="flex items-center gap-2 text-[13px]">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
      />
      <span className="font-medium text-white/90">{range}</span>
      <span className="font-display font-semibold" style={{ color }}>
        {name}
      </span>
      <span className="text-[var(--ink-dim)]/80">· {note}</span>
    </span>
  );
}
