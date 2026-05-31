# IPL Trump Cards — Vizag Edition
### Product Requirements Document (Hackathon Build)

**Status:** Draft for team review · **Format:** Mobile web app · **Build window:** ~2 hours
**Repo:** `ipl2026-trumpcard`

---

## 1. Concept

A modern take on the classic Top Trumps card game, built on **real cricket stats** and themed
around **IPL players with a Vizag Performance Bonus**. Two players go head-to-head: each round a
card is revealed, the attacker picks a stat to compete on, and the higher value captures the
opponent's card. A match flows through three phases that mirror a real cricket innings —
**Powerplay → Middle (Normal) → Death Over** — each phase changing which stats are worth the most.

The hook: the same card can win or lose the **same matchup** depending on the phase. A bowler is
dangerous at the death; a big-hitter dominates the powerplay. Your job is to read the phase and
play the right stat.

---

## 2. Hackathon Requirements (and how we meet them)

The problem statement asks for three things. Mapping:

| Requirement | Our implementation |
|---|---|
| **3-agent workflow** | Agent 1 (Stat Scraper) → card dataset · Agent 2 (Visual Design, Gemini) → card art · Agent 3 (Game Engine) → 1v1 runtime logic |
| **Mobile web app, 8 starter cards** | Next.js mobile-first web app. "8 starter cards" = each player's 8-card starter hand (16-card pool total) |
| **QR scanning** | Presenter displays **one QR (the app/lobby URL)**. Anyone scans it with their phone camera to open the app and join the live lobby |
| **Powerplay vs Death Over modes** | Built into every match as phases (rounds 1–3 Powerplay, 7–8 Death Over), plus a Normal middle phase |

---

## 3. Goals & Non-Goals

**Goals**
- A live **multiplayer** experience: scan one QR, enter a name, get auto-matched 1v1, play.
- A complete 1v1 match in **3–4 minutes**, played across **two real phones** in real time.
- Demonstrate a real 3-agent build pipeline.
- Both required modes (Powerplay, Death Over) visible in **every** match.
- Player agency: you choose which stat to attack on.
- Local/Vizag flavour that lands with a Vizag audience.

**Non-Goals (out of scope for the hackathon MVP)**
- Persistent accounts/passwords (a name-only lobby session is enough; no auth).
- Leaderboards / match history across sessions.
- Live stat scraping inside the app (Agent 1 runs at build time).
- Animations/sound beyond basic transitions.
- More than 16 cards.
- Reconnect-after-disconnect, anti-cheat, spectators (demo assumes a cooperative room).

---

## 4. The 3-Agent Architecture

The agents split by **when they run**, which de-risks the live demo:

| Agent | Role | Runs at | Output |
|---|---|---|---|
| **Agent 1 — Stat Scraper** | Stats already pulled into `batting.json` + `bowling.json` (IPL 2026, 150 batters / 100 bowlers). Agent 1 now **cleans the whole dataset, joins batting+bowling per player, zero-fills missing sides, and flags the single Andhra anchor card** (random 16-card selection happens per match at runtime — §5.2) | Build time | `lib/cards.ts` (full cleaned card pool from the two JSON files) |
| **Agent 2 — Visual Design (Gemini)** | Generate the card art / face for each player | Build time | Card images **or** generative SVG/CSS faces |
| **Agent 3 — Game Engine** | Deal, phase logic, stat-pick + boost, compare, capture, win condition | Runtime | `lib/engine.ts` + UI |

> Agents 1 & 2 produce the **deck** before the demo (shown as proof of pipeline). Agent 3 is the
> game judges actually watch run. Agent 2 ships via **Gemini** if an API key is available; otherwise
> via **generative SVG/CSS card faces** (no external dependency, demo-safe).
>
> **Update (post data-drop):** the raw stats are now provided by the team as `batting.json` and
> `bowling.json`. Agent 1's job shifts from *scraping* to **selecting + cleaning + joining** — see
> §5.3 for the data-quality issues that must be fixed first.

---

## 5. Card Model & Roster

### 5.1 Data shape (Agent 1 output)
Each card carries **real IPL 2026 season stats** (for authenticity and display) plus metadata:

```
id, name, team (franchise), role, vizag (bool), accent (colour)
batting:  { runs, average, strikeRate, fours, sixes }      // batting.json → Runs, Ave, SR, 4s, 6s
bowling:  { wickets, economy, average, strikeRate }        // bowling.json → Wkts, Econ, Ave, SR
```

Notes:
- Source is **IPL 2026 season** stats (`Span: 2026-2026`), **not career** — update any "career" wording.
- The data has **no dot-ball field**; the PRD's earlier `dotBallPct` is **dropped** and replaced with
  bowling **Average** / **Strike Rate**. The Death-Over boost now applies to `wickets`, `economy`,
  `bowling.average`, `bowling.strikeRate`.
- Pure batsmen have zero/empty bowling stats and pure bowlers weak batting stats — legal to play,
  just sub-optimal out of phase (by design).

### 5.2 Roster — randomly selected per match (no fixed/curated 16)
**Decision:** there is **no hand-picked roster**. Each match, the system **randomly selects 16 cards**
from the dataset and deals 8/8. Two hard rules on the selection:

1. **The Andhra anchor card is ALWAYS included** — `K Nitish Kumar Reddy (SRH)` is force-added to
   every match. It is the **only Vizag-flagged card** (carries the +10% Vizag bonus). This guarantees
   the Vizag theme appears in every game and resolves the earlier "only one Andhra star" problem —
   we lean into it: one special card, always present.
2. The other **15 are picked at random** from the dataset, then shuffled with the anchor and dealt.

```
selectMatchDeck():
  deck = [ ANCHOR ]                       // Nitish Kumar Reddy, vizag = true
  pool = allPlayers − ANCHOR
  deck += randomSample(pool, 15)
  shuffle(deck); deal 8 / 8
```

- **Recognisability guard (recommended):** draw the random 15 from a **sensible pool** — e.g. players
  with enough matches/innings to have real stats — so a game isn't full of unknown names. Tunable;
  default can be "top ~60 by matches" rather than all 250.
- Selection happens once per match on the **authoritative client** (Player 1) and is written to the
  match record so both phones see the identical 16. (No shared seed needed — the backend stores the
  actual chosen cards.)

### 5.3 Data Source & Cleaning (Agent 1 must fix before building cards)
Raw files: `batting.json` (150 rows) + `bowling.json` (100 rows), IPL 2026 season. Issues found in review:

| Issue | Where | Fix |
|---|---|---|
| **`BBI` is corrupted into dates** (`"5/20"` → `"2025-03-01 00:00:00"` — spreadsheet auto-format bug) | bowling.json, all rows | We don't use BBI on cards → **ignore the field**. Don't try to parse it. |
| **Junk average** `"Ave": "battein"` | batting.json, Ishan Kishan | Recompute `Ave = Runs / (Inns − NO)` or drop the player |
| **`"Ave": "-"`** (no average) | 14 batting rows (low-innings/not-out players) | Coerce to `0` or recompute; none are in the proposed 16 |
| **`HS` has asterisks** (`"105*"`) → strings | 57 batting rows | Strip `*`, parse int. (HS isn't used on cards — low priority) |
| **Names carry franchise tags + initials** (`V Kohli (RCB)`) and differ between files | both | Normalise a **join key** (strip `(TEAM)`, match on surname) to merge batting+bowling for all-rounders |

> Because selection is **random** (§5.2), Agent 1 must clean the **whole dataset**, not just 16 rows —
> every selectable card needs valid numbers. Also: **every card needs both a batting and a bowling
> block** (default missing stats to `0`) so any card is legal to play in any phase. **61 players appear
> in both files** (all-rounders); the rest get zero-filled on their missing side.

---

## 6. Game Design & Rules

### 6.1 Setup / deal
- On match start, the authoritative client **randomly selects 16 cards** from the dataset (always
  including the Andhra anchor — see §5.2), shuffles, and deals **8 to each player**.
- Players **cannot choose cards or order** — the system fixes the deck. (Removes pick-the-best-card
  cheese; keeps it fair.)
- The chosen 16 + the deal are written to the **match record** so both phones see the identical match
  (no shared seed needed — the backend stores the actual cards).

### 6.2 Phase structure (8 rounds, fixed)
| Rounds | Phase | Effect |
|---|---|---|
| 1–3 | **Powerplay** | Batting stats ×1.25 |
| 4–6 | **Normal** | No boost — raw stats |
| 7–8 | **Death Over** | Bowling stats ×1.25 |

The boost is a **multiplier, not a cage** — you may attack on **any** stat in any phase. A bowler in
Powerplay can still play *Wickets* (unboosted) and win. No card is ever dead weight; the phase just
shifts which stat is *optimal*.

### 6.3 Round flow
1. **Attacker** (alternates: rounds 1,3,5,7 → Player 1; rounds 2,4,6,8 → Player 2) sees their
   top card. Opponent's top card stays **hidden**.
2. Attacker **picks one stat** from their card. The phase boost applies to in-phase stats.
3. Opponent's top card **reveals**; the same stat is compared (with its boost / bonus applied).
4. **Higher value wins** the round and **captures** the opponent's card into a won-pile.
   (For *Economy*, **lower wins**.)
5. Repeat for 8 rounds.

### 6.4 Vizag Performance Bonus
If a card is a Vizag/Andhra carrier, its compared value gets a **+10% favourable adjustment**
(for "lower-wins" stats like Economy, that's −10%). Shown on screen when applied.

### 6.5 Win condition
- **Most cards captured after 8 rounds wins.**
- Tie → one **sudden-death** ball (Normal phase, attacker = Player 1).

### 6.6 Edge cases
- **Tie on the chosen stat** → engine auto re-prompts the attacker / re-picks (no capture on a tie).
- **Economy / lower-is-better** stats handled explicitly in the compare.
- Cards with no bowling profile (pure batsmen) have 0s in bowling stats — still legal to attack with,
  just weak; the phase boost and hidden-opponent gamble keep it interesting.

---

## 7. User Flow & Multiplayer Model

This is now **live multiplayer** (no pass-and-play). One QR on the presenter's screen → many phones
join a lobby → the system auto-pairs them 1v1 → each pair plays on their two phones in real time.

### 7.1 Screen flow
```
PRESENTER (big screen)
 - Shows ONE QR = the app/lobby URL  (generated once; static for the session)

PLAYER PHONE
 SCAN  (native camera) → opens app URL
   │
   ▼
 ENTER NAME  → joins the live lobby ("roster")
   │
   ▼
 LOBBY / WAITING  ("Hi <name>, finding you an opponent…")
   - Shows roster of joined players + who's matched
   - "How to Play" rules panel visible here (read while waiting) — see §7.4
   - System AUTO-MATCHES the next two unpaired players
   │
   ▼
 MATCHED  ("Matched vs <opponent>")
   - Each player sees a [ Start Match ] button (ready-check)
   - Match begins only when BOTH have tapped Start (neither gets thrown in mid-read)
   - "Waiting for <opponent> to be ready…" until both ready
   │
   ▼
 MATCH  (8 rounds, synced across the two phones)
   - Phase banner (Powerplay / Normal / Death Over) + Ball n/8 + running capture score
   - On YOUR attacking turn: your card shown, opponent's hidden → tap a stat
   - On opponent's turn: "Waiting for <opponent> to play…" then both reveal
   - Compare → capture result + Vizag-bonus callout → next ball
   │
   ▼
 RESULT  - Winner + final capture count → "Back to Lobby" (re-queue for a new opponent)
```

### 7.2 Matchmaking rules (MVP, keep simple)
- Players are paired **in join order** (FIFO): as soon as two unpaired players are waiting, match them.
- **Odd player out** waits on a "waiting for next player…" screen until someone joins.
- On match, each player gets a **[ Start Match ]** button. The match starts only when **both** tap it
  (ready-check) — so nobody is dropped into a round while still reading the rules.
- If a matched player doesn't ready-up, the other sees "waiting for opponent to be ready." (No timeout
  in MVP; keep it cooperative.)
- After a match, both players return to the lobby and can **re-queue** for a fresh opponent.
- No opponent selection, no rematch-same-person logic, no skill matching — auto only.

### 7.3 What this requires: a backend (the big change)
Two real phones making live picks **cannot** stay in sync from a seed alone — picks are live inputs.
We need shared real-time state for: the **lobby roster**, **matchmaking**, and **per-match state**.

- **Recommended:** **Firebase (Firestore + realtime listeners)** or **Supabase Realtime** — no custom
  server, clients subscribe to a room/match document. Fastest path for the window.
- **Authority:** to avoid divergence, **Player 1's client is authoritative** for its match — it
  resolves each round and writes the result; Player 2 subscribes and reflects it. (No cloud function
  needed.) Agent 3's engine logic runs there.
- The QR is now just the **app URL** — players scan with their **native camera**, so the in-app
  `html5-qrcode` scanner is **no longer needed** (we only generate a QR for the presenter screen).

> ⚠ **Scope flag:** live lobby + matchmaking + synced 1v1 is a real step up from pass-and-play and is
> **at the edge of a 2-hour build**. Strong recommendation: **keep pass-and-play as a hidden fallback**
> so there's always something demoable if the realtime layer isn't stable in time. See §11/§12.

### 7.4 "How to Play" panel (shown in the lobby/waiting area)
Final in-app copy — kept short enough to read while waiting for a match:

> **How to Play — IPL Trump Cards**
> 1. You're dealt **8 cricket cards**. You can't reorder them — the system decides the order.
> 2. A match is **8 balls (rounds)** through three phases:
>    - **Balls 1–3 — Powerplay:** batting stats get a **×1.25** boost.
>    - **Balls 4–6 — Normal:** no boost, raw stats.
>    - **Balls 7–8 — Death Over:** bowling stats get a **×1.25** boost.
> 3. Each ball, one player **attacks** (turns alternate). The attacker picks **one stat** from their
>    top card. Your opponent's card stays hidden until you lock your pick.
> 4. **Higher value wins** the ball — except **Economy**, where **lower wins**. The winner **captures**
>    the opponent's card.
> 5. **Vizag players** get a **+10%** bonus on their stat. Watch for the ⚡ badge.
> 6. **Most cards captured after 8 balls wins.** Tie → one sudden-death ball.

> This copy lives in a collapsible "How to Play" panel in the lobby and is reachable from the match
> screen via a small "?" so players can re-check rules mid-game.

---

## 8. Feature Breakdown / Build Tasks

| Area | Task | Owner (agent) |
|---|---|---|
| **Data** | 16-card dataset from `batting.json`+`bowling.json` (clean + join + Vizag flags) | Agent 1 |
| **Art** | Card face per player (Gemini art or generative SVG/CSS) | Agent 2 |
| **Engine** | Seeded deal → 8/8 hands | Agent 3 |
| **Engine** | Phase map by round index (PP / Normal / DO) | Agent 3 |
| **Engine** | Attacker rotation + stat pick + phase boost + Vizag bonus | Agent 3 |
| **Engine** | Compare (incl. lower-wins), capture, win condition, tie handling | Agent 3 |
| **Backend** | Firebase/Supabase project + schema (lobby, players, matches) | Backend |
| **Backend** | Lobby join (name entry → roster), realtime roster subscription | Backend |
| **Backend** | Auto-matchmaking (FIFO pairing, odd-one waits, re-queue) | Backend |
| **Backend** | Ready-check sync: match starts only when both tap Start Match | Backend |
| **Backend** | Per-match state sync (P1-authoritative round resolution) | Backend |
| **UI** | Name entry → Lobby/Waiting → Matched → Match → Result screens | Frontend |
| **UI** | "How to Play" rules panel in lobby (+ "?" recap on match screen) | Frontend |
| **UI** | "Matched vs X" + **Start Match** ready-check button & waiting state | Frontend |
| **UI** | Card component (stats grid, highlighted stat, Vizag badge) | Frontend |
| **UI** | Phase banner, round counter, running score, "waiting for opponent" states | Frontend |
| **UI** | "Your turn / opponent's turn" handoff during a round | Frontend |
| **QR** | Generate the single presenter QR (app/lobby URL) | Frontend |
| **Polish** | Mobile-first layout, reveal transition | Frontend |
| **Ship** | Deploy to Vercel + connect backend, test across two phones | DevOps |
| **Safety net** | Keep a local pass-and-play mode as fallback | Frontend |

> Dropped vs previous PRD: the in-app **QR scanner** (`html5-qrcode`) — players use native camera.

---

## 9. Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, mobile-first
- **Runtime/PM:** bun
- **Realtime backend:** **Firebase (Firestore + realtime listeners)** — *chosen.* Lobby, matchmaking,
  ready-check, and per-match state sync. No custom server; no auth (name-only session).
- **QR:** `qrcode` (generate the presenter URL QR only). In-app scanner removed — native camera scans.
- **Card art:** Gemini (if key available) or generative SVG/CSS
- **Hosting:** Vercel (HTTPS) + the Firebase/Supabase project

---

## 10. Demo Script (60 sec)

1. "Top Trumps for cricket — a 3-agent build." Show the deck (Agents 1 & 2 output).
2. Put the **QR on screen** — two volunteers scan, enter names, land in the lobby (rules visible).
3. System **auto-matches** them 1v1 → both tap **Start Match** → match begins on both phones.
4. Round 1 (Powerplay): attacker plays a batsman's Sixes — boosted, capture.
5. Round 7 (Death Over): a bowler flips an earlier loss — phase changes the result.
6. The **Andhra anchor card** appears (always in the deck) → show the ⚡ +10% Vizag bonus.
7. Final capture count → winner → both return to lobby to re-queue.

---

## 11. Open Decisions / Stretch Goals

| Item | Status |
|---|---|
| **Backend choice** | ✅ **RESOLVED — Firebase** (Firestore + realtime listeners). |
| **Realtime multiplayer** | ✅ **RESOLVED — primary scope.** Lobby + matchmaking + ready-check + synced 1v1. The biggest build item and main schedule risk. |
| **Pass-and-play** | ✅ **RESOLVED — fallback only**, not the primary flow. Build it first so there's always a demo if realtime slips. |
| **Vizag bonus carriers** | ✅ **RESOLVED — one Andhra anchor card (Nitish Reddy) always present**, the only Vizag-flagged card (+10%). Random selection fills the other 15 (§5.2). |
| **Roster** | ✅ **RESOLVED — random per match**, no curated/fixed 16, no manual name swaps. |
| **Card stat schema** | ✅ Settled — `dotBallPct` dropped; bowling = Wkts/Econ/Ave/SR. `lib/cards.ts` placeholder must be rebuilt from the JSON pool. |
| **Data cleaning** | Open task (not a decision) — fix junk `Ave`, ignore corrupted `BBI`, normalise the name join key, zero-fill missing stat side (§5.3). |
| **Agent 2 art: Gemini vs SVG/CSS** | Pending — depends on a Gemini key; SVG/CSS fallback otherwise. |
| **Recognisability pool** | Minor — draw the random 15 from "top ~60 by matches" vs all 250 (§5.2). Default to the curated pool; tweakable. |
| Sudden-death tie rule | Confirmed: 1 Normal-phase ball, P1 attacks. |
| Sound / animation polish | Stretch if time remains. |

---

## 12. Build Timeline (~2 hrs)

**Now parallelised across the team** — realtime multiplayer makes a strictly-serial 2-hour plan tight.
Recommend two tracks running concurrently:

| Time | Track A (game) | Track B (backend/multiplayer) |
|---|---|---|
| 0:00–0:20 | Agent 1: 16-card dataset from JSON · Agent 2: card faces | Stand up Firebase project + schema (lobby, players, matches) |
| 0:20–1:00 | Agent 3 engine + Card/Play UI (works in pass-and-play first) | Lobby join + name entry + realtime roster |
| 1:00–1:30 | Wire engine into the synced match (P1-authoritative) | Auto-matchmaking (FIFO) + per-match state sync |
| 1:30–1:50 | Presenter QR + result/re-queue screens | Cross-phone testing, fix sync races |
| 1:50–2:00 | Deploy to Vercel, rehearse demo | — |

> **Critical-path risk:** the synced match (Track A+B merge at ~1:00) is where it can slip. Mitigation:
> build the game **pass-and-play-first** so it's fully playable even if realtime sync isn't finished —
> that's the demo fallback. Lobby/matchmaking can demo independently of a perfectly-synced match.
