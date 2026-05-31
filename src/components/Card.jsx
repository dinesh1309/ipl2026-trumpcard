import React from 'react';
import { motion } from 'framer-motion';

export default function Card({
  card,
  isInteractive = false,
  isOpponentCard = false,
  isFlipped = false, // true = face up, false = face down
  selectedStat = null,
  onSelectStat = null,
  highlightedStat = null, // for comparison screen
  winningCard = false
}) {
  if (!card) return null;

  const {
    name,
    team,
    teamShort,
    role,
    runs,
    strikeRate,
    average,
    fours,
    sixes,
    wickets,
    economy,
    fielding,
    powerplayImpact,
    middleOversImpact,
    deathOversImpact,
    cardType,
    badge,
    colorTheme,
    photo
  } = card;

  // Set borders and shadows based on theme
  let borderClass = 'blue-neon-border';
  let textClass = 'blue-neon-text';
  let badgeColor = 'rgba(0, 240, 255, 0.2)';
  let glowColor = 'var(--neon-blue)';

  if (colorTheme === 'silver') {
    borderClass = 'border-secondary shadow-sm';
    textClass = 'text-white-50';
    badgeColor = 'rgba(255, 255, 255, 0.15)';
    glowColor = '#c0c0c0';
  } else if (colorTheme === 'red-orange') {
    borderClass = 'red-neon-border';
    textClass = 'red-neon-text';
    badgeColor = 'rgba(255, 59, 48, 0.2)';
    glowColor = 'var(--neon-red)';
  }

  // Get stats specific to card phase
  const getStats = () => {
    switch (cardType) {
      case 'POWERPLAY':
        return [
          { label: 'Runs', value: runs, key: 'runs' },
          { label: 'Strike Rate', value: strikeRate, key: 'strikeRate' },
          { label: 'Average', value: average, key: 'average' },
          { label: 'Fours', value: fours, key: 'fours' },
          { label: 'PP Impact', value: powerplayImpact, key: 'powerplayImpact' }
        ];
      case 'MIDDLE_OVERS':
        return [
          { label: 'Runs', value: runs, key: 'runs' },
          { label: 'Average', value: average, key: 'average' },
          { label: 'Strike Rate', value: strikeRate, key: 'strikeRate' },
          { label: 'Fielding', value: fielding, key: 'fielding' },
          { label: 'MO Impact', value: middleOversImpact, key: 'middleOversImpact' }
        ];
      case 'DEATH_OVER':
        return [
          { label: 'Sixes', value: sixes, key: 'sixes' },
          { label: 'Strike Rate', value: strikeRate, key: 'strikeRate' },
          { label: 'Wickets', value: wickets, key: 'wickets' },
          { label: 'Economy', value: economy, key: 'economy', lowerIsBetter: true },
          { label: 'Death Impact', value: deathOversImpact, key: 'deathOversImpact' }
        ];
      default:
        return [];
    }
  };

  const statsList = getStats();

  const handleStatClick = (statKey) => {
    if (isInteractive && onSelectStat) {
      onSelectStat(statKey);
    }
  };

  // Render player image fallback if URL fails
  const renderPlayerPhoto = () => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
    return (
      <div className="position-relative overflow-hidden w-100 rounded-top" style={{ height: '140px', background: 'rgba(255, 255, 255, 0.03)' }}>
        <img
          src={photo}
          alt={name}
          className="w-100 h-100 object-fit-contain d-block mx-auto"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
          style={{ transition: 'all 0.3s ease', transform: 'scale(1.05)' }}
        />
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-none align-items-center justify-content-center"
          style={{
            background: `radial-gradient(circle, ${badgeColor} 0%, rgba(6,15,30,0.8) 100%)`,
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            color: '#fff',
            textShadow: `0 0 10px ${glowColor}`
          }}
        >
          {initials}
        </div>
        
        {/* Phase Badge */}
        <span
          className="position-absolute top-2 start-2 badge text-uppercase fw-bold"
          style={{
            backgroundColor: badgeColor,
            border: `1px solid ${glowColor}`,
            color: '#fff',
            fontSize: '0.7rem',
            letterSpacing: '1px',
            backdropFilter: 'blur(4px)',
            boxShadow: `0 0 8px ${glowColor}55`,
            zIndex: 10
          }}
        >
          {badge}
        </span>
        
        {/* Team tag */}
        <span
          className="position-absolute top-2 end-2 badge bg-dark bg-opacity-70 text-white border border-secondary"
          style={{ fontSize: '0.65rem', zIndex: 10 }}
        >
          {teamShort}
        </span>
      </div>
    );
  };

  return (
    <div 
      className={`flip-card ${isOpponentCard && !isFlipped ? '' : 'flipped'} mx-auto`} 
      style={{ width: '270px', height: '410px' }}
    >
      <div className="flip-card-inner">
        {/* CARD BACK (shown if opponent card and not flipped) */}
        <div className="flip-card-back card-back-premium rounded-4">
          <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
            {/* Inner frame */}
            <div className="border border-warning border-opacity-25 rounded-4 m-3 flex-fill d-flex flex-column align-items-center justify-content-center w-100" style={{ borderStyle: 'dashed !important' }}>
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center pulsing-glow" 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0) 80%)',
                  border: '2px solid var(--neon-gold)',
                  boxShadow: '0 0 20px var(--neon-gold-glow)'
                }}
              >
                <span className="text-warning fw-bold h3 m-0" style={{ fontFamily: 'var(--font-display)' }}>IPL</span>
              </div>
              <p className="mt-3 text-uppercase text-white-50 small tracking-widest" style={{ letterSpacing: '3px', fontSize: '0.7rem' }}>Top Trumps 2026</p>
              <div className="text-center position-absolute bottom-3 text-warning opacity-50 small">
                ⚡ ⚪ 🔥
              </div>
            </div>
          </div>
        </div>

        {/* CARD FRONT */}
        <div 
          className={`flip-card-front glass-panel rounded-4 overflow-hidden d-flex flex-column justify-content-between p-2 ${borderClass} ${winningCard ? 'pulsing-glow' : ''}`}
          style={{
            transition: 'box-shadow 0.3s ease',
            boxShadow: winningCard ? `0 0 35px 5px ${glowColor}` : undefined
          }}
        >
          {/* Photo & Badge */}
          {renderPlayerPhoto()}

          {/* Name & Role */}
          <div className="text-center my-1 px-1">
            <h4 
              className="m-0 text-truncate tracking-wide" 
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: winningCard ? '#fff' : undefined }}
            >
              {name}
            </h4>
            <div className="small text-white-50 text-truncate" style={{ fontSize: '0.75rem' }}>
              {role}
            </div>
          </div>

          {/* Stats List */}
          <div className="stats-grid mb-1">
            {statsList.map((stat) => {
              const isSelected = selectedStat === stat.key || highlightedStat === stat.key;
              const valueDisplay = stat.lowerIsBetter ? stat.value.toFixed(2) : stat.value;
              
              return (
                <div
                  key={stat.key}
                  onClick={() => handleStatClick(stat.key)}
                  className={`stat-row d-flex justify-content-between align-items-center ${isSelected ? 'selected' : ''}`}
                  style={{
                    cursor: isInteractive ? 'pointer' : 'default',
                    borderLeft: isSelected ? `3px solid ${glowColor}` : '1px solid rgba(255,255,255,0.05)',
                    padding: '6px 12px'
                  }}
                >
                  <span className={`fw-medium ${isSelected ? 'text-white' : 'text-white-50'}`} style={{ fontSize: '0.8rem' }}>
                    {stat.label}
                  </span>
                  <span 
                    className="fw-bold" 
                    style={{ 
                      fontFamily: 'var(--font-display)', 
                      fontSize: '1.1rem',
                      color: isSelected ? '#fff' : (colorTheme === 'blue-neon' ? 'var(--neon-blue)' : (colorTheme === 'red-orange' ? 'var(--neon-red)' : '#fff'))
                    }}
                  >
                    {valueDisplay}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Card Footer */}
          <div className="text-center text-white-50" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>
            {team}
          </div>
        </div>
      </div>
    </div>
  );
}
