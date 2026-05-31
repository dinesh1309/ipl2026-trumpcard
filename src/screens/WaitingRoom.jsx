import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';

const TRIVIA_TIPS = [
  "⚡ POWERPLAY CARDS: Prioritize extreme Batting Strike Rates, Runs, and boundary-focused Impact ratings.",
  "⚪ MIDDLE OVERS CARDS: Look out for steady Averages, consistent Runs, and critical Fielding scores to dominate.",
  "🔥 DEATH OVER CARDS: Heavy focus on Bowling Wickets, Sixes, and Economy. Remember: LOW bowling economy wins!",
  "🏏 ECONOMY RULE: For the Economy stat, the LOWER value wins! Keep this in mind to outsmart opponents in the final phase.",
  "🏆 INNINGS FLOW: The game naturally transitions: Cards 1-3 (Powerplay) → Cards 4-6 (Middle Overs) → Cards 7-8 (Death Overs).",
  "⭐ DYNAMIC STATS: All cards are dynamically computed from players.json. Changing the JSON alters card values instantly."
];

export default function WaitingRoom({ queueCount = 0, onCancel }) {
  const [triviaIndex, setTriviaIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTriviaIndex((prev) => (prev + 1) % TRIVIA_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-height-viewport py-4" style={{ minHeight: '94vh' }}>
      <div 
        className="glass-panel p-5 w-100 text-center blue-neon-border"
        style={{ maxWidth: '440px', borderRadius: '28px' }}
      >
        {/* Radar matchmaker search circle */}
        <div className="position-relative mx-auto mb-4" style={{ width: '130px', height: '130px' }}>
          {/* Radar lines */}
          <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle" 
            style={{ 
              width: '100%', 
              height: '100%', 
              border: '2px solid rgba(0, 240, 255, 0.1)',
            }} 
          />
          <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle" 
            style={{ 
              width: '70%', 
              height: '70%', 
              border: '1.5px dashed rgba(0, 240, 255, 0.15)',
            }} 
          />
          <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle" 
            style={{ 
              width: '40%', 
              height: '40%', 
              border: '1px solid rgba(0, 240, 255, 0.2)',
            }} 
          />

          {/* Sweeping Sonar hand */}
          <div 
            className="position-absolute w-100 h-100" 
            style={{ 
              animation: 'stadiumLightRotate 4s linear infinite',
              top: 0,
              left: 0,
            }}
          >
            <div 
              style={{
                width: '50%',
                height: '4px',
                background: 'linear-gradient(to right, rgba(0, 240, 255, 0.8), transparent)',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transformOrigin: 'left center',
                boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
              }}
            />
          </div>

          {/* Pulsing Core */}
          <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle bg-info pulsing-glow" 
            style={{ 
              width: '16px', 
              height: '16px', 
              boxShadow: '0 0 15px #00f0ff',
              backgroundColor: '#00f0ff'
            }} 
          />
        </div>

        {/* Searching Status */}
        <h3 className="sports-header blue-neon-text pulsing-glow mb-1" style={{ fontSize: '2rem', letterSpacing: '2px' }}>
          Finding Opponent...
        </h3>
        
        {/* Strict 1v1 notice */}
        <p className="text-white-50 small mb-4 text-uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>
          Strict even-pairing matchmaking
        </p>

        {/* Info stats box */}
        <div className="bg-dark bg-opacity-50 border border-secondary p-3 rounded-4 mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <RefreshCw size={14} className="text-info animate-spin" />
            <span className="small text-white fw-bold uppercase">Lobby Status</span>
          </div>
          <div className="d-flex justify-content-around text-center mt-2">
            <div>
              <div className="h4 m-0 text-info fw-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>1v1</div>
              <div className="small text-white-50" style={{ fontSize: '0.65rem' }}>Strict format</div>
            </div>
            <div className="border-start border-secondary" />
            <div>
              <div className="h4 m-0 text-warning fw-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>{queueCount}</div>
              <div className="small text-white-50" style={{ fontSize: '0.65rem' }}>In queue</div>
            </div>
          </div>
        </div>

        {/* Trivia Tips slider (Broadcast style) */}
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.p
            key={triviaIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="text-white-50 small font-italic px-2 mb-0"
            style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
          >
            {TRIVIA_TIPS[triviaIndex]}
          </motion.p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="btn btn-outline-danger btn-sm rounded-pill mt-4 px-4 py-2 text-uppercase d-inline-flex align-items-center gap-1 small"
          style={{ letterSpacing: '1px', fontSize: '0.75rem' }}
        >
          <X size={14} /> Leave Queue
        </button>
      </div>
    </div>
  );
}
