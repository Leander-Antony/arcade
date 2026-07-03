import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';
import { audioEngine } from '../utils/audioEngine';

const GAMES = [
  { id: 'mouse-duel', name: 'Mouse Duel', color: 'var(--neon-blue)', desc: 'Collect stars, avoid traps. First to 30 wins.', icon: '⭐' },
  { id: 'button-chaos', name: 'Grid Capture', color: 'var(--neon-red)', desc: 'Claim tiles and steal territory in 30 seconds!', icon: '🟩' },
  { id: 'puzzle-coop', name: 'Puzzle Co-op', color: 'var(--neon-purple)', desc: 'Work together to solve the jigsaw puzzle.', icon: '🧩' },
  { id: 'memory-flip', name: 'Memory Flip', color: 'var(--neon-green)', desc: 'Find matching pairs simultaneously.', icon: '🎴' },
  { id: 'laser-maze', name: 'Laser Maze', color: 'var(--neon-gold)', desc: 'P1 controls mirrors, P2 moves character.', icon: '⚡' }
];

export const GameSelectionScreen = () => {
  const handleSelectGame = (gameId) => {
    audioEngine.playGameStart();
    peerSync.sendAction('SELECT_GAME', { gameId });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-center flex-col h-full w-full"
      style={{ position: 'relative', zIndex: 10 }}
    >
      <h2 className="retro-text neon-text-baby-pink animate-flicker" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', letterSpacing: '2px', textAlign: 'center' }}>
        SELECT MINIGAME
      </h2>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '15px', 
        maxWidth: '1200px', 
        width: '95%' 
      }}>
        {GAMES.map((game, idx) => (
          <motion.div 
            key={game.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${game.color}88, inset 0 0 15px ${game.color}44` }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => audioEngine.playHoverBeep()}
            onClick={() => handleSelectGame(game.id)}
            className="glass-panel"
            style={{ 
              padding: '1.5rem 1rem', 
              width: '180px',
              height: '240px',
              cursor: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              border: `2px solid ${game.color}`,
              boxShadow: `0 0 10px ${game.color}44, inset 0 0 10px ${game.color}22`,
              borderTop: `6px solid ${game.color}`,
              background: `linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(20,20,30,0.9) 100%)`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Cabinet Screen Glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
              background: `radial-gradient(circle at top, ${game.color}33 0%, transparent 70%)`,
              pointerEvents: 'none'
            }}></div>

            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', filter: `drop-shadow(0 0 10px ${game.color})` }}>
              {game.icon}
            </div>
            
            <h3 className="retro-text" style={{ 
              color: game.color, 
              fontSize: '1.3rem', 
              marginBottom: '1rem', 
              textAlign: 'center', 
              textShadow: `0 0 10px ${game.color}`,
              lineHeight: '1.1'
            }}>
              {game.name}
            </h3>
            
            <p style={{ 
              color: 'var(--text-main)', 
              textAlign: 'center', 
              fontSize: '0.8rem', 
              lineHeight: '1.3',
              flex: 1
            }}>
              {game.desc}
            </p>

            <div className="retro-text animate-pulse-glow" style={{ color: game.color, fontSize: '0.9rem', marginTop: '0.5rem' }}>
              [ PLAY ]
            </div>
          </motion.div>
        ))}
      </div>
      
      <button 
        className="btn" 
        style={{ marginTop: '2rem', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', fontSize: '1rem', padding: '10px 20px' }}
        onMouseEnter={() => audioEngine.playHoverBeep()}
        onClick={() => peerSync.sendAction('RETURN_HOME')}
      >
        BACK TO LOBBY
      </button>
    </motion.div>
  );
};
