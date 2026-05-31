// Realtime multiplayer over Firestore.
// Schema:
//   players/{clientId}  — lobby roster. { name, status, matchId, createdAt }
//   matches/{matchId}   — a 1v1 match (see MatchDoc). Player 1 (p1Id) is authoritative:
//                         only the p1 client resolves rounds + advances the match.
//
// All writes are no-ops when Firebase isn't configured (getDb() === null), so the
// app degrades cleanly to pass-and-play.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { CARD_POOL, type Card } from "@/lib/cards";
import {
  STATS,
  TOTAL_ROUNDS,
  TURN_SECONDS,
  phaseForRound,
  resolveRound,
  selectMatchDeck,
} from "@/lib/engine";

const BY_ID = new Map(CARD_POOL.map((c) => [c.id, c]));
export const cardById = (id: string): Card => BY_ID.get(id)!;

export type PlayerStatus = "waiting" | "matched" | "playing" | "left";

export interface PlayerDoc {
  name: string;
  status: PlayerStatus;
  matchId: string | null;
}

export interface MatchPick {
  round: number;
  statKey: string;
  attackerId: string;
}

export interface MatchOutcome {
  round: number;
  statKey: string;
  attackerValue: number;
  defenderValue: number;
  attackerMissing: boolean;
  defenderMissing: boolean;
  winner: "attacker" | "defender" | "tie";
  timedOut: boolean; // attacker ran out of time → auto-lost the ball
}

export interface MatchDoc {
  p1Id: string;
  p2Id: string;
  p1Name: string;
  p2Name: string;
  deckIds: string[]; // 16 ids; [0..7] = P1 hand, [8..15] = P2 hand
  status: "ready" | "active" | "finished";
  round: number; // 0-based
  scoreP1: number;
  scoreP2: number;
  p1Ready: boolean;
  p2Ready: boolean;
  pick: MatchPick | null;
  outcome: MatchOutcome | null;
  turnDeadline: number | null; // epoch ms; attacker must pick before this
  p1Next: boolean;
  p2Next: boolean;
  history: ("p1" | "p2" | "tie")[]; // per-ball winner, for the over ticker
  strikesP1: number; // timeout strikes; 2 forfeits the match
  strikesP2: number;
  winner: 1 | 2 | "tie" | null;
  winReason: "score" | "forfeit" | null;
}

function newId(): string {
  // crypto.randomUUID is available in modern browsers (HTTPS / localhost).
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- Lobby ----

export async function joinLobby(name: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const clientId = newId();
  await setDoc(doc(db, "players", clientId), {
    name: name.trim() || "Player",
    status: "waiting",
    matchId: null,
    createdAt: serverTimestamp(),
  });
  return clientId;
}

export async function leaveLobby(clientId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, "players", clientId)).catch(() => {});
}

export function subscribePlayer(
  clientId: string,
  cb: (p: PlayerDoc | null) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(doc(db, "players", clientId), (snap) => {
    cb(snap.exists() ? (snap.data() as PlayerDoc) : null);
  });
}

export function subscribeLobbyCount(cb: (waiting: number) => void): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};
  const q = query(collection(db, "players"), where("status", "==", "waiting"));
  return onSnapshot(q, (snap) => cb(snap.size));
}

/**
 * Try to pair this client with the oldest other waiting player. A transaction
 * claims both players + creates the match atomically, so concurrent matchmakers
 * can't double-book. Returns the matchId if a match was made, else null.
 */
export async function attemptMatchmake(clientId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  // Firestore transactions can't run queries, so find a candidate first.
  // Filter only on status (no composite index needed) and pick the oldest other
  // waiting player by sorting client-side.
  const q = query(collection(db, "players"), where("status", "==", "waiting"));
  const snap = await getDocs(q);
  const candidate = snap.docs
    .filter((d) => d.id !== clientId)
    .sort(
      (a, b) =>
        (a.data().createdAt?.toMillis?.() ?? 0) -
        (b.data().createdAt?.toMillis?.() ?? 0)
    )[0];
  if (!candidate) return null;

  const matchId = newId();
  // p1 = the OLDER waiting player (candidate) → authoritative.
  const p1Id = candidate.id;
  const p2Id = clientId;

  try {
    const made = await runTransaction(db, async (tx) => {
      const p1Ref = doc(db, "players", p1Id);
      const p2Ref = doc(db, "players", p2Id);
      const p1Snap = await tx.get(p1Ref);
      const p2Snap = await tx.get(p2Ref);
      if (!p1Snap.exists() || !p2Snap.exists()) return false;
      if (p1Snap.data().status !== "waiting" || p2Snap.data().status !== "waiting") {
        return false; // someone got matched first
      }
      const deckIds = selectMatchDeck().map((c) => c.id);
      const match: MatchDoc = {
        p1Id,
        p2Id,
        p1Name: p1Snap.data().name,
        p2Name: p2Snap.data().name,
        deckIds,
        status: "ready",
        round: 0,
        scoreP1: 0,
        scoreP2: 0,
        p1Ready: false,
        p2Ready: false,
        pick: null,
        outcome: null,
        turnDeadline: null,
        p1Next: false,
        p2Next: false,
        history: [],
        strikesP1: 0,
        strikesP2: 0,
        winner: null,
        winReason: null,
      };
      tx.set(doc(db, "matches", matchId), match);
      tx.update(p1Ref, { status: "matched", matchId });
      tx.update(p2Ref, { status: "matched", matchId });
      return true;
    });
    return made ? matchId : null;
  } catch {
    return null; // lost the race; will retry on next tick
  }
}

// ---- Match ----

export function subscribeMatch(
  matchId: string,
  cb: (m: MatchDoc | null) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(doc(db, "matches", matchId), (snap) => {
    cb(snap.exists() ? (snap.data() as MatchDoc) : null);
  });
}

export function decksFor(m: MatchDoc): { p1Deck: Card[]; p2Deck: Card[] } {
  const ids = m.deckIds;
  return {
    p1Deck: ids.slice(0, 8).map(cardById),
    p2Deck: ids.slice(8, 16).map(cardById),
  };
}

export function attackerIdForRound(m: MatchDoc): string {
  return m.round % 2 === 0 ? m.p1Id : m.p2Id;
}

export async function setReady(matchId: string, clientId: string, isP1: boolean): Promise<void> {
  const db = getDb();
  if (!db) return;
  await updateDoc(doc(db, "matches", matchId), isP1 ? { p1Ready: true } : { p2Ready: true });
}

export async function submitPick(
  matchId: string,
  round: number,
  statKey: string,
  attackerId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const pick: MatchPick = { round, statKey, attackerId };
  await updateDoc(doc(db, "matches", matchId), { pick });
}

export async function setNext(matchId: string, isP1: boolean): Promise<void> {
  const db = getDb();
  if (!db) return;
  await updateDoc(doc(db, "matches", matchId), isP1 ? { p1Next: true } : { p2Next: true });
}

export async function leaveMatch(matchId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await updateDoc(doc(db, "matches", matchId), { status: "finished" }).catch(() => {});
}

/**
 * Authoritative reconciler — call on every match snapshot. Only the P1 client
 * actually writes; everyone else returns early. Drives three transitions:
 *  ready→active (both ready), pick→outcome (resolve a ball), advance (both Next).
 */
export async function reconcile(matchId: string, m: MatchDoc, clientId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (clientId !== m.p1Id) return; // P1 is authoritative
  const ref = doc(db, "matches", matchId);

  // 1) Start the match when both have readied up (and start the turn timer).
  if (m.status === "ready" && m.p1Ready && m.p2Ready) {
    await updateDoc(ref, {
      status: "active",
      turnDeadline: Date.now() + TURN_SECONDS * 1000,
    });
    return;
  }

  if (m.status !== "active") return;

  // 2) Resolve the current ball once the attacker has picked.
  const needsResolve =
    m.pick && m.pick.round === m.round && (!m.outcome || m.outcome.round !== m.round);
  if (needsResolve && m.pick) {
    const stat = STATS.find((s) => s.key === m.pick!.statKey);
    if (!stat) return;
    const { p1Deck, p2Deck } = decksFor(m);
    const phase = phaseForRound(m.round);
    const attackerIsP1 = m.round % 2 === 0;
    const attackerCard = attackerIsP1 ? p1Deck[m.round] : p2Deck[m.round];
    const defenderCard = attackerIsP1 ? p2Deck[m.round] : p1Deck[m.round];
    const r = resolveRound(attackerCard, defenderCard, stat, phase);

    let scoreP1 = m.scoreP1;
    let scoreP2 = m.scoreP2;
    if (r.winner !== "tie") {
      const attackerWon = r.winner === "attacker";
      const winnerIsP1 = attackerIsP1 ? attackerWon : !attackerWon;
      if (winnerIsP1) scoreP1++;
      else scoreP2++;
    }

    const outcome: MatchOutcome = {
      round: m.round,
      statKey: stat.key,
      attackerValue: r.attackerValue,
      defenderValue: r.defenderValue,
      attackerMissing: r.attackerMissing,
      defenderMissing: r.defenderMissing,
      winner: r.winner,
      timedOut: false,
    };
    await updateDoc(ref, { outcome, scoreP1, scoreP2, turnDeadline: null });
    return;
  }

  // 3) Advance once both players tap Next.
  if (m.outcome && m.outcome.round === m.round && m.p1Next && m.p2Next) {
    const o = m.outcome;
    const ballResult: "p1" | "p2" | "tie" =
      o.winner === "tie"
        ? "tie"
        : (o.winner === "attacker") === (m.round % 2 === 0)
          ? "p1"
          : "p2";
    const history = [...(m.history ?? []), ballResult];
    const nextRound = m.round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      const winner: 1 | 2 | "tie" =
        m.scoreP1 === m.scoreP2 ? "tie" : m.scoreP1 > m.scoreP2 ? 1 : 2;
      await updateDoc(ref, {
        status: "finished",
        winner,
        winReason: "score",
        history,
        turnDeadline: null,
      });
    } else {
      await updateDoc(ref, {
        round: nextRound,
        pick: null,
        outcome: null,
        p1Next: false,
        p2Next: false,
        history,
        turnDeadline: Date.now() + TURN_SECONDS * 1000,
      });
    }
  }
}

/**
 * Turn-timer enforcement. If the attacker hasn't picked before turnDeadline,
 * the attacker loses the ball (defender captures). Only the P1 client writes.
 * Call from a client-side timer when the deadline passes.
 */
export async function resolveTimeout(
  matchId: string,
  m: MatchDoc,
  clientId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (clientId !== m.p1Id) return; // P1 authoritative
  if (m.status !== "active") return;
  if (m.pick && m.pick.round === m.round) return; // a pick exists; resolve handles it
  if (m.outcome && m.outcome.round === m.round) return; // already resolved
  if (!m.turnDeadline || Date.now() < m.turnDeadline) return; // not expired yet

  const attackerIsP1 = m.round % 2 === 0;
  let scoreP1 = m.scoreP1;
  let scoreP2 = m.scoreP2;
  let strikesP1 = m.strikesP1 ?? 0;
  let strikesP2 = m.strikesP2 ?? 0;
  // Defender (the non-attacker) wins the ball; the attacker takes a strike.
  if (attackerIsP1) {
    scoreP2++;
    strikesP1++;
  } else {
    scoreP1++;
    strikesP2++;
  }

  const outcome: MatchOutcome = {
    round: m.round,
    statKey: "",
    attackerValue: 0,
    defenderValue: 0,
    attackerMissing: false,
    defenderMissing: false,
    winner: "defender",
    timedOut: true,
  };

  const ref = doc(db, "matches", matchId);
  // Two strikes → terminate the match and award it to the opponent.
  if (strikesP1 >= 2 || strikesP2 >= 2) {
    await updateDoc(ref, {
      outcome,
      scoreP1,
      scoreP2,
      strikesP1,
      strikesP2,
      status: "finished",
      winner: strikesP1 >= 2 ? 2 : 1,
      winReason: "forfeit",
      turnDeadline: null,
    });
    return;
  }
  await updateDoc(ref, {
    outcome,
    scoreP1,
    scoreP2,
    strikesP1,
    strikesP2,
    turnDeadline: null,
  });
}
