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
import { audioEngine } from './utils/audioEngine';

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

function App() {
  const gameState = useGameStore(state => state.gameState);
  const players = useGameStore(state => state.players);

  useEffect(() => {
    audioEngine.init(); // Initialize audio context early
  }, []);

  useEffect(() => {
    if (gameState === 'game-over') {
      audioEngine.playGameOver();
    }
  }, [gameState]);

  return (
    <>
      <ArcadeBackground />
      <CursorOverlay />
      
      <div className="crt-turn-on" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        {gameState === 'home' && <HomeScreen />}
        {gameState === 'select' && <GameSelectionScreen />}
        {gameState === 'rules' && <RulesScreen />}
        {gameState === 'playing' && <GameRenderer />}
        {gameState === 'game-over' && (
        <div className="flex-center h-full w-full flex-col">
          <h1 className="neon-text-pink retro-text animate-flicker" style={{fontSize: '5rem', marginBottom: '2rem', textAlign: 'center'}}>GAME OVER</h1>
          
          <div style={{ display: 'flex', gap: '5rem', marginBottom: '3rem', justifyContent: 'center' }}>
            <div className="glass-panel" style={{textAlign: 'center', padding: '2rem', minWidth: '200px'}}>
              <div className="retro-text neon-text-blue" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>P1 Score</div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white' }}>{players.p1.score}</div>
            </div>
            <div className="glass-panel" style={{textAlign: 'center', padding: '2rem', minWidth: '200px'}}>
              <div className="retro-text neon-text-red" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>P2 Score</div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white' }}>{players.p2.score}</div>
            </div>
          </div>

          <h2 className="retro-text" style={{ 
            fontSize: '3rem', 
            marginBottom: '3rem', 
            color: players.p1.score > players.p2.score ? 'var(--neon-blue)' : players.p1.score < players.p2.score ? 'var(--neon-red)' : 'var(--baby-pink)',
            textShadow: `0 0 10px ${players.p1.score > players.p2.score ? 'var(--neon-blue)' : players.p1.score < players.p2.score ? 'var(--neon-red)' : 'var(--baby-pink)'}`
          }}>
            {players.p1.score > players.p2.score ? 'PLAYER 1 WINS!' : players.p1.score < players.p2.score ? 'PLAYER 2 WINS!' : 'IT\'S A TIE!'}
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
    </>
  );
}

export default App;
