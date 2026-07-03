import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';
import { audioEngine } from '../utils/audioEngine';

export const HomeScreen = () => {
  const { isHost, connectionStatus, roomCode } = useGameStore();
  const [joinMode, setJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const connected = connectionStatus === 'connected';
  const waiting = connectionStatus === 'waiting';
  const connecting = connectionStatus === 'connecting';

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

        {connectionStatus === 'disconnected' && !joinMode && (
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary"
              onMouseEnter={() => audioEngine.playHoverBeep()}
              onClick={() => {
                audioEngine.playCoinInsert();
                peerSync.hostGame();
              }}
              style={{ fontSize: '1.5rem', padding: '15px 40px' }}
            >
              HOST GAME
            </button>
            <button 
              className="btn btn-primary"
              style={{ borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)', boxShadow: '0 0 10px var(--neon-purple)' }}
              onMouseEnter={() => audioEngine.playHoverBeep()}
              onClick={() => setJoinMode(true)}
            >
              JOIN GAME
            </button>
          </div>
        )}

        {connectionStatus === 'disconnected' && joinMode && (
          <div className="flex-col flex-center" style={{ gap: '1rem' }}>
            <input 
              type="text" 
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER 6-DIGIT CODE"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '2px solid var(--neon-purple)',
                color: 'var(--neon-purple)',
                padding: '15px 20px',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '5px',
                borderRadius: '8px',
                outline: 'none',
                textTransform: 'uppercase',
                width: '300px'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary"
                onMouseEnter={() => audioEngine.playHoverBeep()}
                onClick={() => {
                  audioEngine.playCoinInsert();
                  if (joinCode.length > 0) peerSync.joinGame(joinCode);
                }}
              >
                CONNECT
              </button>
              <button 
                className="btn"
                style={{ background: 'transparent', border: '1px solid gray', color: 'gray' }}
                onClick={() => setJoinMode(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {connecting && (
          <p className="retro-text animate-pulse-glow" style={{ color: 'var(--neon-blue)', fontSize: '1.5rem' }}>
            CONNECTING TO SERVER...
          </p>
        )}

        {(waiting || connected) && (
          <>
            {isHost && (
              <div className="glass-panel" style={{ 
                display: 'inline-block', padding: '10px 20px', marginBottom: '3rem', 
                border: '1px solid var(--neon-gold)', backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              }}>
                <span className="retro-text" style={{ color: 'var(--text-muted)' }}>ROOM CODE: </span>
                <span className="retro-text" style={{ color: 'var(--neon-gold)', fontSize: '1.5rem', letterSpacing: '4px' }}>{roomCode}</span>
              </div>
            )}

            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-around' }}>
              <div className="flex-col flex-center">
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  backgroundColor: 'var(--neon-blue)',
                  boxShadow: '0 0 15px var(--neon-blue)',
                  marginBottom: '15px',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}></div>
                <span className="retro-text" style={{ color: 'var(--neon-blue)', fontSize: '1.2rem' }}>P1 (HOST)</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Connected</span>
              </div>
              
              <div className="flex-col flex-center">
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  backgroundColor: connected ? 'var(--neon-red)' : '#333',
                  boxShadow: connected ? '0 0 15px var(--neon-red)' : 'none',
                  marginBottom: '15px',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}></div>
                <span className="retro-text" style={{ color: 'var(--neon-red)', fontSize: '1.2rem' }}>P2 (CLIENT)</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{connected ? 'Connected' : 'Waiting...'}</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem', minHeight: '80px' }} className="flex-center">
              {connected ? (
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
                  (Share your Room Code)
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
