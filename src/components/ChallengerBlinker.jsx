import { useGameStore } from '../store/useGameStore';

export const ChallengerBlinker = () => {
  const isHost = useGameStore(state => state.isHost);
  const p2Connected = useGameStore(state => state.players.p2.connected);
  const gameState = useGameStore(state => state.gameState);

  // Only show if we are the host, P2 is not connected, and we aren't just chilling on the home screen disconnected
  if (!isHost || p2Connected || gameState === 'home') return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 9000, // Very high but below CRT overlay
      pointerEvents: 'none'
    }}>
      <h2 
        className="retro-text animate-flicker" 
        style={{
          color: 'var(--neon-red)',
          textShadow: '0 0 10px var(--neon-red), 0 0 20px red',
          fontSize: '1.5rem',
          margin: 0,
          border: '2px solid var(--neon-red)',
          padding: '10px 20px',
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}
      >
        PLAYER 2: INSERT COIN TO JOIN
      </h2>
    </div>
  );
};
