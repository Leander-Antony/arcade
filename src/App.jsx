import { useEffect } from 'react';
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
import { LaserMaze } from './games/LaserMaze';

// We'll import actual games later
const GameRenderer = () => {
  const currentGame = useGameStore(state => state.currentGame);
  switch (currentGame) {
    case 'mouse-duel': return <MouseDuel />;
    case 'button-chaos': return <ButtonChaos />;
    case 'puzzle-coop': return <PuzzleCoop />;
    case 'memory-flip': return <MemoryFlip />;
    case 'laser-maze': return <LaserMaze />;
    default: return <div>Unknown Game</div>;
  }
};

function App() {
  const gameState = useGameStore(state => state.gameState);
  const players = useGameStore(state => state.players);

  useEffect(() => {
    // Initialize P2P connection when app loads
    peerSync.init();
  }, []);

  return (
    <>
      <CursorOverlay />
      
      {gameState === 'home' && <HomeScreen />}
      {gameState === 'select' && <GameSelectionScreen />}
      {gameState === 'rules' && <RulesScreen />}
      {gameState === 'playing' && <GameRenderer />}
      {gameState === 'game-over' && (
        <div className="flex-center h-full w-full flex-col">
          <h1 className="neon-text-blue" style={{fontSize: '4rem', marginBottom: '2rem'}}>GAME OVER</h1>
          
          <div style={{ display: 'flex', gap: '4rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--neon-blue)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>P1 Score</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white' }}>{players.p1.score}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--neon-red)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>P2 Score</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white' }}>{players.p2.score}</div>
            </div>
          </div>

          <h2 style={{ fontSize: '3rem', marginBottom: '3rem', color: players.p1.score > players.p2.score ? 'var(--neon-blue)' : players.p1.score < players.p2.score ? 'var(--neon-red)' : 'white' }}>
            {players.p1.score > players.p2.score ? 'PLAYER 1 WINS!' : players.p1.score < players.p2.score ? 'PLAYER 2 WINS!' : 'IT\'S A TIE!'}
          </h2>

          <button className="btn btn-primary" onClick={() => peerSync.sendAction('RETURN_HOME')}>RETURN TO MENU</button>
        </div>
      )}
    </>
  );
}

export default App;
