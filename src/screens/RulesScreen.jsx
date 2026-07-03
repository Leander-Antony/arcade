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
    title: 'Grid Capture',
    rules: [
      'Battle over an 8x8 neon grid.',
      'Click tiles to paint them your color (Blue vs Red).',
      'You CAN steal your opponent\'s tiles!',
      'Watch for Energy Cores: clicking one claims a 3x3 area instantly!',
      'Player with the most tiles after 30 seconds wins.'
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
      'Take turns flipping cards to find matching pairs.',
      'If you find a match, you score a point and KEEP your turn!',
      'If you miss, your turn ends and your opponent goes.',
      '5x5 Mode: Find the hidden Joker 🃏 for an instant free point!'
    ],
    color: 'var(--neon-green)'
  },
  'tron-lightcycles': {
    title: 'Tron Lightcycles',
    rules: [
      'You control a constantly moving neon lightcycle.',
      'Use W, A, S, D or Arrow Keys to steer.',
      'Your bike leaves a solid energy wall behind it.',
      'Box your opponent in! If they crash into any wall, you win.',
      'Best 3 out of 5 rounds wins the match.'
    ],
    color: 'var(--neon-gold)'
  }
};

export const RulesScreen = () => {
  const currentGame = useGameStore(state => state.currentGame);
  const isHost = useGameStore(state => state.isHost);
  const gameSettings = useGameStore(state => state.gameSettings);
  
  const handleSettingChange = (setting, value) => {
    if (!isHost) return;
    const newSettings = { ...gameSettings, [setting]: value };
    useGameStore.getState().updateGameSettings(newSettings);
    // Send updated settings to client immediately
    peerSync.sendState(useGameStore.getState());
  };
  
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

        {currentGame === 'memory-flip' && (
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--neon-green)', marginBottom: '1rem' }}>Grid Size</h3>
            <div className="flex-center" style={{ gap: '15px' }}>
              <button 
                className="btn"
                style={{ 
                  backgroundColor: gameSettings.memoryGridSize === '4x4' ? 'var(--neon-green)' : 'transparent',
                  color: gameSettings.memoryGridSize === '4x4' ? '#000' : 'var(--neon-green)',
                  borderColor: 'var(--neon-green)',
                  opacity: (!isHost && gameSettings.memoryGridSize !== '4x4') ? 0.3 : 1,
                  cursor: isHost ? 'pointer' : 'default'
                }}
                onClick={() => handleSettingChange('memoryGridSize', '4x4')}
                disabled={!isHost}
              >
                4x4 (Classic)
              </button>
              <button 
                className="btn"
                style={{ 
                  backgroundColor: gameSettings.memoryGridSize === '5x5' ? 'var(--neon-green)' : 'transparent',
                  color: gameSettings.memoryGridSize === '5x5' ? '#000' : 'var(--neon-green)',
                  borderColor: 'var(--neon-green)',
                  opacity: (!isHost && gameSettings.memoryGridSize !== '5x5') ? 0.3 : 1,
                  cursor: isHost ? 'pointer' : 'default'
                }}
                onClick={() => handleSettingChange('memoryGridSize', '5x5')}
                disabled={!isHost}
              >
                5x5 (Joker's Wild)
              </button>
            </div>
          </div>
        )}

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
