import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { audioEngine } from '../utils/audioEngine';
import { motion } from 'framer-motion';

const GRID_WIDTH = 21;
const GRID_HEIGHT = 21;
const TICK_RATE = 150; // ms per tick

const generateMaze = (width, height) => {
  const grid = Array(height).fill().map(() => Array(width).fill(1)); // 1 is wall, 0 is path
  
  const stack = [[1, 1]];
  grid[1][1] = 0;
  
  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];
    
    const neighbors = [];
    if (x >= 3 && grid[y][x - 2] === 1) neighbors.push([x - 2, y, x - 1, y]);
    if (x <= width - 4 && grid[y][x + 2] === 1) neighbors.push([x + 2, y, x + 1, y]);
    if (y >= 3 && grid[y - 2][x] === 1) neighbors.push([x, y - 2, x, y - 1]);
    if (y <= height - 4 && grid[y + 2][x] === 1) neighbors.push([x, y + 2, x, y + 1]);
    
    if (neighbors.length > 0) {
      const idx = Math.floor(Math.random() * neighbors.length);
      const [nx, ny, wx, wy] = neighbors[idx];
      grid[wy][wx] = 0;
      grid[ny][nx] = 0;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }
  
  // Ensure the center is open (Core)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  grid[cy][cx] = 0;
  // Break walls around the core to ensure it's accessible
  grid[cy-1][cx] = 0;
  grid[cy+1][cx] = 0;
  grid[cy][cx-1] = 0;
  grid[cy][cx+1] = 0;
  
  return grid;
};

const getInitialState = () => ({
  status: 'countdown',
  countdown: 3,
  grid: generateMaze(GRID_WIDTH, GRID_HEIGHT),
  p1: { x: 1, y: 1, dx: 0, dy: 0 },
  p2: { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2, dx: 0, dy: 0 },
  winner: null
});

export const MazeRace = () => {
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
        
        const nextP1 = { ...current.p1 };
        const nextP2 = { ...current.p2 };
        
        const cx = Math.floor(GRID_WIDTH / 2);
        const cy = Math.floor(GRID_HEIGHT / 2);

        const p1Wins = nextP1.x === cx && nextP1.y === cy;
        const p2Wins = nextP2.x === cx && nextP2.y === cy;

        if (p1Wins || p2Wins) {
          let winner = null;
          if (p1Wins && !p2Wins) winner = 'p1';
          if (p2Wins && !p1Wins) winner = 'p2';
          if (p1Wins && p2Wins) winner = 'tie'; // Highly unlikely due to different distances, but possible
          
          if (winner && winner !== 'tie') {
            useGameStore.getState().updatePlayerScore(winner, 1);
          }
          
          const newState = { ...current, status: 'round-over', p1: nextP1, p2: nextP2, winner };
          useGameStore.getState().setGameData(newState);
          peerSync.sendState(useGameStore.getState());
          peerSync.sendAction('PLAY_SOUND', { sound: 'win' }); 
          
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
          // Normal tick - just sync state
          peerSync.sendState(useGameStore.getState());
        }
      }, TICK_RATE);
    }
    return () => clearInterval(timer);
  }, [isHost, gameData?.status]);

  // Input Handling (Tron mechanic)
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
        peerSync.sendAction('ACTION_MAZE_STEP', { playerId: myPlayerId, dx, dy });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myPlayerId]);

  if (!gameData || !gameData.status || !gameData.grid) return null;

  const { p1, p2, status, countdown, grid, winner } = gameData;
  const myPlayer = myPlayerId === 'p1' ? p1 : p2;

  const getCellPos = (x, y) => ({
    position: 'absolute',
    left: `${(x / GRID_WIDTH) * 100}%`,
    top: `${(y / GRID_HEIGHT) * 100}%`,
    width: `${100 / GRID_WIDTH}%`,
    height: `${100 / GRID_HEIGHT}%`
  });

  const cx = Math.floor(GRID_WIDTH / 2);
  const cy = Math.floor(GRID_HEIGHT / 2);

  // Fog of war position
  const fogX = ((myPlayer.x + 0.5) / GRID_WIDTH) * 100;
  const fogY = ((myPlayer.y + 0.5) / GRID_HEIGHT) * 100;

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative' }}>
      {/* Scoreboard */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '50px', zIndex: 20 }}>
          <div className="glass-panel" style={{ padding: '10px 30px', textAlign: 'center', border: '1px solid var(--neon-blue)' }}>
            <span style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>ENOLA</span>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p1.score}/3</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 30px', textAlign: 'center', border: '1px solid var(--neon-red)' }}>
            <span style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>MADZ</span>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{players.p2.score}/3</div>
          </div>
      </div>

      {/* Grid Arena */}
      <div className="glass-panel" style={{
        position: 'relative',
        width: '100%',
        maxWidth: '70vh',
        maxHeight: '70vh',
        aspectRatio: '1 / 1',
        marginTop: '60px',
        overflow: 'hidden',
        border: '3px solid var(--neon-purple)',
        boxShadow: '0 0 30px rgba(176, 38, 255, 0.2), inset 0 0 50px rgba(176, 38, 255, 0.1)',
        backgroundColor: '#050510',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: `${100 / GRID_WIDTH}% ${100 / GRID_HEIGHT}%`
      }}>
        
        {/* The Maze Content */}
        <div style={{
           position: 'absolute', width: '100%', height: '100%',
           // The fog of war effect! Using mask-image to create a flashlight
           maskImage: status === 'playing' ? `radial-gradient(circle at ${fogX}% ${fogY}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 12%, transparent 22%)` : 'none',
           WebkitMaskImage: status === 'playing' ? `radial-gradient(circle at ${fogX}% ${fogY}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 12%, transparent 22%)` : 'none',
        }}>
           
           {/* Render Walls */}
           {grid.map((row, y) => row.map((cell, x) => (
             cell === 1 ? (
               <div key={`wall-${x}-${y}`} style={{
                 ...getCellPos(x, y),
                 background: 'repeating-linear-gradient(45deg, rgba(20,20,40,0.9), rgba(20,20,40,0.9) 10px, rgba(10,10,25,0.9) 10px, rgba(10,10,25,0.9) 20px)',
                 border: '1px solid rgba(176, 38, 255, 0.4)',
                 boxShadow: 'inset 0 0 15px rgba(176, 38, 255, 0.3)'
               }} />
             ) : null
           )))}

           {/* Core */}
           <div style={{
             ...getCellPos(cx, cy),
             backgroundColor: '#fff',
             boxShadow: '0 0 20px var(--neon-gold), 0 0 50px var(--neon-gold), inset 0 0 10px var(--neon-gold)',
             borderRadius: '50%',
             transform: 'scale(0.7)',
             border: '2px solid var(--neon-gold)'
           }} className="animate-pulse-glow" />

           {/* P1 */}
           <div style={{
             ...getCellPos(p1.x, p1.y),
             backgroundColor: '#fff',
             border: '2px solid var(--neon-blue)',
             boxShadow: '0 0 20px var(--neon-blue), inset 0 0 5px var(--neon-blue)',
             borderRadius: '50%',
             transform: 'scale(0.65)',
             transition: `all ${TICK_RATE}ms linear`,
             zIndex: 5
           }} />

           {/* P2 */}
           <div style={{
             ...getCellPos(p2.x, p2.y),
             backgroundColor: '#fff',
             border: '2px solid var(--neon-red)',
             boxShadow: '0 0 20px var(--neon-red), inset 0 0 5px var(--neon-red)',
             borderRadius: '50%',
             transform: 'scale(0.65)',
             transition: `all ${TICK_RATE}ms linear`,
             zIndex: 5
           }} />
        </div>

        {/* Overlay Modals */}
        {status === 'countdown' && (
          <div className="flex-center" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050510', zIndex: 25 }}>
            <motion.h1 
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="retro-text chromatic-text"
              style={{ fontSize: '5rem', color: 'var(--neon-gold)', textShadow: '0 0 20px black' }}
            >
              {countdown}
            </motion.h1>
          </div>
        )}

        {status === 'round-over' && (
          <div className="flex-center flex-col" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 25 }}>
            <h1 className="retro-text animate-flicker" style={{ fontSize: '3rem', color: winner === 'p1' ? 'var(--neon-blue)' : winner === 'p2' ? 'var(--neon-red)' : 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
              {winner === 'p1' ? 'ENOLA FINDS THE CORE' : winner === 'p2' ? 'MADZ FINDS THE CORE' : 'DRAW'}
            </h1>
          </div>
        )}
      </div>

      <p className="retro-text" style={{ color: 'var(--text-muted)', marginTop: '20px' }}>
        RACE TO THE GOLDEN CORE
      </p>
    </div>
  );
};
