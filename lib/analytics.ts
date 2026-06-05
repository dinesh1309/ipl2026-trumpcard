"use client";

// One place to fire a custom event. It fans out to both backends:
//   - Vercel Analytics (page views are free; custom events need Pro, so these
//     are effectively no-ops on the Hobby plan but harmless to keep).
//   - PostHog (free tier, 1M events/month) — this is where game_started /
//     game_finished actually land and show up in dashboards.
import { track as vercelTrack } from "@vercel/analytics";
import posthog from "posthog-js";

type Props = Record<string, string | number | boolean | null>;

export function track(event: string, props?: Props) {
  vercelTrack(event, props);
  // Guard: only capture once PostHog has initialised in the browser.
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(event, props);
  }
}
