import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, MessageCircle } from 'lucide-react';
import Card from '../components/Card';

const EMOJIS = ['🔥', '😂', '👑', '😮', '🏏', '💥'];

export default function BattleArena({
  myDeck,
  opponentCardCount,
  isMyTurn,
  opponentName,
  myUsername,
  onSelectStat,
  onSendEmoji,
  incomingEmoji
}) {
  const [selectedStat, setSelectedStat] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const activeCard = myDeck[0];
  // Opponent's card is masked as a placeholder representing their current phase
  // In a real match, opponent's card is generated on the fly.
  // We can deduce opponent's active card type based on how many cards are left.
  // Full deck = 8 cards.
  // Opponent card type matches the corresponding card number in their deck.
  const getCardTypeFromCount = (count) => {
    // Deck has 8 cards originally
    // Cards 1-3 are Powerplay (count is 8, 7, 6)
    // Cards 4-6 are Middle Overs (count is 5, 4, 3)
    // Cards 7-8 are Death Overs (count is 2, 1)
    if (count >= 6) return { cardType: 'POWERPLAY', badge: '⚡ POWERPLAY', colorTheme: 'blue-neon' };
    if (count >= 3) return { cardType: 'MIDDLE_OVERS', badge: '⚪ MIDDLE OVERS', colorTheme: 'silver' };
    return { cardType: 'DEATH_OVER', badge: '🔥 DEATH OVER', colorTheme: 'red-orange' };
  };

  const opponentMaskCard = getCardTypeFromCount(opponentCardCount);

  const handleStatSelect = (statKey) => {
    if (!isMyTurn) return;
    setSelectedStat(statKey);
    // Add small delay to let selected highlight display
    setTimeout(() => {
      onSelectStat(statKey);
      setSelectedStat(null);
    }, 400);
  };

  const handleEmojiClick = (emoji) => {
    onSendEmoji(emoji);
    setEmojiOpen(false);
  };

  // Determine game phase percentage (Powerplay -> Middle -> Death)
  // Total cards in play = myDeck.length + opponentCardCount
  const getPhaseProgress = () => {
    const remaining = myDeck.length + opponentCardCount;
    // Max remaining is 16
    if (remaining > 10) return { phase: 'Powerplay Phase', progress: 30, color: '#00f0ff' };
    if (remaining > 4) return { phase: 'Middle Overs Phase', progress: 65, color: '#ffd700' };
    return { phase: 'Death Overs Battle!', progress: 90, color: '#ff3b30' };
  };

  const phaseDetails = getPhaseProgress();

  return (
    <div className="battle-arena-layout mx-auto w-100 position-relative" style={{ maxWidth: '500px' }}>
      
      {/* Floating incoming emoji bursts */}
      <AnimatePresence>
        {incomingEmoji && (
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ scale: [1, 2.5, 2], y: -200, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.8 }}
            className="position-absolute start-50 translate-middle-x fs-1 text-center"
            style={{ zIndex: 1000, pointerEvents: 'none', top: '40%' }}
          >
            <div className="bg-dark bg-opacity-70 border border-warning px-3 py-1 rounded-pill shadow-lg">
              {incomingEmoji}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP: OPPONENT ROW */}
      <div className="glass-panel p-2 d-flex flex-column align-items-center border-secondary mt-1" style={{ borderRadius: '18px' }}>
        <div className="d-flex justify-content-between align-items-center w-100 px-3 py-1">
          <div className="d-flex align-items-center gap-2">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff3b30' }} />
            <span className="small text-white-50 fw-bold">{opponentName}</span>
          </div>
          <span className="badge bg-dark border border-secondary text-white-50 px-2 py-1" style={{ fontSize: '0.7rem' }}>
            🎴 Deck: {opponentCardCount} Left
          </span>
        </div>

        {/* Card back visual */}
        <div className="py-2" style={{ transform: 'scale(0.85)', margin: '-25px 0' }}>
          <Card
            card={opponentMaskCard}
            isOpponentCard={true}
            isFlipped={false}
          />
        </div>
      </div>

      {/* MIDDLE: PHASE SLIDER & TURN BANNER */}
      <div className="d-flex flex-column align-items-center my-1 w-100 px-2">
        {/* Innings phase progress */}
        <div className="w-100 bg-dark bg-opacity-65 border border-secondary px-3 py-1 rounded-pill mb-2 d-flex align-items-center justify-content-between">
          <span className="text-uppercase fw-bold text-white" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: phaseDetails.color }}>
            🏏 {phaseDetails.phase}
          </span>
          <div className="flex-fill mx-3 bg-secondary bg-opacity-20 rounded-pill overflow-hidden" style={{ height: '5px' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${phaseDetails.progress}%`, 
                backgroundColor: phaseDetails.color,
                transition: 'all 0.5s ease',
                boxShadow: `0 0 10px ${phaseDetails.color}`
              }} 
            />
          </div>
          <span className="small text-white-50 fw-bold" style={{ fontSize: '0.65rem' }}>
            {myDeck.length + opponentCardCount}/16 Cards
          </span>
        </div>

        {/* Turn banner indicator */}
        <div className="w-100 position-relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-100 text-center py-2 rounded-4 text-uppercase fw-bold ${isMyTurn ? 'blue-neon-border' : 'border border-secondary bg-dark bg-opacity-50'}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              letterSpacing: '1.5px',
              backgroundColor: isMyTurn ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)'
            }}
          >
            {isMyTurn ? (
              <span className="blue-neon-text pulsing-glow">⚡ YOUR PICK! Select a Stat</span>
            ) : (
              <span className="text-white-50">🔴 OPPONENT IS PICKING...</span>
            )}
          </motion.div>

          {/* Floating Emoji Reactions menu */}
          <div className="position-absolute end-2 top-50 translate-middle-y" style={{ zIndex: 50 }}>
            <button
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="btn btn-sm btn-dark border-secondary rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px' }}
            >
              <MessageCircle size={16} className="text-white-50" />
            </button>
            
            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: -70 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="position-absolute bg-dark border border-secondary p-1 rounded-pill d-flex gap-1"
                  style={{ top: '-4px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                >
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => handleEmojiClick(e)}
                      className="btn btn-sm border-0 p-1 fs-5 leading-none transition-transform hover-scale"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* BOTTOM: PLAYERS ACTIVE CARD */}
      <div className="glass-panel p-2 d-flex flex-column align-items-center border-secondary mb-1" style={{ borderRadius: '18px' }}>
        <div className="w-100 px-3 py-1 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span className="small text-white fw-bold">{myUsername} (You)</span>
          </div>
          <span className="badge bg-dark border border-secondary text-info px-2 py-1" style={{ fontSize: '0.7rem' }}>
            🎴 Deck: {myDeck.length} Left
          </span>
        </div>

        {/* Player card display */}
        <div className="py-2" style={{ transform: 'scale(0.88)', margin: '-22px 0' }}>
          <Card
            card={activeCard}
            isInteractive={isMyTurn}
            isOpponentCard={false}
            isFlipped={true}
            selectedStat={selectedStat}
            onSelectStat={handleStatSelect}
          />
        </div>
      </div>
      
    </div>
  );
}
