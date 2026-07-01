import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion, AnimatePresence } from 'framer-motion';

export const ButtonChaos = () => {
  const { isHost, gameData, players, gameState, currentGame } = useGameStore();
  const btn = gameData?.activeBtn;
  const myPlayerId = isHost ? 'p1' : 'p2';
  const spawnTimeoutRef = useRef(null);

  // HOST LOGIC
  useEffect(() => {
    if (!isHost) return;
    
    useGameStore.getState().setGameData({ activeBtn: null });

    const spawnButton = () => {
      const types = ['standard', 'standard', 'standard', 'standard', 'green', 'green', 'gold', 'red', 'red', 'red'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const x = 10 + Math.random() * 80; // 10% to 90%
      const y = 20 + Math.random() * 70; // 20% to 90%
      
      useGameStore.getState().setGameData({
        activeBtn: { id: Date.now().toString(), type, x, y }
      });
    };

    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.gameState === 'playing' && state.currentGame === 'button-chaos') {
        if (!state.gameData?.activeBtn && !spawnTimeoutRef.current) {
           spawnTimeoutRef.current = setTimeout(() => {
             spawnButton();
             spawnTimeoutRef.current = null;
           }, 300 + Math.random() * 500);
        }
      }
    });

    spawnButton();

    return () => {
      unsubscribe();
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    };
  }, [isHost]);

  // Handle score checking (Host only)
  useEffect(() => {
    if (!isHost) return;
    if (players.p1.score >= 15 || players.p2.score >= 15) {
      peerSync.sendAction('GAME_OVER');
    }
  }, [players.p1.score, players.p2.score, isHost]);

  const handleClick = () => {
    if (btn) {
      peerSync.sendAction('ACTION_CLICK_BUTTONCHAOS', { 
        btnId: btn.id, 
        playerId: myPlayerId, 
        type: btn.type 
      });
    }
  };

  const getBtnStyle = (type) => {
    switch (type) {
      case 'green': return { color: 'var(--bg-color)', background: 'var(--neon-green)', boxShadow: '0 0 20px var(--neon-green)' };
      case 'gold': return { color: 'var(--bg-color)', background: 'var(--neon-gold)', boxShadow: '0 0 30px var(--neon-gold)' };
      case 'red': return { color: 'var(--neon-red)', background: 'transparent', border: '2px solid var(--neon-red)', boxShadow: '0 0 15px var(--neon-red)' };
      default: return { color: 'var(--bg-color)', background: 'var(--neon-blue)', boxShadow: '0 0 15px var(--neon-blue)' };
    }
  };

  const getBtnText = (type) => {
    switch (type) {
      case 'green': return '+2 POINT';
      case 'gold': return '+3 JACKPOT';
      case 'red': return '-1 DANGER';
      default: return '+1 CLICK';
    }
  };

  return (
    <div className="w-full h-full" style={{ position: 'relative' }}>
      {/* Scoreboard */}
      <div className="glass-panel" style={{ 
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', 
        padding: '10px 30px', display: 'flex', gap: '40px', zIndex: 10
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>P1 Score</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p1.score}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>P2 Score</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p2.score}</div>
        </div>
      </div>

      {/* Game Area */}
      <AnimatePresence>
        {btn && (
          <motion.button
            key={btn.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={handleClick} // Use onMouseDown for faster reaction than onClick
            className="btn"
            style={{
              position: 'absolute',
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              fontSize: '1.2rem',
              padding: '15px 30px',
              borderRadius: '8px',
              ...getBtnStyle(btn.type)
            }}
          >
            {getBtnText(btn.type)}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
