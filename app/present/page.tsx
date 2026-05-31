"use client";

// Presenter screen — put this on the big screen. Everyone scans the one QR
// (the app URL) with their phone camera to join the lobby.

import { useEffect, useState } from "react";
import { QRShow } from "@/components/QRShow";

export default function Present() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  return (
    <main className="floodlight flex min-h-[100svh] w-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="font-display text-5xl font-bold tracking-tight text-white">
          IPL <span className="text-gold">2026</span> TRUMP CARDS
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.4em] text-[var(--ink-dim)]">
          Vizag Edition · Scan to Play
        </p>
      </div>

      {url ? (
        <QRShow payload={url} />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded-2xl bg-white/10" />
      )}

      <ol className="max-w-xs space-y-1.5 text-left text-sm text-[var(--ink-dim)]">
        <li>1. Scan the QR with your phone camera.</li>
        <li>2. Enter your name to join the lobby.</li>
        <li>3. Get auto-matched 1v1 and battle.</li>
      </ol>
    </main>
  );
}
