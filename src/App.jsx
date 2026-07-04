import { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { peerSync } from './network/PeerSync';
import { CursorOverlay } from './components/CursorOverlay';
import { HomeScreen } from './screens/HomeScreen';
import { GameSelectionScreen } from './screens/GameSelectionScreen';
import { RulesScreen } from './screens/RulesScreen';
import { MouseDuel } from './games/MouseDuel';
import { ButtonChaos } from './games/ButtonChaos';
import { PuzzleCoop } from './games/PuzzleCoop';
import { MemoryFlip } from './games/MemoryFlip';
import { TronLightcycles } from './games/TronLightcycles';
import { ArcadeBackground } from './components/ArcadeBackground';
import { CrtOverlay } from './components/CrtOverlay';
import { ChallengerBlinker } from './components/ChallengerBlinker';
import { audioEngine } from './utils/audioEngine';
import { motion } from 'framer-motion';

const GameRenderer = () => {
  const currentGame = useGameStore(state => state.currentGame);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    setIsBooting(true);
    audioEngine.playBootUp();
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentGame]);

  if (isBooting) {
    return (
      <div className="boot-screen">
        <div className="boot-text animate-flicker">BOOTING ARCADE_OS_v3.2...</div>
        <div className="boot-progress-bar">
          <div className="boot-progress-fill"></div>
        </div>
      </div>
    );
  }

  switch (currentGame) {
    case 'mouse-duel': return <MouseDuel />;
    case 'button-chaos': return <ButtonChaos />;
    case 'puzzle-coop': return <PuzzleCoop />;
    case 'memory-flip': return <MemoryFlip />;
    case 'tron-lightcycles': return <TronLightcycles />;
    default: return <div>Unknown Game</div>;
  }
};

import { BootSequence } from './components/BootSequence';

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const gameState = useGameStore(state => state.gameState);
  const players = useGameStore(state => state.players);
  const isShaking = useGameStore(state => state.isShaking);

  useEffect(() => {
    audioEngine.init(); // Initialize audio context early
  }, []);

  useEffect(() => {
    if (gameState === 'game-over') {
      audioEngine.playGameOver();
    }
  }, [gameState]);

  if (isBooting) {
    return <BootSequence onComplete={() => setIsBooting(false)} />;
  }

  return (
    <>
      <ArcadeBackground />
      <CrtOverlay />
      <CursorOverlay />
      
      <motion.div 
        style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}
        animate={isShaking ? { x: [-20, 20, -20, 20, -10, 10, 0], y: [10, -10, 10, -10, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="crt-turn-on" style={{ width: '100%', height: '100%' }}>
          {gameState === 'home' && <HomeScreen />}
        {gameState === 'select' && <GameSelectionScreen />}
        {gameState === 'rules' && <RulesScreen />}
        {gameState === 'playing' && <GameRenderer />}
        {gameState === 'game-over' && (
        <div className="flex-center h-full w-full flex-col">
          <h1 className="neon-text-pink retro-text animate-flicker" style={{fontSize: '5rem', marginBottom: '2rem', textAlign: 'center'}}>GAME OVER</h1>
          
          <div style={{ display: 'flex', gap: '5rem', marginBottom: '3rem', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ flex: 1, textAlign: 'center', padding: '2rem', minWidth: '200px', maxWidth: '250px', border: '1px solid var(--neon-blue)' }}>
              <div className="retro-text neon-text-blue" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>ENOLA</div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white' }}>{players.p1.score}</div>
            </div>
            
            <div className="glass-panel" style={{ flex: 1, textAlign: 'center', padding: '2rem', minWidth: '200px', maxWidth: '250px', border: '1px solid var(--neon-red)' }}>
              <div className="retro-text neon-text-red" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>MADZ</div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white' }}>{players.p2.score}</div>
            </div>
          </div>

          <h2 className="retro-text" style={{ 
            fontSize: '3rem', 
            marginBottom: '3rem', 
            color: players.p1.score > players.p2.score ? 'var(--neon-blue)' : players.p1.score < players.p2.score ? 'var(--neon-red)' : 'var(--baby-pink)',
            textShadow: `0 0 10px ${players.p1.score > players.p2.score ? 'var(--neon-blue)' : players.p1.score < players.p2.score ? 'var(--neon-red)' : 'var(--baby-pink)'}`
          }}>
            {players.p1.score > players.p2.score ? 'ENOLA WINS!' : players.p1.score < players.p2.score ? 'MADZ WINS!' : 'IT\'S A TIE!'}
          </h2>

          <button 
            className="btn btn-primary" 
            onMouseEnter={() => audioEngine.playHoverBeep()}
            onClick={() => {
              audioEngine.playCoinInsert();
              peerSync.sendAction('RETURN_HOME');
            }}
          >
            RETURN TO MENU
          </button>
        </div>
        )}
        </div>
      </motion.div>
    </>
  );
}

export default App;
