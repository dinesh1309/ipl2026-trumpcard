"use client";

import type { CSSProperties } from "react";

// Shared match visual effects: the ball-result stamp and the Vizag lightning sweep.

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
