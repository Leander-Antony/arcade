import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const GRID_SIZE = 8;
const START_POS = { x: 0, y: 0, dir: 'right' };
const EXIT_POS = { x: 7, y: 7 };

export const LaserMaze = () => {
  const { isHost, gameData, players } = useGameStore();
  const grid = gameData?.grid || [];
  const p2Pos = gameData?.p2Pos || { x: 0, y: 7 };
  const exitLocked = gameData?.exitLocked ?? true;
  const laserPath = gameData?.laserPath || [];

  const myPlayerId = isHost ? 'p1' : 'p2';

  // HOST LOGIC - Init grid
  useEffect(() => {
    if (!isHost) return;
    
    // Generate a simple layout with mirrors
    const initialGrid = Array(GRID_SIZE * GRID_SIZE).fill('empty');
    
    // Place some mirrors
    const mirrors = [
      {x: 3, y: 0, type: '/'}, {x: 3, y: 3, type: '\\'},
      {x: 6, y: 3, type: '/'}, {x: 6, y: 5, type: '\\'},
      {x: 7, y: 5, type: '/'}
    ];
    mirrors.forEach(m => initialGrid[m.y * GRID_SIZE + m.x] = m.type);
    
    useGameStore.getState().setGameData({ 
      grid: initialGrid, 
      p2Pos: { x: 0, y: 7 },
      exitLocked: true,
      laserPath: []
    });
    
    // Initial laser calculation is handled by the other effect if we abstract it, but let's just do it directly.
  }, [isHost]);

  const handleRotate = (x, y) => {
    if (myPlayerId !== 'p1') return; // Only P1 controls mirrors
    peerSync.sendAction('ACTION_ROTATE_MIRROR', { x, y });
  };

  const handleKeyDown = useCallback((e) => {
    if (myPlayerId !== 'p2') return; // Only P2 controls character
    let dx = 0, dy = 0;
    if (e.key === 'w' || e.key === 'ArrowUp') dy = -1;
    if (e.key === 's' || e.key === 'ArrowDown') dy = 1;
    if (e.key === 'a' || e.key === 'ArrowLeft') dx = -1;
    if (e.key === 'd' || e.key === 'ArrowRight') dx = 1;
    
    if (dx !== 0 || dy !== 0) {
      peerSync.sendAction('ACTION_MOVE_P2', { dx, dy });
    }
  }, [myPlayerId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getCellType = (x, y) => grid[y * GRID_SIZE + x];

  return (
    <div className="w-full h-full flex-center flex-col">
      <h2 style={{ color: exitLocked ? 'var(--neon-red)' : 'var(--neon-green)', marginBottom: '1rem', textShadow: `0 0 10px ${exitLocked ? 'var(--neon-red)' : 'var(--neon-green)'}` }}>
        {exitLocked ? 'UNLOCK THE EXIT WITH THE LASER (P1 Rotate Mirrors)' : 'EXIT OPEN! P2 GO!'}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 60px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 60px)`,
        gap: '2px',
        backgroundColor: 'var(--panel-bg)',
        padding: '10px',
        borderRadius: '10px',
        boxShadow: '0 0 20px rgba(255,255,255,0.1)',
        position: 'relative'
      }}>
        {/* Draw laser path as SVG overlay for ease, or just highlight cells */}
        {grid.map((cell, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const isMirror = cell === '/' || cell === '\\';
          const isP2 = p2Pos.x === x && p2Pos.y === y;
          const isExit = EXIT_POS.x === x && EXIT_POS.y === y;
          const isStart = START_POS.x === x && START_POS.y === y;
          
          const hasLaser = laserPath.some(p => p.x === x && p.y === y);

          return (
            <div 
              key={idx}
              onClick={() => isMirror && handleRotate(x, y)}
              style={{
                width: '100%', height: '100%',
                backgroundColor: hasLaser ? 'rgba(255,0,85,0.3)' : 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: isMirror && myPlayerId === 'p1' ? 'pointer' : 'default',
                position: 'relative'
              }}
            >
              {isStart && <div style={{width: 20, height: 20, borderRadius: '50%', background: 'var(--neon-red)'}}/>}
              
              {isMirror && (
                <div style={{
                  width: '80%', height: '4px', background: 'var(--neon-blue)',
                  transform: `rotate(${cell === '/' ? -45 : 45}deg)`,
                  boxShadow: '0 0 10px var(--neon-blue)'
                }} />
              )}
              
              {isExit && (
                <div style={{
                  width: '80%', height: '80%', 
                  border: `4px solid ${exitLocked ? 'var(--neon-red)' : 'var(--neon-green)'}`,
                  boxShadow: `0 0 10px ${exitLocked ? 'var(--neon-red)' : 'var(--neon-green)'}`
                }}>EXIT</div>
              )}

              {isP2 && (
                <motion.div 
                  layout
                  style={{
                    position: 'absolute', width: '30px', height: '30px', 
                    borderRadius: '5px', background: '#ff0055',
                    boxShadow: '0 0 15px #ff0055', zIndex: 10
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
