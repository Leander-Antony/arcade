import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { audioEngine } from '../utils/audioEngine';
import { motion } from 'framer-motion';

const GRID_SIZE = 40;
const TICK_RATE = 150; // ms per tick

const getInitialState = () => ({
  status: 'countdown',
  countdown: 3,
  p1: { x: 5, y: 20, dx: 1, dy: 0, trail: [] },
  p2: { x: 34, y: 20, dx: -1, dy: 0, trail: [] },
  roundWinner: null
});

export const TronLightcycles = () => {
  const { isHost, gameData, players } = useGameStore();
  const myPlayerId = isHost ? 'p1' : 'p2';

  // Host Initial Setup
  useEffect(() => {
    if (isHost && !gameData?.status) {
      const state = getInitialState();
      useGameStore.getState().setGameData(state);
      peerSync.sendState(useGameStore.getState());
    }
  }, [isHost]);

  // Host Game Loop
  useEffect(() => {
    if (!isHost) return;

    let timer;
    if (gameData?.status === 'countdown') {
      timer = setInterval(() => {
        const current = useGameStore.getState().gameData;
        if (!current || current.status !== 'countdown') return;
        
        if (current.countdown > 1) {
           useGameStore.getState().setGameData({ ...current, countdown: current.countdown - 1 });
           peerSync.sendState(useGameStore.getState());
           audioEngine.playHoverBeep();
        } else {
           useGameStore.getState().setGameData({ ...current, status: 'playing' });
           peerSync.sendState(useGameStore.getState());
           audioEngine.playGameStart();
        }
      }, 1000);
    } else if (gameData?.status === 'playing') {
      timer = setInterval(() => {
        const current = useGameStore.getState().gameData;
        if (!current || current.status !== 'playing') return;
        
        const nextP1 = { ...current.p1, trail: [...current.p1.trail, {x: current.p1.x, y: current.p1.y}] };
        const nextP2 = { ...current.p2, trail: [...current.p2.trail, {x: current.p2.x, y: current.p2.y}] };
        
        nextP1.x += nextP1.dx;
        nextP1.y += nextP1.dy;
        
        nextP2.x += nextP2.dx;
        nextP2.y += nextP2.dy;

        // Collision logic
        const checkCollision = (p, otherTrail) => {
           if (p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE) return true;
           if (p.trail.some(t => t.x === p.x && t.y === p.y)) return true; // Self
           if (otherTrail.some(t => t.x === p.x && t.y === p.y)) return true; // Opponent
           return false;
        };

        const p1Dead = checkCollision(nextP1, nextP2.trail) || (nextP1.x === nextP2.x && nextP1.y === nextP2.y);
        const p2Dead = checkCollision(nextP2, nextP1.trail) || (nextP1.x === nextP2.x && nextP1.y === nextP2.y);

        if (p1Dead || p2Dead) {
          let winner = null;
          if (p1Dead && !p2Dead) winner = 'p2';
          if (p2Dead && !p1Dead) winner = 'p1';
          
          if (winner) {
            useGameStore.getState().updatePlayerScore(winner, 1);
          }
          
          const newState = { ...current, status: 'round-over', p1: nextP1, p2: nextP2, roundWinner: winner };
          useGameStore.getState().setGameData(newState);
          peerSync.sendState(useGameStore.getState());
          peerSync.sendAction('PLAY_SOUND', { sound: 'trap' }); 
          useGameStore.getState().triggerShake();
          peerSync.sendAction('TRIGGER_SHAKE');
          
          // Check Match Win
          setTimeout(() => {
             const finalStore = useGameStore.getState();
             if (finalStore.players.p1.score >= 3 || finalStore.players.p2.score >= 3) {
                peerSync.sendAction('GAME_OVER');
             } else {
                finalStore.setGameData(getInitialState());
                peerSync.sendState(finalStore);
             }
          }, 3000);
        } else {
          // Normal tick
          useGameStore.getState().setGameData({ ...current, p1: nextP1, p2: nextP2 });
          peerSync.sendState(useGameStore.getState());
        }
      }, TICK_RATE);
    }
    return () => clearInterval(timer);
  }, [isHost, gameData?.status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentData = useGameStore.getState().gameData;
      if (!currentData || currentData.status !== 'playing') return;
      
      const key = e.key.toLowerCase();
      const code = e.code || '';
      
      let dx = 0, dy = 0;
      if (key === 'w' || code === 'KeyW' || key === 'arrowup' || code === 'ArrowUp') { dx = 0; dy = -1; }
      else if (key === 's' || code === 'KeyS' || key === 'arrowdown' || code === 'ArrowDown') { dx = 0; dy = 1; }
      else if (key === 'a' || code === 'KeyA' || key === 'arrowleft' || code === 'ArrowLeft') { dx = -1; dy = 0; }
      else if (key === 'd' || code === 'KeyD' || key === 'arrowright' || code === 'ArrowRight') { dx = 1; dy = 0; }
      
      if (dx !== 0 || dy !== 0) {
        if (code.startsWith('Arrow')) e.preventDefault();
        peerSync.sendAction('ACTION_TRON_TURN', { playerId: myPlayerId, dx, dy });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myPlayerId]);

  if (!gameData || !gameData.status) return null;

  const { p1, p2, status, countdown, roundWinner } = gameData;

  const getCellPos = (x, y) => ({
    position: 'absolute',
    left: `${(x / GRID_SIZE) * 100}%`,
    top: `${(y / GRID_SIZE) * 100}%`,
    width: `${100 / GRID_SIZE}%`,
    height: `${100 / GRID_SIZE}%`
  });

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative' }}>
      {/* Scoreboard */}
      <div className="glass-panel" style={{ 
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', 
        padding: '10px 30px', display: 'flex', gap: '40px', zIndex: 10
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>P1</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p1.score}/3</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>P2</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p2.score}/3</div>
        </div>
      </div>

      {/* Grid Arena */}
      <div className="glass-panel" style={{
        position: 'relative',
        width: '90%',
        maxWidth: '700px',
        aspectRatio: '1 / 1',
        marginTop: '60px',
        overflow: 'hidden',
        border: '2px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Background Grid Lines */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
        }}></div>

        {/* P1 Trail */}
        {p1.trail.map((t, i) => (
          <div key={`p1t-${i}`} style={{
            ...getCellPos(t.x, t.y),
            backgroundColor: 'rgba(0, 243, 255, 0.5)',
            boxShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
          }} />
        ))}
        {/* P1 Head */}
        <div style={{
          ...getCellPos(p1.x, p1.y),
          backgroundColor: 'var(--neon-blue)',
          boxShadow: '0 0 15px var(--neon-blue)',
          zIndex: 2
        }} />

        {/* P2 Trail */}
        {p2.trail.map((t, i) => (
          <div key={`p2t-${i}`} style={{
            ...getCellPos(t.x, t.y),
            backgroundColor: 'rgba(255, 0, 85, 0.5)',
            boxShadow: '0 0 10px rgba(255, 0, 85, 0.5)'
          }} />
        ))}
        {/* P2 Head */}
        <div style={{
          ...getCellPos(p2.x, p2.y),
          backgroundColor: 'var(--neon-red)',
          boxShadow: '0 0 15px var(--neon-red)',
          zIndex: 2
        }} />

        {/* Overlay Modals */}
        {status === 'countdown' && (
          <div className="absolute-fill flex-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 5 }}>
            <motion.h1 
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="retro-text chromatic-text"
              style={{ fontSize: '8rem', color: 'var(--neon-gold)' }}
            >
              {countdown}
            </motion.h1>
          </div>
        )}

        {status === 'round-over' && (
          <div className="absolute-fill flex-center flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 5 }}>
            <h1 className="retro-text animate-flicker" style={{ fontSize: '4rem', color: roundWinner === 'p1' ? 'var(--neon-blue)' : roundWinner === 'p2' ? 'var(--neon-red)' : 'var(--text-muted)' }}>
              {roundWinner === 'p1' ? 'P1 WINS' : roundWinner === 'p2' ? 'P2 WINS' : 'DRAW'}
            </h1>
          </div>
        )}
      </div>

      <p className="retro-text" style={{ color: 'var(--text-muted)', marginTop: '20px' }}>
        USE WASD OR ARROW KEYS TO DRIVE
      </p>
    </div>
  );
};
