import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const EMOJIS = ['🚀', '🛸', '🛰️', '🌠', '🌑', '🌞', '🌌', '🌍'];

export const MemoryFlip = () => {
  const { isHost, gameData, players } = useGameStore();
  const cards = gameData?.cards || [];
  const myPlayerId = isHost ? 'p1' : 'p2';

  // HOST LOGIC
  useEffect(() => {
    if (!isHost) return;
    
    // Generate deck
    const deck = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, flipped: false, claimedBy: null }));
      
    useGameStore.getState().setGameData({ cards: deck, flip1: null, flip2: null, lock: false });
    peerSync.sendState(useGameStore.getState());
  }, [isHost]);

  // Host checks win
  useEffect(() => {
    if (!isHost) return;
    if (cards.length > 0 && cards.every(c => c.claimedBy)) {
       peerSync.sendAction('GAME_OVER');
    }
  }, [cards, isHost]);

  const handleCardClick = (card) => {
    if (card.claimedBy || card.flipped) return;
    peerSync.sendAction('ACTION_FLIP_CARD', { cardId: card.id, playerId: myPlayerId });
  };

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative' }}>
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

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginTop: '80px'
      }}>
        {cards.map(card => {
          let shadow = '0 0 10px rgba(0, 243, 255, 0.1)';
          let border = '1px solid rgba(255, 255, 255, 0.1)';
          if (card.claimedBy === 'p1') {
            shadow = '0 0 15px var(--neon-blue)';
            border = '1px solid var(--neon-blue)';
          } else if (card.claimedBy === 'p2') {
            shadow = '0 0 15px var(--neon-red)';
            border = '1px solid var(--neon-red)';
          }

          return (
            <motion.div
              key={card.id}
              whileHover={{ scale: (card.flipped || card.claimedBy) ? 1 : 1.05 }}
              whileTap={{ scale: (card.flipped || card.claimedBy) ? 1 : 0.95 }}
              onMouseDown={() => handleCardClick(card)}
              className="glass-panel flex-center"
              style={{
                width: '100px',
                height: '140px',
                cursor: 'none',
                pointerEvents: 'auto',
                boxShadow: shadow,
                border: border,
                backgroundColor: card.flipped || card.claimedBy ? 'var(--panel-bg)' : 'rgba(0,0,0,0.5)'
              }}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: (card.flipped || card.claimedBy) ? 0 : 180 }}
                transition={{ duration: 0.3 }}
                style={{ fontSize: '3rem', transformStyle: 'preserve-3d' }}
              >
                {(card.flipped || card.claimedBy) ? card.emoji : '❓'}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
