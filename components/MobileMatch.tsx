"use client";

// MobileMatch — phone-only (< md) one-card-flip layout, shared by pass-and-play,
// vs-Computer and online. Fixed top bar + a single card that flips between the
// pick view and the duel result + a pinned bottom bar. No scrolling. The flip is
// driven by `revealed` (no internal state) so it stays in sync with each mode.

import { TappableCard } from "@/components/TappableCard";
import { CardFace } from "@/components/CardFace";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useCountUp } from "@/components/MatchFx";
import type { Card } from "@/lib/cards";
import { TOTAL_ROUNDS, type Phase, type StatDef } from "@/lib/engine";

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  powerplay: { label: "Powerplay", color: "#3ddc84" },
  normal: { label: "Normal", color: "#9fb0d0" },
  deathover: { label: "Death Over", color: "#ff6a6a" },
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export interface MobileSide {
  name: string;
  card: Card;
  value: number; // effective value for the picked stat
  missing: boolean;
  score: number;
}

export function MobileMatch({
  phase,
  round,
  left,
  right,
  // pick phase
  frontCard,
  frontTappable,
  onPick,
  pickPrompt,
  waitingText,
  turnSecs,
  // reveal phase
  revealed,
  picked,
  lowerWins,
  timedOut,
  vizag,
  winner, // "left" | "right" | "tie" | null
  // advance
  advanceCan,
  onAdvance,
  advanceLabel,
  advanceWaiting,
}: {
  phase: Phase;
  round: number;
  left: MobileSide;
  right: MobileSide;
  frontCard: Card;
  frontTappable: boolean;
  onPick: (stat: StatDef) => void;
  pickPrompt: string;
  waitingText: string | null;
  turnSecs: number | null;
  revealed: boolean;
  picked: StatDef | null;
  lowerWins: boolean;
  timedOut: boolean;
  vizag: boolean;
  winner: "left" | "right" | "tie" | null;
  advanceCan: boolean;
  onAdvance: () => void;
  advanceLabel: string;
  advanceWaiting: boolean;
}) {
  const meta = PHASE_META[phase];
  const leftUp = useCountUp(left.value, revealed && !timedOut);
  const rightUp = useCountUp(right.value, revealed && !timedOut);

  return (
    <div
      onClick={() => advanceCan && onAdvance()}
      className={`flex h-[100svh] w-full flex-col overflow-hidden md:hidden ${advanceCan ? "cursor-pointer" : ""}`}
    >
      {/* top bar: phase · ball · score */}
      <div className="shrink-0 px-4 pt-4">
        <div
          className="flex items-center justify-between rounded-2xl border px-3 py-2"
          style={{ borderColor: `${meta.color}55`, background: `linear-gradient(120deg, ${meta.color}22, rgba(0,0,0,.35))` }}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
            <span className="font-display text-xs font-bold uppercase tracking-[0.15em]" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </span>
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Ball {round + 1}/{TOTAL_ROUNDS}
          </span>
          <span className="font-display text-xs font-bold">
            <span className="text-gold">{left.score}</span>
            <span className="text-[var(--ink-dim)]"> – </span>
            <span className="text-[#ff9a9a]">{right.score}</span>
          </span>
        </div>
      </div>

      {/* card stage — single card flips between pick and duel */}
      <div className="flex flex-1 items-center justify-center px-4 py-3" style={{ perspective: "1500px" }}>
        <div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 650ms cubic-bezier(.4,.05,.2,1)",
            transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* FRONT — your card (tappable when it's your pick; otherwise face-up + waiting) */}
          <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            {frontTappable ? (
              <TappableCard card={frontCard} phase={phase} onPick={onPick} />
            ) : (
              <div className="relative">
                <CardFace card={frontCard} />
                {waitingText && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 rounded-b-2xl bg-black/65 py-2.5 backdrop-blur-[2px]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/60" />
                    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-white/85">
                      {waitingText}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BACK — duel for the picked stat */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl ring-1 ring-white/12"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(158deg, #1a2348 -12%, #0b1024 60%, #070b18 100%)",
            }}
          >
            {revealed && (
              <div className="flex h-full flex-col p-4 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  {timedOut ? "Time up" : `${picked?.label} · ${lowerWins ? "lower wins" : "higher wins"}`}
                </p>

                <div className="mt-3 flex flex-1 items-center justify-center gap-2">
                  <DuelSide side={left} shown={round1(leftUp)} won={winner === "left"} dim={winner === "right"} timedOut={timedOut} />
                  <span className="font-display text-xs font-black tracking-[0.2em] text-[var(--ink-dim)]/60">VS</span>
                  <DuelSide side={right} shown={round1(rightUp)} won={winner === "right"} dim={winner === "left"} timedOut={timedOut} />
                </div>

                <div className="mt-2">
                  <span className="font-display inline-block rounded-md border-2 border-[var(--gold)] px-3 py-1 text-sm font-black uppercase tracking-widest text-gold shadow-[0_0_18px_rgba(245,197,24,0.4)]">
                    {timedOut ? "⏱ Time Up" : winner === "tie" ? "Tied" : "Captured!"}
                  </span>
                  <p className="mt-2 font-display text-sm font-bold uppercase tracking-wide text-white">
                    {winner === "tie" ? (
                      "No capture"
                    ) : (
                      <>
                        <span className="text-gold">{winner === "left" ? left.name : right.name}</span> takes the card
                      </>
                    )}
                  </p>
                  {!timedOut && vizag && (
                    <p className="text-gold mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em]">⚡ Vizag · +10%</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom bar: status / tap CTA */}
      <div className="shrink-0 px-4 pb-5 pt-1">
        {revealed ? (
          advanceWaiting ? (
            <div className="rounded-2xl border border-[var(--hair)] bg-black/40 py-3.5 text-center font-display text-sm font-bold uppercase tracking-[0.18em] text-[var(--ink-dim)]">
              Waiting…
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              className="animate-pulse w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-3.5 font-display text-sm font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)]"
            >
              {advanceLabel}
            </button>
          )
        ) : frontTappable ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 py-3.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--gold)]" />
            <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-gold">{pickPrompt}</span>
            <span className="text-xs text-[var(--ink-dim)]">— tap a stat</span>
            {turnSecs !== null && <span className="font-mono ml-1 text-sm font-bold tabular-nums text-white">{turnSecs}s</span>}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--hair)] bg-black/30 py-3.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/70">
              {waitingText ?? "Waiting…"}
            </span>
            {turnSecs !== null && <span className="font-mono ml-1 text-sm font-bold tabular-nums text-[var(--ink-dim)]">{turnSecs}s</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function DuelSide({
  side,
  shown,
  won,
  dim,
  timedOut,
}: {
  side: MobileSide;
  shown: number;
  won: boolean;
  dim: boolean;
  timedOut: boolean;
}) {
  return (
    <div className={`flex w-0 flex-1 flex-col items-center gap-1.5 px-1 ${dim ? "opacity-50" : ""}`}>
      <PlayerAvatar
        card={side.card}
        className={`h-[104px] w-[104px] ${won ? "ring-2 ring-[var(--gold)]" : "ring-1 ring-white/15"}`}
      />
      {/* cricketer name — prominent, so the player is recognisable even if the face is small */}
      <span className="font-display w-full truncate text-sm font-bold leading-tight text-white">
        {side.card.name}
      </span>
      {/* who's side + team */}
      <span className="w-full truncate text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
        {side.name} · {side.card.team}
      </span>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${won ? "text-gold" : "text-white/80"}`}
        style={won ? { textShadow: "0 0 16px rgba(245,197,24,.6)" } : undefined}
      >
        {timedOut || side.missing ? "—" : fmt(shown)}
      </span>
    </div>
  );
}
