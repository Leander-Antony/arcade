import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const GAME_RULES = {
  'mouse-duel': {
    title: 'Mouse Duel',
    rules: [
      'Okay, here\'s the deal: stuff is going to pop up everywhere.',
      'Hover over the Stars (+1) and Cakes (+5) before I steal them from you!',
      'Watch out for Traps and Bombs, they\'ll drain your score.',
      '(Warning: If you grab a trap, your whole screen is going to shake!)',
      'First one of us to hit 30 points wins. Don\'t hold back!'
    ],
    color: 'var(--neon-blue)'
  },
  'button-chaos': {
    title: 'Grid Capture',
    rules: [
      'This one gets intense. We\'re battling over this neon grid.',
      'Click tiles as fast as you can to paint them your color.',
      'You can steal my tiles, and trust me, I am absolutely going to steal yours.',
      'If you see a glowing Energy Core, click it—it claims a huge 3x3 area instantly!',
      'Whoever owns the most tiles when the 30 seconds run out takes the crown.'
    ],
    color: 'var(--neon-red)'
  },
  'puzzle-coop': {
    title: 'Puzzle Co-op',
    rules: [
      'Alright, take a deep breath. We aren\'t fighting in this one.',
      'We have to work together to rebuild this jigsaw puzzle.',
      'We can both drag pieces at the same time (you\'ll actually see my mouse moving around!).',
      'Just get the pieces close to where they belong, and they\'ll snap right into place.'
    ],
    color: 'var(--neon-purple)'
  },
  'memory-flip': {
    title: 'Memory Flip',
    rules: [
      'Classic memory game, but we take turns flipping cards to find matches.',
      'If you find a pair, you get a point AND you get to go again!',
      'If you miss, your turn is over and it\'s my turn to score.',
      'If we play the 5x5 mode, watch out for the Joker 🃏—finding it is an instant free point!'
    ],
    color: 'var(--neon-green)'
  },
  'tron-lightcycles': {
    title: 'Tron Lightcycles',
    rules: [
      'We are both driving lightcycles that never stop moving.',
      'Use your WASD or Arrow Keys to steer.',
      'You leave a solid neon wall behind you. Try to trap me in your trail!',
      '(Warning: When you inevitably crash into a wall, your screen will shake.)',
      'First one of us to crash 3 times loses!'
    ],
    color: 'var(--neon-gold)'
  },
  'maze-race': {
    title: 'Maze Race',
    rules: [
      'We\'re racing through a pitch-black maze.',
      'Use your Arrow Keys (or WASD) to move. You move one step per press.',
      'You only have a tiny flashlight to see what\'s immediately around you.',
      'The first one to find the glowing Golden Core hidden somewhere in the dark wins!'
    ],
    color: 'var(--neon-pink)'
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
