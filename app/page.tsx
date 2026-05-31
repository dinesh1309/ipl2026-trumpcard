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
import type { Card } from "@/lib/cards";
import { selectMatchDeck, TOTAL_ROUNDS } from "@/lib/engine";

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
  const [screen, setScreen] = useState<Screen>("name");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [hands, setHands] = useState<Deal | null>(null);
  const [round, setRound] = useState(0); // 0-based ball index
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);

  function startMatch() {
    setHands(deal());
    setRound(0);
    setScoreP1(0);
    setScoreP2(0);
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
    setScreen("name");
  }

  function onResolve(winner: 1 | 2 | "tie") {
    if (winner === 1) setScoreP1((s) => s + 1);
    else if (winner === 2) setScoreP2((s) => s + 1);
  }

  function onNext() {
    if (round + 1 >= TOTAL_ROUNDS) {
      setScreen("result");
    } else {
      setRound((r) => r + 1);
    }
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
          p1FirstCard={hands.p1Deck[0]}
          p2FirstCard={hands.p2Deck[0]}
          onRematch={rematch}
          onNewPlayers={newPlayers}
        />
      )}
    </main>
  );
}
