import React from 'react';
import { Trophy, ArrowRight, Home, RefreshCw, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultScreen({
  winnerName,
  myUsername,
  roundsPlayed = 0,
  cardsWon = 16,
  onPlayAgain,
  onGoHome,
  opponentRequestedRematch = false,
  onRequestRematch,
  rematchRequested = false
}) {
  const iWon = winnerName === myUsername;

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-height-viewport py-4" style={{ minHeight: '94vh' }}>
      
      {/* Victory / Defeat Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        className="text-center mb-4"
      >
        <div 
          className="d-inline-flex align-items-center justify-content-center mb-3"
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: iWon 
              ? 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(0,0,0,0) 80%)' 
              : 'radial-gradient(circle, rgba(255,59,48,0.3) 0%, rgba(0,0,0,0) 80%)',
            border: `3px solid ${iWon ? 'var(--neon-gold)' : 'var(--neon-red)'}`,
            boxShadow: `0 0 25px ${iWon ? 'var(--neon-gold-glow)' : 'var(--neon-red-glow)'}`
          }}
        >
          {iWon ? (
            <Trophy size={50} className="text-warning pulsing-glow" />
          ) : (
            <Award size={50} className="text-danger pulsing-glow" />
          )}
        </div>
        
        <h1 
          className={`display-3 fw-black m-0 text-uppercase tracking-wider ${iWon ? 'gold-neon-text' : 'red-neon-text'}`}
          style={{ fontFamily: 'var(--font-display)', fontSize: '4.2rem', lineHeight: 0.95 }}
        >
          {iWon ? "Champion!" : "Runner-Up!"}
        </h1>
        <h2 className="h5 text-white-50 text-uppercase tracking-widest mt-2" style={{ fontSize: '0.9rem', letterSpacing: '3px' }}>
          {iWon ? "You ruled the stadium" : "Spectacular battle effort"}
        </h2>
      </motion.div>

      {/* Match Scoreboard Summary */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-4 w-100 mb-4 border border-secondary text-center"
        style={{ maxWidth: '420px', borderRadius: '24px' }}
      >
        <h3 className="sports-header text-white-50 small mb-3 tracking-widest" style={{ fontSize: '0.8rem' }}>
          Match Summary Board
        </h3>

        {/* Stats Grid */}
        <div className="d-flex flex-column gap-3 mb-4">
          <div className="d-flex justify-content-between align-items-center bg-dark bg-opacity-40 p-3 rounded-3 border border-secondary">
            <span className="small text-white-50 uppercase fw-bold">Winner</span>
            <span className={`fw-bold text-uppercase fs-5 ${iWon ? 'text-warning' : 'text-danger'}`} style={{ fontFamily: 'var(--font-display)' }}>
              {winnerName}
            </span>
          </div>

          <div className="d-flex justify-content-between align-items-center bg-dark bg-opacity-40 p-3 rounded-3 border border-secondary">
            <span className="small text-white-50 uppercase fw-bold">Rounds Played</span>
            <span className="fw-bold fs-5 text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {roundsPlayed}
            </span>
          </div>

          <div className="d-flex justify-content-between align-items-center bg-dark bg-opacity-40 p-3 rounded-3 border border-secondary">
            <span className="small text-white-50 uppercase fw-bold">Cards Collected</span>
            <span className="fw-bold fs-5 text-info" style={{ fontFamily: 'var(--font-display)' }}>
              {iWon ? cardsWon : (16 - cardsWon)} / 16
            </span>
          </div>
        </div>

        {/* Rematch status alert */}
        {opponentRequestedRematch && !rematchRequested && (
          <div className="alert alert-info border-info bg-dark bg-opacity-80 py-2 px-3 small text-center mb-3">
            🤝 Opponent has challenged you to a Rematch!
          </div>
        )}

        {/* Action Controls */}
        <div className="d-flex flex-column gap-2">
          {/* Rematch or Search Again */}
          <button
            onClick={onPlayAgain}
            className={`w-100 py-3 d-flex align-items-center justify-content-center gap-2 ${iWon ? 'gold-neon-btn' : 'blue-neon-btn'}`}
          >
            <RefreshCw size={20} className="animate-spin-hover" /> 
            {opponentRequestedRematch ? "Accept Rematch" : (rematchRequested ? "Waiting for Opponent..." : "Play Again / Matchmake")}
          </button>

          {/* Go Home */}
          <button
            onClick={onGoHome}
            className="btn btn-outline-light border-secondary text-uppercase py-2 rounded-5 small mt-2"
            style={{ fontSize: '0.85rem', letterSpacing: '1.5px' }}
          >
            <Home size={14} className="align-middle me-1" /> Home Screen
          </button>
        </div>
      </motion.div>
      
    </div>
  );
}
