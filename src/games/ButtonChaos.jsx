import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion, AnimatePresence } from 'framer-motion';
import { audioEngine } from '../utils/audioEngine';

export const ButtonChaos = () => {
  const { isHost, gameData, players } = useGameStore();
  const grid = gameData?.grid || Array(64).fill(0);
  const powerUpIndex = gameData?.powerUpIndex ?? null;
  const timeLeft = gameData?.timeLeft ?? 30;
  const myPlayerId = isHost ? 'p1' : 'p2';

  // HOST LOGIC
  useEffect(() => {
    if (!isHost) return;
    
    // Initialize Game
    useGameStore.getState().setGameData({ 
      grid: Array(64).fill(0),
      powerUpIndex: null,
      timeLeft: 30
    });

    // Timer Loop
    const timerInterval = setInterval(() => {
      const state = useGameStore.getState();
      const currentData = state.gameData;
      
      if (currentData.timeLeft > 0) {
        state.setGameData(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      } else {
        // Game Over! Calculate scores
        clearInterval(timerInterval);
        
        let p1Count = 0;
        let p2Count = 0;
        currentData.grid.forEach(cell => {
          if (cell === 1) p1Count++;
          if (cell === 2) p2Count++;
        });

        // Set the final scores in the global store so the Game Over screen displays them correctly
        // We calculate delta from current score, but here we can just overwrite or update relative to 0
        state.resetScores(); // Ensure we start from 0 for this calculation just in case
        if (p1Count > 0) state.updatePlayerScore('p1', p1Count);
        if (p2Count > 0) state.updatePlayerScore('p2', p2Count);
        
        peerSync.sendAction('GAME_OVER');
      }
    }, 1000);

    // Power-up Loop
    const powerUpInterval = setInterval(() => {
      const state = useGameStore.getState();
      const currentData = state.gameData;
      
      if (currentData.timeLeft > 2 && currentData.powerUpIndex === null) {
        // Find a random tile that isn't already a power up
        const target = Math.floor(Math.random() * 64);
        state.setGameData(prev => ({ ...prev, powerUpIndex: target }));
        
        // Remove power up after 3 seconds if not clicked
        setTimeout(() => {
          const checkState = useGameStore.getState();
          if (checkState.gameData?.powerUpIndex === target) {
            checkState.setGameData(prev => ({ ...prev, powerUpIndex: null }));
          }
        }, 3000);
      }
    }, 5000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(powerUpInterval);
    };
  }, [isHost]);

  // Calculate current scores for live display
  let liveP1 = 0;
  let liveP2 = 0;
  grid.forEach(cell => {
    if (cell === 1) liveP1++;
    if (cell === 2) liveP2++;
  });

  const handleTileClick = (index) => {
    if (timeLeft <= 0) return;
    
    // Prevent clicking your own tile unless it's a powerup
    const playerVal = myPlayerId === 'p1' ? 1 : 2;
    const isPowerUp = index === powerUpIndex;
    
    if (grid[index] === playerVal && !isPowerUp) return;

    peerSync.sendAction('ACTION_CLICK_BUTTONCHAOS', { 
      index, 
      playerId: myPlayerId, 
      isPowerUp
    });
  };

  const getTileStyle = (owner, isPowerUp) => {
    let base = {
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(20, 20, 30, 0.5)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '4px',
      cursor: 'none',
      transition: 'all 0.1s ease-out'
    };

    if (owner === 1) {
      base.backgroundColor = 'var(--neon-blue)';
      base.boxShadow = '0 0 10px var(--neon-blue)';
      base.border = '1px solid var(--neon-blue)';
    } else if (owner === 2) {
      base.backgroundColor = 'var(--neon-red)';
      base.boxShadow = '0 0 10px var(--neon-red)';
      base.border = '1px solid var(--neon-red)';
    }

    if (isPowerUp) {
      base.boxShadow = '0 0 20px var(--neon-gold), inset 0 0 10px var(--neon-gold)';
      base.border = '2px solid var(--neon-gold)';
      base.backgroundColor = 'var(--neon-gold)';
    }

    return base;
  };

  return (
    <div className="w-full h-full flex-col flex-center" style={{ position: 'relative' }}>
      
      {/* Top HUD */}
      <div style={{
        display: 'flex', 
        justifyContent: 'center', 
        gap: '40px', 
        marginBottom: '20px',
        width: '100%',
        maxWidth: '800px'
      }}>
        {/* P1 Score */}
        <div className="glass-panel" style={{ flex: 1, padding: '15px', textAlign: 'center', border: '1px solid var(--neon-blue)' }}>
          <div className="retro-text" style={{ color: 'var(--neon-blue)', fontSize: '1.2rem', marginBottom: '5px' }}>P1 TILES</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveP1}</div>
        </div>

        {/* Timer */}
        <div className="glass-panel flex-center flex-col" style={{ flex: 1, padding: '15px' }}>
          <div className="retro-text" style={{ color: 'var(--neon-gold)', fontSize: '1rem', marginBottom: '5px' }}>TIME LEFT</div>
          <div className="retro-text" style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            color: timeLeft <= 5 ? 'var(--neon-red)' : 'white',
            animation: timeLeft <= 5 ? 'pulse 1s infinite' : 'none'
          }}>
            {timeLeft}s
          </div>
        </div>

        {/* P2 Score */}
        <div className="glass-panel" style={{ flex: 1, padding: '15px', textAlign: 'center', border: '1px solid var(--neon-red)' }}>
          <div className="retro-text" style={{ color: 'var(--neon-red)', fontSize: '1.2rem', marginBottom: '5px' }}>P2 TILES</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveP2}</div>
        </div>
      </div>

      {/* Grid Area */}
      <div 
        className="glass-panel"
        style={{
          width: '90%',
          maxWidth: 'min(600px, 60vh)',
          aspectRatio: '1/1',
          padding: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          gap: '4px',
          backgroundColor: 'rgba(5, 5, 10, 0.8)',
          pointerEvents: 'auto'
        }}
      >
        {grid.map((owner, index) => {
          const isPowerUp = index === powerUpIndex;
          return (
            <motion.div
              key={index}
              initial={false}
              animate={{ 
                scale: isPowerUp ? [1, 1.1, 1] : 1,
                opacity: 1 
              }}
              transition={{
                duration: isPowerUp ? 1 : 0.2,
                repeat: isPowerUp ? Infinity : 0
              }}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              whileTap={{ scale: 0.9 }}
              onMouseDown={() => handleTileClick(index)}
              style={getTileStyle(owner, isPowerUp)}
            >
              {isPowerUp && (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 5px black)' }}>⚡</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
    </div>
  );
};
