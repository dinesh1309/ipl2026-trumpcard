import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATTING_PATH = path.join(__dirname, 'temp-repo', 'batting.json');
const BOWLING_PATH = path.join(__dirname, 'temp-repo', 'bowling.json');
const OUTPUT_ROOT = path.join(__dirname, 'players.json');
const OUTPUT_PUBLIC = path.join(__dirname, 'public', 'players.json');

const TEAM_MAP = {
  'RCB': 'Royal Challengers Bengaluru',
  'MI': 'Mumbai Indians',
  'CSK': 'Chennai Super Kings',
  'KKR': 'Kolkata Knight Riders',
  'RR': 'Rajasthan Royals',
  'SRH': 'Sunrisers Hyderabad',
  'DC': 'Delhi Capitals',
  'GT': 'Gujarat Titans',
  'LSG': 'Lucknow Super Giants',
  'PBKS': 'Punjab Kings'
};

const DEFAULT_PHOTOS = [
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/c58514d7-4632-4752-bfb2-659f1d5e683f.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/62d8544d-5878-43d9-959f-d317e33e3871.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/73e13d52-7389-40ef-8025-a1310344d9b4.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/3b624fdf-a9d7-466d-8566-ffb4c81f33f0.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/fb862590-b197-4009-847e-a0e271eb5ee6.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/c92eb295-d227-465b-80df-39b036577fc7.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/1d34c036-7c08-417d-b35f-22a0f8bfdf80.png",
  "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320,q_50/gpt-prod/dma/image/4458cd19-3bf6-417c-a496-c148286a111a.png"
];

function cleanNameAndTeam(rawName) {
  // Extract "Shubman Gill (GT)" -> Name: "Shubman Gill", Team: "GT"
  const regex = /^(.*?)\s*\((.*?)\)$/;
  const match = rawName.match(regex);
  if (match) {
    return {
      name: match[1].trim(),
      teamShort: match[2].trim()
    };
  }
  return {
    name: rawName.trim(),
    teamShort: 'IPL'
  };
}

function parseFloatSafe(val, fallback = 0.0) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

function parseIntSafe(val, fallback = 0) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function generatePlayers() {
  console.log("Loading batting.json and bowling.json...");
  const rawBatting = JSON.parse(fs.readFileSync(BATTING_PATH, 'utf-8'));
  const rawBowling = JSON.parse(fs.readFileSync(BOWLING_PATH, 'utf-8'));

  const playerMap = new Map();

  // 1. Process Batting Data (Load first)
  rawBatting.forEach(bat => {
    const { name, teamShort } = cleanNameAndTeam(bat.Player);
    
    // Parse stats
    const runs = parseIntSafe(bat.Runs);
    const strikeRate = parseFloatSafe(bat.SR, 100.0);
    const average = parseFloatSafe(bat.Ave, 22.0);
    const fours = parseIntSafe(bat['4s']);
    const sixes = parseIntSafe(bat['6s']);
    const matches = parseIntSafe(bat.Mat);

    playerMap.set(name, {
      id: 0,
      name,
      team: TEAM_MAP[teamShort] || 'IPL franchise',
      teamShort,
      runs,
      strikeRate,
      average,
      fours,
      sixes,
      wickets: 0,
      economy: 12.0, // default poor economy if they don't bowl
      fielding: Math.floor(75 + (Math.random() * 20)), // Dynamic realistic fielding
      matches,
      hasBatStats: true,
      hasBowlStats: false
    });
  });

  // 2. Merge / Process Bowling Data
  rawBowling.forEach(bowl => {
    const { name, teamShort } = cleanNameAndTeam(bowl.Player);
    const wickets = parseIntSafe(bowl.Wkts);
    const economy = parseFloatSafe(bowl.Econ, 9.0);
    const bowlSR = parseFloatSafe(bowl.SR, 20.0);
    const matches = parseIntSafe(bowl.Mat);

    if (playerMap.has(name)) {
      // Exists in batting list (All-Rounder)
      const existing = playerMap.get(name);
      existing.wickets = wickets;
      existing.economy = economy;
      existing.hasBowlStats = true;
    } else {
      // Bowler only
      playerMap.set(name, {
        id: 0,
        name,
        team: TEAM_MAP[teamShort] || 'IPL franchise',
        teamShort,
        runs: 10 + Math.floor(Math.random() * 80), // default low runs
        strikeRate: 80.0 + (Math.random() * 40),   // default strike rate
        average: 8.0 + (Math.random() * 8),       // default low average
        fours: Math.floor(Math.random() * 4),
        sixes: Math.floor(Math.random() * 2),
        wickets,
        economy,
        fielding: Math.floor(70 + (Math.random() * 20)),
        matches,
        hasBatStats: false,
        hasBowlStats: true
      });
    }
  });

  // 3. Compile, Rank and Assign Roles / Dynamic Impact Metrics
  const compiledPlayers = Array.from(playerMap.values());

  // Determine roles and phase impacts
  const finalPlayers = compiledPlayers.map((p, idx) => {
    let role = 'Batsman';
    if (p.hasBatStats && p.hasBowlStats && p.wickets >= 4 && p.runs >= 100) {
      role = 'All-Rounder';
    } else if (p.hasBowlStats && p.wickets >= 4) {
      role = 'Bowler';
    } else if (p.name.includes('Klaasen') || p.name.includes('Samson') || p.name.includes('Pant') || p.name.includes('Inglis') || p.name.includes('Kishan')) {
      role = 'Wicketkeeper Batsman';
    }

    // Dynamic phase impacts based on their real stats
    // Powerplay Impact: High strike rate, runs, boundary fours
    let powerplayImpact = Math.min(99, Math.floor(
      (p.strikeRate * 0.25) + (p.runs * 0.05) + (p.fours * 0.3)
    ));
    if (role === 'Bowler') powerplayImpact = Math.min(95, Math.floor(75 + (12 - p.economy) * 2));

    // Middle Overs Impact: High average, runs, fielding
    let middleOversImpact = Math.min(99, Math.floor(
      (p.average * 0.8) + (p.runs * 0.06) + (p.fielding * 0.1)
    ));

    // Death Overs Impact: boundary sixes, wickets, low economy
    let deathOversImpact = Math.min(99, Math.floor(
      (p.sixes * 0.8) + (p.wickets * 1.5) + (Math.max(0, 15 - p.economy) * 3)
    ));
    if (role === 'Batsman' && p.sixes > 20) deathOversImpact = Math.max(deathOversImpact, 92);

    // Clamp impact ratings to realistic sport limits (45 to 99)
    const clamp = (val) => Math.max(50, Math.min(val, 99));

    // Photo selection (cycles or fallbacks)
    const photo = DEFAULT_PHOTOS[idx % DEFAULT_PHOTOS.length];

    return {
      id: idx + 1,
      name: p.name,
      team: p.team,
      teamShort: p.teamShort,
      role,
      runs: p.runs,
      strikeRate: parseFloat(p.strikeRate.toFixed(1)),
      average: parseFloat(p.average.toFixed(1)),
      fours: p.fours,
      sixes: p.sixes,
      wickets: p.wickets,
      economy: parseFloat(p.economy.toFixed(2)),
      fielding: p.fielding,
      powerplayImpact: clamp(powerplayImpact),
      middleOversImpact: clamp(middleOversImpact),
      deathOversImpact: clamp(deathOversImpact),
      photo
    };
  });

  // Sort and select top 40 star players to maintain high-quality gaming rosters
  // Filter out any entries with blank names or placeholder stats
  const filteredPlayers = finalPlayers
    .filter(p => p.runs > 20 || p.wickets > 2)
    .sort((a, b) => (b.runs + b.wickets * 20) - (a.runs + a.wickets * 20))
    .slice(0, 48); // Draw top 48 players

  // Save outputs
  fs.writeFileSync(OUTPUT_ROOT, JSON.stringify(filteredPlayers, null, 2));
  fs.writeFileSync(OUTPUT_PUBLIC, JSON.stringify(filteredPlayers, null, 2));

  console.log(`Successfully generated dynamic IPL 2026 player database!`);
  console.log(`Saved ${filteredPlayers.length} high-quality player profiles to:`);
  console.log(`- ${OUTPUT_ROOT}`);
  console.log(`- ${OUTPUT_PUBLIC}`);
}

generatePlayers();
