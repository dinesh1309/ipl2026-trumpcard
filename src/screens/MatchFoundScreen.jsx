import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MatchFoundScreen({
  playerA,
  playerB,
  startingTurn,
  onCountdownComplete
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown === 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCountdownComplete]);

  return (
    <div 
      className="d-flex flex-column align-items-center justify-content-center min-height-viewport overflow-hidden"
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'linear-gradient(135deg, #030814 0%, #0c1a30 50%, #030814 100%)',
        zIndex: 900
      }}
    >
      {/* Broadcast Match Tag */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="text-center mb-5"
      >
        <span 
          className="badge bg-warning bg-opacity-10 border border-warning px-4 py-2 text-warning fw-bold tracking-widest text-uppercase"
          style={{ letterSpacing: '3px', fontSize: '0.85rem', boxShadow: '0 0 10px rgba(255,215,0,0.1)' }}
        >
          ⚔️ Match Found ⚔️
        </span>
        <h2 className="display-5 text-white fw-bold tracking-wide mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          Battle Arena Ready
        </h2>
      </motion.div>

      {/* Clashing Sides */}
      <div 
        className="d-flex flex-column flex-md-row align-items-center justify-content-center w-100 gap-4 mb-5"
        style={{ maxWidth: '850px', padding: '0 20px' }}
      >
        {/* Player A (Left side / Cyan) */}
        <motion.div
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 0.1 }}
          className="flex-fill text-center glass-panel p-4 blue-neon-border w-100"
          style={{ borderRadius: '20px' }}
        >
          <div className="text-white-50 text-uppercase tracking-widest small mb-1">Player 1</div>
          <h3 
            className="blue-neon-text fw-bold m-0 text-truncate"
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}
          >
            {playerA?.username}
          </h3>
          <div className="text-white-50 small mt-2">Deck Size: {playerA?.cardsCount || 8} Cards</div>
        </motion.div>

        {/* VS Clash Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1.1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, delay: 0.3 }}
          className="d-flex align-items-center justify-content-center bg-dark rounded-circle"
          style={{
            width: '70px',
            height: '70px',
            border: '2px dashed var(--neon-gold)',
            boxShadow: '0 0 15px var(--neon-gold-glow)',
            zIndex: 10
          }}
        >
          <span 
            className="text-warning fw-black font-italic m-0"
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem' }}
          >
            VS
          </span>
        </motion.div>

        {/* Player B (Right side / Gold-Red) */}
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 0.1 }}
          className="flex-fill text-center glass-panel p-4 gold-neon-border w-100"
          style={{ borderRadius: '20px' }}
        >
          <div className="text-white-50 text-uppercase tracking-widest small mb-1">Player 2</div>
          <h3 
            className="gold-neon-text fw-bold m-0 text-truncate"
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}
          >
            {playerB?.username}
          </h3>
          <div className="text-white-50 small mt-2">Deck Size: {playerB?.cardsCount || 8} Cards</div>
        </motion.div>
      </div>

      {/* Starting indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-white-50 small mb-4"
      >
        🏏 First Pick Turn: <span className="text-white fw-bold">{startingTurn}</span>
      </motion.div>

      {/* Large Glowing Countdown */}
      <div className="position-relative d-flex align-items-center justify-content-center" style={{ height: '140px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.2, 1], opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="display-1 fw-bold text-center"
            style={{
              fontFamily: 'var(--font-display)',
              color: countdown === 1 ? 'var(--neon-red)' : (countdown === 2 ? 'var(--neon-gold)' : 'var(--neon-blue)'),
              textShadow: `0 0 25px ${countdown === 1 ? 'var(--neon-red-glow)' : (countdown === 2 ? 'var(--neon-gold-glow)' : 'var(--neon-blue-glow)')}`,
              fontSize: '6.5rem'
            }}
          >
            {countdown === 0 ? "PLAY!" : countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
