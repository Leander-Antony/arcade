import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Network State
  isHost: false,
  connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'waiting', 'connected'
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setIsHost: (isHost) => set({ isHost }),

  // Global Game State
  gameState: 'home', // 'home', 'select', 'rules', 'playing', 'game-over'
  currentGame: null, 
  setGameState: (state) => set({ gameState: state }),
  setCurrentGame: (gameId) => set({ currentGame: gameId }),

  // Player State
  players: {
    p1: { connected: false, cursor: { x: 0, y: 0 }, score: 0 },
    p2: { connected: false, cursor: { x: 0, y: 0 }, score: 0 }
  },
  
  updateCursor: (playerId, x, y) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], cursor: { x, y } }
    }
  })),

  updatePlayerScore: (playerId, scoreDelta) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { 
        ...state.players[playerId], 
        score: state.players[playerId].score + scoreDelta 
      }
    }
  })),

  resetScores: () => set((state) => ({
    players: {
      p1: { ...state.players.p1, score: 0 },
      p2: { ...state.players.p2, score: 0 }
    }
  })),

  // Mini-Game State (Generic)
  gameData: {},
  setGameData: (data) => set((state) => ({ 
    gameData: typeof data === 'function' ? data(state.gameData) : data 
  })),

  // Sync action (for full state replacement from Host -> Client)
  syncState: (newState) => set((state) => {
    // Only sync what is necessary, avoid overriding local cursor
    const myPlayerId = state.isHost ? 'p1' : 'p2';
    const otherPlayerId = state.isHost ? 'p2' : 'p1';
    
    return {
      gameState: newState.gameState,
      currentGame: newState.currentGame,
      gameData: newState.gameData,
      players: {
        [myPlayerId]: state.players[myPlayerId], // Keep local cursor
        [otherPlayerId]: newState.players[otherPlayerId] // Sync remote cursor and scores
      }
    };
  }),

  syncFullState: (newState) => set((state) => ({
    ...newState,
    gameData: {
      ...newState.gameData,
      puzzleImg: newState.gameData?.puzzleImg || state.gameData?.puzzleImg
    }
  }))
}));
