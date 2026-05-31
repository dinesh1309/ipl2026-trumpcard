import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import StadiumBg from './components/StadiumBg';
import QrScanner from './components/QrScanner';
import VSOverlay from './components/VSOverlay';
import HomeScreen from './screens/HomeScreen';
import WaitingRoom from './screens/WaitingRoom';
import MatchFoundScreen from './screens/MatchFoundScreen';
import BattleArena from './screens/BattleArena';
import ResultScreen from './screens/ResultScreen';
import playersData from '../players.json';

export default function App() {
  // Screen Router: 'home', 'waiting', 'match_found', 'arena', 'result'
  const [screen, setScreen] = useState('home');
  const [gameMode, setGameMode] = useState(null); // 'online', 'vs_ai', 'pass_play'
  const [username, setUsername] = useState('');
  
  // Real-time states
  const [socket, setSocket] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [myRole, setMyRole] = useState('playerA'); // 'playerA' or 'playerB'
  const [opponentName, setOpponentName] = useState('Opponent');

  // Decks & Gameplay
  const [myDeck, setMyDeck] = useState([]);
  const [opponentCardCount, setOpponentCardCount] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  
  // Comparison overlay state
  const [comparison, setComparison] = useState(null); 
  // { myCard, opponentCard, statKey, winnerRole, isDraw }
  const [isComparing, setIsComparing] = useState(false);

  // Result screen details
  const [gameResult, setGameResult] = useState(null); // { winnerName, roundsPlayed, cardsWon }

  // Social interactions
  const [incomingEmoji, setIncomingEmoji] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false);

  // Offline game core storage
  const [offlinePlayersPool, setOfflinePlayersPool] = useState(playersData);
  const [offlineOpponentDeck, setOfflineOpponentDeck] = useState([]);

  // Socket Connection setup
  useEffect(() => {
    // Determine backend host
    const socketUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:5001' 
      : window.location.origin;
    
    const newSocket = io(socketUrl, { autoConnect: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log("Connected to IPL Socket Server");
    });

    newSocket.on('online_count', (count) => {
      setOnlineCount(count);
    });

    newSocket.on('queue_update', (count) => {
      setQueueCount(count);
    });

    newSocket.on('match_found', (data) => {
      setRoomId(data.roomId);
      setRoundsPlayed(0);
      setRematchRequested(false);
      setOpponentRequestedRematch(false);
      
      // Determine my role in match_found
      // We will set this in receive_deck specifically, but transition screen here
      setScreen('match_found');
    });

    newSocket.on('receive_deck', (data) => {
      setMyRole(data.role);
      setMyDeck(data.myDeck);
      setOpponentName(data.opponentName);
      setOpponentCardCount(data.opponentCardCount);
      setIsMyTurn(data.isMyTurn);
    });

    newSocket.on('deck_update', (data) => {
      setMyDeck(data.myDeck);
      setOpponentCardCount(data.opponentCardCount);
      setIsMyTurn(data.isMyTurn);
      setIsComparing(false);
      setComparison(null);
    });

    newSocket.on('round_result', (data) => {
      // Trigger battle overlay screen
      const myCard = data.cardA; // placeholder placeholder mapping
      const opponentCard = data.cardB;
      
      setComparison({
        myCard: data.winnerRole === 'playerA' ? (myRole === 'playerA' ? data.cardA : data.cardB) : (myRole === 'playerA' ? data.cardA : data.cardB),
        // Wait, to be perfectly simple:
        cardA: data.cardA,
        cardB: data.cardB,
        statKey: data.statKey,
        winnerRole: data.winnerRole,
        isDraw: data.isDraw
      });
      setIsComparing(true);
      
      // Keep track of rounds locally
      setRoundsPlayed(prev => prev + 1);
    });

    newSocket.on('game_over', (data) => {
      setGameResult({
        winnerName: data.winnerName,
        roundsPlayed: data.roundsPlayed,
        cardsWon: data.cardsWon
      });
      setTimeout(() => {
        setIsComparing(false);
        setScreen('result');
      }, 3200);
    });

    newSocket.on('receive_emoji', (data) => {
      setIncomingEmoji(data.emoji);
      setTimeout(() => setIncomingEmoji(null), 2000);
    });

    newSocket.on('opponent_requested_rematch', () => {
      setOpponentRequestedRematch(true);
    });

    newSocket.on('opponent_disconnected', () => {
      alert("Opponent has disconnected from the match!");
      resetToHome();
    });

    // Check query params for instant QR connection
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      // Prompt direct join or automatic nickname setup
      console.log(`Lobby code detected: ${roomParam}`);
    }

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Reset helper
  const resetToHome = () => {
    setScreen('home');
    setGameMode(null);
    setRoomId(null);
    setMyDeck([]);
    setOfflineOpponentDeck([]);
    setComparison(null);
    setIsComparing(false);
    setGameResult(null);
    setRematchRequested(false);
    setOpponentRequestedRematch(false);
  };

  // Join online queue
  const handlePlayOnline = (name) => {
    setUsername(name);
    setGameMode('online');
    setScreen('waiting');
    if (socket) {
      socket.emit('join_queue', { username: name });
    }
  };

  const handleCancelOnline = () => {
    if (socket) {
      socket.emit('leave_queue');
    }
    resetToHome();
  };

  // SCAN QR SUCCESS
  const handleScanSuccess = (decodedText) => {
    setScannerOpen(false);
    // Decode room and username
    // If scanned text is a URL, check params, or join lobby directly
    let connectCode = decodedText;
    try {
      if (decodedText.startsWith('http')) {
        const url = new URL(decodedText);
        connectCode = url.searchParams.get('room') || decodedText;
      }
    } catch(e) {}
    
    // Connect to scanned room via custom socket event or queue pairing code
    alert(`Connecting to code: ${connectCode}`);
    handlePlayOnline(`QR_Challenger_${Math.floor(Math.random()*100)}`);
  };

  // OFFLINE GAME GENERATOR & MECHANICS
  const handlePlayOffline = (name, mode) => {
    setUsername(name);
    setGameMode(mode); // 'vs_ai' or 'pass_play'
    setScreen('waiting');

    // Simulate short matchmaking wait
    setTimeout(() => {
      if (offlinePlayersPool.length < 16) {
        alert("Unable to generate offline decks: players.json is still loading or too small.");
        resetToHome();
        return;
      }

      // Formulas matching server.js
      const ppScore = (p) => (p.strikeRate * 0.3) + (p.runs * 0.2) + (p.fours * 0.2) + (p.average * 0.1) + (p.powerplayImpact * 0.2);
      const moScore = (p) => (p.runs * 0.3) + (p.average * 0.2) + (p.strikeRate * 0.2) + (p.fielding * 0.1) + (p.middleOversImpact * 0.2);
      const doScore = (p) => {
        const econValue = Math.max(0, 15 - p.economy) * 10;
        return (p.sixes * 0.2) + (p.strikeRate * 0.2) + (p.wickets * 0.3) + (econValue * 0.1) + (p.deathOversImpact * 0.2);
      };

      const ppPool = [...offlinePlayersPool].map(p => ({ p, s: ppScore(p) })).sort((a,b) => b.s - a.s).map(x => x.p);
      const moPool = [...offlinePlayersPool].map(p => ({ p, s: moScore(p) })).sort((a,b) => b.s - a.s).map(x => x.p);
      const doPool = [...offlinePlayersPool].map(p => ({ p, s: doScore(p) })).sort((a,b) => b.s - a.s).map(x => x.p);

      const drawUnique = (pool, count, exclude = []) => {
        const topSubpool = pool.slice(0, 12).filter(p => !exclude.some(ex => ex.id === p.id));
        return topSubpool.sort(() => 0.5 - Math.random()).slice(0, count);
      };

      // Generate Deck A (Player)
      const ppA = drawUnique(ppPool, 3);
      const moA = drawUnique(moPool, 3, ppA);
      const doA = drawUnique(doPool, 2, [...ppA, ...moA]);
      const deckA = [
        ...ppA.map(p => ({ ...p, cardType: 'POWERPLAY', badge: '⚡ POWERPLAY', colorTheme: 'blue-neon' })),
        ...moA.map(p => ({ ...p, cardType: 'MIDDLE_OVERS', badge: '⚪ MIDDLE OVERS', colorTheme: 'silver' })),
        ...doA.map(p => ({ ...p, cardType: 'DEATH_OVER', badge: '🔥 DEATH OVER', colorTheme: 'red-orange' }))
      ];

      // Generate Deck B (AI or Player 2)
      const ppB = drawUnique(ppPool, 3, deckA);
      const moB = drawUnique(moPool, 3, [...deckA, ...ppB]);
      const doB = drawUnique(doPool, 2, [...deckA, ...ppB, ...moB]);
      const deckB = [
        ...ppB.map(p => ({ ...p, cardType: 'POWERPLAY', badge: '⚡ POWERPLAY', colorTheme: 'blue-neon' })),
        ...moB.map(p => ({ ...p, cardType: 'MIDDLE_OVERS', badge: '⚪ MIDDLE OVERS', colorTheme: 'silver' })),
        ...doB.map(p => ({ ...p, cardType: 'DEATH_OVER', badge: '🔥 DEATH OVER', colorTheme: 'red-orange' }))
      ];

      setMyDeck(deckA);
      setOfflineOpponentDeck(deckB);
      setOpponentCardCount(deckB.length);
      setOpponentName(mode === 'vs_ai' ? 'IPL_Smart_AI' : 'Local_Guest');
      setMyRole('playerA');
      
      const firstTurn = Math.random() < 0.5;
      setIsMyTurn(firstTurn);
      setRoundsPlayed(0);

      setScreen('match_found');
    }, 1500);
  };

  // Local comparison battle triggers
  const handleOfflineStatSelect = (statKey) => {
    const cardA = myDeck[0];
    const cardB = offlineOpponentDeck[0];
    if (!cardA || !cardB) return;

    const valA = cardA[statKey];
    const valB = cardB[statKey];

    let playerAWins = false;
    let isDraw = false;

    if (statKey === 'economy') {
      // Lower economy bowling wins
      if (valA < valB) playerAWins = true;
      else if (valA > valB) playerAWins = false;
      else isDraw = true;
    } else {
      // Higher wins
      if (valA > valB) playerAWins = true;
      else if (valA < valB) playerAWins = false;
      else isDraw = true;
    }

    const winnerRole = isDraw ? (isMyTurn ? 'playerA' : 'playerB') : (playerAWins ? 'playerA' : 'playerB');

    // Slide up clashing overlay
    setComparison({
      cardA,
      cardB,
      statKey,
      winnerRole,
      isDraw
    });
    setIsComparing(true);
    setRoundsPlayed(prev => prev + 1);

    // Shift cards to winner
    setTimeout(() => {
      const newDeckA = [...myDeck];
      const newDeckB = [...offlineOpponentDeck];
      const poppedA = newDeckA.shift();
      const poppedB = newDeckB.shift();

      if (winnerRole === 'playerA') {
        newDeckA.push(poppedA);
        newDeckA.push(poppedB);
      } else {
        newDeckB.push(poppedB);
        newDeckB.push(poppedA);
      }

      // Check win/lose
      if (newDeckA.length === 0 || newDeckB.length === 0) {
        const absoluteWinner = newDeckA.length === 0 ? (gameMode === 'vs_ai' ? 'IPL_Smart_AI' : 'Local_Guest') : username;
        setGameResult({
          winnerName: absoluteWinner,
          roundsPlayed: roundsPlayed + 1,
          cardsWon: newDeckA.length > 0 ? 16 : 0
        });

        setTimeout(() => {
          setIsComparing(false);
          setScreen('result');
        }, 3200);
      } else {
        // Continue play
        setMyDeck(newDeckA);
        setOfflineOpponentDeck(newDeckB);
        setOpponentCardCount(newDeckB.length);
        setIsMyTurn(winnerRole === 'playerA');
        
        setIsComparing(false);
        setComparison(null);

        // If VS AI, trigger AI choice if it's the AI's turn
        if (gameMode === 'vs_ai' && winnerRole === 'playerB') {
          triggerAIChoice(newDeckA, newDeckB);
        }
      }
    }, 3200);
  };

  // AI Decision Logic
  const triggerAIChoice = (deckA, deckB) => {
    setTimeout(() => {
      const activeAICard = deckB[0];
      if (!activeAICard) return;

      let chosenStat = 'runs';

      if (activeAICard.cardType === 'POWERPLAY') {
        // Select maximum out of PP fields
        const stats = [
          { key: 'runs', val: activeAICard.runs },
          { key: 'strikeRate', val: activeAICard.strikeRate },
          { key: 'average', val: activeAICard.average },
          { key: 'fours', val: activeAICard.fours },
          { key: 'powerplayImpact', val: activeAICard.powerplayImpact }
        ];
        // Sort highest
        stats.sort((a,b) => b.val - a.val);
        chosenStat = stats[0].key;
      } else if (activeAICard.cardType === 'MIDDLE_OVERS') {
        const stats = [
          { key: 'runs', val: activeAICard.runs },
          { key: 'strikeRate', val: activeAICard.strikeRate },
          { key: 'average', val: activeAICard.average },
          { key: 'fielding', val: activeAICard.fielding },
          { key: 'middleOversImpact', val: activeAICard.middleOversImpact }
        ];
        stats.sort((a,b) => b.val - a.val);
        chosenStat = stats[0].key;
      } else if (activeAICard.cardType === 'DEATH_OVER') {
        // Lower is better for economy!
        // Strength of economy calculated as (15 - economy) * 10
        const stats = [
          { key: 'sixes', val: activeAICard.sixes },
          { key: 'strikeRate', val: activeAICard.strikeRate },
          { key: 'wickets', val: activeAICard.wickets },
          { key: 'economy', val: (15 - activeAICard.economy) * 10 },
          { key: 'deathOversImpact', val: activeAICard.deathOversImpact }
        ];
        stats.sort((a,b) => b.val - a.val);
        chosenStat = stats[0].key;
      }

      // Simulate a thinking delay before AI selects
      handleOfflineStatSelect(chosenStat);
    }, 1800);
  };

  // Offline Emoji trigger (just floating local mock reaction)
  const handleSendEmoji = (emoji) => {
    if (gameMode === 'online' && socket) {
      socket.emit('send_emoji', { roomId, emoji });
    } else {
      setIncomingEmoji(emoji);
      setTimeout(() => setIncomingEmoji(null), 2000);
    }
  };

  // Play Again triggers
  const handlePlayAgain = () => {
    if (gameMode === 'online') {
      setRematchRequested(true);
      if (socket) {
        socket.emit('request_rematch', { roomId });
      }
      
      // Wait for opponent
      if (opponentRequestedRematch) {
        // Both agreed, generate new game
        alert("Rematch Accepted! Launching fresh innings...");
        handlePlayOnline(username);
      }
    } else {
      // Offline rematch restart
      handlePlayOffline(username, gameMode);
    }
  };

  return (
    <div className="position-relative min-vh-100 py-3 d-flex flex-column justify-content-between">
      
      {/* Stadium Particle Arena Backdrop */}
      <StadiumBg />

      {/* Floating scanner */}
      {scannerOpen && (
        <QrScanner
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}

      {/* Real-time CLASH overlay */}
      {isComparing && comparison && (
        <VSOverlay
          myCard={gameMode === 'online' ? (myRole === 'playerA' ? comparison.cardA : comparison.cardB) : comparison.cardA}
          opponentCard={gameMode === 'online' ? (myRole === 'playerA' ? comparison.cardB : comparison.cardA) : comparison.cardB}
          statKey={comparison.statKey}
          winnerRole={comparison.winnerRole}
          myRole={myRole}
          myUsername={username}
          opponentUsername={opponentName}
        />
      )}

      {/* Screen Router */}
      {screen === 'home' && (
        <HomeScreen
          onPlayOnline={handlePlayOnline}
          onPlayOffline={handlePlayOffline}
          onOpenScanner={() => setScannerOpen(true)}
          onlineCount={onlineCount}
        />
      )}

      {screen === 'waiting' && (
        <WaitingRoom
          queueCount={gameMode === 'online' ? queueCount : 1}
          onCancel={gameMode === 'online' ? handleCancelOnline : resetToHome}
        />
      )}

      {screen === 'match_found' && (
        <MatchFoundScreen
          playerA={{ username: gameMode === 'online' ? (myRole === 'playerA' ? username : opponentName) : username, cardsCount: 8 }}
          playerB={{ username: gameMode === 'online' ? (myRole === 'playerB' ? username : opponentName) : opponentName, cardsCount: 8 }}
          startingTurn={gameMode === 'online' ? (isMyTurn ? username : opponentName) : (isMyTurn ? username : opponentName)}
          onCountdownComplete={() => {
            setScreen('arena');
            // If offline VS AI and AI goes first, trigger its choice
            if (gameMode === 'vs_ai' && !isMyTurn) {
              triggerAIChoice(myDeck, offlineOpponentDeck);
            }
          }}
        />
      )}

      {screen === 'arena' && myDeck.length > 0 && (
        <BattleArena
          myDeck={myDeck}
          opponentCardCount={opponentCardCount}
          isMyTurn={isMyTurn}
          opponentName={opponentName}
          myUsername={username}
          onSelectStat={gameMode === 'online' ? (stat) => socket.emit('select_stat', { roomId, statKey: stat }) : handleOfflineStatSelect}
          onSendEmoji={handleSendEmoji}
          incomingEmoji={incomingEmoji}
        />
      )}

      {screen === 'result' && gameResult && (
        <ResultScreen
          winnerName={gameResult.winnerName}
          myUsername={username}
          roundsPlayed={gameResult.roundsPlayed}
          cardsWon={gameResult.cardsWon}
          onPlayAgain={handlePlayAgain}
          onGoHome={resetToHome}
          opponentRequestedRematch={opponentRequestedRematch}
          rematchRequested={rematchRequested}
        />
      )}

      {/* Footer Branding */}
      <footer className="text-center text-white-50 mt-4 mb-2 small tracking-wider" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
        IPL TOP TRUMPS 2026 • PREMIUM SPORTS GAME ENGINE
      </footer>
    </div>
  );
}
