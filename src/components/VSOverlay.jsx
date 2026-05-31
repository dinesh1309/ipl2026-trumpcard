import React from 'react';
import { motion } from 'framer-motion';
import Card from './Card';

export default function VSOverlay({
  myCard,
  opponentCard,
  statKey,
  winnerRole, // 'playerA' or 'playerB'
  myRole, // 'playerA' or 'playerB'
  myUsername,
  opponentUsername,
  onComplete
}) {
  const isMyCard = (role) => role === myRole;
  const isDraw = winnerRole === null || winnerRole === undefined || winnerRole === 'draw';
  const iWon = winnerRole === myRole;

  // Find stat details
  const getStatLabel = (card, key) => {
    if (!card) return '';
    const statsList = [
      { label: 'Runs', key: 'runs' },
      { label: 'Strike Rate', key: 'strikeRate' },
      { label: 'Average', key: 'average' },
      { label: 'Fours', key: 'fours' },
      { label: 'Sixes', key: 'sixes' },
      { label: 'Wickets', key: 'wickets' },
      { label: 'Economy', key: 'economy' },
      { label: 'Fielding', key: 'fielding' },
      { label: 'PP Impact', key: 'powerplayImpact' },
      { label: 'MO Impact', key: 'middleOversImpact' },
      { label: 'Death Impact', key: 'deathOversImpact' }
    ];
    const match = statsList.find(s => s.key === key);
    return match ? match.label : key;
  };

  const statLabel = getStatLabel(myCard, statKey);
  const myValue = myCard ? myCard[statKey] : 0;
  const opponentValue = opponentCard ? opponentCard[statKey] : 0;

  const myValueDisplay = statKey === 'economy' ? myValue.toFixed(2) : myValue;
  const opponentValueDisplay = statKey === 'economy' ? opponentValue.toFixed(2) : opponentValue;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(5, 8, 17, 0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      {/* Title / Turn Result Banner */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-4"
      >
        <span 
          className="badge px-4 py-2 text-uppercase mb-2"
          style={{
            background: iWon ? 'rgba(0, 240, 255, 0.2)' : (isDraw ? 'rgba(255,255,255,0.1)' : 'rgba(255, 59, 48, 0.2)'),
            border: `1.5px solid ${iWon ? 'var(--neon-blue)' : (isDraw ? '#ccc' : 'var(--neon-red)')}`,
            color: '#fff',
            fontSize: '1rem',
            letterSpacing: '2px',
            boxShadow: `0 0 15px ${iWon ? 'var(--neon-blue-glow)' : (isDraw ? 'rgba(255,255,255,0.2)' : 'var(--neon-red-glow)')}`
          }}
        >
          {isDraw ? "🛠️ IT'S A TIE!" : (iWon ? "🎉 YOU WON THE ROUND!" : "💥 OPPONENT WON THE ROUND!")}
        </span>
        <h2 className="display-6 fw-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
          {statLabel} Clash
        </h2>
      </motion.div>

      {/* Clashing Arena Container */}
      <div 
        className="d-flex flex-column flex-md-row align-items-center justify-content-center w-100 gap-4"
        style={{ maxWidth: '900px' }}
      >
        {/* Left Side: My Card */}
        <motion.div
          initial={{ x: -150, opacity: 0, rotate: -5 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="d-flex flex-column align-items-center"
        >
          <div className="mb-2 text-uppercase tracking-wider small fw-bold text-white-50">
            {myUsername} (You)
          </div>
          <Card
            card={myCard}
            highlightedStat={statKey}
            winningCard={winnerRole === myRole}
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-3 fs-3 fw-bold text-center" 
            style={{ 
              fontFamily: 'var(--font-display)',
              color: winnerRole === myRole ? 'var(--neon-blue)' : '#aaa',
              textShadow: winnerRole === myRole ? '0 0 10px var(--neon-blue-glow)' : 'none'
            }}
          >
            {myValueDisplay}
          </motion.div>
        </motion.div>

        {/* Center VS Indicator */}
        <div className="d-flex flex-column align-items-center my-3 my-md-0 position-relative" style={{ zIndex: 10 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.6, type: 'spring' }}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-red) 0%, var(--neon-blue) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
              border: '3px solid var(--neon-gold)',
            }}
          >
            <span 
              className="text-white fw-bold tracking-tighter m-0" 
              style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontStyle: 'italic' }}
            >
              VS
            </span>
          </motion.div>
          {isDraw && (
            <span className="badge bg-secondary mt-2 text-uppercase">Tie Breaker</span>
          )}
        </div>

        {/* Right Side: Opponent Card */}
        <motion.div
          initial={{ x: 150, opacity: 0, rotate: 5 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="d-flex flex-column align-items-center"
        >
          <div className="mb-2 text-uppercase tracking-wider small fw-bold text-white-50">
            {opponentUsername} (Opponent)
          </div>
          <Card
            card={opponentCard}
            highlightedStat={statKey}
            winningCard={winnerRole !== myRole && !isDraw}
            isFlipped={true} // ensure opponent card flips face up!
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-3 fs-3 fw-bold text-center" 
            style={{ 
              fontFamily: 'var(--font-display)',
              color: winnerRole !== myRole && !isDraw ? 'var(--neon-red)' : '#aaa',
              textShadow: winnerRole !== myRole && !isDraw ? '0 0 10px var(--neon-red-glow)' : 'none'
            }}
          >
            {opponentValueDisplay}
          </motion.div>
        </motion.div>
      </div>

      {/* Countdown Visual Timer */}
      <div className="mt-5 w-100" style={{ maxWidth: '400px' }}>
        <p className="text-center text-white-50 small mb-2 text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>
          Preparing for next round...
        </p>
        <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3.2, ease: 'linear' }}
            style={{ height: '100%', background: 'linear-gradient(to right, var(--neon-blue), var(--neon-gold))' }}
          />
        </div>
      </div>
    </div>
  );
}
