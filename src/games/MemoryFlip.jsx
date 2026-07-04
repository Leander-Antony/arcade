import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const EMOJIS = ['🚀', '🛸', '🛰️', '🌠', '🌑', '🌞', '🌌', '🌍'];

export const MemoryFlip = () => {
  const { isHost, gameData, players } = useGameStore();
  const cards = gameData?.cards || [];
  const myPlayerId = isHost ? 'p1' : 'p2';

  const gameSettings = useGameStore(state => state.gameSettings);

  // HOST LOGIC
  useEffect(() => {
    if (!isHost) return;
    
    // Generate deck based on settings
    const is5x5 = gameSettings.memoryGridSize === '5x5';
    
    let baseEmojis = [...EMOJIS];
    if (is5x5) {
      // Add 4 more emojis for 12 pairs (24 cards)
      baseEmojis = [...baseEmojis, '🪐', '☄️', '🌟', '👨‍🚀'];
    }
    
    let deck = [...baseEmojis, ...baseEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, flipped: false, claimedBy: null, isJoker: false }));
      
    if (is5x5) {
      // Add Joker (25th card)
      deck.splice(Math.floor(Math.random() * deck.length), 0, {
        id: 999, emoji: '🃏', flipped: false, claimedBy: null, isJoker: true
      });
    }
      
    useGameStore.getState().setGameData({ 
      cards: deck, 
      flip1: null, 
      flip2: null, 
      lock: false,
      currentTurn: 'p1' 
    });
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
    if (gameData?.currentTurn !== myPlayerId) return;
    if (card.claimedBy || card.flipped) return;
    peerSync.sendAction('ACTION_FLIP_CARD', { cardId: card.id, playerId: myPlayerId });
  };

  const isMyTurn = gameData?.currentTurn === myPlayerId;

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative' }}>
      {/* Scoreboard */}
      <div className="glass-panel" style={{ 
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', 
        padding: '10px 30px', display: 'flex', gap: '40px', zIndex: 10
      }}>
        <div className="glass-panel" style={{
          padding: '20px',
          textAlign: 'center',
          minWidth: '150px',
          border: '1px solid var(--neon-blue)',
          opacity: gameData?.currentTurn === 'p1' ? 1 : 0.4,
          textShadow: gameData?.currentTurn === 'p1' ? '0 0 15px var(--neon-blue)' : 'none',
          transform: gameData?.currentTurn === 'p1' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>ENOLA</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p1.score}</div>
        </div>

        {/* Turn Indicator */}
        <div className="retro-text animate-pulse-glow" style={{
          color: gameData?.currentTurn === 'p1' ? 'var(--neon-blue)' : 'var(--neon-red)',
          fontSize: '2rem'
        }}>
          {gameData?.currentTurn === 'p1' ? "ENOLA'S TURN" : "MADZ'S TURN"}
        </div>

        {/* Scoreboard P2 */}
        <div className="glass-panel" style={{
          padding: '20px',
          textAlign: 'center',
          minWidth: '150px',
          border: '1px solid var(--neon-red)',
          opacity: gameData?.currentTurn === 'p2' ? 1 : 0.4,
          textShadow: gameData?.currentTurn === 'p2' ? '0 0 15px var(--neon-red)' : 'none',
          transform: gameData?.currentTurn === 'p2' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>MADZ</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p2.score}</div>
        </div>
      </div>
      
      {!isMyTurn && (
        <div className="retro-text animate-flicker" style={{ position: 'absolute', top: '100px', color: 'var(--neon-gold)' }}>
          WAITING FOR OPPONENT...
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gameSettings.memoryGridSize === '5x5' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
        gap: '2vmin',
        justifyContent: 'center',
        alignContent: 'center',
        width: '90%',
        maxWidth: '70vh',
        marginTop: '60px',
        paddingBottom: '20px'
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
              whileHover={{ scale: (card.flipped || card.claimedBy) ? 1 : 1.05, y: (card.flipped || card.claimedBy) ? 0 : -5 }}
              whileTap={{ scale: (card.flipped || card.claimedBy) ? 1 : 0.95 }}
              onMouseDown={() => handleCardClick(card)}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                cursor: 'none',
                pointerEvents: 'auto',
                perspective: '1000px'
              }}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: (card.flipped || card.claimedBy) ? 180 : 0 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
              >
                {/* Front Face (Question Mark) */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.5rem, 5vmin, 3rem)',
                  backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '8px',
                  border: border, boxShadow: shadow
                }}>❓</div>
                
                {/* Back Face (Emoji) */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.5rem, 5vmin, 3rem)',
                  backgroundColor: 'var(--panel-bg)', borderRadius: '8px',
                  transform: 'rotateY(180deg)',
                  border: border, boxShadow: shadow
                }}>
                  {card.emoji}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
