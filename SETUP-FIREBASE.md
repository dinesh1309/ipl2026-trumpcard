# Realtime Multiplayer — Dependency List & Setup

The online lobby + matchmaking + synced 1v1 layer is **built and wired**, but gated
behind config. Until the Firebase keys below are set, the app runs in **pass-and-play**
mode (no regression). Once set, the home screen shows **Play Online**.

## What's blocking go-live (the dependency list)

| # | Dependency | Who | Status |
|---|---|---|---|
| 1 | `firebase` npm package | — | ✅ installed (`firebase@12`) |
| 2 | A **Firebase project** | **You** (needs Google login) | ⛔ needed |
| 3 | A **Web App** in that project → config keys | **You** | ⛔ needed |
| 4 | **Cloud Firestore** enabled | **You** | ⛔ needed |
| 5 | Firestore **security rules** (open for the demo) | **You** | ⛔ needed |
| 6 | Env vars in `.env.local` (local) + Vercel (prod) | **You** paste, me wire | ⛔ needed |
| 7 | Realtime code (lib/firebase, lib/realtime, OnlineGame, /present) | me | ✅ done |
| 8 | Cross-device live test (two phones) | both | ⛔ after keys |

## Setup steps (~5 min, all in the Firebase console)

1. Go to https://console.firebase.google.com → **Add project** (e.g. `ipl2026-trumpcard`). Disable Analytics to keep it quick.
2. **Build → Firestore Database → Create database** → Start in **test mode** → pick a region (e.g. `asia-south1`, Mumbai).
3. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values.
4. Create `.env.local` in the project root (copy `.env.local.example`) and paste:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
5. Restart the dev server (`bun run dev`). The home screen now shows **Play Online**.
6. For production: add the same four vars in **Vercel → Project → Settings → Environment Variables**, then redeploy.

### Firestore rules for the demo (open — fine for a hackathon, NOT production)
Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Data model (already implemented)
- `players/{clientId}` — lobby roster: `{ name, status: waiting|matched, matchId }`
- `matches/{matchId}` — one 1v1 match: decks (16 card ids), round, scores, ready flags,
  current `pick`, resolved `outcome`, next flags, winner. **Player 1 is authoritative** —
  only the P1 client resolves rounds and advances (`reconcile()` in `lib/realtime.ts`).

## Flow
Scan QR (`/present`) → enter name → lobby (auto-matchmake, FIFO) → **Start Match**
ready-check (both) → synced 8-ball match → result → Back to Lobby (re-queue).

## ⚠ Not yet verified
The realtime path compiles and is logically complete but has **not been live-tested**
(no Firebase project yet). First two-phone run may surface sync edge cases
(matchmaking races, Next-ball handoff). Pass-and-play is the demo-safe fallback.
