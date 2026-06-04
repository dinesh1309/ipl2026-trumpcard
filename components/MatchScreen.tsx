"use client";

// MatchScreen — Screen 3 of the IPL 2026 Trump Cards pass-and-play flow.
// 8 balls. Attacker (even round -> P1, odd -> P2) reveals their card face-up
// and taps a stat; the defender card is hidden until the pick is locked, then
// resolveRound() decides the ball. Running capture score lives in page.tsx.

import { useEffect, useMemo, useState } from "react";
import { CardFace } from "@/components/CardFace";
import { PhaseIntro } from "@/components/PhaseIntro";
import { OverTicker } from "@/components/OverTicker";
import { TappableCard } from "@/components/TappableCard";
import { BallStamp, VizagStrike } from "@/components/MatchFx";
import type { Card } from "@/lib/cards";
import {
  STATS,
  TOTAL_ROUNDS,
  TURN_SECONDS,
  phaseForRound,
  effectiveValue,
  resolveRound,
  pickBotStat,
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
  strikesP1,
  strikesP2,
  results,
  onResolve,
  onNext,
  vsComputer = false,
}: {
  p1Name: string;
  p2Name: string;
  p1Deck: Card[];
  p2Deck: Card[];
  round: number; // 0-based
  scoreP1: number;
  scoreP2: number;
  strikesP1: number;
  strikesP2: number;
  results: ("p1" | "p2" | "tie" | null)[];
  onResolve: (winner: 1 | 2 | "tie", timedOutAttacker?: 1 | 2) => void;
  onNext: () => void;
  vsComputer?: boolean; // P2 is the computer — it auto-picks when attacking
}) {
  const phase = phaseForRound(round);
  const meta = PHASE_META[phase];

  // Even round -> P1 attacks, odd -> P2 attacks.
  const attackerIsP1 = round % 2 === 0;
  // The computer is P2, so it attacks on the odd rounds.
  const botAttacking = vsComputer && !attackerIsP1;
  const attackerName = attackerIsP1 ? p1Name : p2Name;
  const defenderName = attackerIsP1 ? p2Name : p1Name;
  const attackerCard = attackerIsP1 ? p1Deck[round] : p2Deck[round];
  const defenderCard = attackerIsP1 ? p2Deck[round] : p1Deck[round];

  // Locked pick for this ball (null until the attacker taps a stat).
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Reset the pick whenever the round changes.
  const resetKey = `${round}`;
  const [seenRound, setSeenRound] = useState(resetKey);
  if (seenRound !== resetKey) {
    setSeenRound(resetKey);
    setPickedKey(null);
    setTimedOut(false);
  }

  // Turn countdown (per ball). The attacker has TURN_SECONDS to pick, else loses.
  const [now, setNow] = useState(0);
  const [deadline, setDeadline] = useState(() => Date.now() + TURN_SECONDS * 1000);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  // New deadline each ball.
  useEffect(() => {
    setDeadline(Date.now() + TURN_SECONDS * 1000);
  }, [round]);

  const pickedStat = pickedKey
    ? STATS.find((s) => s.key === pickedKey) ?? null
    : null;

  const revealed = pickedKey !== null || timedOut;

  const remaining =
    !revealed && now ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  const outcome = useMemo(() => {
    if (timedOut) {
      // Attacker ran out of time → defender wins.
      return {
        attackerValue: 0,
        defenderValue: 0,
        attackerMissing: false,
        defenderMissing: false,
        winner: "defender" as const,
      };
    }
    if (!pickedStat) return null;
    return resolveRound(attackerCard, defenderCard, pickedStat, phase);
  }, [timedOut, pickedStat, attackerCard, defenderCard, phase]);

  // Fire the timeout once the clock hits zero. The computer never times out.
  useEffect(() => {
    if (botAttacking || revealed || !now || now < deadline) return;
    setTimedOut(true);
    const defender: 1 | 2 = attackerIsP1 ? 2 : 1;
    onResolve(defender, attackerIsP1 ? 1 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, deadline, revealed, botAttacking]);

  // Computer's move: when it's the bot's turn to attack, it "thinks" briefly,
  // then locks in its strongest stat for the phase.
  useEffect(() => {
    if (!botAttacking || revealed) return;
    const t = setTimeout(() => pickStat(pickBotStat(attackerCard, phase)), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botAttacking, revealed, round]);

  function pickStat(stat: StatDef) {
    if (pickedKey || timedOut) return;
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
    <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-6 pt-5 md:max-w-4xl">
      <PhaseIntro round={round} />
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

      {/* Over-by-over ticker */}
      <div className="mt-3">
        <OverTicker results={results} current={round} />
      </div>

      {/* Capture scoreboard */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ScoreChip
          name={p1Name}
          score={scoreP1}
          strikes={strikesP1}
          active={attackerIsP1}
          tag="P1"
        />
        <ScoreChip
          name={p2Name}
          score={scoreP2}
          strikes={strikesP2}
          active={!attackerIsP1}
          tag="P2"
        />
      </div>

      {/* Turn indicator + countdown */}
      <div className="mt-4 text-center">
        {!revealed && botAttacking ? (
          <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-xl border border-[var(--hair)] bg-black/30 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/50" />
            <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-white/80">
              {attackerName} is thinking…
            </span>
          </div>
        ) : !revealed ? (
          <div
            className={`mx-auto flex max-w-xs items-center justify-center gap-2 rounded-xl border py-2.5 ${
              remaining !== null && remaining <= 5
                ? "border-[#ff6a6a]/55 bg-[#ff6a6a]/10"
                : "border-[var(--gold)]/40 bg-[var(--gold)]/10"
            }`}
          >
            <span
              className="font-display text-sm font-bold uppercase tracking-[0.15em]"
              style={{ color: remaining !== null && remaining <= 5 ? "#ff6a6a" : "var(--gold)" }}
            >
              {attackerName}&apos;s turn
            </span>
            <span className="text-xs text-[var(--ink-dim)]">— tap a stat</span>
            {remaining !== null && (
              <span className="font-mono ml-1 text-base font-bold tabular-nums text-white">
                {remaining}s
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-dim)]">
            {timedOut ? (
              <span className="font-display font-bold text-[#ff6a6a]">⏱ Time up</span>
            ) : (
              <>
                <span className="font-display font-bold text-white">
                  {pickedStat?.label}
                </span>{" "}
                · {pickedStat?.lowerWins ? "lower wins" : "higher wins"}
              </>
            )}
          </p>
        )}
      </div>

      {/* Cards: stacked on mobile, side-by-side on laptop */}
      <div className="mt-3 flex flex-col md:flex-row md:items-start md:gap-5">
        {/* Attacker card — face-up with tappable stat rows */}
        <div className="md:flex-1">
          <CardLabel
            name={attackerName}
            tag={attackerIsP1 ? "P1" : "P2"}
            role="Attacker"
            win={outcome?.winner === "attacker"}
          />
        <div
          className={`relative mt-1.5 transition duration-300 ${
            outcome?.winner === "defender" ? "opacity-55 saturate-50" : ""
          }`}
        >
          {revealed ? (
            <CardFace
              card={attackerCard}
              highlightStatKey={pickedKey ?? undefined}
              shownValue={attackerEff !== undefined ? round1(attackerEff) : undefined}
            />
          ) : botAttacking ? (
            // Keep the computer's hand hidden while it decides.
            <CardFace card={attackerCard} revealed={false} />
          ) : (
            <TappableCard
              card={attackerCard}
              phase={phase}
              onPick={pickStat}
            />
          )}
          {revealed && attackerCard.vizag && <VizagStrike key={`atk-${round}`} />}
        </div>
      </div>

        <div className="my-2 flex items-center justify-center md:my-0 md:self-center">
          <span className="font-display text-xs font-black tracking-[0.3em] text-[var(--ink-dim)]/60">
            VS
          </span>
        </div>

        {/* Defender card — hidden until pick locks */}
        <div className="md:flex-1">
          <CardLabel
            name={defenderName}
            tag={attackerIsP1 ? "P2" : "P1"}
            role="Defender"
            win={outcome?.winner === "defender"}
          />
        <div
          className={`relative mt-1.5 transition duration-300 ${
            outcome?.winner === "attacker" ? "opacity-55 saturate-50" : ""
          }`}
        >
          {revealed ? (
            <CardFace
              card={defenderCard}
              highlightStatKey={pickedKey ?? undefined}
              shownValue={defenderEff !== undefined ? round1(defenderEff) : undefined}
            />
          ) : botAttacking ? (
            // You're defending the computer — your own card stays in view.
            <CardFace card={defenderCard} />
          ) : (
            <CardFace card={defenderCard} revealed={false} />
          )}
          {revealed && defenderCard.vizag && <VizagStrike key={`def-${round}`} />}
          </div>
        </div>
      </div>

      {/* Outcome banner + Next */}
      {outcome && (
        <div className="animate-reveal mt-4">
          <div className="rounded-2xl border border-[var(--hair)] bg-black/45 px-4 py-3 text-center">
            <div className="mb-1.5 flex justify-center">
              <BallStamp
                kind={timedOut ? "timeout" : outcome.winner === "tie" ? "tie" : "capture"}
              />
            </div>
            {timedOut ? (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                <span className="text-[#ff6a6a]">{attackerName}</span> ran out of time
              </p>
            ) : outcome.winner === "tie" ? (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                Ball Tied — no capture
              </p>
            ) : (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                <span className="text-gold">{ballWinnerName}</span> takes the card
              </p>
            )}
            {timedOut ? (
              <p className="mt-1 text-[11px] uppercase tracking-wider text-[#ff6a6a]">
                {attackerName} earns a strike · 2 strikes = forfeit
              </p>
            ) : (
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
            )}
            {!timedOut && (outcome.attackerMissing || outcome.defenderMissing) && (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--ink-dim)]/70">
                — = did not bowl
              </p>
            )}
            {!timedOut && vizagInPlay && (
              <p className="text-gold mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em]">
                ⚡ Vizag Power · +10%
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
  strikes,
  active,
  tag,
}: {
  name: string;
  score: number;
  strikes: number;
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
          <span className="flex items-center gap-0.5" title={`${strikes} / 2 timeout strikes`}>
            {[0, 1].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: i < strikes ? "#ff6a6a" : "rgba(255,255,255,0.18)",
                  boxShadow: i < strikes ? "0 0 6px rgba(255,106,106,0.7)" : "none",
                }}
              />
            ))}
          </span>
        </div>
        <span className="font-display block truncate text-sm font-semibold text-white">
          {name}
        </span>
      </div>
      <span
        key={score}
        className="animate-score-pop font-display ml-2 text-2xl font-bold tabular-nums text-white"
      >
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

