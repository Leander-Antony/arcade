import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

export const MouseDuel = () => {
  const { isHost, gameData, players } = useGameStore();
  const items = gameData?.items || [];

  const myPlayerId = isHost ? 'p1' : 'p2';

  // HOST LOGIC: Spawning items and handling collections
  useEffect(() => {
    if (!isHost) return;
    
    useGameStore.getState().setGameData({ items: [] });
    
    let itemId = 0;
    const spawnInterval = setInterval(() => {
      const currentItems = useGameStore.getState().gameData?.items || [];
      if (currentItems.length < 12) {
        const type = Math.random() > 0.75 ? 'trap' : 'star';
        const x = 10 + Math.random() * 80; // 10% to 90% vw
        const y = 15 + Math.random() * 75; // 15% to 90% vh
        
        const newItem = { id: `item-${itemId++}`, type, x, y };
        
        useGameStore.getState().setGameData(prev => ({ items: [...(prev?.items || []), newItem] }));
      }
    }, 700);

    return () => clearInterval(spawnInterval);
  }, [isHost]);

  // Handle score checking (Host only)
  useEffect(() => {
    if (!isHost) return;
    if (players.p1.score >= 20 || players.p2.score >= 20) {
      peerSync.sendAction('GAME_OVER');
    }
  }, [players.p1.score, players.p2.score, isHost]);

  // HOST LOGIC: Collision Detection
  useEffect(() => {
    if (!isHost) return;
    
    const checkCollisions = () => {
      const state = useGameStore.getState();
      const currentItems = state.gameData?.items || [];
      if (currentItems.length === 0) return;

      const { p1, p2 } = state.players;
      
      let itemsChanged = false;
      const itemsToKeep = [];
      let p1ScoreDelta = 0;
      let p2ScoreDelta = 0;
      let soundToPlay = null;
      
      for (const item of currentItems) {
        let collectedBy = null;
        
        const p1x = (p1.cursor.x || 0) * 100;
        const p1y = (p1.cursor.y || 0) * 100;
        const p2x = (p2.cursor.x || 0) * 100;
        const p2y = (p2.cursor.y || 0) * 100;
        
        const p1Dist = Math.hypot(p1x - item.x, p1y - item.y);
        const p2Dist = Math.hypot(p2x - item.x, p2y - item.y);
        
        // 4% of screen width/height is roughly the radius of the items
        if (p1Dist < 4) { 
          collectedBy = 'p1';
        } else if (p2Dist < 4) {
          collectedBy = 'p2';
        }
        
        if (collectedBy) {
          itemsChanged = true;
          if (collectedBy === 'p1') p1ScoreDelta += item.type === 'star' ? 1 : -1;
          if (collectedBy === 'p2') p2ScoreDelta += item.type === 'star' ? 1 : -1;
          soundToPlay = item.type === 'star' ? 'star' : 'trap';
        } else {
          itemsToKeep.push(item);
        }
      }
      
      if (itemsChanged) {
        state.setGameData(prev => ({ items: itemsToKeep }));
        if (p1ScoreDelta !== 0) state.updatePlayerScore('p1', p1ScoreDelta);
        if (p2ScoreDelta !== 0) state.updatePlayerScore('p2', p2ScoreDelta);
        if (soundToPlay) peerSync.sendAction('PLAY_SOUND', { sound: soundToPlay });
      }
    };
    
    const interval = setInterval(checkCollisions, 50); // 20 times a second
    return () => clearInterval(interval);
  }, [isHost]);

  const handleHover = (item) => {
    // Only kept as a fallback for P1 if collision detection misses
    if (isHost) {
      peerSync.sendAction('ACTION_COLLECT_MOUSEDUEL', { itemId: item.id, playerId: myPlayerId, type: item.type });
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
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onMouseEnter={() => handleHover(item)}
          onMouseOver={() => handleHover(item)}
          onMouseDown={() => handleHover(item)}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.type === 'star' ? '40px' : '50px',
            height: item.type === 'star' ? '40px' : '50px',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'none',
            pointerEvents: 'auto',
          }}
        >
          {item.type === 'star' ? (
            <div style={{
              width: '100%', height: '100%',
              backgroundColor: 'var(--neon-gold)',
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              boxShadow: '0 0 15px var(--neon-gold)'
            }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              backgroundColor: 'var(--neon-red)',
              clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)',
              boxShadow: '0 0 15px var(--neon-red)'
            }} />
          )}
        </motion.div>
      ))}
    </div>
  );
};
