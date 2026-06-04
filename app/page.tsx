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
import { CardFace } from "@/components/CardFace";
import { isFirebaseConfigured } from "@/lib/firebase";
import { CARD_POOL, type Card } from "@/lib/cards";
import { selectMatchDeck, TOTAL_ROUNDS } from "@/lib/engine";

// A few card backs for the fanned-cards hero on the landing.
const FAN_CARDS = CARD_POOL.slice(0, 5);

type Mode = "choose" | "online" | "local" | "bot";

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
  // Always land on the mode picker — Pass & Play and vs Computer work offline;
  // Play Online only shows when Firebase is configured.
  const [mode, setMode] = useState<Mode>("choose");
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

  // Single-player kickoff: set up the human vs the computer and deal straight in.
  function startBot(name: string) {
    setP1(name.trim() || "You");
    setP2("Computer");
    setMode("bot");
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
      <main className="floodlight relative flex min-h-[100svh] w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* A — big star cutouts flanking on laptop/large screens (Kohli left, Vaibhav Suryavanshi right) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/players/v-kohli.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 hidden h-[78%] max-h-[680px] object-contain object-bottom opacity-90 drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] lg:block xl:left-4"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/players/v-sooryavanshi.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 hidden h-[78%] max-h-[680px] -scale-x-100 object-contain object-bottom opacity-90 drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] lg:block xl:right-4"
        />
        {/* A — single faded star behind the content on phones */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/players/v-kohli.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-4 left-1/2 h-[46%] -translate-x-1/2 object-contain object-bottom opacity-[0.12] blur-[1px] lg:hidden"
        />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-7">
          {/* B — fanned trump cards */}
          <div className="flex items-end justify-center">
            {FAN_CARDS.map((c, i) => (
              <div
                key={c.id}
                className="-ml-7 w-16 first:ml-0 sm:w-20"
                style={{
                  transform: `rotate(${(i - 2) * 11}deg) translateY(${Math.abs(i - 2) * 9}px)`,
                  transformOrigin: "bottom center",
                  zIndex: 5 - Math.abs(i - 2),
                }}
              >
                <CardFace card={c} revealed={false} size="mini" />
              </div>
            ))}
          </div>

          {/* title */}
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">
              IPL <span className="text-gold">2026</span>
            </h1>
            <p className="font-display mt-1 text-lg tracking-[0.3em] text-white/70">TRUMP CARDS</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">Vizag Edition</p>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--ink-dim)]">
            Choose your format
          </p>

          {/* modes with cricket one-liners */}
          <div className="flex w-full max-w-xs flex-col gap-3">
            {isFirebaseConfigured && (
              <ModeButton
                primary
                onClick={() => setMode("online")}
                label="Play Online"
                tagline="Take on a real rival, live 1v1"
              />
            )}
            <ModeButton
              primary={!isFirebaseConfigured}
              onClick={() => {
                setMode("bot");
                setScreen("name");
              }}
              label="Play vs Computer"
              tagline="Net session against the AI"
            />
            <ModeButton
              onClick={() => {
                setMode("local");
                setScreen("name");
              }}
              label="Pass & Play"
              tagline="One phone, two players — pass the bat"
            />
          </div>
        </div>
      </main>
    );
  }

  if (mode === "online") {
    return (
      <main className="floodlight flex w-full flex-1 flex-col">
        <OnlineGame
          onExit={() => setMode("choose")}
          onPlayBot={(name) => startBot(name)}
        />
      </main>
    );
  }

  return (
    <main className="floodlight flex w-full flex-1 flex-col">
      {screen === "name" && (
        <NameEntry
          initialP1={p1}
          initialP2={mode === "bot" ? "" : p2}
          solo={mode === "bot"}
          onContinue={(a, b) => {
            if (mode === "bot") {
              startBot(a);
              return;
            }
            setP1(a);
            setP2(b);
            setScreen("lobby");
          }}
        />
      )}

      {screen === "lobby" && mode !== "bot" && (
        <Lobby
          p1={p1}
          p2={p2}
          onStart={startMatch}
          onBack={() => setMode("choose")}
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
          vsComputer={mode === "bot"}
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
          p1Deck={hands.p1Deck}
          p2Deck={hands.p2Deck}
          onRematch={rematch}
          onNewPlayers={newPlayers}
        />
      )}
    </main>
  );
}

function ModeButton({
  label,
  tagline,
  onClick,
  primary = false,
}: {
  label: string;
  tagline: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display flex flex-col items-center gap-0.5 rounded-2xl py-3 transition active:scale-[0.98] ${
        primary
          ? "bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)]"
          : "border border-[var(--hair)] bg-black/40 text-white backdrop-blur-sm"
      }`}
    >
      <span className="text-base font-bold uppercase tracking-widest">{label}</span>
      <span
        className={`text-[11px] font-medium normal-case tracking-normal ${primary ? "text-[#161003]/75" : "text-[var(--ink-dim)]"}`}
      >
        {tagline}
      </span>
    </button>
  );
}
