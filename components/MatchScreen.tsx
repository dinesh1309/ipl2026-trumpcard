"use client";

// MatchScreen — Screen 3 of the IPL 2026 Trump Cards pass-and-play flow.
// 8 balls. Attacker (even round -> P1, odd -> P2) reveals their card face-up
// and taps a stat; the defender card is hidden until the pick is locked, then
// resolveRound() decides the ball. Running capture score lives in page.tsx.

import { useMemo, useState } from "react";
import { CardFace } from "@/components/CardFace";
import type { Card } from "@/lib/cards";
import {
  STATS,
  TOTAL_ROUNDS,
  phaseForRound,
  effectiveValue,
  resolveRound,
  isMissing,
  type Phase,
  type StatDef,
} from "@/lib/engine";

const PHASE_META: Record<
  Phase,
  { label: string; color: string; note: string }
> = {
  powerplay: { label: "Powerplay", color: "#3ddc84", note: "Batting +25%" },
  normal: { label: "Normal", color: "#9fb0d0", note: "No boost" },
  deathover: { label: "Death Over", color: "#ff6a6a", note: "Bowling +25%" },
};

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function MatchScreen({
  p1Name,
  p2Name,
  p1Deck,
  p2Deck,
  round,
  scoreP1,
  scoreP2,
  onResolve,
  onNext,
}: {
  p1Name: string;
  p2Name: string;
  p1Deck: Card[];
  p2Deck: Card[];
  round: number; // 0-based
  scoreP1: number;
  scoreP2: number;
  onResolve: (winner: 1 | 2 | "tie") => void;
  onNext: () => void;
}) {
  const phase = phaseForRound(round);
  const meta = PHASE_META[phase];

  // Even round -> P1 attacks, odd -> P2 attacks.
  const attackerIsP1 = round % 2 === 0;
  const attackerName = attackerIsP1 ? p1Name : p2Name;
  const defenderName = attackerIsP1 ? p2Name : p1Name;
  const attackerCard = attackerIsP1 ? p1Deck[round] : p2Deck[round];
  const defenderCard = attackerIsP1 ? p2Deck[round] : p1Deck[round];

  // Locked pick for this ball (null until the attacker taps a stat).
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  // Reset the pick whenever the round changes.
  const resetKey = `${round}`;
  const [seenRound, setSeenRound] = useState(resetKey);
  if (seenRound !== resetKey) {
    setSeenRound(resetKey);
    setPickedKey(null);
  }

  const pickedStat = pickedKey
    ? STATS.find((s) => s.key === pickedKey) ?? null
    : null;

  const outcome = useMemo(() => {
    if (!pickedStat) return null;
    return resolveRound(attackerCard, defenderCard, pickedStat, phase);
  }, [pickedStat, attackerCard, defenderCard, phase]);

  function pickStat(stat: StatDef) {
    if (pickedKey) return;
    setPickedKey(stat.key);
    const res = resolveRound(attackerCard, defenderCard, stat, phase);
    const winner =
      res.winner === "tie" ? "tie" : res.winner === "attacker"
        ? attackerIsP1
          ? 1
          : 2
        : attackerIsP1
          ? 2
          : 1;
    onResolve(winner as 1 | 2 | "tie");
  }

  const revealed = pickedKey !== null;
  const vizagInPlay = attackerCard.vizag || defenderCard.vizag;

  // Who won the ball, for the result banner.
  let ballWinnerName: string | null = null;
  if (outcome) {
    if (outcome.winner === "tie") ballWinnerName = null;
    else
      ballWinnerName =
        outcome.winner === "attacker" ? attackerName : defenderName;
  }

  const attackerEff = pickedStat
    ? effectiveValue(attackerCard, pickedStat, phase)
    : undefined;
  const defenderEff = pickedStat
    ? effectiveValue(defenderCard, pickedStat, phase)
    : undefined;

  return (
    <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-6 pt-5">
      {/* Phase banner */}
      <div
        className="relative overflow-hidden rounded-2xl border px-4 py-3"
        style={{
          borderColor: `${meta.color}55`,
          background: `linear-gradient(120deg, ${meta.color}22, rgba(0,0,0,0.35))`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
            />
            <span
              className="font-display text-base font-bold uppercase tracking-[0.18em]"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
              {meta.note}
            </span>
          </div>
          <span className="font-display text-sm font-semibold tracking-wide text-white">
            Ball {round + 1}
            <span className="text-[var(--ink-dim)]"> / {TOTAL_ROUNDS}</span>
          </span>
        </div>
      </div>

      {/* Capture scoreboard */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ScoreChip
          name={p1Name}
          score={scoreP1}
          active={attackerIsP1}
          tag="P1"
        />
        <ScoreChip
          name={p2Name}
          score={scoreP2}
          active={!attackerIsP1}
          tag="P2"
        />
      </div>

      {/* Turn indicator */}
      <div className="mt-4 text-center">
        {!revealed ? (
          <p className="text-sm text-[var(--ink-dim)]">
            <span className="font-display font-bold text-gold">
              {attackerName}
            </span>{" "}
            attacks — tap a stat to play
          </p>
        ) : (
          <p className="text-sm text-[var(--ink-dim)]">
            <span className="font-display font-bold text-white">
              {pickedStat?.label}
            </span>{" "}
            · {pickedStat?.lowerWins ? "lower wins" : "higher wins"}
          </p>
        )}
      </div>

      {/* Attacker card — face-up with tappable stat rows */}
      <div className="mt-3">
        <CardLabel
          name={attackerName}
          tag={attackerIsP1 ? "P1" : "P2"}
          role="Attacker"
          win={outcome?.winner === "attacker"}
        />
        <div className="mt-1.5">
          {!revealed ? (
            <TappableCard
              card={attackerCard}
              phase={phase}
              onPick={pickStat}
            />
          ) : (
            <CardFace
              card={attackerCard}
              highlightStatKey={pickedKey ?? undefined}
              shownValue={attackerEff !== undefined ? round1(attackerEff) : undefined}
            />
          )}
        </div>
      </div>

      <div className="my-2 text-center">
        <span className="font-display text-xs font-black tracking-[0.3em] text-[var(--ink-dim)]/60">
          VS
        </span>
      </div>

      {/* Defender card — hidden until pick locks */}
      <div>
        <CardLabel
          name={defenderName}
          tag={attackerIsP1 ? "P2" : "P1"}
          role="Defender"
          win={outcome?.winner === "defender"}
        />
        <div className="mt-1.5">
          {revealed ? (
            <CardFace
              card={defenderCard}
              highlightStatKey={pickedKey ?? undefined}
              shownValue={defenderEff !== undefined ? round1(defenderEff) : undefined}
            />
          ) : (
            <CardFace card={defenderCard} revealed={false} />
          )}
        </div>
      </div>

      {/* Outcome banner + Next */}
      {outcome && (
        <div className="animate-reveal mt-4">
          <div className="rounded-2xl border border-[var(--hair)] bg-black/45 px-4 py-3 text-center">
            {outcome.winner === "tie" ? (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                Ball Tied — no capture
              </p>
            ) : (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                <span className="text-gold">{ballWinnerName}</span> captures the
                card
              </p>
            )}
            <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
              {pickedStat?.label}:{" "}
              <span className="font-mono text-white/90">
                {outcome.attackerMissing ? "—" : fmt(outcome.attackerValue)}
              </span>{" "}
              <span className="text-[var(--ink-dim)]/60">(atk)</span> vs{" "}
              <span className="font-mono text-white/90">
                {outcome.defenderMissing ? "—" : fmt(outcome.defenderValue)}
              </span>{" "}
              <span className="text-[var(--ink-dim)]/60">(def)</span>
            </p>
            {(outcome.attackerMissing || outcome.defenderMissing) && (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--ink-dim)]/70">
                — = did not bowl
              </p>
            )}
            {vizagInPlay && (
              <p className="text-gold mt-1.5 text-[11px] font-semibold uppercase tracking-wider">
                ⚡ Vizag bonus applied
              </p>
            )}
          </div>

          <button
            onClick={onNext}
            className="font-display mt-3 w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)] transition active:scale-[0.98]"
          >
            {round + 1 >= TOTAL_ROUNDS ? "See Result" : "Next Ball"}
          </button>
        </div>
      )}
    </section>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function ScoreChip({
  name,
  score,
  active,
  tag,
}: {
  name: string;
  score: number;
  active: boolean;
  tag: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition ${
        active
          ? "border-[var(--gold)]/45 bg-[var(--gold)]/10"
          : "border-[var(--hair)] bg-black/30"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
            {tag}
          </span>
          {active && (
            <span className="text-gold text-[8px] font-bold uppercase tracking-wider">
              ● Attacking
            </span>
          )}
        </div>
        <span className="font-display block truncate text-sm font-semibold text-white">
          {name}
        </span>
      </div>
      <span className="font-display ml-2 text-2xl font-bold tabular-nums text-white">
        {score}
      </span>
    </div>
  );
}

function CardLabel({
  name,
  tag,
  role,
  win,
}: {
  name: string;
  tag: string;
  role: string;
  win?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
        {tag}
      </span>
      <span className="font-display text-sm font-semibold text-white">{name}</span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]/70">
        {role}
      </span>
      {win && (
        <span className="ml-auto rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold ring-1 ring-[var(--gold)]/30">
          Won ball
        </span>
      )}
    </div>
  );
}

/**
 * The attacker's card rendered with each stat row as a tap target.
 * Mirrors CardFace's foil styling but rows are buttons that pick the stat.
 */
function TappableCard({
  card,
  phase,
  onPick,
}: {
  card: Card;
  phase: Phase;
  onPick: (stat: StatDef) => void;
}) {
  const accent = card.accent;
  const battingStats = STATS.filter((s) => s.group === "batting");
  const bowlingStats = STATS.filter((s) => s.group === "bowling");

  const phaseBoostsBatting = phase === "powerplay";
  const phaseBoostsBowling = phase === "deathover";

  return (
    <div
      className="animate-reveal relative w-full overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-[0_28px_70px_-26px_rgba(0,0,0,0.85)]"
      style={{
        background: `linear-gradient(158deg, ${accent} -12%, #0b1024 58%, #070b18 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.16), transparent)",
        }}
      />

      {card.vizag && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#161003] shadow-[0_4px_14px_-2px_rgba(245,197,24,0.6)]">
          <span aria-hidden>⚡</span>
          <span>Vizag</span>
        </div>
      )}

      <div className="relative flex items-center gap-3 px-4 pt-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ring-1 ring-white/20"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}
        >
          <span className="font-display tracking-wide text-white">
            {card.name
              .split(/\s+/)
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="font-display truncate text-xl font-bold leading-tight text-white">
            {card.name}
          </h3>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--ink-dim)]">
            {card.team} · {card.role}
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-3">
        <TapGroup
          title="Batting"
          boosted={phaseBoostsBatting}
          stats={battingStats}
          card={card}
          phase={phase}
          onPick={onPick}
        />
        <TapGroup
          title="Bowling"
          boosted={phaseBoostsBowling}
          stats={bowlingStats}
          card={card}
          phase={phase}
          onPick={onPick}
          className="mt-3"
        />
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-2">
        <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-[var(--ink-dim)]">
          IPL 2026
        </span>
        <span className="text-[9px] uppercase tracking-[0.25em] text-gold">
          Tap a stat ↑
        </span>
      </div>
    </div>
  );
}

function TapGroup({
  title,
  boosted,
  stats,
  card,
  phase,
  onPick,
  className = "",
}: {
  title: string;
  boosted: boolean;
  stats: StatDef[];
  card: Card;
  phase: Phase;
  onPick: (stat: StatDef) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
          {title}
        </span>
        {boosted && (
          <span className="text-gold rounded bg-[var(--gold)]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
            +25%
          </span>
        )}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map((s) => {
          // Did not bowl → not a real value, so it can't be attacked with.
          if (isMissing(card, s)) {
            return (
              <div
                key={s.key}
                aria-disabled
                title="Did not bowl"
                className="stat-row cursor-not-allowed opacity-35"
              >
                <span className="stat-row__label">{s.label}</span>
                <span className="stat-row__value">—</span>
              </div>
            );
          }
          const raw = s.get(card);
          const eff = effectiveValue(card, s, phase);
          const lifted = round1(eff) !== round1(raw);
          return (
            <button
              key={s.key}
              onClick={() => onPick(s)}
              className="stat-row group text-left transition hover:bg-[var(--gold)]/15 hover:ring-1 hover:ring-[var(--gold)]/40 active:scale-[0.97]"
            >
              <span className="stat-row__label">{s.label}</span>
              <span className="stat-row__value flex items-center gap-1">
                {lifted && (
                  <span className="text-gold text-[8px]">▲</span>
                )}
                {fmt(round1(eff))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
