import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { playSound } from '../utils/sounds';

// Room code is managed dynamically via store and UI now.
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
    this.socket = null;
    this.isHost = false;
    this.unsubscribe = null;
    this.imageChunks = [];
    this.roomCode = null;
    
    // Connect to the Cloudflare tunnel (or fallback to localhost if missing)
    const serverUrl = import.meta.env.VITE_PEER_HOST 
      ? `https://${import.meta.env.VITE_PEER_HOST}` 
      : 'http://localhost:9000';
      
    this.socket = io(serverUrl, {
      autoConnect: false, // We connect manually when host/join is clicked
      extraHeaders: {
        "Bypass-Tunnel-Reminder": "true"
      }
    });
    
    this.setupSocketHandlers();
  }
  
  setupSocketHandlers() {
    this.socket.on('peer_connected', ({ id, isHost }) => {
      if (this.isHost && !isHost) {
        console.log('Client connected to room!');
        const store = useGameStore.getState();
        store.setConnectionStatus('connected');
        
        store.setGameState('home');
        store.setCurrentGame(null);
        store.resetScores();
        
        // Start broadcasting state
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
        
        if (currentStore.currentGame === 'puzzle-coop' && currentStore.gameData?.puzzleImg) {
          this.sendImage(currentStore.gameData.puzzleImg);
        }
      }
    });

    this.socket.on('state_sync', (state) => {
      if (!this.isHost) {
        const currentState = useGameStore.getState();
        currentState.syncFullState({
          ...state,
          isHost: false, 
          players: {
            p1: { ...state.players.p1, cursor: currentState.players.p1.cursor },
            p2: { ...state.players.p2, cursor: currentState.players.p2.cursor }
          }
        });
      }
    });

    this.socket.on('action', ({ action, payload }) => {
      if (this.isHost) {
        this.handleClientAction(action, payload);
      } else if (action === 'PLAY_SOUND') {
        playSound(payload.sound);
      } else if (action === 'TRIGGER_SHAKE') {
        useGameStore.getState().triggerShake();
      } else if (action === 'ACTION_SET_PUZZLE_CONFIG') {
        useGameStore.getState().setGameData(prev => ({
          ...payload.config,
          puzzleImg: prev?.puzzleImg
        }));
      }
    });

    this.socket.on('cursor', ({ x, y }) => {
      const playerId = this.isHost ? 'p2' : 'p1';
      useGameStore.getState().updateCursor(playerId, x, y);
    });

    this.socket.on('image_chunk', (data) => {
      this.imageChunks[data.chunkIndex] = data.data;
      if (this.imageChunks.filter(Boolean).length === data.totalChunks) {
        const fullImage = this.imageChunks.join('');
        this.imageChunks = []; 
        useGameStore.getState().setGameData(prev => ({
          ...prev,
          puzzleImg: fullImage
        }));
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      useGameStore.getState().setConnectionStatus('disconnected');
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (this.isHost) {
        useGameStore.getState().setConnectionStatus('waiting');
      }
    });
  }

  hostGame() {
    const store = useGameStore.getState();
    store.setConnectionStatus('connecting');

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    store.setRoomCode(roomCode);
    this.roomCode = roomCode;
    
    this.isHost = true;
    store.setIsHost(true);
    
    if (this.socket.connected) this.socket.disconnect();
    this.socket.connect();
    
    const hostTimeout = setTimeout(() => {
       if (useGameStore.getState().connectionStatus === 'connecting') {
          alert("Could not reach your local relay server.");
          store.setConnectionStatus('disconnected');
          this.socket.disconnect();
       }
    }, 12000);
    
    this.socket.once('connect', () => {
      clearTimeout(hostTimeout);
      this.socket.emit('join_room', { roomCode, isHost: true });
      store.setConnectionStatus('waiting');
    });
  }

  joinGame(roomCode) {
    const store = useGameStore.getState();
    store.setConnectionStatus('connecting');
    this.roomCode = roomCode.trim().toUpperCase();
    
    this.isHost = false;
    store.setIsHost(false);
    
    if (this.socket.connected) this.socket.disconnect();
    this.socket.connect();
    
    const joinTimeout = setTimeout(() => {
       if (useGameStore.getState().connectionStatus === 'connecting') {
          alert("Connection timed out. The host relay is unreachable.");
          store.setConnectionStatus('disconnected');
          this.socket.disconnect();
       }
    }, 15000);
    
    this.socket.once('connect', () => {
      clearTimeout(joinTimeout);
      this.socket.emit('join_room', { roomCode: this.roomCode, isHost: false });
      store.setConnectionStatus('connected');
    });
  }

  sendAction(action, payload) {
    console.log('SENDING ACTION:', action, payload);
    if (this.socket && this.socket.connected) {
      if (!this.isHost) {
        this.socket.emit('action', { roomCode: this.roomCode, action, payload });
      } else {
        this.socket.emit('action', { roomCode: this.roomCode, action, payload });
        this.handleClientAction(action, payload);
      }
    } else if (this.isHost) {
      this.handleClientAction(action, payload);
    }
  }

  sendState(state) {
    if (this.socket && this.socket.connected && this.isHost) {
      try {
        let safeGameData = state.gameData;
        if (state.gameData && state.gameData.puzzleImg) {
          const { puzzleImg, ...rest } = state.gameData;
          safeGameData = rest;
        }

        const serializableState = {
          gameState: state.gameState,
          currentGame: state.currentGame,
          gameSettings: state.gameSettings,
          gameData: safeGameData,
          players: state.players
        };
        this.socket.emit('state_sync', { roomCode: this.roomCode, state: serializableState });
      } catch (err) {
        console.error('Error sending state:', err);
      }
    }
  }

  sendCursor(x, y) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor', { roomCode: this.roomCode, x, y });
    }
  }

  async sendImage(base64Str) {
    if (!this.socket || !this.socket.connected || !this.isHost) return;
    const CHUNK_SIZE = 16384; 
    const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64Str.substr(i * CHUNK_SIZE, CHUNK_SIZE);
      this.socket.emit('image_chunk', {
        roomCode: this.roomCode,
        chunkIndex: i,
        totalChunks: totalChunks,
        data: chunk
      });
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  handleClientAction(action, payload) {
    if (!this.isHost) return;
    
    const store = useGameStore.getState();
    switch(action) {
      case 'SELECT_GAME': {
        store.setCurrentGame(payload.gameId);
        store.setGameState('rules');
        store.setGameData(null); // Clear old match data
        break;
      }
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
        store.setGameData(null);
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

        if (cards[cardIndex].isJoker) {
          const newCards = [...cards];
          newCards[cardIndex] = { ...newCards[cardIndex], flipped: true, claimedBy: playerId };
          store.updatePlayerScore(playerId, 1);
          playSound('star');
          store.triggerShake(); // Physical feedback!
          if (peerSync.connection && peerSync.connection.open) {
            peerSync.connection.send({ type: 'ACTION', action: 'TRIGGER_SHAKE', payload: {} });
          }
          store.setGameData({ ...state, cards: newCards });
          break; // Joker instantly resolves, they keep their turn
        }

        if (state.flip1 === null) {
          const newCards = [...cards];
          const cIndex = newCards.findIndex(c => c.id === cardId);
          newCards[cIndex] = { ...newCards[cIndex], flipped: true };
          store.setGameData({ ...state, cards: newCards, flip1: cardId });
        } else if (state.flip2 === null) {
          const newCards = [...cards];
          const cIndex = newCards.findIndex(c => c.id === cardId);
          newCards[cIndex] = { ...newCards[cIndex], flipped: true };
          store.setGameData({ ...state, cards: newCards, flip2: cardId, lock: true });
          
          setTimeout(() => {
            const currentStore = useGameStore.getState();
            const currentCards = currentStore.gameData.cards.map(c => ({...c}));
            
            const c1 = currentCards.find(c => c.id === state.flip1);
            const c2 = currentCards.find(c => c.id === cardId);
            
            let nextTurn = currentStore.gameData.currentTurn;
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
              nextTurn = playerId === 'p1' ? 'p2' : 'p1';
            }
            
            currentStore.setGameData({ 
              ...currentStore.gameData, 
              cards: currentCards, 
              flip1: null, 
              flip2: null, 
              lock: false, 
              currentTurn: nextTurn 
            });
            this.sendState(useGameStore.getState());
          }, 1000);
        }
        break;
      }
      case 'ACTION_TRON_TURN': {
        const { playerId, dx, dy } = payload;
        store.setGameData(prev => {
          if (prev && prev.status === 'playing') {
            const pState = prev[playerId];
            // Prevent 180 degree immediate death turns
            if (pState.dx !== -dx || pState.dy !== -dy) {
              return { ...prev, [playerId]: { ...pState, dx, dy } };
            }
          }
          return prev;
        });
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
