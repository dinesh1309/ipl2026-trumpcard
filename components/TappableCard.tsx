"use client";

// TappableCard — the attacker's card with each stat row as a tap target.
// Mirrors CardFace's foil styling but the rows are buttons that pick the stat.
// Shared by the pass-and-play and online match screens.

import { Card } from "@/lib/cards";
import { STATS, effectiveValue, isMissing, type Phase, type StatDef } from "@/lib/engine";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function TappableCard({
  card,
  phase,
  onPick,
  hideAvatarLg = false,
}: {
  card: Card;
  phase: Phase;
  onPick: (stat: StatDef) => void;
  hideAvatarLg?: boolean; // hide the header thumbnail on lg+ (big photo shows instead)
}) {
  const accent = card.accent;
  const battingStats = STATS.filter((s) => s.group === "batting");
  const bowlingStats = STATS.filter((s) => s.group === "bowling");
  const phaseBoostsBatting = phase === "powerplay";
  const phaseBoostsBowling = phase === "deathover";

  return (
    <div
      className="animate-reveal relative w-full overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-[0_28px_70px_-26px_rgba(0,0,0,0.85)]"
      style={{
        background: `linear-gradient(158deg, ${accent} -12%, #0b1024 58%, #070b18 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.16), transparent)" }}
      />

      {card.vizag && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#161003] shadow-[0_4px_14px_-2px_rgba(245,197,24,0.6)]">
          <span aria-hidden>⚡</span>
          <span>Vizag</span>
        </div>
      )}

      <div className="relative flex items-center gap-3 px-4 pt-4">
        <PlayerAvatar card={card} className={hideAvatarLg ? "h-14 w-14 lg:hidden" : "h-14 w-14"} />
        <div className="min-w-0">
          <h3 className="font-display truncate text-xl font-bold leading-tight text-white">
            {card.name}
          </h3>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--ink-dim)]">
            {card.team} · {card.role}
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-3">
        <TapGroup
          title="Batting"
          boosted={phaseBoostsBatting}
          stats={battingStats}
          card={card}
          phase={phase}
          onPick={onPick}
        />
        <TapGroup
          title="Bowling"
          boosted={phaseBoostsBowling}
          stats={bowlingStats}
          card={card}
          phase={phase}
          onPick={onPick}
          className="mt-3"
        />
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-2">
        <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-[var(--ink-dim)]">
          IPL 2026
        </span>
        <span className="text-[9px] uppercase tracking-[0.25em] text-gold">Tap a stat ↑</span>
      </div>
    </div>
  );
}

function TapGroup({
  title,
  boosted,
  stats,
  card,
  phase,
  onPick,
  className = "",
}: {
  title: string;
  boosted: boolean;
  stats: StatDef[];
  card: Card;
  phase: Phase;
  onPick: (stat: StatDef) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
          {title}
        </span>
        {boosted && (
          <span className="text-gold rounded bg-[var(--gold)]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
            +25%
          </span>
        )}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map((s) => {
          if (isMissing(card, s)) {
            return (
              <div
                key={s.key}
                aria-disabled
                title="Did not bowl"
                className="stat-row cursor-not-allowed opacity-35"
              >
                <span className="stat-row__label">{s.label}</span>
                <span className="stat-row__value">—</span>
              </div>
            );
          }
          const raw = s.get(card);
          const eff = effectiveValue(card, s, phase);
          const lifted = round1(eff) !== round1(raw);
          return (
            <button
              key={s.key}
              onClick={() => onPick(s)}
              className="stat-row text-left transition hover:bg-[var(--gold)]/15 hover:ring-1 hover:ring-[var(--gold)]/40 active:scale-[0.97]"
            >
              <span className="stat-row__label">{s.label}</span>
              <span className="stat-row__value flex items-center gap-1">
                {lifted && <span className="text-gold text-[8px]">▲</span>}
                {fmt(round1(eff))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
