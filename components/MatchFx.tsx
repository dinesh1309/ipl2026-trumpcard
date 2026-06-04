"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Card } from "@/lib/cards";

// Shared match visual effects: ball-result stamp, Vizag sweep, capture pile,
// count-up, confetti — used across pass-and-play, vs-Computer, and online.

/** Ramps a number 0 → target once `run` becomes true (for the winning-stat reveal). */
export function useCountUp(target: number, run: boolean, ms = 480) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) {
      setV(0);
      return;
    }
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      setV(target * p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [run, target, ms]);
  return v;
}

/**
 * A growing stack of captured-card chips — this becomes the score. `side`
 * tints it (you = gold, opponent = red). Newly added chips pop in. `strikes`
 * shows timeout-strike pips (0–2).
 */
export function CapturedPile({
  count,
  side,
  name,
  strikes = 0,
  align = "left",
}: {
  count: number;
  side: "you" | "opp";
  name: string;
  strikes?: number;
  align?: "left" | "right";
}) {
  const color = side === "you" ? "var(--gold)" : "#ff6a6a";
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="min-w-0">
        <div className={`flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
          <span className="font-display truncate text-sm font-semibold text-white">{name}</span>
          <span className="font-mono text-lg font-bold tabular-nums" style={{ color }}>
            {count}
          </span>
          {strikes > 0 && (
            <span className="flex items-center gap-0.5" title={`${strikes} / 2 timeout strikes`}>
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: i < strikes ? "#ff6a6a" : "rgba(255,255,255,0.18)" }}
                />
              ))}
            </span>
          )}
        </div>
        <div className={`mt-1 flex items-end ${align === "right" ? "flex-row-reverse" : ""}`}>
          {count === 0 && <span className="text-xs text-[var(--ink-dim)]/40">—</span>}
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={`h-6 w-4 rounded-[3px] border ${align === "right" ? "-mr-1.5 first:mr-0" : "-ml-1.5 first:ml-0"}`}
              style={{
                background: `linear-gradient(160deg, ${color}, #0a0f1f)`,
                borderColor: `${color}66`,
                animation: "cap-chip 360ms cubic-bezier(.2,.8,.2,1) both",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Big standing player photo beside its card on laptop/large screens (lg+),
 * hidden on phones/tablets. self-stretch → the box is exactly the card's height;
 * object-contain + max-h-full means the full cutout always fits (never cropped,
 * never spills past the card). object-bottom stands the player on the floor.
 * `show` fades it in (e.g. only once the opponent's card is revealed).
 */
export function BigPlayer({
  card,
  show,
  side,
}: {
  card: Card;
  show: boolean;
  side: "left" | "right";
}) {
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

/** Falling confetti for the win celebration. Render inside a relative/overflow-hidden parent. */
export function Confetti({ count = 16 }: { count?: number }) {
  const colors = ["var(--gold)", "#ff6a6a", "#3ddc84", "#ffffff"];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 h-2 w-2 rounded-sm"
          style={{
            left: `${(i * 6.1 + 4) % 100}%`,
            background: colors[i % 4],
            animation: `confetti-fall ${1700 + (i % 4) * 350}ms linear ${(i % 6) * 140}ms infinite`,
          }}
        />
      ))}
    </>
  );
}

export function BallStamp({ kind }: { kind: "capture" | "tie" | "timeout" }) {
  if (kind === "timeout") {
    return (
      <span className="animate-stamp inline-block rounded-md border-2 border-[#ff6a6a] px-3 py-1 font-display text-base font-black uppercase tracking-widest text-[#ff6a6a] shadow-[0_0_18px_rgba(255,106,106,0.5)]">
        ⏱ Time Up
      </span>
    );
  }
  if (kind === "tie") {
    return (
      <span className="animate-stamp inline-block rounded-md border-2 border-white/40 px-3 py-1 font-display text-sm font-black uppercase tracking-widest text-white/70">
        Tied
      </span>
    );
  }
  return (
    <span className="animate-stamp inline-block rounded-md border-2 border-[var(--gold)] px-3 py-1 font-display text-base font-black uppercase tracking-widest text-gold shadow-[0_0_18px_rgba(245,197,24,0.5)]">
      Captured!
    </span>
  );
}

/**
 * A one-shot gold lightning sweep for a Vizag card. Render inside a
 * position:relative card wrapper; give it a changing `key` to re-trigger.
 */
export function VizagStrike() {
  return (
    <span
      className="vizag-strike pointer-events-none absolute inset-0 z-20 rounded-2xl"
      aria-hidden
    />
  );
}

/** A radial firework burst, e.g. behind the trophy on a win. Position over a relative parent. */
export function WinSparks({ count = 14 }: { count?: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 80 + (i % 3) * 24;
        return (
          <span
            key={i}
            className="spark absolute h-1.5 w-1.5 rounded-full"
            style={
              {
                background: i % 2 ? "var(--gold)" : "#ffffff",
                boxShadow: "0 0 6px rgba(245,197,24,0.7)",
                "--dx": `${Math.cos(a) * r}px`,
                "--dy": `${Math.sin(a) * r}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
