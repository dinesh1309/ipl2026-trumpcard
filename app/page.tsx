"use client";

import { useMemo, useState } from "react";
import { CardFace } from "@/components/CardFace";
import { QRShow } from "@/components/QRShow";
import { QRScan } from "@/components/QRScan";
import { playMatch, Mode, METRIC_LABEL, MatchResult } from "@/lib/engine";

type Screen = "home" | "create" | "join" | "play";
type POV = 1 | 2 | "both";

const newSeed = () => Math.random().toString(36).slice(2, 7);
const MODE_CODE: Record<Mode, string> = { powerplay: "pp", deathover: "do" };
const CODE_MODE: Record<string, Mode> = { pp: "powerplay", do: "deathover" };

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("powerplay");
  const [seed, setSeed] = useState("");
  const [pov, setPov] = useState<POV>("both");
  const [round, setRound] = useState(0);

  const match: MatchResult | null = useMemo(
    () => (seed ? playMatch(seed, mode) : null),
    [seed, mode]
  );

  function startCreate(m: Mode) {
    setMode(m);
    setSeed(newSeed());
    setPov(1);
    setRound(0);
    setScreen("create");
  }

  function onScan(text: string) {
    const [code, s] = text.split(":");
    const m = CODE_MODE[code];
    if (!m || !s) return;
    setMode(m);
    setSeed(s);
    setPov(2);
    setRound(0);
    setScreen("play");
  }

  function startDemo() {
    setSeed(newSeed());
    setPov("both");
    setRound(0);
    setScreen("play");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-gradient-to-b from-slate-900 to-black px-4 py-6 text-white">
      <header className="text-center">
        <h1 className="text-2xl font-black tracking-tight">
          IPL <span className="text-yellow-400">TRUMP</span> CARDS
        </h1>
        <p className="text-xs text-white/60">Vizag Edition · Powerplay vs Death Over</p>
      </header>

      {screen === "home" && (
        <div className="flex flex-1 flex-col justify-center gap-3">
          <p className="mb-2 text-center text-sm text-white/70">
            Two phones, one QR. Cards are dealt by the system — no picking, no order. Highest
            stat captures the card.
          </p>
          <button
            onClick={() => startCreate("powerplay")}
            className="rounded-xl bg-yellow-400 py-3 font-bold text-black"
          >
            Create Match (host)
          </button>
          <button
            onClick={() => setScreen("join")}
            className="rounded-xl bg-white/10 py-3 font-bold ring-1 ring-white/20"
          >
            Scan QR to Join
          </button>
          <button
            onClick={startDemo}
            className="rounded-xl bg-white/5 py-3 text-sm font-medium text-white/70 ring-1 ring-white/10"
          >
            Demo on this device (pass &amp; play)
          </button>
        </div>
      )}

      {screen === "create" && match && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="flex gap-2">
            {(["powerplay", "deathover"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => startCreate(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                  mode === m ? "bg-yellow-400 text-black" : "bg-white/10"
                }`}
              >
                {m === "powerplay" ? "🏏 Powerplay" : "🎯 Death Over"}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-white/60">
            Opponent scans this to join the same dealt match.
          </p>
          <QRShow payload={`${MODE_CODE[mode]}:${seed}`} />
          <button
            onClick={() => setScreen("play")}
            className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-black"
          >
            Start Match →
          </button>
        </div>
      )}

      {screen === "join" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-center text-sm text-white/70">Point camera at the host&apos;s QR</p>
          <QRScan onResult={onScan} />
          <button onClick={() => setScreen("home")} className="text-xs text-white/50 underline">
            Back
          </button>
        </div>
      )}

      {screen === "play" && match && (
        <PlayScreen
          match={match}
          pov={pov}
          round={round}
          setRound={setRound}
          reset={() => setScreen("home")}
        />
      )}
    </main>
  );
}

function PlayScreen({
  match,
  pov,
  round,
  setRound,
  reset,
}: {
  match: MatchResult;
  pov: POV;
  round: number;
  setRound: (n: number) => void;
  reset: () => void;
}) {
  const total = match.rounds.length;
  const finished = round >= total;

  // running deck counts (net +1 winner / -1 loser per round)
  let d1 = 4;
  let d2 = 4;
  for (let k = 0; k < Math.min(round, total); k++) {
    if (match.rounds[k].winner === 1) {
      d1++;
      d2--;
    } else {
      d2++;
      d1--;
    }
  }

  const modeLabel = match.mode === "powerplay" ? "🏏 Powerplay" : "🎯 Death Over";

  if (finished) {
    const youWon = pov === "both" ? null : match.winner === pov;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">{match.hitCap ? "⏱️" : "🏆"}</div>
        <h2 className="text-2xl font-black">
          {pov === "both"
            ? `Player ${match.winner} wins!`
            : youWon
            ? "You win! 🎉"
            : "You lose"}
        </h2>
        <p className="text-sm text-white/60">
          {modeLabel} · {total} balls · captured the full deck
        </p>
        <button onClick={reset} className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-black">
          New Match
        </button>
      </div>
    );
  }

  const r = match.rounds[round];
  const youWonRound = pov === "both" ? null : r.winner === pov;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{modeLabel}</span>
        <span>
          Ball {round + 1} / {total}
        </span>
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span className={pov === 1 ? "text-yellow-400" : ""}>P1 deck: {d1}</span>
        <span className={pov === 2 ? "text-yellow-400" : ""}>P2 deck: {d2}</span>
      </div>

      <div className="rounded-lg bg-white/5 py-2 text-center text-sm">
        Stat this ball:{" "}
        <span className="font-bold text-yellow-400">{METRIC_LABEL[r.metric]}</span>
        {match.mode === "deathover" && r.metric === "economy" && (
          <span className="text-white/50"> (lower wins)</span>
        )}
      </div>

      <div className={`rounded-2xl p-1 ${r.winner === 1 ? "ring-2 ring-green-400" : "opacity-90"}`}>
        <div className="mb-1 px-1 text-xs font-bold text-white/60">
          Player 1 {pov === 1 && "(you)"}
        </div>
        <CardFace card={r.p1Card} highlight={r.metric} value={r.p1Value} />
      </div>

      <div className="text-center text-xs font-black text-white/40">VS</div>

      <div className={`rounded-2xl p-1 ${r.winner === 2 ? "ring-2 ring-green-400" : "opacity-90"}`}>
        <div className="mb-1 px-1 text-xs font-bold text-white/60">
          Player 2 {pov === 2 && "(you)"}
        </div>
        <CardFace card={r.p2Card} highlight={r.metric} value={r.p2Value} />
      </div>

      <div className="rounded-lg bg-black/40 py-2 text-center text-sm font-bold">
        {(r.p1Vizag || r.p2Vizag) && (
          <span className="text-yellow-400">⚡ Vizag bonus applied · </span>
        )}
        {pov === "both"
          ? `Player ${r.winner} captures!`
          : youWonRound
          ? "You capture! ✅"
          : "Card captured by opponent"}
      </div>

      <button
        onClick={() => setRound(round + 1)}
        className="mt-auto w-full rounded-xl bg-yellow-400 py-3 font-bold text-black"
      >
        {round + 1 === total ? "See Result →" : "Next Ball →"}
      </button>
    </div>
  );
}
