"use client";

// Initialises PostHog once in the browser. Mounted from the root layout.
// Page views are captured automatically; custom events go through lib/analytics.
// No-ops cleanly if NEXT_PUBLIC_POSTHOG_KEY isn't set (e.g. local without env).
import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      defaults: "2025-05-24",
    });
  }, []);
  return null;
}
