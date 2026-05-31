"use client";

// OverTicker — the "this innings so far" strip: one bar per ball, coloured by
// who won it (gold = your side, blue = opponent, grey = tie), faded by phase
// for balls not yet played, with the current ball outlined + glowing.

import { phaseForRound } from "@/lib/engine";

const PHASE_COLOR: Record<string, string> = {
  powerplay: "#3ddc84",
  normal: "#9fb0d0",
  deathover: "#ff6a6a",
};

type Res = "p1" | "p2" | "tie";

export function OverTicker({
  results,
  current,
  total = 8,
  youAre = "p1",
}: {
  results: (Res | null)[];
  current: number;
  total?: number;
  youAre?: "p1" | "p2";
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const r = results[i] ?? null;
        const isCurrent = i === current;
        const phaseC = PHASE_COLOR[phaseForRound(i)];
        let bg = `${phaseC}22`; // unplayed: faint phase tint
        let glow = "none";
        if (r === "tie") {
          bg = "rgba(255,255,255,0.28)";
        } else if (r) {
          bg = r === youAre ? "var(--gold)" : "#5fa8ff";
          glow = `0 0 6px ${r === youAre ? "rgba(245,197,24,0.6)" : "rgba(95,168,255,0.6)"}`;
        }
        return (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: bg,
              boxShadow: isCurrent ? `0 0 8px ${phaseC}` : glow,
              outline: isCurrent ? `1.5px solid ${phaseC}` : "none",
              outlineOffset: "1px",
            }}
          />
        );
      })}
    </div>
  );
}
