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
import { BallStamp, VizagStrike, CapturedPile, useCountUp } from "@/components/MatchFx";
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

const AUTO_MS = 10000; // long fallback — tapping is the primary way to advance

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

  // Computer's move: when it's the bot's turn to attack, it "thinks" for a few
  // seconds (giving you time to read your own card) before locking in its
  // strongest stat for the phase.
  useEffect(() => {
    if (!botAttacking || revealed) return;
    const t = setTimeout(() => pickStat(pickBotStat(attackerCard, phase)), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botAttacking, revealed, round]);

  // Auto-advance once the ball has resolved (no Next button). Tap anywhere skips.
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(onNext, AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, round]);

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

  // Count the winning-stat numbers up on reveal (skip on a timeout — no numbers).
  const countRun = !!outcome && !timedOut;
  const atkUp = useCountUp(outcome?.attackerValue ?? 0, countRun);
  const defUp = useCountUp(outcome?.defenderValue ?? 0, countRun);

  // A card is "face-up" (safe to also show the player's big photo) when: the
  // attacker card is up except while the bot is thinking; the defender card is
  // up only after the reveal (or when the human is defending the bot).
  const attackerCardVisible = revealed || !botAttacking;
  const defenderCardVisible = revealed || botAttacking;

  // On laptop/large screens everything must fit in one viewport (no scroll).
  // During play the cards can be roomy; once revealed, the outcome banner + Next
  // appear below, so the cards shrink to make room.
  const cardWidthCls = revealed
    ? "lg:max-w-[235px] xl:max-w-[265px] 2xl:max-w-[300px]"
    : "lg:max-w-[290px] xl:max-w-[330px] 2xl:max-w-[370px]";

  const attackerBlock = (
    <div className={`w-full md:flex-1 lg:flex lg:flex-none lg:shrink-0 lg:flex-col ${cardWidthCls}`}>
      <CardLabel
        name={attackerName}
        tag={attackerIsP1 ? "P1" : "P2"}
        role="Attacker"
        win={outcome?.winner === "attacker"}
      />
      <div
        className={`relative mt-1.5 transition duration-300 lg:min-h-0 lg:flex-1 ${
          outcome?.winner === "defender" ? "opacity-55 saturate-50" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        {botAttacking ? (
          // Computer is the attacker: hidden while it thinks, flips over on reveal.
          revealed ? (
            <div key={`atk-rev-${round}`} className="animate-flip h-full">
              <CardFace
                card={attackerCard}
                highlightStatKey={pickedKey ?? undefined}
                shownValue={attackerEff !== undefined ? round1(attackerEff) : undefined}
                hideAvatarLg
              />
            </div>
          ) : (
            <CardFace card={attackerCard} revealed={false} fill />
          )
        ) : (
          // You're the attacker: your card is dealt face-up — flip it in at the start.
          <div key={`atk-deal-${round}`} className="animate-flip h-full">
            {revealed ? (
              <CardFace
                card={attackerCard}
                highlightStatKey={pickedKey ?? undefined}
                shownValue={attackerEff !== undefined ? round1(attackerEff) : undefined}
                hideAvatarLg
              />
            ) : (
              <TappableCard card={attackerCard} phase={phase} onPick={pickStat} hideAvatarLg />
            )}
          </div>
        )}
        {revealed && attackerCard.vizag && <VizagStrike key={`atk-${round}`} />}
      </div>
    </div>
  );

  const defenderBlock = (
    <div className={`w-full md:flex-1 lg:flex lg:flex-none lg:shrink-0 lg:flex-col ${cardWidthCls}`}>
      <CardLabel
        name={defenderName}
        tag={attackerIsP1 ? "P2" : "P1"}
        role="Defender"
        win={outcome?.winner === "defender"}
      />
      <div
        className={`relative mt-1.5 transition duration-300 lg:min-h-0 lg:flex-1 ${
          outcome?.winner === "attacker" ? "opacity-55 saturate-50" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        {botAttacking ? (
          // You're defending the computer: your card is dealt face-up — flip in at start.
          <div key={`def-deal-${round}`} className="animate-flip h-full">
            {revealed ? (
              <CardFace
                card={defenderCard}
                highlightStatKey={pickedKey ?? undefined}
                shownValue={defenderEff !== undefined ? round1(defenderEff) : undefined}
                hideAvatarLg
              />
            ) : (
              <CardFace card={defenderCard} hideAvatarLg />
            )}
          </div>
        ) : (
          // Defender is hidden until the pick, then flips over on reveal.
          revealed ? (
            <div key={`def-rev-${round}`} className="animate-flip h-full">
              <CardFace
                card={defenderCard}
                highlightStatKey={pickedKey ?? undefined}
                shownValue={defenderEff !== undefined ? round1(defenderEff) : undefined}
                hideAvatarLg
              />
            </div>
          ) : (
            <CardFace card={defenderCard} revealed={false} fill />
          )
        )}
        {revealed && defenderCard.vizag && <VizagStrike key={`def-${round}`} />}
      </div>
    </div>
  );

  // Fixed screen sides: vs Computer pins you (P1) left and the computer right;
  // otherwise the attacker sits on the left. Each side gets a big standing photo
  // (laptop/large screens only) that fades in once that card is face-up.
  const leftIsAttacker = vsComputer ? attackerIsP1 : true;
  const leftBlock = leftIsAttacker ? attackerBlock : defenderBlock;
  const rightBlock = leftIsAttacker ? defenderBlock : attackerBlock;
  const leftCardData = leftIsAttacker ? attackerCard : defenderCard;
  const rightCardData = leftIsAttacker ? defenderCard : attackerCard;
  const leftShow = leftIsAttacker ? attackerCardVisible : defenderCardVisible;
  const rightShow = leftIsAttacker ? defenderCardVisible : attackerCardVisible;

  return (
    // Full-width clipper: stops vertical scroll on laptop/large screens without
    // clipping the big side photos horizontally (the section stays max-w-4xl, so
    // the header + outcome stay centered; only this wrapper does the clipping).
    <div className="flex w-full flex-1 flex-col lg:h-[100svh] lg:overflow-hidden">
    <section
      onClick={() => revealed && onNext()}
      className={`relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-6 pt-5 md:max-w-4xl lg:min-h-0 lg:pb-3 ${revealed ? "cursor-pointer" : ""}`}
    >
      <PhaseIntro round={round} />
      {/* auto-advance countdown line */}
      {revealed && (
        <span
          key={`cd-${round}`}
          className="absolute left-0 top-0 z-10 h-1 rounded-r-full"
          style={{ background: "linear-gradient(90deg,var(--gold-soft),var(--gold))", animation: `countdown-line ${AUTO_MS}ms linear forwards` }}
        />
      )}
      {/* Phase banner */}
      <div
        className="relative overflow-hidden rounded-2xl border px-4 py-3 lg:py-2"
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
      <div className="mt-3 lg:mt-2">
        <OverTicker results={results} current={round} />
      </div>

      {/* Captured piles = the score (grows as cards are won) */}
      <div className="mt-3 flex items-start justify-between gap-3 lg:mt-2">
        <CapturedPile count={scoreP1} side="you" name={p1Name} strikes={strikesP1} align="left" />
        <CapturedPile count={scoreP2} side="opp" name={p2Name} strikes={strikesP2} align="right" />
      </div>

      {/* Turn indicator + countdown */}
      <div className="mt-4 text-center lg:mt-2">
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

      {/* Cards: stacked on mobile, side-by-side on tablet. On laptop/large
          screens the row goes full-bleed and a big standing player photo flanks
          each card (you on the left, computer on the right). */}
      <div className="mt-3 lg:mx-[calc(50%-50vw)] lg:mt-2 lg:w-screen">
        <div className="mx-auto flex max-w-md flex-col md:max-w-4xl md:flex-row md:items-start md:gap-5 lg:max-w-none lg:items-stretch lg:justify-center lg:gap-0 lg:px-4">
          <BigPlayer card={leftCardData} show={leftShow} side="left" />
          {leftBlock}
          <div className="my-2 flex items-center justify-center md:my-0 md:self-center">
            {revealed ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="animate-pulse whitespace-nowrap rounded-full border border-[var(--gold)]/50 bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#161003] shadow-[0_10px_24px_-8px_rgba(245,197,24,0.7)]"
              >
                {round + 1 >= TOTAL_ROUNDS ? "Tap → Result" : "Tap → Next"}
              </button>
            ) : (
              <span className="font-display text-xs font-black tracking-[0.3em] text-[var(--ink-dim)]/60">
                VS
              </span>
            )}
          </div>
          {rightBlock}
          <BigPlayer card={rightCardData} show={rightShow} side="right" />
        </div>
      </div>

      {/* Outcome banner + Next */}
      {outcome && (
        <div className="animate-reveal mt-4 lg:mt-2">
          <div className="rounded-2xl border border-[var(--hair)] bg-black/45 px-4 py-3 text-center lg:py-2">
            <div className="mb-1.5 flex justify-center lg:mb-1">
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
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[12px] text-[var(--ink-dim)]">
                <span>{pickedStat?.label}:</span>
                <span
                  className={`font-mono tabular-nums ${outcome.winner === "attacker" ? "text-gold text-base font-bold" : "text-white/90"}`}
                  style={outcome.winner === "attacker" ? { textShadow: "0 0 12px rgba(245,197,24,.6)" } : undefined}
                >
                  {outcome.attackerMissing ? "—" : fmt(round1(atkUp))}
                </span>
                <span className="text-[var(--ink-dim)]/60">(atk)</span>
                <span>vs</span>
                <span
                  className={`font-mono tabular-nums ${outcome.winner === "defender" ? "text-gold text-base font-bold" : "text-white/90"}`}
                  style={outcome.winner === "defender" ? { textShadow: "0 0 12px rgba(245,197,24,.6)" } : undefined}
                >
                  {outcome.defenderMissing ? "—" : fmt(round1(defUp))}
                </span>
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
        </div>
      )}
    </section>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Big transparent player photo that stands beside its card on laptop/large
 * screens only (hidden on mobile/tablet). Width is always reserved so the cards
 * don't shift when the opponent's photo fades in on reveal; `show` toggles the
 * fade. The right-side photo is mirrored so the player faces inward.
 */
function BigPlayer({
  card,
  show,
  side,
}: {
  card: Card;
  show: boolean;
  side: "left" | "right";
}) {
  // self-stretch → the box is exactly the card's height; object-contain + max-h-full
  // means the full cutout always fits inside (never cropped, never spills past the
  // card bottom into the outcome banner). object-bottom stands the player on the floor.
  return (
    <div
      aria-hidden
      className={`hidden self-stretch lg:flex lg:items-end lg:shrink-0 lg:w-[220px] xl:w-[300px] 2xl:w-[360px] ${
        side === "left" ? "lg:-mr-6 xl:-mr-8" : "lg:-ml-6 xl:-ml-8"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/players/${card.id}.png`}
        alt=""
        draggable={false}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
        className={`max-h-full w-full object-contain object-bottom drop-shadow-[0_30px_45px_rgba(0,0,0,0.6)] transition-opacity duration-500 ${
          show ? "opacity-100" : "opacity-0"
        } ${side === "right" ? "-scale-x-100" : ""}`}
      />
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

