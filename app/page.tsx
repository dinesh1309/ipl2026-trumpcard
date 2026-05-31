"use client";

// IPL 2026 Trump Cards — Vizag Edition.
//
// PASS-AND-PLAY build: two players share one phone, taking alternating turns.
// This is the PRD's sanctioned fallback ahead of the realtime layer.
// NEXT LAYER: Firebase realtime so each player plays from their own device
// (the defender's card stays hidden on the attacker's screen during the pick).
//
// Screen state machine: name → lobby → match → result.

import { useState } from "react";
import { NameEntry } from "@/components/NameEntry";
import { Lobby } from "@/components/Lobby";
import { MatchScreen } from "@/components/MatchScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { OnlineGame } from "@/components/OnlineGame";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Card } from "@/lib/cards";
import { selectMatchDeck, TOTAL_ROUNDS } from "@/lib/engine";

type Mode = "choose" | "online" | "local";

type Screen = "name" | "lobby" | "match" | "result";

interface Deal {
  p1Deck: Card[]; // 8 cards
  p2Deck: Card[]; // 8 cards
}

function deal(): Deal {
  const deck = selectMatchDeck(); // 16 cards, shuffled, anchor included
  return { p1Deck: deck.slice(0, 8), p2Deck: deck.slice(8, 16) };
}

export default function Home() {
  // Online mode only appears when Firebase is configured; otherwise straight to pass-and-play.
  const [mode, setMode] = useState<Mode>(isFirebaseConfigured ? "choose" : "local");
  const [screen, setScreen] = useState<Screen>("name");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [hands, setHands] = useState<Deal | null>(null);
  const [round, setRound] = useState(0); // 0-based ball index
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [results, setResults] = useState<("p1" | "p2" | "tie" | null)[]>([]);
  const [strikesP1, setStrikesP1] = useState(0);
  const [strikesP2, setStrikesP2] = useState(0);
  const [forfeitWinner, setForfeitWinner] = useState<1 | 2 | null>(null);

  function startMatch() {
    setHands(deal());
    setRound(0);
    setScoreP1(0);
    setScoreP2(0);
    setResults([]);
    setStrikesP1(0);
    setStrikesP2(0);
    setForfeitWinner(null);
    setScreen("match");
  }

  function rematch() {
    startMatch();
  }

  function newPlayers() {
    setHands(null);
    setRound(0);
    setScoreP1(0);
    setScoreP2(0);
    setResults([]);
    setStrikesP1(0);
    setStrikesP2(0);
    setForfeitWinner(null);
    setScreen("name");
  }

  function onResolve(winner: 1 | 2 | "tie", timedOutAttacker?: 1 | 2) {
    if (winner === 1) setScoreP1((s) => s + 1);
    else if (winner === 2) setScoreP2((s) => s + 1);
    setResults((prev) => {
      const next = [...prev];
      next[round] = winner === "tie" ? "tie" : winner === 1 ? "p1" : "p2";
      return next;
    });
    // A timeout is a strike against the attacker; two strikes forfeits the match.
    if (timedOutAttacker === 1) {
      setStrikesP1((s) => {
        const n = s + 1;
        if (n >= 2) setForfeitWinner(2);
        return n;
      });
    } else if (timedOutAttacker === 2) {
      setStrikesP2((s) => {
        const n = s + 1;
        if (n >= 2) setForfeitWinner(1);
        return n;
      });
    }
  }

  function onNext() {
    if (forfeitWinner || round + 1 >= TOTAL_ROUNDS) {
      setScreen("result");
    } else {
      setRound((r) => r + 1);
    }
  }

  if (mode === "choose") {
    return (
      <main className="floodlight flex min-h-[100svh] w-full flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            IPL <span className="text-gold">2026</span>
          </h1>
          <p className="font-display mt-1 text-lg tracking-[0.3em] text-white/70">
            TRUMP CARDS
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">
            Vizag Edition
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => setMode("online")}
            className="font-display rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)]"
          >
            Play Online
          </button>
          <button
            onClick={() => setMode("local")}
            className="font-display rounded-2xl border border-[var(--hair)] bg-black/30 py-4 text-base font-bold uppercase tracking-widest text-white"
          >
            Pass &amp; Play
          </button>
        </div>
      </main>
    );
  }

  if (mode === "online") {
    return (
      <main className="floodlight flex w-full flex-1 flex-col">
        <OnlineGame onExit={() => setMode("choose")} />
      </main>
    );
  }

  return (
    <main className="floodlight flex w-full flex-1 flex-col">
      {screen === "name" && (
        <NameEntry
          initialP1={p1}
          initialP2={p2}
          onContinue={(a, b) => {
            setP1(a);
            setP2(b);
            setScreen("lobby");
          }}
        />
      )}

      {screen === "lobby" && (
        <Lobby
          p1={p1}
          p2={p2}
          onStart={startMatch}
          onBack={() => setScreen("name")}
        />
      )}

      {screen === "match" && hands && (
        <MatchScreen
          key={`${round}-${hands.p1Deck[0]?.id ?? ""}`}
          p1Name={p1}
          p2Name={p2}
          p1Deck={hands.p1Deck}
          p2Deck={hands.p2Deck}
          round={round}
          scoreP1={scoreP1}
          scoreP2={scoreP2}
          strikesP1={strikesP1}
          strikesP2={strikesP2}
          results={results}
          onResolve={onResolve}
          onNext={onNext}
        />
      )}

      {screen === "result" && hands && (
        <ResultScreen
          p1Name={p1}
          p2Name={p2}
          scoreP1={scoreP1}
          scoreP2={scoreP2}
          forfeitWinner={forfeitWinner}
          p1FirstCard={hands.p1Deck[0]}
          p2FirstCard={hands.p2Deck[0]}
          onRematch={rematch}
          onNewPlayers={newPlayers}
        />
      )}
    </main>
  );
}
