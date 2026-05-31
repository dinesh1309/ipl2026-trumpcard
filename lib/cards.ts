// Agent 1 (Stat Scraper) output — 8 starter cards.
// Ratings are game-balanced figures derived from real career profiles, not claimed exact stats.
// 5 stars + 3 Vizag/Andhra cards (vizag: true) that carry the Vizag Performance Bonus.

export type Metric =
  | "sixes"
  | "fours"
  | "strikeRate"
  | "runs"
  | "average"
  | "wickets"
  | "economy"
  | "dotBallPct";

export interface Card {
  id: string;
  name: string;
  team: string;
  role: string;
  vizag: boolean;
  accent: string; // hex for the generative SVG card face (Agent 2)
  batting: { runs: number; average: number; strikeRate: number; sixes: number; fours: number };
  bowling: { wickets: number; economy: number; dotBallPct: number };
}

export const CARDS: Card[] = [
  {
    id: "kohli",
    name: "Virat Kohli",
    team: "India",
    role: "Batsman",
    vizag: false,
    accent: "#1e3a8a",
    batting: { runs: 8200, average: 52.7, strikeRate: 139, sixes: 290, fours: 720 },
    bowling: { wickets: 4, economy: 8.8, dotBallPct: 30 },
  },
  {
    id: "rohit",
    name: "Rohit Sharma",
    team: "India",
    role: "Batsman",
    vizag: false,
    accent: "#1d4ed8",
    batting: { runs: 9100, average: 31.3, strikeRate: 140, sixes: 350, fours: 820 },
    bowling: { wickets: 1, economy: 9.2, dotBallPct: 28 },
  },
  {
    id: "surya",
    name: "Suryakumar Yadav",
    team: "India",
    role: "Batsman",
    vizag: false,
    accent: "#0ea5e9",
    batting: { runs: 2500, average: 44.0, strikeRate: 168, sixes: 130, fours: 250 },
    bowling: { wickets: 0, economy: 9.9, dotBallPct: 22 },
  },
  {
    id: "hardik",
    name: "Hardik Pandya",
    team: "India",
    role: "All-rounder",
    vizag: false,
    accent: "#ea580c",
    batting: { runs: 1500, average: 27.8, strikeRate: 143, sixes: 90, fours: 110 },
    bowling: { wickets: 80, economy: 8.4, dotBallPct: 35 },
  },
  {
    id: "bumrah",
    name: "Jasprit Bumrah",
    team: "India",
    role: "Bowler",
    vizag: false,
    accent: "#0f766e",
    batting: { runs: 90, average: 6.0, strikeRate: 85, sixes: 2, fours: 6 },
    bowling: { wickets: 145, economy: 6.6, dotBallPct: 48 },
  },
  {
    id: "ksbharat",
    name: "KS Bharat",
    team: "India / Andhra",
    role: "WK-Batsman",
    vizag: true,
    accent: "#7c3aed",
    batting: { runs: 3200, average: 38.5, strikeRate: 132, sixes: 70, fours: 360 },
    bowling: { wickets: 0, economy: 0, dotBallPct: 0 },
  },
  {
    id: "rayudu",
    name: "Ambati Rayudu",
    team: "Andhra",
    role: "Batsman",
    vizag: true,
    accent: "#be123c",
    batting: { runs: 4300, average: 28.4, strikeRate: 127, sixes: 95, fours: 320 },
    bowling: { wickets: 3, economy: 9.0, dotBallPct: 20 },
  },
  {
    id: "vihari",
    name: "Hanuma Vihari",
    team: "Andhra",
    role: "Batsman",
    vizag: true,
    accent: "#15803d",
    batting: { runs: 4100, average: 41.2, strikeRate: 118, sixes: 55, fours: 410 },
    bowling: { wickets: 25, economy: 8.1, dotBallPct: 33 },
  },
];

export const cardById = (id: string): Card | undefined => CARDS.find((c) => c.id === id);
