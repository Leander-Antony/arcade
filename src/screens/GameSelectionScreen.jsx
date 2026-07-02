import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const GAMES = [
  { id: 'mouse-duel', name: 'Mouse Duel', color: 'var(--neon-blue)', desc: 'Collect stars, avoid traps. First to 30 wins.' },
  { id: 'button-chaos', name: 'Button Chaos', color: 'var(--neon-red)', desc: 'Click the active button. Watch out for red ones!' },
  { id: 'puzzle-coop', name: 'Puzzle Co-op', color: 'var(--neon-purple)', desc: 'Work together to solve the jigsaw puzzle.' },
  { id: 'memory-flip', name: 'Memory Flip', color: 'var(--neon-green)', desc: 'Find matching pairs simultaneously.' },
  { id: 'laser-maze', name: 'Laser Maze', color: 'var(--neon-gold)', desc: 'P1 controls mirrors, P2 moves character.' }
];

export const GameSelectionScreen = () => {
  const handleSelectGame = (gameId) => {
    peerSync.sendAction('SELECT_GAME', { gameId });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-center flex-col h-full w-full"
    >
      <h2 className="neon-text-purple" style={{ fontSize: '3rem', marginBottom: '3rem', letterSpacing: '2px' }}>SELECT MINIGAME</h2>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '24px', 
        maxWidth: '1000px', 
        width: '90%' 
      }}>
        {GAMES.map((game) => (
          <motion.div 
            key={game.id}
            whileHover={{ scale: 1.05, boxShadow: `0 0 25px ${game.color}88` }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectGame(game.id)}
            className="glass-panel"
            style={{ 
              padding: '2rem', 
              width: '280px',
              cursor: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              border: `1px solid ${game.color}55`,
              boxShadow: `0 0 10px ${game.color}33`,
            }}
          >
            <h3 style={{ color: game.color, fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center', textShadow: `0 0 10px ${game.color}` }}>{game.name}</h3>
            <p style={{ color: 'var(--text-main)', textAlign: 'center', fontSize: '0.95rem', lineHeight: '1.4' }}>{game.desc}</p>
          </motion.div>
        ))}
      </div>
      
      <button 
        className="btn" 
        style={{ marginTop: '3rem', color: 'var(--text-muted)', border: '1px solid var(--text-muted)' }}
        onClick={() => peerSync.sendAction('RETURN_HOME')}
      >
        BACK TO LOBBY
      </button>
    </motion.div>
  );
};
