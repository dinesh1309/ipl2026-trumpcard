export const meta = {
  name: 'ipl-trumpcards-build',
  description: 'Build a beautiful pass-and-play IPL 2026 Trump Cards game (data + engine + design + app) in parallel, then verify the production build',
  phases: [
    { title: 'Foundations', detail: 'parallel: data pool, game engine, visual design system' },
    { title: 'Integration', detail: 'wire the full screen flow into a beautiful app' },
    { title: 'Verify', detail: 'production build + fix TypeScript/runtime errors' },
  ],
}

const ROOT = '/Users/pvd/Documents/Coding/ipl2026-trumpcard'

const CONTRACT = `
SHARED INTERFACE CONTRACT — every file MUST conform to this EXACTLY so the parts compile together.

THEME: This is the IPL 2026 season. Brand everything as "IPL 2026". Stats are IPL 2026 season stats. Use "IPL 2026" in titles, headers, and the card-back/foil branding.

Project: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, bun.
Project root: ${ROOT}. Use ABSOLUTE paths when writing. Import alias '@/...' maps to project root.
If a file already exists, READ it first, then overwrite with Write. Do NOT run 'bun install' or any build — the Verify phase does that. Only write YOUR files. Randomness/shuffling in the generated APP code is fine (use the JS runtime random generator); this restriction is only on workflow scripts, not on the code you write.

// ---- lib/cards.ts (OWNED BY DATA AGENT; everyone else imports the type from '@/lib/cards') ----
export type Role = 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';
export interface Card {
  id: string;          // kebab slug
  name: string;        // clean display name, NO '(TEAM)' suffix
  team: string;        // franchise code, e.g. 'RCB','GT','SRH','MI','DC','LSG','PBKS','KKR','RR','CSK'
  role: Role;
  vizag: boolean;      // TRUE only for the anchor (Nitish Kumar Reddy)
  accent: string;      // hex colour used by the card face, pick from the team colour
  batting: { runs: number; average: number; strikeRate: number; fours: number; sixes: number };
  bowling: { wickets: number; economy: number; average: number; strikeRate: number };
}
export const ANCHOR_ID = 'nitish-reddy';
export const CARD_POOL: Card[]; // cleaned pool (~40-60 cards), MUST contain the anchor with vizag:true

// ---- lib/engine.ts (OWNED BY ENGINE AGENT) ----
import type { Card } from '@/lib/cards';
export type Phase = 'powerplay' | 'normal' | 'deathover';
export interface StatDef { key: string; label: string; group: 'batting' | 'bowling'; lowerWins: boolean; get: (c: Card) => number }
export const STATS: StatDef[];          // 5 batting + 4 bowling = 9
export const TOTAL_ROUNDS = 8;
export const PHASE_BOOST = 0.25;        // 25%
export const VIZAG_BONUS = 0.10;        // 10%
export function phaseForRound(roundIndex: number): Phase;   // 0-2 powerplay, 3-5 normal, 6-7 deathover
export function selectMatchDeck(pool?: Card[]): Card[];     // 16 cards incl anchor, shuffled. first 8 = Player 1, next 8 = Player 2
export function effectiveValue(card: Card, stat: StatDef, phase: Phase): number;
export interface RoundOutcome { attackerValue: number; defenderValue: number; winner: 'attacker' | 'defender' | 'tie' }
export function resolveRound(attacker: Card, defender: Card, stat: StatDef, phase: Phase): RoundOutcome;

STATS must be exactly:
  batting (higher wins, lowerWins:false): runs 'Runs', average 'Bat Avg', strikeRate 'Strike Rate', fours 'Fours', sixes 'Sixes'
  bowling: wickets 'Wickets' (lowerWins:false), economy 'Economy' (lowerWins:true), average 'Bowl Avg' (lowerWins:true), strikeRate 'Bowl SR' (lowerWins:true)
effectiveValue rules (boosts must ALWAYS be advantageous):
  let v = stat.get(card)
  inPhase = (phase==='powerplay' && group==='batting') || (phase==='deathover' && group==='bowling')
  boostFactor = inPhase ? (lowerWins ? 1-PHASE_BOOST : 1+PHASE_BOOST) : 1
  vizagFactor = card.vizag ? (lowerWins ? 1-VIZAG_BONUS : 1+VIZAG_BONUS) : 1
  return v * boostFactor * vizagFactor
resolveRound: a=effectiveValue(attacker), d=effectiveValue(defender); tie if a===d; else for lowerWins the smaller wins, otherwise the larger wins. Round displayed values to 1 decimal.
`

phase('Foundations')

const foundations = await parallel([
  () => agent(
    `You are the DATA agent. Read ${ROOT}/batting.json (150 rows) and ${ROOT}/bowling.json (100 rows) — IPL 2026 season stats.
Write ${ROOT}/lib/cards.ts that builds CARD_POOL by CLEANING and JOINING this real data at module load (do NOT hand-transcribe players — import the JSON and transform it in code).

Steps in the code:
1. Copy the two JSON files into ${ROOT}/lib/data/ (use Bash: mkdir -p lib/data && cp batting.json bowling.json lib/data/), then import them with: import batting from './data/batting.json'; import bowling from './data/bowling.json';  (tsconfig already has resolveJsonModule).
2. Normalise a join key: strip the ' (TEAM)' suffix and trim. Extract the team code from inside the parens for the 'team' field.
3. Clean numbers: Ave may be 'battein' or '-' (coerce: recompute Runs/(Inns-NO) when possible, else 0); HS like '105*' is irrelevant (ignore); IGNORE the corrupted BBI field entirely.
4. Build a unified pool: for each player present in batting and/or bowling, zero-fill the missing side so every card has BOTH batting and bowling blocks. Map: batting.runs=Runs, batting.average=Ave(number else 0), batting.strikeRate=SR, batting.fours='4s', batting.sixes='6s'; bowling.wickets=Wkts, bowling.economy=Econ, bowling.average=Ave(bowling), bowling.strikeRate=SR(bowling).
5. Recognisability guard: keep only the top ~55 players by Matches (Mat) so the pool is recognisable (NOT all 250). Always force-include 'K Nitish Kumar Reddy' as the anchor regardless of rank.
6. Assign role heuristically (Bowler if wickets high & runs low; Batsman if opposite; All-rounder if both). Assign accent hex per franchise (RCB #c8102e, GT #1b2133, SRH #f26522, MI #004ba0, DC #17449b, LSG #0057b8, PBKS #d71920, KKR #3a225d, RR #ea1a85, CSK #f9cd05). id = kebab of name.
7. The anchor card: id 'nitish-reddy', name 'Nitish Kumar Reddy', team 'SRH', role 'All-rounder', vizag TRUE, accent '#7c3aed'. EVERY other card vizag:false.

Conform to the Card interface EXACTLY. Export ANCHOR_ID and CARD_POOL. Clean, typed code.

${CONTRACT}

Return: 2-line summary (pool size, confirm anchor present with vizag:true).`,
    { label: 'data:cards.ts', phase: 'Foundations' }
  ),
  () => agent(
    `You are the ENGINE agent. Write ${ROOT}/lib/engine.ts implementing the game engine EXACTLY per the contract.
- import type { Card } from '@/lib/cards' and import { CARD_POOL, ANCHOR_ID } from '@/lib/cards'.
- Implement Phase, StatDef, STATS (the 9 exact stats), TOTAL_ROUNDS, PHASE_BOOST, VIZAG_BONUS.
- phaseForRound(i): 0-2 powerplay, 3-5 normal, 6-7 deathover.
- selectMatchDeck(pool=CARD_POOL): build a 16-card deck that ALWAYS includes the anchor (find by ANCHOR_ID), fill the other 15 by randomly sampling distinct cards from the pool, then shuffle all 16 (use the JS runtime random generator — allowed in app code). First 8 = Player 1 hand, next 8 = Player 2 hand.
- effectiveValue & resolveRound exactly per the contract (boosts always advantageous; economy/bowl-avg/bowl-sr are lowerWins).
- Pure, dependency-free. Export everything in the contract.

${CONTRACT}

Return: 1-line summary confirming exports.`,
    { label: 'engine:engine.ts', phase: 'Foundations' }
  ),
  () => agent(
    `You are the DESIGN agent. Build a BEAUTIFUL premium visual system for an IPL 2026 cricket trading-card battle game. Mobile-first.
Art direction: dark stadium night under floodlights — deep navy/black gradient with a subtle floodlight radial glow; cards look like premium foil sports cards with the team accent colour, soft glassmorphism, rounded-2xl, fine ring/border, tasteful shadow; bold condensed display headings, mono for numbers; gold (#f5c518) for highlights/winning stat; a small gold ⚡ badge for Vizag cards; the card BACK shows an "IPL 2026" foil branding. Restrained motion (reveal fade / subtle flip), no gaudy animation, no emoji spam. Must feel polished and intentional, not a generic template.

Write these files (READ each first if present, then overwrite):
1. ${ROOT}/app/globals.css — Tailwind v4 base + a few custom utilities/keyframes (reveal fade, subtle card-flip, floodlight radial bg, .stat-row). Lean.
2. ${ROOT}/app/layout.tsx — strong display+sans font pairing via next/font (e.g. bold display 'Oswald' or 'Bebas Neue' for headings + 'Inter' body + a mono for numbers), dark gradient <html> bg, metadata title 'IPL 2026 Trump Cards — Vizag Edition', mobile viewport.
3. ${ROOT}/components/CardFace.tsx — a reusable gorgeous card. Props: { card: Card; highlightStatKey?: string; shownValue?: number; revealed?: boolean; size?: 'full'|'mini' }. Show name, team chip, role, the gold ⚡ Vizag badge when card.vizag, and a stat grid (batting + bowling) with the highlighted stat glowing gold. revealed===false shows a face-down foil 'IPL 2026' card back. Use card.accent for the gradient. import { Card } from '@/lib/cards' and { STATS } from '@/lib/engine' for stat labels.

Conform to the contract. Do NOT write app/page.tsx or screen components — that's Integration.

${CONTRACT}

Return: 2-line summary of the design language + the fonts you used.`,
    { label: 'design:visuals', phase: 'Foundations' }
  ),
])

phase('Integration')

const appResult = await agent(
  `You are the APP agent. Build the full screen flow into a BEAUTIFUL single-page app at ${ROOT}/app/page.tsx (plus small screen components under ${ROOT}/components/ e.g. NameEntry.tsx, Lobby.tsx, MatchScreen.tsx, ResultScreen.tsx). This is the PASS-AND-PLAY build (two players share one phone) — the PRD's sanctioned fallback ahead of the Firebase realtime layer. Add a top-of-file comment noting realtime is the next layer. THEME everywhere: "IPL 2026".

Use the existing foundations (READ them first for exact exports):
- '@/lib/cards' → Card, CARD_POOL, ANCHOR_ID
- '@/lib/engine' → STATS, TOTAL_ROUNDS, phaseForRound, selectMatchDeck, effectiveValue, resolveRound, Phase
- '@/components/CardFace' → <CardFace>

Screen state machine in page.tsx (mobile-first, matching the design system):
1) NAME ENTRY — title 'IPL 2026 TRUMP CARDS' with 'Vizag Edition' tagline; two inputs (Player 1, Player 2 names); Continue.
2) LOBBY / HOW TO PLAY — show both names matched; a collapsible 'How to Play' with: dealt 8 cards (system fixes order); 8 balls across phases — Balls 1-3 Powerplay (batting +25%), 4-6 Normal, 7-8 Death Over (bowling +25%); each ball one player attacks (turns alternate) and picks one stat, opponent card hidden until the pick is locked; higher value wins EXCEPT Economy/Bowl Avg/Bowl SR where lower wins; Vizag ⚡ cards get +10%; most cards captured after 8 balls wins. Big 'Start Match' button.
3) MATCH — call selectMatchDeck() once on start; first 8 = P1 deck, next 8 = P2 deck. 8 rounds:
   - Banner: current phase (Powerplay/Normal/Death Over) coloured, 'Ball n/8', running capture score for both.
   - Attacker = even round -> P1, odd -> P2 (show whose turn). Show ATTACKER's current card face-up with tappable stat rows (from STATS). Defender card face-DOWN until pick.
   - On stat tap: reveal defender card, resolveRound(attackerCard, defenderCard, stat, phase). Highlight the contested stat in gold on both with effective values. Show who won the ball + a '⚡ Vizag bonus applied' note when either card is vizag. Winner capture +1 (tie: none). 'Next Ball' advances; after ball 8 -> Result.
4) RESULT — winner by most captures (tie -> declare tie OR one sudden-death ball reusing first cards), celebratory but tasteful, final score, 'Rematch' (re-deal) and 'New Players' (back to name entry).

Genuinely polished, cohesive with the design system (dark stadium, gold highlights, premium cards, strong typography/spacing, smooth reveal). No lorem, no broken states. Mobile viewport first.

${CONTRACT}

Return: 3-line summary of screens built + any assumptions.`,
  { label: 'app:screens', phase: 'Integration' }
)

phase('Verify')

const verify = await agent(
  `You are the VERIFY agent for ${ROOT}. Run the production build and make it pass.
1. cd ${ROOT} && bun run build  (Next.js 16 / Turbopack).
2. If TypeScript or build errors appear, FIX them in the offending files while preserving behaviour and the shared contract. Likely issues: JSON import typing (may need a cast or a tiny type), unused vars, missing 'use client', Tailwind v4 class issues, next/font import names.
3. Re-run bun run build until it SUCCEEDS. Do NOT weaken game logic to pass.
Return: final build status (SUCCESS/FAIL) + a bullet list of every fix you made.`,
  { label: 'verify:build', phase: 'Verify' }
)

return { foundations, app: appResult, verify }
