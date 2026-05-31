"use client";

// NameEntry — Screen 1 of the IPL 2026 Trump Cards pass-and-play flow.
// Two players enter their names on a single shared phone.

import { useState } from "react";

export function NameEntry({
  initialP1 = "",
  initialP2 = "",
  onContinue,
}: {
  initialP1?: string;
  initialP2?: string;
  onContinue: (p1: string, p2: string) => void;
}) {
  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState(initialP2);

  const trimmed1 = p1.trim();
  const trimmed2 = p2.trim();
  const ready = trimmed1.length > 0 && trimmed2.length > 0;

  function submit() {
    if (!ready) return;
    onContinue(trimmed1, trimmed2);
  }

  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Title block */}
        <div className="mb-9 text-center">
          <span className="font-display text-gold inline-block rounded-full border border-[var(--hair)] bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em]">
            IPL 2026
          </span>
          <h1 className="font-display mt-5 text-[2.65rem] font-bold leading-[0.95] tracking-tight text-white">
            TRUMP
            <br />
            <span className="text-gold">CARDS</span>
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.32em] text-[var(--ink-dim)]">
            Vizag Edition
          </p>
          <span className="mx-auto mt-4 block h-px w-16 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <PlayerInput
            label="Player 1"
            badge="P1"
            value={p1}
            onChange={setP1}
            placeholder="Enter name"
            autoFocus
          />
          <PlayerInput
            label="Player 2"
            badge="P2"
            value={p2}
            onChange={setP2}
            placeholder="Enter name"
            onEnter={submit}
          />
        </div>

        <button
          onClick={submit}
          disabled={!ready}
          className="font-display mt-8 w-full rounded-2xl bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] py-4 text-base font-bold uppercase tracking-widest text-[#161003] shadow-[0_12px_30px_-10px_rgba(245,197,24,0.6)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
        >
          Continue
        </button>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--ink-dim)]/70">
          Pass &amp; Play · One Phone · Two Players
        </p>
      </div>
    </section>
  );
}

function PlayerInput({
  label,
  badge,
  value,
  onChange,
  placeholder,
  autoFocus,
  onEnter,
}: {
  label: string;
  badge: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--ink-dim)]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--hair)] bg-black/40 px-4 py-3 transition focus-within:border-[var(--gold)]/60 focus-within:bg-black/55">
        <span className="font-display text-gold flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/12 text-xs font-bold tracking-wide ring-1 ring-[var(--gold)]/25">
          {badge}
        </span>
        <input
          value={value}
          autoFocus={autoFocus}
          maxLength={18}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter();
          }}
          placeholder={placeholder}
          className="font-display w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--ink-dim)]/50"
        />
      </div>
    </label>
  );
}
