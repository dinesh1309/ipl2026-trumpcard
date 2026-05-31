import React, { useState } from 'react';
import { Trophy, Users, Camera, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomeScreen({
  onPlayOnline,
  onPlayOffline,
  onOpenScanner,
  onlineCount = 0
}) {
  const [username, setUsername] = useState(() => {
    // Generate a default nickname
    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    return `IPL_Player_${randomSuffix}`;
  });

  const handleOnlineClick = () => {
    if (username.trim()) {
      onPlayOnline(username.trim());
    }
  };

  const handleOfflineClick = (mode) => {
    if (username.trim()) {
      onPlayOffline(username.trim(), mode);
    }
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-height-viewport py-4" style={{ minHeight: '94vh' }}>
      {/* Title logo section */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="text-center mb-4"
      >
        <div 
          className="d-inline-flex align-items-center justify-content-center mb-2"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--neon-gold) 0%, rgba(0,0,0,0) 80%)',
            border: '2px solid var(--neon-gold)',
            boxShadow: '0 0 15px var(--neon-gold-glow)'
          }}
        >
          <Trophy size={30} className="text-warning" />
        </div>
        <h1 
          className="display-2 fw-black m-0 tracking-wide gold-neon-text" 
          style={{ 
            fontFamily: 'var(--font-display)', 
            lineHeight: 0.95,
            fontSize: '4.5rem'
          }}
        >
          IPL 2026
        </h1>
        <h2 
          className="h4 text-uppercase tracking-widest text-white fw-bold mb-3"
          style={{ letterSpacing: '4px', fontSize: '1.1rem' }}
        >
          Top Trumps Edition
        </h2>
      </motion.div>

      {/* Username / Settings card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-4 w-100 mb-4 border border-secondary"
        style={{ maxWidth: '420px', borderRadius: '24px' }}
      >
        <div className="mb-4">
          <label className="form-label text-uppercase tracking-wider small fw-bold text-white-50 mb-2">
            Enter Player Nickname
          </label>
          <input
            type="text"
            className="form-control form-control-lg bg-dark bg-opacity-70 text-white text-center rounded-3 border-secondary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nickname"
            maxLength={18}
            style={{ fontSize: '1.2rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}
          />
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-column gap-3">
          {/* Play Online Matchmaking */}
          <button
            onClick={handleOnlineClick}
            className="w-100 blue-neon-btn d-flex align-items-center justify-content-center gap-2"
          >
            <Users size={20} /> Join Matchmaking Room
          </button>

          <div className="d-flex gap-2">
            {/* Scan QR */}
            <button
              onClick={onOpenScanner}
              className="flex-fill gold-neon-btn d-flex align-items-center justify-content-center gap-2 py-2"
              style={{ fontSize: '1.1rem' }}
            >
              <Camera size={18} /> Invite QR
            </button>

            {/* Offline Local Battle */}
            <button
              onClick={() => handleOfflineClick('vs_ai')}
              className="flex-fill red-neon-btn d-flex align-items-center justify-content-center gap-2 py-2"
              style={{ fontSize: '1.1rem' }}
            >
              <Flame size={18} /> Play VS AI
            </button>
          </div>
          
          <button
            onClick={() => handleOfflineClick('pass_play')}
            className="btn btn-outline-light border-secondary text-uppercase py-2 rounded-5 small"
            style={{ fontSize: '0.8rem', letterSpacing: '1px' }}
          >
            Pass & Play Mode (Local)
          </button>
        </div>
      </motion.div>

      {/* Online indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="d-flex align-items-center justify-content-center gap-2"
      >
        <span className="position-relative d-inline-flex" style={{ width: '10px', height: '10px' }}>
          <span className="animate-ping position-absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-success" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
        </span>
        <span className="small text-white-50 text-uppercase tracking-widest" style={{ letterSpacing: '1.5px', fontSize: '0.75rem' }}>
          {onlineCount} Player{onlineCount !== 1 ? 's' : ''} Online
        </span>
      </motion.div>
    </div>
  );
}
