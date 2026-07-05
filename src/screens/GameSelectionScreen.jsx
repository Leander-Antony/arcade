import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion, AnimatePresence } from 'framer-motion';
import { audioEngine } from '../utils/audioEngine';

const GAMES = [
  { id: 'mouse-duel', name: 'Mouse Duel', color: 'var(--neon-blue)', desc: 'Collect stars, avoid traps. First to 30 wins.', icon: '⭐' },
  { id: 'button-chaos', name: 'Grid Capture', color: 'var(--neon-red)', desc: 'Claim tiles and steal territory in 30 seconds!', icon: '🟩' },
  { id: 'puzzle-coop', name: 'Puzzle Co-op', color: 'var(--neon-purple)', desc: 'Work together to solve the jigsaw puzzle.', icon: '🧩' },
  { id: 'memory-flip', name: 'Memory Flip', color: 'var(--neon-green)', desc: 'Find matching pairs simultaneously.', icon: '🎴' },
  { id: 'tron-lightcycles', name: 'Tron Lightcycles', color: 'var(--neon-gold)', desc: 'Trap your opponent with your neon trail.', icon: '🏍️' },
  { id: 'maze-race', name: 'Maze Race', color: 'var(--neon-pink)', desc: 'Race through the dark to find the core.', icon: '🔦' }
];

export const GameSelectionScreen = () => {
  const [activeId, setActiveId] = useState(GAMES[0].id);

  const handleSelectGame = (gameId) => {
    audioEngine.playGameStart();
    peerSync.sendAction('SELECT_GAME', { gameId });
  };

  const activeGame = GAMES.find(g => g.id === activeId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex"
      style={{ 
        backgroundColor: '#050508', // Deep space black
        backgroundImage: 'linear-gradient(rgba(0, 216, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 216, 255, 0.04) 1px, transparent 1px), radial-gradient(circle at center, #10101a 0%, #000000 100%)',
        backgroundSize: '40px 40px, 40px 40px, 100% 100%',
        backgroundPosition: 'center center',
        padding: '60px 80px',
        position: 'relative',
        zIndex: 10,
        display: 'flex'
      }}
    >
      {/* Global Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)',
        pointerEvents: 'none',
        zIndex: 20
      }} />

      {/* LEFT PANEL: Game List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '2px solid rgba(255,255,255,0.05)', paddingRight: '40px' }}>
        
        <h2 className="retro-text animate-pulse-glow" style={{ color: 'var(--neon-pink)', fontSize: '2.5rem', letterSpacing: '8px', marginBottom: '40px', textShadow: '0 0 15px var(--neon-pink)' }}>
          SELECT GAME
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {GAMES.map((game) => {
            const isActive = activeId === game.id;
            return (
              <div 
                key={game.id}
                onMouseEnter={() => {
                  if (activeId !== game.id) {
                    audioEngine.playHoverBeep();
                    setActiveId(game.id);
                  }
                }}
                onClick={() => handleSelectGame(game.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '2rem',
                  cursor: 'none',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.2s',
                  position: 'relative'
                }}
              >
                {/* Neon Cursor */}
                <span style={{ 
                  width: '30px', 
                  color: 'var(--neon-blue)', 
                  opacity: isActive ? 1 : 0, 
                  textShadow: '0 0 10px var(--neon-blue)',
                  transition: 'opacity 0.2s',
                  display: 'inline-block'
                }}>
                  ▶
                </span>
                
                <span className="retro-text" style={{ 
                  textShadow: isActive ? `0 0 20px ${game.color}, 0 0 40px ${game.color}` : 'none',
                  letterSpacing: isActive ? '8px' : '2px',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: isActive ? 'translateX(10px)' : 'none',
                  display: 'inline-block'
                }}>
                  {game.name.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
          <button 
            className="btn" 
            style={{ 
              color: 'var(--text-muted)', 
              border: '2px solid rgba(255,255,255,0.2)', 
              fontSize: '1rem', 
              padding: '10px 20px',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={() => audioEngine.playHoverBeep()}
            onClick={() => peerSync.sendAction('RETURN_HOME')}
          >
            ← BACK TO LOBBY
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Large Preview */}
      <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center', alignItems: 'center', paddingLeft: '60px' }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeGame.id}
            initial={{ opacity: 0, scale: 0.8, x: 50, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, x: 0, rotateY: -5 }}
            exit={{ opacity: 0, scale: 0.8, x: -50, rotateY: -15 }}
            transition={{ duration: 0.3, type: 'spring' }}
            style={{
              width: '100%',
              maxWidth: '550px',
              backgroundColor: 'rgba(10,10,20,0.85)',
              border: `2px solid ${activeGame.color}`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 40px ${activeGame.color}44, inset 0 0 20px ${activeGame.color}22`,
              borderRadius: '16px',
              padding: '60px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Holographic grid inside the card */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(${activeGame.color}22 1px, transparent 1px), linear-gradient(90deg, ${activeGame.color}22 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              opacity: 0.3,
              pointerEvents: 'none',
              zIndex: 0
            }}></div>

            {/* Top scanning line effect purely for aesthetic */}
            <div className="animate-pulse-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: activeGame.color, boxShadow: `0 0 30px ${activeGame.color}, 0 0 10px #fff` }} />

            <div style={{ fontSize: '8rem', marginBottom: '30px', filter: `drop-shadow(0 0 40px ${activeGame.color})`, zIndex: 1 }}>
              {activeGame.icon}
            </div>

            <h3 className="retro-text" style={{ fontSize: '2.8rem', color: '#fff', textAlign: 'center', marginBottom: '20px', textShadow: `0 0 20px ${activeGame.color}`, letterSpacing: '4px', zIndex: 1 }}>
              {activeGame.name.toUpperCase()}
            </h3>

            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', textAlign: 'center', lineHeight: '1.6', marginBottom: '30px', minHeight: '60px', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {activeGame.desc}
            </p>

            <div 
              className="retro-text animate-pulse-glow"
              style={{
                color: activeGame.color,
                fontSize: '1rem',
                letterSpacing: '8px',
                textShadow: `0 0 10px ${activeGame.color}`,
                zIndex: 1,
                opacity: 0.8
              }}
            >
              [ SYSTEM READY ]
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </motion.div>
  );
};

