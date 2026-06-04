"use client";

import { Card } from "@/lib/cards";
import { STATS, isMissing } from "@/lib/engine";
import { PlayerAvatar } from "@/components/PlayerAvatar";

/** Average the channels of a hex colour to decide black/white text on chips. */
function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  const n =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16))
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  const [r, g, b] = n;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

const battingStats = STATS.filter((s) => s.group === "batting");
const bowlingStats = STATS.filter((s) => s.group === "bowling");

/** Format a number for display: one decimal when fractional, else integer. */
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function CardFace({
  card,
  highlightStatKey,
  shownValue,
  revealed = true,
  size = "full",
  fill = false,
  hideAvatarLg = false,
}: {
  card: Card;
  highlightStatKey?: string;
  shownValue?: number;
  revealed?: boolean;
  size?: "full" | "mini";
  fill?: boolean; // stretch to the parent's height instead of using a fixed aspect
  hideAvatarLg?: boolean; // hide the header thumbnail on lg+ (big photo shows instead)
}) {
  const accent = card.accent;
  const chipDark = !isLight(accent);

  // ---- Face-down: premium foil "IPL 2026" card back ----
  if (!revealed) {
    return (
      <div
        className={`relative w-full select-none overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] ${
          fill ? "h-full min-h-full" : size === "mini" ? "aspect-[3/4]" : "aspect-[3/4.35]"
        }`}
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #16204a 0%, #0a0f24 55%, #05070f 100%)",
        }}
      >
        {/* foil sheen sweep */}
        <div className="foil-sheen animate-sheen pointer-events-none absolute inset-0" />
        {/* hairline frame */}
        <div className="absolute inset-2 rounded-xl ring-1 ring-white/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <span
            className="font-display text-gold text-[11px] font-semibold tracking-[0.45em]"
            style={{ marginLeft: "0.45em" }}
          >
            IPL
          </span>
          <span className="font-display text-4xl font-bold leading-none tracking-wide text-white/95">
            2026
          </span>
          <span className="mt-1 h-px w-10 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
          <span className="text-[9px] uppercase tracking-[0.32em] text-[var(--ink-dim)]">
            Trump Cards
          </span>
        </div>
      </div>
    );
  }

  // ---- Mini face: compact chip for decks / queues ----
  if (size === "mini") {
    return (
      <div
        className="relative overflow-hidden rounded-xl px-3 py-2 ring-1 ring-white/10 shadow-lg"
        style={{
          background: `linear-gradient(140deg, ${accent} -10%, #0a0f1f 80%)`,
        }}
      >
        {card.vizag && (
          <span className="absolute right-1.5 top-1.5 text-[10px] text-gold">⚡</span>
        )}
        <div className="font-display text-sm font-semibold leading-tight text-white">
          {card.name}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-white/60">
          {card.team} · {card.role}
        </div>
      </div>
    );
  }

  // ---- Full premium foil card ----
  return (
    <div
      className="animate-reveal relative w-full overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-[0_28px_70px_-26px_rgba(0,0,0,0.85)]"
      style={{
        background: `linear-gradient(158deg, ${accent} -12%, #0b1024 58%, #070b18 100%)`,
      }}
    >
      {/* glossy top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16), transparent)",
        }}
      />

      {/* Vizag gold badge */}
      {card.vizag && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#161003] shadow-[0_4px_14px_-2px_rgba(245,197,24,0.6)]">
          <span aria-hidden>⚡</span>
          <span>Vizag</span>
        </div>
      )}

      {/* Header: headshot + name + role */}
      <div className="relative flex items-center gap-3 px-4 pt-4">
        <PlayerAvatar card={card} className={hideAvatarLg ? "h-14 w-14 lg:hidden" : "h-14 w-14"} />
        <div className="min-w-0">
          <h3 className="font-display truncate text-xl font-bold leading-tight text-white">
            {card.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/15"
              style={{
                background: accent,
                color: chipDark ? "#fff" : "#0a0f1f",
              }}
            >
              {card.team}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-[var(--ink-dim)]">
              {card.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stat grid: batting + bowling, highlighted stat glows gold */}
      <div className="relative px-4 pb-4 pt-3">
        <StatGroup
          title="Batting"
          stats={battingStats}
          card={card}
          highlightStatKey={highlightStatKey}
          shownValue={shownValue}
        />
        <StatGroup
          title="Bowling"
          stats={bowlingStats}
          card={card}
          highlightStatKey={highlightStatKey}
          shownValue={shownValue}
          className="mt-3"
        />
      </div>

      {/* foil footer branding */}
      <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-2">
        <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-[var(--ink-dim)]">
          IPL 2026
        </span>
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/30">
          Trump Card
        </span>
      </div>
    </div>
  );
}

function StatGroup({
  title,
  stats,
  card,
  highlightStatKey,
  shownValue,
  className = "",
}: {
  title: string;
  stats: typeof STATS;
  card: Card;
  highlightStatKey?: string;
  shownValue?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
          {title}
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map((s) => {
          const hi = highlightStatKey === s.key;
          const raw = s.get(card);
          const missing = isMissing(card, s); // did not bowl → show "—", never a value
          const value = hi && shownValue !== undefined ? shownValue : raw;
          return (
            <div
              key={s.key}
              className={`stat-row ${hi ? "stat-row--hi" : ""} ${
                missing ? "opacity-45" : ""
              }`}
            >
              <span className="stat-row__label">{s.label}</span>
              <span className="stat-row__value">{missing ? "—" : fmt(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
