import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';

export const CursorOverlay = () => {
  const { players, isHost } = useGameStore();

  useEffect(() => {
    let lastSend = 0;
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      const myPlayerId = isHost ? 'p1' : 'p2';
      
      useGameStore.getState().updateCursor(myPlayerId, x, y);
      
      const now = Date.now();
      if (now - lastSend > 40) { // Throttle network sync to ~25 FPS to prevent channel flooding
        lastSend = now;
        peerSync.sendCursor(x, y);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHost]);

  // Convert relative coordinates back to absolute for rendering
  const getAbsPos = (relPos) => ({
    x: relPos.x * window.innerWidth,
    y: relPos.y * window.innerHeight
  });

  const p1Pos = getAbsPos(players.p1.cursor);
  const p2Pos = getAbsPos(players.p2.cursor);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {/* Player 1 Cursor (Blue) */}
      {players.p1.connected || isHost || useGameStore.getState().connectionStatus === 'connected' ? (
        <div 
          style={{
            position: 'absolute',
            left: p1Pos.x,
            top: p1Pos.y,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.05s linear, top 0.05s linear',
            pointerEvents: 'none',
            opacity: 1
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px #00f3ff)' }}>
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </div>
      ) : null}

      {/* Player 2 Cursor (Red) */}
      {players.p2.connected || !isHost || useGameStore.getState().connectionStatus === 'connected' ? (
        <div 
          style={{
            position: 'absolute',
            left: p2Pos.x,
            top: p2Pos.y,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.05s linear, top 0.05s linear',
            pointerEvents: 'none',
            opacity: 1
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0055" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px #ff0055)' }}>
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </div>
      ) : null}
    </div>
  );
};
