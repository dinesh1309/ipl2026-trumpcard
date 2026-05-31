"use client";

// OnlineGame — realtime multiplayer flow over Firestore.
// name → lobby (waiting + matchmaking) → matched (ready-check) → synced match → result.
// Each player is on their own device; the opponent's card stays hidden until the
// attacker locks a pick. P1 is authoritative (see lib/realtime reconcile()).

import { useEffect, useRef, useState } from "react";
import { CardFace } from "@/components/CardFace";
import { PhaseIntro } from "@/components/PhaseIntro";
import { OverTicker } from "@/components/OverTicker";
import { BallStamp, VizagStrike, WinSparks } from "@/components/MatchFx";
import { HowToPlay } from "@/components/Lobby";
import {
  STATS,
  TOTAL_ROUNDS,
  phaseForRound,
  effectiveValue,
  isMissing,
  type Phase,
} from "@/lib/engine";
import {
  joinLobby,
  leaveLobby,
  leaveMatch,
  subscribePlayer,
  subscribeLobbyCount,
  subscribeMatch,
  attemptMatchmake,
  setReady,
  submitPick,
  setNext,
  reconcile,
  decksFor,
  attackerIdForRound,
  type PlayerDoc,
  type MatchDoc,
} from "@/lib/realtime";

const PHASE_META: Record<Phase, { label: string; color: string; note: string }> = {
  powerplay: { label: "Powerplay", color: "#3ddc84", note: "Batting +25%" },
  normal: { label: "Normal", color: "#9fb0d0", note: "No boost" },
  deathover: { label: "Death Over", color: "#ff6a6a", note: "Bowling +25%" },
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function OnlineGame({ onExit }: { onExit: () => void }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [player, setPlayer] = useState<PlayerDoc | null>(null);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [lobbyCount, setLobbyCount] = useState(0);
  const joiningRef = useRef(false);

  // Subscribe to this player's doc + lobby size.
  useEffect(() => {
    if (!clientId) return;
    const unsubP = subscribePlayer(clientId, setPlayer);
    const unsubL = subscribeLobbyCount(setLobbyCount);
    return () => {
      unsubP();
      unsubL();
    };
  }, [clientId]);

  // Matchmaking loop while waiting.
  useEffect(() => {
    if (!clientId || player?.status !== "waiting") return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      await attemptMatchmake(clientId);
    };
    const id = setInterval(tick, 1500);
    tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [clientId, player?.status]);

  // Subscribe to the match once we have one.
  const matchId = player?.matchId ?? null;
  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      return;
    }
    return subscribeMatch(matchId, setMatch);
  }, [matchId]);

  // Drive authoritative transitions (P1 only acts inside reconcile()).
  useEffect(() => {
    if (matchId && match && clientId) reconcile(matchId, match, clientId);
  }, [matchId, match, clientId]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (clientId) leaveLobby(clientId);
    };
  }, [clientId]);

  async function join() {
    if (joiningRef.current || !name.trim()) return;
    joiningRef.current = true;
    const id = await joinLobby(name);
    joiningRef.current = false;
    if (id) setClientId(id);
  }

  async function backToLobby() {
    if (matchId) await leaveMatch(matchId);
    // Re-queue: drop the old player doc and rejoin fresh.
    if (clientId) await leaveLobby(clientId);
    const id = await joinLobby(name);
    setMatch(null);
    setPlayer(null);
    setClientId(id);
  }

  // ---- NAME ENTRY ----
  if (!clientId) {
    return (
      <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center gap-6 px-5">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            IPL <span className="text-gold">2026</span>
          </h1>
          <p className="font-display mt-1 text-lg tracking-[0.3em] text-white/70">
            TRUMP CARDS
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">
            Online · Vizag Edition
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="Enter your name"
            className="rounded-2xl border border-[var(--hair)] bg-black/40 px-4 py-3.5 text-center text-lg text-white outline-none focus:border-[var(--gold)]/50"
          />
          <button
            onClick={join}
            disabled={!name.trim()}
            className="font-display rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] disabled:opacity-40"
          >
            Join Lobby
          </button>
          <button
            onClick={onExit}
            className="text-xs uppercase tracking-wider text-[var(--ink-dim)] underline"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  // ---- WAITING IN LOBBY ----
  if (!match || (player && player.status === "waiting")) {
    return (
      <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center gap-5 px-5 text-center">
        <div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--gold)]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Finding you an opponent…
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Hi <span className="text-gold font-semibold">{name}</span> · {lobbyCount} in lobby
          </p>
        </div>
        <HowToPlay defaultOpen />
        <button
          onClick={onExit}
          className="text-xs uppercase tracking-wider text-[var(--ink-dim)] underline"
        >
          Leave lobby
        </button>
      </section>
    );
  }

  const isP1 = clientId === match.p1Id;
  const myName = isP1 ? match.p1Name : match.p2Name;
  const oppName = isP1 ? match.p2Name : match.p1Name;

  // ---- MATCHED: READY-CHECK ----
  if (match.status === "ready") {
    const iAmReady = isP1 ? match.p1Ready : match.p2Ready;
    return (
      <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center gap-5 px-5 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">Matched</p>
        <h2 className="font-display text-2xl font-bold text-white">
          <span className="text-gold">{myName}</span>
          <span className="text-white/40"> vs </span>
          {oppName}
        </h2>
        <HowToPlay />
        {iAmReady ? (
          <p className="text-sm text-[var(--ink-dim)]">Waiting for opponent to be ready…</p>
        ) : (
          <button
            onClick={() => matchId && setReady(matchId, clientId, isP1)}
            className="font-display rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003]"
          >
            Start Match
          </button>
        )}
      </section>
    );
  }

  // ---- RESULT ----
  if (match.status === "finished") {
    const myScore = isP1 ? match.scoreP1 : match.scoreP2;
    const oppScore = isP1 ? match.scoreP2 : match.scoreP1;
    const iWon = match.winner !== "tie" && (match.winner === 1) === isP1;
    return (
      <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="relative flex items-center justify-center">
          {iWon && <WinSparks />}
          <span className="text-5xl">
            {match.winner === "tie" ? "⚖️" : iWon ? "🏆" : "🫡"}
          </span>
        </div>
        <h2 className="font-display text-3xl font-bold text-white">
          {match.winner === "tie" ? "Match Tied" : iWon ? "You Win!" : "You Lose"}
        </h2>
        <p className="font-mono text-lg text-white/80">
          {myScore} <span className="text-[var(--ink-dim)]">—</span> {oppScore}
        </p>
        <button
          onClick={backToLobby}
          className="font-display mt-2 rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-8 py-3.5 text-base font-bold uppercase tracking-widest text-[#161003]"
        >
          Back to Lobby
        </button>
        <button
          onClick={onExit}
          className="text-xs uppercase tracking-wider text-[var(--ink-dim)] underline"
        >
          Exit
        </button>
      </section>
    );
  }

  // ---- ACTIVE MATCH ----
  return (
    <OnlineMatch
      match={match}
      matchId={matchId!}
      clientId={clientId}
      isP1={isP1}
      myName={myName}
      oppName={oppName}
    />
  );
}

function OnlineMatch({
  match,
  matchId,
  clientId,
  isP1,
  myName,
  oppName,
}: {
  match: MatchDoc;
  matchId: string;
  clientId: string;
  isP1: boolean;
  myName: string;
  oppName: string;
}) {
  const { p1Deck, p2Deck } = decksFor(match);
  const phase = phaseForRound(match.round);
  const meta = PHASE_META[phase];

  const myDeck = isP1 ? p1Deck : p2Deck;
  const oppDeck = isP1 ? p2Deck : p1Deck;
  const myCard = myDeck[match.round];
  const oppCard = oppDeck[match.round];

  const amAttacker = clientId === attackerIdForRound(match);
  const outcome = match.outcome && match.outcome.round === match.round ? match.outcome : null;
  const myScore = isP1 ? match.scoreP1 : match.scoreP2;
  const oppScore = isP1 ? match.scoreP2 : match.scoreP1;
  const iPressedNext = isP1 ? match.p1Next : match.p2Next;

  const pickedKey = outcome?.statKey;
  const pickedStat = pickedKey ? STATS.find((s) => s.key === pickedKey) : null;
  const iWonBall =
    !!outcome && outcome.winner !== "tie" && (outcome.winner === "attacker") === amAttacker;

  // Effective values for the reveal (mine vs opponent).
  const myEff =
    pickedStat ? round1(effectiveValue(myCard, pickedStat, phase)) : undefined;
  const oppEff =
    pickedStat ? round1(effectiveValue(oppCard, pickedStat, phase)) : undefined;
  // outcome stores attacker/defender; map to me/opp by whether I attacked this round.
  const iAttackedThisRound = amAttacker;
  const myOutcomeMissing = outcome
    ? iAttackedThisRound
      ? outcome.attackerMissing
      : outcome.defenderMissing
    : false;
  const oppOutcomeMissing = outcome
    ? iAttackedThisRound
      ? outcome.defenderMissing
      : outcome.attackerMissing
    : false;

  const battingStats = STATS.filter((s) => s.group === "batting");
  const bowlingStats = STATS.filter((s) => s.group === "bowling");

  return (
    <section className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-6 pt-5 md:max-w-4xl">
      <PhaseIntro round={match.round} />
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
            Ball {match.round + 1}
            <span className="text-[var(--ink-dim)]"> / {TOTAL_ROUNDS}</span>
          </span>
        </div>
      </div>

      {/* Over-by-over ticker */}
      <div className="mt-3">
        <OverTicker
          results={match.history ?? []}
          current={match.round}
          youAre={isP1 ? "p1" : "p2"}
        />
      </div>

      {/* Scoreboard */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--hair)] bg-black/30 px-4 py-2.5">
        <span className="font-display text-sm font-semibold text-gold">
          {myName}{" "}
          <span key={myScore} className="animate-score-pop font-mono text-xl text-white">
            {myScore}
          </span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">vs</span>
        <span className="font-display text-sm font-semibold text-white/80">
          <span key={oppScore} className="animate-score-pop font-mono text-xl">
            {oppScore}
          </span>{" "}
          {oppName}
        </span>
      </div>

      {/* Turn indicator */}
      <div className="mt-3 text-center text-sm text-[var(--ink-dim)]">
        {outcome ? (
          <span>
            <span className="font-display font-bold text-white">{pickedStat?.label}</span> ·{" "}
            {pickedStat?.lowerWins ? "lower wins" : "higher wins"}
          </span>
        ) : amAttacker ? (
          <span>
            <span className="font-display font-bold text-gold">Your turn</span> — tap a stat
          </span>
        ) : (
          <span>Waiting for {oppName} to play…</span>
        )}
      </div>

      {/* Cards: stacked on mobile, side-by-side on laptop */}
      <div className="mt-3 flex flex-col md:flex-row md:items-start md:gap-5">
      {/* My card */}
      <div className="md:flex-1">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
          You · {myName}
        </p>
        <div
          className={`relative mt-1.5 transition duration-300 ${
            outcome && !iWonBall && outcome.winner !== "tie" ? "opacity-55 saturate-50" : ""
          }`}
        >
          <CardFace card={myCard} highlightStatKey={pickedKey} shownValue={myEff} />
          {outcome && myCard.vizag && <VizagStrike key={`me-${match.round}`} />}
        </div>

        {/* Attacker stat picker */}
        {amAttacker && !outcome && (
          <div className="mt-2 rounded-2xl border border-[var(--hair)] bg-black/30 p-2">
            {[battingStats, bowlingStats].map((group, gi) => (
              <div key={gi} className={gi ? "mt-2" : ""}>
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  {gi === 0 ? "Batting" : "Bowling"}
                  {((gi === 0 && phase === "powerplay") ||
                    (gi === 1 && phase === "deathover")) && (
                    <span className="text-gold ml-1">+25%</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.map((s) => {
                    if (isMissing(myCard, s)) {
                      return (
                        <div
                          key={s.key}
                          className="stat-row cursor-not-allowed opacity-35"
                          title="Did not bowl"
                        >
                          <span className="stat-row__label">{s.label}</span>
                          <span className="stat-row__value">—</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={s.key}
                        onClick={() =>
                          submitPick(matchId, match.round, s.key, clientId)
                        }
                        className="stat-row text-left transition hover:bg-[var(--gold)]/15 hover:ring-1 hover:ring-[var(--gold)]/40 active:scale-[0.97]"
                      >
                        <span className="stat-row__label">{s.label}</span>
                        <span className="stat-row__value">
                          {fmt(round1(effectiveValue(myCard, s, phase)))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {amAttacker && !outcome ? null : !outcome ? (
          <p className="mt-2 text-center text-xs text-[var(--ink-dim)]">
            Opponent is choosing a stat…
          </p>
        ) : null}
      </div>

      <div className="my-2 flex items-center justify-center md:my-0 md:self-center">
        <span className="font-display text-xs font-black tracking-[0.3em] text-[var(--ink-dim)]/60">
          VS
        </span>
      </div>

      {/* Opponent card — hidden until reveal */}
      <div className="md:flex-1">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
          {oppName}
        </p>
        <div
          className={`relative mt-1.5 transition duration-300 ${
            outcome && iWonBall ? "opacity-55 saturate-50" : ""
          }`}
        >
          {outcome ? (
            <CardFace card={oppCard} highlightStatKey={pickedKey} shownValue={oppEff} />
          ) : (
            <CardFace card={oppCard} revealed={false} />
          )}
          {outcome && oppCard.vizag && <VizagStrike key={`opp-${match.round}`} />}
        </div>
      </div>
      </div>

      {/* Outcome + Next */}
      {outcome && (
        <div className="animate-reveal mt-4">
          <div className="rounded-2xl border border-[var(--hair)] bg-black/45 px-4 py-3 text-center">
            <div className="mb-1.5 flex justify-center">
              <BallStamp kind={outcome.winner === "tie" ? "tie" : "capture"} />
            </div>
            {outcome.winner === "tie" ? (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                Ball Tied — no capture
              </p>
            ) : (
              <p className="font-display text-base font-bold uppercase tracking-wide text-white">
                {iWonBall ? (
                  <span className="text-gold">You take the card</span>
                ) : (
                  <span>{oppName} takes the card</span>
                )}
              </p>
            )}
            <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
              {pickedStat?.label}:{" "}
              <span className="font-mono text-white/90">
                {myOutcomeMissing ? "—" : fmt(myEff ?? 0)}
              </span>{" "}
              <span className="text-[var(--ink-dim)]/60">(you)</span> vs{" "}
              <span className="font-mono text-white/90">
                {oppOutcomeMissing ? "—" : fmt(oppEff ?? 0)}
              </span>{" "}
              <span className="text-[var(--ink-dim)]/60">({oppName})</span>
            </p>
            {(myCard.vizag || oppCard.vizag) && (
              <p className="text-gold mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em]">
                ⚡ Vizag Power · +10%
              </p>
            )}
          </div>

          {iPressedNext ? (
            <p className="mt-3 text-center text-sm text-[var(--ink-dim)]">
              Waiting for {oppName}…
            </p>
          ) : (
            <button
              onClick={() => setNext(matchId, isP1)}
              className="font-display mt-3 w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003]"
            >
              {match.round + 1 >= TOTAL_ROUNDS ? "See Result" : "Next Ball"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
