import { Peer } from 'peerjs';
import { useGameStore } from '../store/useGameStore';
import { playSound } from '../utils/sounds';

// Generate or retrieve room ID from URL
let roomParam = new URLSearchParams(window.location.search).get('room');
if (!roomParam) {
  roomParam = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + roomParam;
  window.history.pushState({path: newUrl}, '', newUrl);
}
const GLOBAL_ROOM_ID = `arcade-room-${roomParam}`;
function calculateLaser(grid) {
  let cx = 0, cy = 0, cdir = 'right';
  const path = [];
  let exitHit = false;
  
  for(let i = 0; i < 50; i++) {
    path.push({x: cx, y: cy});
    if (cx === 7 && cy === 7) exitHit = true;
    
    if (cdir === 'right') cx++;
    else if (cdir === 'left') cx--;
    else if (cdir === 'up') cy--;
    else if (cdir === 'down') cy++;
    
    if (cx < 0 || cx >= 8 || cy < 0 || cy >= 8) break;
    
    const cell = grid[cy * 8 + cx];
    if (cell === '/') {
      if (cdir === 'right') cdir = 'up';
      else if (cdir === 'left') cdir = 'down';
      else if (cdir === 'up') cdir = 'right';
      else if (cdir === 'down') cdir = 'left';
    } else if (cell === '\\') {
      if (cdir === 'right') cdir = 'down';
      else if (cdir === 'left') cdir = 'up';
      else if (cdir === 'up') cdir = 'left';
      else if (cdir === 'down') cdir = 'right';
    }
  }
  return { laserPath: path, exitLocked: !exitHit };
}

class PeerSyncManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.unsubscribe = null;
    this.imageChunks = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    const store = useGameStore.getState();
    store.setConnectionStatus('connecting');

    // Attempt to connect as client first
    this.peer = new Peer({ debug: 2 });
    
    this.peer.on('open', (id) => {
      console.log('My client peer ID is: ' + id);
      // Try connecting to the global room ID
      const conn = this.peer.connect(GLOBAL_ROOM_ID, {
        reliable: true
      });

      conn.on('open', () => {
        console.log('Connected to host!');
        this.connection = conn;
        this.isHost = false;
        useGameStore.getState().setIsHost(false);
        useGameStore.getState().setConnectionStatus('connected');
        this.setupConnectionHandlers(conn);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
          // Host doesn't exist, so we become the host
          console.log('No host found, becoming host...');
          this.becomeHost();
        }
      });
    });
  }
  
  becomeHost() {
    if (this.peer) {
      this.peer.destroy();
    }
    
    // Create new peer with the global ID
    this.peer = new Peer(GLOBAL_ROOM_ID, { debug: 2 });
    
    this.peer.on('open', (id) => {
      console.log('Host established: ' + id);
      this.isHost = true;
      useGameStore.getState().setIsHost(true);
      useGameStore.getState().setConnectionStatus('waiting');
    });

    this.peer.on('connection', (conn) => {
      if (this.connection) {
        console.log('Rejecting additional connection');
        conn.close();
        return;
      }
      console.log('Client connection received...');
      
      conn.on('open', () => {
        console.log('Client connection OPEN!');
        this.connection = conn;
        
        const store = useGameStore.getState();
        store.setConnectionStatus('connected');
        
        store.setGameState('home');
        store.setCurrentGame(null);
        store.resetScores();

        this.setupConnectionHandlers(conn);
        
        let lastCoreState = '';
        if (this.unsubscribe) this.unsubscribe();
        this.unsubscribe = useGameStore.subscribe((state) => {
          try {
            const coreState = {
              gameState: state.gameState,
              currentGame: state.currentGame,
              gameData: state.gameData,
              p1Score: state.players.p1.score,
              p2Score: state.players.p2.score
            };
            const newStateStr = JSON.stringify(coreState);
            if (newStateStr !== lastCoreState) {
              lastCoreState = newStateStr;
              this.sendState(state);
            }
          } catch (e) {
            console.error('State sync error:', e);
          }
        });
        
        const currentStore = useGameStore.getState();
        this.sendState(currentStore);
        
        // If a client connects late (or refreshes) during a puzzle, send them the image chunks
        if (currentStore.currentGame === 'puzzle-coop' && currentStore.gameData?.puzzleImg) {
          this.sendImage(currentStore.gameData.puzzleImg);
        }
      });
    });
    
    this.peer.on('error', (err) => {
      console.error('Host error:', err);
    });
  }

  setupConnectionHandlers(conn) {
    conn.on('data', (data) => {
      if (data.type === 'STATE_SYNC' && !this.isHost) {
        const currentState = useGameStore.getState();
        currentState.syncFullState({
          ...data.state,
          isHost: false, // ensure client stays client
          players: {
            p1: { ...data.state.players.p1, cursor: currentState.players.p1.cursor }, // Preserve remote cursor
            p2: { ...data.state.players.p2, cursor: currentState.players.p2.cursor }  // Preserve local cursor
          }
        });
      } else if (data.type === 'ACTION') {
        if (this.isHost) {
          console.log('HOST RECEIVED ACTION:', data.action, data.payload);
          this.handleClientAction(data.action, data.payload);
        } else if (data.action === 'PLAY_SOUND') {
          playSound(data.payload.sound);
        } else if (data.action === 'ACTION_SET_PUZZLE_CONFIG') {
          // Client receives the puzzle config
          useGameStore.getState().setGameData(prev => ({
            ...data.payload.config,
            puzzleImg: prev?.puzzleImg
          }));
        }
      } else if (data.type === 'IMAGE_CHUNK') {
        this.imageChunks[data.chunkIndex] = data.data;
        // Check if all chunks received
        if (this.imageChunks.filter(Boolean).length === data.totalChunks) {
          const fullImage = this.imageChunks.join('');
          this.imageChunks = []; // Reset for future images
          useGameStore.getState().setGameData(prev => ({
            ...prev,
            puzzleImg: fullImage
          }));
          console.log('Successfully received and assembled full image!');
        }
      } else if (data.type === 'CURSOR') {
        const playerId = this.isHost ? 'p2' : 'p1'; // If I am host, data is from p2
        useGameStore.getState().updateCursor(playerId, data.x, data.y);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed');
      useGameStore.getState().setConnectionStatus('disconnected');
      this.connection = null;
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (this.isHost) {
        useGameStore.getState().setConnectionStatus('waiting');
      } else {
        // Try to reconnect
        setTimeout(() => this.init(), 2000);
      }
    });
  }

  sendAction(action, payload) {
    console.log('SENDING ACTION:', action, payload);
    if (this.connection && this.connection.open) {
      if (!this.isHost) {
        this.connection.send({ type: 'ACTION', action, payload });
      } else {
        // Host sending action to client (e.g. sound)
        this.connection.send({ type: 'ACTION', action, payload });
        this.handleClientAction(action, payload);
      }
    } else if (this.isHost) {
      this.handleClientAction(action, payload);
    }
  }

  sendState(state) {
    if (this.connection && this.connection.open && this.isHost) {
      try {
        // Strip out puzzleImg to prevent 100KB payloads on every sync
        let safeGameData = state.gameData;
        if (state.gameData && state.gameData.puzzleImg) {
          const { puzzleImg, ...rest } = state.gameData;
          safeGameData = rest;
        }

        const serializableState = {
          gameState: state.gameState,
          currentGame: state.currentGame,
          gameData: safeGameData,
          players: state.players
        };
        this.connection.send({ type: 'STATE_SYNC', state: serializableState });
      } catch (err) {
        console.error('Error sending state:', err);
      }
    }
  }

  sendCursor(x, y) {
    // Only send if connected
    if (this.connection && this.connection.open) {
      this.connection.send({ type: 'CURSOR', x, y });
    }
  }

  async sendImage(base64Str) {
    if (!this.connection || !this.connection.open || !this.isHost) return;
    const CHUNK_SIZE = 16384; // 16KB chunks to easily pass through WebRTC limits
    const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64Str.substr(i * CHUNK_SIZE, CHUNK_SIZE);
      this.connection.send({
        type: 'IMAGE_CHUNK',
        chunkIndex: i,
        totalChunks: totalChunks,
        data: chunk
      });
      // Small artificial delay to prevent WebRTC send buffer overflow
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  handleClientAction(action, payload) {
    if (!this.isHost) return;
    
    const store = useGameStore.getState();
    switch(action) {
      case 'SELECT_GAME':
        store.setCurrentGame(payload.gameId);
        store.setGameState('rules');
        break;
      case 'GOTO_SELECT':
        store.setGameState('select');
        break;
      case 'START_GAME':
        store.setGameState('playing');
        break;
      case 'RETURN_HOME':
        store.setGameState('home');
        store.setCurrentGame(null);
        store.resetScores();
        break;
      case 'UPDATE_GAME_DATA':
        store.setGameData(payload.data);
        break;
      case 'ADD_SCORE':
        store.updatePlayerScore(payload.playerId, payload.amount);
        break;
      case 'GAME_OVER':
        store.setGameState('game-over');
        playSound('win');
        break;
      case 'PLAY_SOUND':
        playSound(payload.sound);
        break;
      case 'ACTION_COLLECT_MOUSEDUEL': {
        const { itemId, playerId, type } = payload;
        const currentItems = store.gameData?.items || [];
        console.log('PROCESSING COLLECT:', itemId, 'Current items count:', currentItems.length);
        if (currentItems.find(i => i.id === itemId)) {
          console.log('ITEM FOUND! Collecting...', itemId);
          store.setGameData(prev => ({ items: prev.items.filter(i => i.id !== itemId) }));
          let delta = 0;
          let soundToPlay = 'trap';
          if (type === 'star') { delta = 1; soundToPlay = 'star'; }
          else if (type === 'cake') { delta = 5; soundToPlay = 'powerup'; }
          else if (type === 'bomb') { delta = -5; soundToPlay = 'trap'; }
          else if (type === 'trap') { delta = -1; soundToPlay = 'trap'; }
          
          store.updatePlayerScore(playerId, delta);
          playSound(soundToPlay);
        } else {
          console.log('ITEM NOT FOUND IN STATE:', itemId);
        }
        break;
      }
      case 'ACTION_CLICK_BUTTONCHAOS': {
        const { index, playerId, isPowerUp } = payload;
        const currentGrid = store.gameData?.grid;
        if (!currentGrid) break;
        
        const newGrid = [...currentGrid];
        const playerVal = playerId === 'p1' ? 1 : 2;
        
        const claimTile = (idx) => {
          if (idx >= 0 && idx < 64) {
            newGrid[idx] = playerVal;
          }
        };

        claimTile(index);

        if (isPowerUp) {
          // Claim 3x3 area
          const row = Math.floor(index / 8);
          const col = index % 8;
          for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
              if (row + r >= 0 && row + r < 8 && col + c >= 0 && col + c < 8) {
                claimTile((row + r) * 8 + (col + c));
              }
            }
          }
          playSound('powerup');
          // Host clears powerup immediately
          store.setGameData(prev => ({ ...prev, grid: newGrid, powerUpIndex: null }));
        } else {
          playSound('click');
          store.setGameData(prev => ({ ...prev, grid: newGrid }));
        }
        
        break;
      }
      case 'ACTION_SET_PUZZLE_CONFIG':
        store.setGameData(prev => ({
          ...payload.config,
          puzzleImg: prev?.puzzleImg
        }));
        break;
      case 'ACTION_RESTART_PUZZLE':
        store.setGameData({});
        break;
      case 'ACTION_DROP_PIECE': {
        const { pieceId, cellIndex } = payload;
        const state = store.gameData || {};
        const pieces = state.pieces || [];
        
        let occupant = null;
        if (cellIndex !== null) {
          occupant = pieces.find(p => p.currentIndex === cellIndex && p.id !== pieceId);
          if (occupant && occupant.locked) {
            // Cannot drop onto a locked piece
            break;
          }
        }
        
        const newPieces = pieces.map(p => {
          if (p.id === pieceId) {
            const isCorrect = p.correctIndex === cellIndex;
            return { ...p, currentIndex: cellIndex, locked: isCorrect };
          }
          if (occupant && p.id === occupant.id) {
            return { ...p, currentIndex: null }; // Swap to tray
          }
          return p;
        });
        
        const anyUnlocked = newPieces.some(p => !p.locked);
        
        const isCompleted = !anyUnlocked && newPieces.length > 0;
        store.setGameData(prev => ({ 
          ...prev, 
          pieces: newPieces, 
          completed: isCompleted,
          moves: (prev.moves || 0) + 1,
          timeTaken: isCompleted && !prev.completed ? Date.now() - (prev.startTime || Date.now()) : prev.timeTaken
        }));
        
        if (isCompleted && !state.completed) {
          playSound('win');
        } else {
          // Check if the piece we just dropped locked into place
          const droppedPiece = newPieces.find(p => p.id === pieceId);
          if (droppedPiece && droppedPiece.locked) {
            playSound('star'); // Satisfying snap sound
          }
        }
        break;
      }
      case 'ACTION_FLIP_CARD': {
        const { cardId, playerId } = payload;
        const state = store.gameData;
        if (!state || state.lock) break;
        
        const cards = [...state.cards];
        const cardIndex = cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1 || cards[cardIndex].flipped || cards[cardIndex].claimedBy) break;

        cards[cardIndex].flipped = true;

        if (state.flip1 === null) {
          store.setGameData({ ...state, cards, flip1: cardId });
        } else if (state.flip2 === null) {
          store.setGameData({ ...state, cards, flip2: cardId, lock: true });
          
          setTimeout(() => {
            const currentStore = useGameStore.getState();
            const currentCards = [...currentStore.gameData.cards];
            const c1 = currentCards.find(c => c.id === state.flip1);
            const c2 = currentCards.find(c => c.id === cardId);
            
            if (c1 && c2 && c1.emoji === c2.emoji) {
              c1.claimedBy = playerId;
              c2.claimedBy = playerId;
              c1.flipped = false;
              c2.flipped = false;
              currentStore.updatePlayerScore(playerId, 1);
              playSound('star');
            } else {
              if (c1) c1.flipped = false;
              if (c2) c2.flipped = false;
              playSound('trap');
            }
            
            currentStore.setGameData({ ...currentStore.gameData, cards: currentCards, flip1: null, flip2: null, lock: false });
            this.sendState(currentStore);
          }, 1000);
        }
        break;
      }
      case 'ACTION_ROTATE_MIRROR': {
        const { x, y } = payload;
        const state = store.gameData;
        const grid = [...state.grid];
        const idx = y * 8 + x;
        if (grid[idx] === '/') grid[idx] = '\\';
        else if (grid[idx] === '\\') grid[idx] = '/';
        
        const { laserPath, exitLocked } = calculateLaser(grid);
        store.setGameData({ ...state, grid, laserPath, exitLocked });
        break;
      }
      case 'ACTION_MOVE_P2': {
        const { dx, dy } = payload;
        const state = store.gameData;
        const newX = state.p2Pos.x + dx;
        const newY = state.p2Pos.y + dy;
        
        if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
          const cell = state.grid[newY * 8 + newX];
          if (cell !== '/' && cell !== '\\' && cell !== 'wall') {
            store.setGameData({ ...state, p2Pos: { x: newX, y: newY } });
            
            if (!state.exitLocked && newX === 7 && newY === 7) {
              store.setGameState('game-over');
            }
          }
        }
        break;
      }
      default:
        console.warn('Unknown action:', action);
    }
  }
}

export const peerSync = new PeerSyncManager();
