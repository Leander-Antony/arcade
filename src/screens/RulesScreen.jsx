import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const GAME_RULES = {
  'mouse-duel': {
    title: 'Mouse Duel',
    rules: [
      'Random stars spawn on the board.',
      'Collect stars by touching them with your cursor (+1 point).',
      'Avoid traps! Touching them deducts 1 point.',
      'First player to reach 30 points wins.'
    ],
    color: 'var(--neon-blue)'
  },
  'button-chaos': {
    title: 'Button Chaos',
    rules: [
      'Random buttons will appear on screen.',
      'Click the active button to score points.',
      'Standard Button = +1',
      'Green Button = +2',
      'Gold Button = +3',
      'Red Button = -1 (AVOID!)',
      'First to 15 points wins.'
    ],
    color: 'var(--neon-red)'
  },
  'puzzle-coop': {
    title: 'Puzzle Co-op',
    rules: [
      'Work together to complete a jigsaw puzzle.',
      'Both players can drag pieces simultaneously.',
      'Pieces will snap into place when near correct spots.',
      'No score, just teamwork!'
    ],
    color: 'var(--neon-purple)'
  },
  'memory-flip': {
    title: 'Memory Flip',
    rules: [
      'Shared grid of face-down cards.',
      'Both players can click and flip anytime (no turns).',
      'Find matching pairs to claim them (+1 point).',
      'Highest score when all cards are claimed wins.'
    ],
    color: 'var(--neon-green)'
  },
  'laser-maze': {
    title: 'Laser Maze',
    rules: [
      'Cooperative teamwork required.',
      'Player 1 (Blue) clicks mirrors to rotate them.',
      'Player 2 (Red) uses W,A,S,D to move the character.',
      'Guide the laser to the exit to unlock it!'
    ],
    color: 'var(--neon-gold)'
  }
};

export const RulesScreen = () => {
  const currentGame = useGameStore(state => state.currentGame);
  const isHost = useGameStore(state => state.isHost);
  
  const gameInfo = GAME_RULES[currentGame];

  if (!gameInfo) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="flex-center flex-col h-full w-full"
    >
      <div className="glass-panel" style={{ 
        padding: '3rem', 
        width: '80%', 
        maxWidth: '700px', 
        border: `1px solid ${gameInfo.color}88`,
        boxShadow: `0 0 30px ${gameInfo.color}33`
      }}>
        <h2 style={{ color: gameInfo.color, fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center', textShadow: `0 0 10px ${gameInfo.color}` }}>
          {gameInfo.title} Rules
        </h2>
        
        <ul style={{ listStyle: 'none', marginBottom: '3rem' }}>
          {gameInfo.rules.map((rule, idx) => (
            <motion.li 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{ 
                fontSize: '1.2rem', 
                marginBottom: '1rem', 
                display: 'flex', 
                alignItems: 'center' 
              }}
            >
              <span style={{ 
                color: gameInfo.color, 
                marginRight: '15px', 
                fontSize: '1.5rem' 
              }}>▸</span>
              {rule}
            </motion.li>
          ))}
        </ul>

        <div className="flex-center" style={{ gap: '20px' }}>
          <button 
            className="btn btn-primary"
            style={{ borderColor: gameInfo.color, color: gameInfo.color, boxShadow: `0 0 15px ${gameInfo.color}44` }}
            onClick={() => peerSync.sendAction('START_GAME')}
          >
            START GAME
          </button>
          
          <button 
            className="btn" 
            style={{ color: 'var(--text-muted)', border: '1px solid var(--text-muted)' }}
            onClick={() => peerSync.sendAction('GOTO_SELECT')}
          >
            BACK
          </button>
        </div>
      </div>
    </motion.div>
  );
};
