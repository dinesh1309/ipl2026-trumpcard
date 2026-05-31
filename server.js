import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static client files if built
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5001;

// Matchmaking State
let waitingQueue = [];
let activeRooms = new Map(); // roomId -> roomState
let onlineCount = 0;

// Dynamic Data Loading & Card Generation
function loadPlayers() {
  try {
    const filePath = path.join(__dirname, 'players.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading players.json: ", error);
    return [];
  }
}

// Pool ranking score formulas
function calculatePowerplayScore(p) {
  // PP Score = SR * 0.3 + Runs * 0.2 + Fours * 0.2 + Avg * 0.1 + PPImpact * 0.2
  return (p.strikeRate * 0.3) + (p.runs * 0.2) + (p.fours * 0.2) + (p.average * 0.1) + (p.powerplayImpact * 0.2);
}

function calculateMiddleOversScore(p) {
  // MO Score = Runs * 0.3 + Avg * 0.2 + SR * 0.2 + Fielding * 0.1 + MOImpact * 0.2
  return (p.runs * 0.3) + (p.average * 0.2) + (p.strikeRate * 0.2) + (p.fielding * 0.1) + (p.middleOversImpact * 0.2);
}

function calculateDeathOversScore(p) {
  // DO Score = Sixes * 0.2 + SR * 0.2 + Wickets * 0.3 + ((15 - Econ) * 10) * 0.1 + DOImpact * 0.2
  const econValue = Math.max(0, 15 - p.economy) * 10;
  return (p.sixes * 0.2) + (p.strikeRate * 0.2) + (p.wickets * 0.3) + (econValue * 0.1) + (p.deathOversImpact * 0.2);
}

function generateDecks() {
  const players = loadPlayers();
  if (players.length < 16) {
    console.error("Not enough players in players.json to generate unique decks (Need at least 16)");
    return { deckA: [], deckB: [] };
  }

  // Rank players for each pool
  const ppPool = [...players].map(p => ({ player: p, score: calculatePowerplayScore(p) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.player);

  const moPool = [...players].map(p => ({ player: p, score: calculateMiddleOversScore(p) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.player);

  const doPool = [...players].map(p => ({ player: p, score: calculateDeathOversScore(p) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.player);

  // Helper to draw random unique elements from a subpool
  const drawUnique = (pool, count, exclude = []) => {
    // Take top 12 and shuffle them to add variety
    const topSubpool = pool.slice(0, 12).filter(p => !exclude.some(ex => ex.id === p.id));
    const shuffled = topSubpool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Player A Deck
  const ppA = drawUnique(ppPool, 3);
  const moA = drawUnique(moPool, 3, ppA);
  const doA = drawUnique(doPool, 2, [...ppA, ...moA]);
  const deckA = [
    ...ppA.map(p => ({ ...p, cardType: 'POWERPLAY', badge: '⚡ POWERPLAY', colorTheme: 'blue-neon' })),
    ...moA.map(p => ({ ...p, cardType: 'MIDDLE_OVERS', badge: '⚪ MIDDLE OVERS', colorTheme: 'silver' })),
    ...doA.map(p => ({ ...p, cardType: 'DEATH_OVER', badge: '🔥 DEATH OVER', colorTheme: 'red-orange' }))
  ];

  // Player B Deck (Excluding cards already assigned to A if possible to keep them unique)
  const ppB = drawUnique(ppPool, 3, deckA);
  const moB = drawUnique(moPool, 3, [...deckA, ...ppB]);
  const doB = drawUnique(doPool, 2, [...deckA, ...ppB, ...moB]);
  const deckB = [
    ...ppB.map(p => ({ ...p, cardType: 'POWERPLAY', badge: '⚡ POWERPLAY', colorTheme: 'blue-neon' })),
    ...moB.map(p => ({ ...p, cardType: 'MIDDLE_OVERS', badge: '⚪ MIDDLE OVERS', colorTheme: 'silver' })),
    ...doB.map(p => ({ ...p, cardType: 'DEATH_OVER', badge: '🔥 DEATH OVER', colorTheme: 'red-orange' }))
  ];

  return { deckA, deckB };
}

// Socket IO Event Handling
io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online_count', onlineCount);
  console.log(`User connected: ${socket.id}. Online players: ${onlineCount}`);

  // Disconnect handler
  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online_count', onlineCount);
    console.log(`User disconnected: ${socket.id}. Online players: ${onlineCount}`);

    // Remove from waiting queue if present
    waitingQueue = waitingQueue.filter(player => player.socketId !== socket.id);
    io.emit('queue_update', waitingQueue.length);

    // Handle game rooms disconnect
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.playerA.socketId === socket.id || room.playerB.socketId === socket.id) {
        const remainingPlayer = room.playerA.socketId === socket.id ? room.playerB : room.playerA;
        io.to(remainingPlayer.socketId).emit('opponent_disconnected');
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} destroyed due to player disconnect`);
      }
    }
  });

  // Join Queue
  socket.on('join_queue', (data) => {
    const { username } = data;
    console.log(`Player entered queue: ${username} (${socket.id})`);

    // Avoid duplicate queue entries
    if (waitingQueue.some(p => p.socketId === socket.id)) {
      return;
    }

    // Add to queue
    const newPlayer = { socketId: socket.id, username };
    waitingQueue.push(newPlayer);
    io.emit('queue_update', waitingQueue.length);

    // Strictly 1v1 pairing
    if (waitingQueue.length >= 2) {
      const playerA = waitingQueue.shift();
      const playerB = waitingQueue.shift();
      io.emit('queue_update', waitingQueue.length);

      const roomId = `room_${playerA.socketId.substring(0, 5)}_${playerB.socketId.substring(0, 5)}`;
      console.log(`Match matched strictly 1v1. Room created: ${roomId}`);

      // Generate dynamic decks
      const { deckA, deckB } = generateDecks();

      // Setup initial room state
      const initialTurn = Math.random() < 0.5 ? 'playerA' : 'playerB';
      const roomState = {
        roomId,
        playerA: { ...playerA, deck: deckA },
        playerB: { ...playerB, deck: deckB },
        roundsPlayed: 0,
        turn: initialTurn,
        status: 'playing',
        comparison: null
      };

      activeRooms.set(roomId, roomState);

      // Join sockets
      const socketA = io.sockets.sockets.get(playerA.socketId);
      const socketB = io.sockets.sockets.get(playerB.socketId);

      if (socketA) socketA.join(roomId);
      if (socketB) socketB.join(roomId);

      // Notify clients
      io.to(roomId).emit('match_found', {
        roomId,
        playerA: { username: playerA.username, cardsCount: deckA.length },
        playerB: { username: playerB.username, cardsCount: deckB.length },
        startingTurn: initialTurn === 'playerA' ? playerA.username : playerB.username,
        deck: null // Decks are sent individually for privacy!
      });

      // Send private decks to individual players
      io.to(playerA.socketId).emit('receive_deck', {
        role: 'playerA',
        myDeck: deckA,
        opponentName: playerB.username,
        opponentCardCount: deckB.length,
        isMyTurn: initialTurn === 'playerA'
      });

      io.to(playerB.socketId).emit('receive_deck', {
        role: 'playerB',
        myDeck: deckB,
        opponentName: playerA.username,
        opponentCardCount: deckA.length,
        isMyTurn: initialTurn === 'playerB'
      });
    }
  });

  // Leave Queue
  socket.on('leave_queue', () => {
    waitingQueue = waitingQueue.filter(p => p.socketId !== socket.id);
    io.emit('queue_update', waitingQueue.length);
  });

  // Stat Selected
  socket.on('select_stat', (data) => {
    const { roomId, statKey } = data;
    const room = activeRooms.get(roomId);

    if (!room || room.status !== 'playing') return;

    // Verify turn
    const isPlayerA = room.playerA.socketId === socket.id;
    const activeRole = room.turn;

    if ((isPlayerA && activeRole !== 'playerA') || (!isPlayerA && activeRole !== 'playerB')) {
      console.log("Cheating or latency warning: invalid turn selection!");
      return;
    }

    const cardA = room.playerA.deck[0];
    const cardB = room.playerB.deck[0];

    if (!cardA || !cardB) return;

    const valA = cardA[statKey];
    const valB = cardB[statKey];

    // Determine winner based on stat
    let playerAWins = false;
    let isDraw = false;

    if (statKey === 'economy') {
      // For economy, LOWER is better!
      if (valA < valB) playerAWins = true;
      else if (valA > valB) playerAWins = false;
      else isDraw = true;
    } else {
      // Higher is better for all other stats
      if (valA > valB) playerAWins = true;
      else if (valA < valB) playerAWins = false;
      else isDraw = true;
    }

    const winnerRole = isDraw ? activeRole : (playerAWins ? 'playerA' : 'playerB');
    const winnerName = room[winnerRole].username;
    
    // Process cards movement
    const poppedA = room.playerA.deck.shift();
    const poppedB = room.playerB.deck.shift();

    if (winnerRole === 'playerA') {
      // Cards go to bottom of Player A's deck
      // Winner's card first, then loser's card
      room.playerA.deck.push(poppedA);
      room.playerA.deck.push(poppedB);
    } else {
      // Cards go to bottom of Player B's deck
      room.playerB.deck.push(poppedB);
      room.playerB.deck.push(poppedA);
    }

    room.roundsPlayed++;
    room.turn = winnerRole; // Winner gets the next turn

    // Check Win Conditions
    let gameOver = false;
    let absoluteWinner = null;

    if (room.playerA.deck.length === 0) {
      gameOver = true;
      absoluteWinner = 'playerB';
    } else if (room.playerB.deck.length === 0) {
      gameOver = true;
      absoluteWinner = 'playerA';
    }

    // Broadcast comparison result to both players
    io.to(roomId).emit('round_result', {
      statKey,
      cardA: { ...cardA, name: cardA.name, value: valA },
      cardB: { ...cardB, name: cardB.name, value: valB },
      valA,
      valB,
      winnerRole,
      winnerName,
      playerACardCount: room.playerA.deck.length,
      playerBCardCount: room.playerB.deck.length,
      nextTurnName: room[winnerRole].username,
      isDraw
    });

    if (gameOver) {
      room.status = 'game_over';
      setTimeout(() => {
        io.to(roomId).emit('game_over', {
          winnerRole,
          winnerName: room[absoluteWinner].username,
          roundsPlayed: room.roundsPlayed,
          cardsWon: 16
        });
        activeRooms.delete(roomId);
        console.log(`Game finished in Room ${roomId}. Winner: ${room[absoluteWinner].username}`);
      }, 3500); // Allow comparison screen to be viewed before going to results
    } else {
      // Emit deck updates to both players in private
      setTimeout(() => {
        io.to(room.playerA.socketId).emit('deck_update', {
          myDeck: room.playerA.deck,
          opponentCardCount: room.playerB.deck.length,
          isMyTurn: room.turn === 'playerA'
        });

        io.to(room.playerB.socketId).emit('deck_update', {
          myDeck: room.playerB.deck,
          opponentCardCount: room.playerA.deck.length,
          isMyTurn: room.turn === 'playerB'
        });
      }, 3500);
    }
  });

  // Emoticon reactions or chats (bonus sports interaction)
  socket.on('send_emoji', (data) => {
    const { roomId, emoji } = data;
    socket.to(roomId).emit('receive_emoji', { emoji });
  });

  // Rematch / Play again request
  socket.on('request_rematch', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('opponent_requested_rematch');
  });
});

// Root API check to verify status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlinePlayers: onlineCount,
    waitingPlayers: waitingQueue.length,
    activeMatches: activeRooms.size
  });
});

// Fallback index serving for single server deployment
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`IPL Top Trumps 2026 Server running on port ${PORT}`);
});
