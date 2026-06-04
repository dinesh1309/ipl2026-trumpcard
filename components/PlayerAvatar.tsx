"use client";

// PlayerAvatar — the player's official headshot (transparent cutout) for the
// card header. Falls back to initials if the image is missing or fails to load.
// Photos live in public/players/<card.id>.png (head-and-shoulders, ~256px).

import { useState } from "react";
import type { Card } from "@/lib/cards";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PlayerAvatar({
  card,
  className = "h-14 w-14",
}: {
  card: Card;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/20 ${className}`}
      style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/players/${card.id}.png`}
          alt={card.name}
          onError={() => setFailed(true)}
          draggable={false}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className="font-display flex h-full w-full items-center justify-center text-lg font-bold tracking-wide text-white">
          {initials(card.name)}
        </span>
      )}
    </div>
  );
}
