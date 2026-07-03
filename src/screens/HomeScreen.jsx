import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';
import { audioEngine } from '../utils/audioEngine';

export const HomeScreen = () => {
  const { isHost, connectionStatus } = useGameStore();
  
  const bothConnected = connectionStatus === 'connected';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
      className="flex-center flex-col h-full w-full"
      style={{ position: 'relative', zIndex: 10 }}
    >
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', width: '80%', maxWidth: '700px' }}>
        <h1 className="retro-text neon-text-baby-pink animate-flicker" style={{ fontSize: '5rem', marginBottom: '0.5rem', letterSpacing: '4px' }}>
          ARCADE ENTRY
        </h1>
        <p className="retro-text neon-text-purple" style={{ fontSize: '1.5rem', marginBottom: '3rem', letterSpacing: '2px' }}>
          P2P MULTIPLAYER SYSTEM
        </p>

        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-around' }}>
          <div className="flex-col flex-center">
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', 
              backgroundColor: isHost ? 'var(--neon-blue)' : (connectionStatus === 'connected' ? 'var(--neon-blue)' : '#333'),
              boxShadow: isHost ? '0 0 15px var(--neon-blue)' : 'none',
              marginBottom: '15px',
              border: '2px solid rgba(255,255,255,0.2)'
            }}></div>
            <span className="retro-text" style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>{isHost ? 'P1 (HOST)' : 'PLAYER 1'}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{isHost ? 'Active' : (connectionStatus === 'connected' ? 'Connected' : 'Waiting...')}</span>
          </div>
          
          <div className="flex-col flex-center">
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', 
              backgroundColor: !isHost ? 'var(--neon-red)' : (connectionStatus === 'connected' ? 'var(--neon-red)' : '#333'),
              boxShadow: !isHost ? '0 0 15px var(--neon-red)' : 'none',
              marginBottom: '15px',
              border: '2px solid rgba(255,255,255,0.2)'
            }}></div>
            <span className="retro-text" style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>{!isHost ? 'P2 (CLIENT)' : 'PLAYER 2'}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{!isHost ? 'Active' : (connectionStatus === 'connected' ? 'Connected' : 'Waiting...')}</span>
          </div>
        </div>

        <div style={{ marginTop: '2rem', minHeight: '80px' }} className="flex-center">
          {bothConnected ? (
            isHost ? (
              <button 
                className="btn btn-primary animate-pulse-glow" 
                onMouseEnter={() => audioEngine.playHoverBeep()}
                onClick={() => {
                  audioEngine.playCoinInsert();
                  useGameStore.getState().setGameState('select');
                  peerSync.sendState(useGameStore.getState());
                }}
                style={{ fontSize: '1.8rem', padding: '15px 40px' }}
              >
                INSERT COIN / START
              </button>
            ) : (
              <p className="retro-text" style={{ color: 'var(--neon-pink)', fontSize: '1.5rem', animation: 'flicker 2s infinite alternate' }}>
                WAITING FOR P1 TO INSERT COIN...
              </p>
            )
          ) : (
            <p className="retro-text" style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: '1.5' }}>
              <span className="animate-flicker">WAITING FOR P2...</span><br/>
              (Share this URL to connect)
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
