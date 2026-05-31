// Agent 2 (Visual Design) — generative SVG/CSS card face. No image assets.
"use client";

import { Card, Metric } from "@/lib/cards";
import { METRIC_LABEL } from "@/lib/engine";

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function CardFace({
  card,
  highlight,
  value,
  size = "full",
}: {
  card: Card;
  highlight?: Metric; // the stat this round is fought on
  value?: number; // effective value to show for the highlighted stat
  size?: "full" | "mini";
}) {
  const battingRows: [Metric, number][] = [
    ["runs", card.batting.runs],
    ["average", card.batting.average],
    ["strikeRate", card.batting.strikeRate],
    ["sixes", card.batting.sixes],
    ["fours", card.batting.fours],
  ];
  const bowlingRows: [Metric, number][] = [
    ["wickets", card.bowling.wickets],
    ["economy", card.bowling.economy],
    ["dotBallPct", card.bowling.dotBallPct],
  ];

  if (size === "mini") {
    return (
      <div
        className="rounded-xl px-3 py-2 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${card.accent}, #0b1120)` }}
      >
        <div className="text-sm font-bold leading-tight">{card.name}</div>
        <div className="text-[10px] opacity-80">{card.role}</div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl text-white shadow-2xl ring-1 ring-white/10"
      style={{ background: `linear-gradient(150deg, ${card.accent}, #0b1120 75%)` }}
    >
      {card.vizag && (
        <div className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-extrabold text-black">
          ⚡ VIZAG
        </div>
      )}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-black">
          {initials(card.name)}
        </div>
        <div>
          <div className="text-lg font-black leading-tight">{card.name}</div>
          <div className="text-xs opacity-80">
            {card.role} · {card.team}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/10 p-px">
        {[...battingRows, ...bowlingRows].map(([m, v]) => {
          const isHi = highlight === m;
          return (
            <div
              key={m}
              className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                isHi ? "bg-yellow-400 text-black" : "bg-black/30"
              }`}
            >
              <span className={isHi ? "font-bold" : "opacity-80"}>{METRIC_LABEL[m]}</span>
              <span className="font-mono font-bold">
                {isHi && value !== undefined ? value : v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
