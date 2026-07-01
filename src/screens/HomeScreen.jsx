import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

export const HomeScreen = () => {
  const { isHost, connectionStatus, players } = useGameStore();
  
  const bothConnected = connectionStatus === 'connected';

  const handlePlay = () => {
    if (isHost && bothConnected) {
      peerSync.sendAction('GAME_ACTION', null); // Generic, but we just set state directly on host
      useGameStore.getState().setGameState('select');
      peerSync.sendState(useGameStore.getState());
    } else if (!isHost && bothConnected) {
      // Client can also trigger play
      peerSync.sendAction('GAME_ACTION', { type: 'GO_TO_SELECT' }); 
      // Actually let's standardize:
      // Host handles everything. Client sends action.
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-center flex-col h-full w-full"
    >
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', width: '80%', maxWidth: '600px' }}>
        <h1 className="neon-text-blue" style={{ fontSize: '4rem', marginBottom: '1rem', letterSpacing: '4px' }}>
          CURSOR CLASH
        </h1>
        <p className="neon-text-purple" style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>
          Real-Time P2P Microgames
        </p>

        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-around' }}>
          <div className="flex-col flex-center">
            <div style={{ 
              width: '20px', height: '20px', borderRadius: '50%', 
              backgroundColor: isHost ? '#00f3ff' : (connectionStatus === 'connected' ? '#00f3ff' : '#333'),
              boxShadow: isHost ? '0 0 10px #00f3ff' : 'none',
              marginBottom: '10px'
            }}></div>
            <span style={{ color: '#00f3ff' }}>{isHost ? 'You (P1)' : 'Player 1'}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isHost ? 'Host' : (connectionStatus === 'connected' ? 'Connected' : 'Waiting...')}</span>
          </div>
          
          <div className="flex-col flex-center">
            <div style={{ 
              width: '20px', height: '20px', borderRadius: '50%', 
              backgroundColor: !isHost ? '#ff0055' : (connectionStatus === 'connected' ? '#ff0055' : '#333'),
              boxShadow: !isHost ? '0 0 10px #ff0055' : 'none',
              marginBottom: '10px'
            }}></div>
            <span style={{ color: '#ff0055' }}>{!isHost ? 'You (P2)' : 'Player 2'}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{!isHost ? 'Client' : (connectionStatus === 'connected' ? 'Connected' : 'Waiting...')}</span>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          {bothConnected ? (
            <button 
              className="btn btn-primary animate-pulse-glow" 
              onClick={() => {
                if (isHost) {
                  useGameStore.getState().setGameState('select');
                  peerSync.sendState(useGameStore.getState());
                } else {
                   // In this game, Host drives state, client requests it, but actually we can let both trigger 'select' phase 
                   // Wait, I will just let anyone click it and it tells host to change state.
                   peerSync.sendAction('GAME_ACTION', { type: 'GOTO_SELECT' });
                }
              }}
            >
              START BATTLE
            </button>
          ) : (
            <p style={{ color: 'var(--text-muted)', animation: 'pulse 2s infinite' }}>
              Waiting for Player 2 to join...<br/>
              (Open this same URL in another window)
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
