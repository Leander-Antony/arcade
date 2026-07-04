import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Crop to center square
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;
      
      const targetSize = Math.min(size, 1200);
      canvas.width = targetSize;
      canvas.height = targetSize;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
      
      // Compress strongly to keep JSON small for P2P network
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

export const PuzzleCoop = () => {
  const { isHost, gameData } = useGameStore();
  const [showSecret, setShowSecret] = useState(false);
  
  const pieces = gameData?.pieces;
  const isSetup = !pieces;
  const completed = gameData?.completed || false;
  const moves = gameData?.moves || 0;
  const startTime = gameData?.startTime || null;
  const timeTaken = gameData?.timeTaken || null;
  const puzzleImg = gameData?.puzzleImg || DEFAULT_IMG;
  const gridSize = gameData?.gridSize || 4;

  const [puzzleSize, setPuzzleSize] = useState(600);
  const PIECE_SIZE = puzzleSize / gridSize;

  // Responsive scaling
  useEffect(() => {
    const updateSize = () => {
      const ww = window.innerWidth;
      const wh = window.innerHeight;
      // Subtract tray width approx (350) + padding (100)
      const maxW = ww - 400; 
      // Subtract HUD and padding approx
      const maxH = wh - 150;
      let size = Math.min(600, maxW, maxH);
      // Snap to multiple of 12 for clean division by 4 and 6
      size = Math.floor(size / 12) * 12;
      // Minimum size is 240px
      setPuzzleSize(Math.max(size, 240));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const [setupImg, setSetupImg] = useState(DEFAULT_IMG);
  const [setupGrid, setSetupGrid] = useState(4);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [draggedPieceId, setDraggedPieceId] = useState(null);

  // Timer update
  useEffect(() => {
    if (isSetup || completed || !startTime) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSetup, completed, startTime]);

  const handleStartPuzzle = () => {
    const initialPieces = [];
    
    for (let r = 0; r < setupGrid; r++) {
      for (let c = 0; c < setupGrid; c++) {
        const index = r * setupGrid + c;
        initialPieces.push({
          id: `piece-${index}`,
          correctIndex: index,
          currentIndex: null, // null means it's in the tray
          locked: false
        });
      }
    }
    
    // Shuffle the array visually in the tray
    initialPieces.sort(() => Math.random() - 0.5);

    // Send the huge image base64 as chunks to prevent data channel drops
    peerSync.sendImage(setupImg);

    // Update local state first (so the Host gets the image immediately)
    useGameStore.getState().setGameData({
      puzzleImg: setupImg,
      gridSize: setupGrid,
      pieces: initialPieces,
      startTime: Date.now(),
      moves: 0,
      completed: false,
      timeTaken: null
    });

    peerSync.sendAction('ACTION_SET_PUZZLE_CONFIG', {
      config: {
        gridSize: setupGrid,
        pieces: initialPieces,
        startTime: Date.now(),
        moves: 0,
        completed: false,
        timeTaken: null
      }
    });
  };

  const handleDragStart = (e, pieceId) => {
    setDraggedPieceId(pieceId);
    e.dataTransfer.setData('text/plain', pieceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPieceId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, cellIndex) => {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('text/plain') || draggedPieceId;
    if (pieceId) {
      const state = useGameStore.getState().gameData;
      if (!state || !state.pieces) return;
      
      const occupant = state.pieces.find(p => p.currentIndex === cellIndex && p.id !== pieceId);
      
      if (occupant && occupant.locked) {
        // Reject drop if the cell already has a correctly placed (locked) piece
        return;
      }

      // Optimistic local update so it feels instant for Player 2
      useGameStore.getState().setGameData(prev => {
        if (!prev || !prev.pieces) return prev;
        return {
          ...prev,
          pieces: prev.pieces.map(p => {
            if (p.id === pieceId) return { ...p, currentIndex: cellIndex };
            if (occupant && p.id === occupant.id) return { ...p, currentIndex: null }; // Swap old piece to tray
            return p;
          })
        };
      });
      peerSync.sendAction('ACTION_DROP_PIECE', { pieceId, cellIndex });
    }
  };

  const handleDropToTray = (e) => {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('text/plain') || draggedPieceId;
    if (pieceId) {
      // Optimistic local update
      useGameStore.getState().setGameData(prev => {
        if (!prev || !prev.pieces) return prev;
        return {
          ...prev,
          pieces: prev.pieces.map(p => p.id === pieceId ? { ...p, currentIndex: null } : p)
        };
      });
      peerSync.sendAction('ACTION_DROP_PIECE', { pieceId, cellIndex: null });
    }
  };

  if (isSetup) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex-center flex-col h-full w-full"
      >
        <div className="glass-panel" style={{ padding: '3rem', width: '90%', maxWidth: '600px', textAlign: 'center' }}>
          <h2 className="neon-text-purple" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>PUZZLE SETUP</h2>
          
          {isHost ? (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--neon-purple)', fontSize: '1.2rem' }}>
                  1. Select Image
                </label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      compressImage(e.target.files[0], setSetupImg);
                    }
                  }}
                  style={{ display: 'none' }}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="btn" style={{ cursor: 'none', border: '1px solid var(--neon-purple)', color: 'var(--neon-purple)' }}>
                  Upload Custom Image
                </label>
                
                <div style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '200px', height: '200px', borderRadius: '10px', border: '2px solid var(--neon-purple)', overflow: 'hidden' }}>
                    <img src={setupImg} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '3rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--neon-purple)', fontSize: '1.2rem' }}>
                  2. Select Difficulty
                </label>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {[4, 6].map(size => (
                    <button 
                      key={size}
                      className="btn"
                      style={{
                        background: setupGrid === size ? 'var(--neon-purple)' : 'transparent',
                        color: setupGrid === size ? '#000' : 'white',
                        border: '1px solid var(--neon-purple)'
                      }}
                      onClick={() => setSetupGrid(size)}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary animate-pulse-glow" onClick={handleStartPuzzle} style={{ width: '100%', fontSize: '1.5rem' }}>
                START PUZZLE
              </button>
            </>
          ) : (
            <div style={{ padding: '3rem 0' }}>
              <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite', marginBottom: '2rem' }}>⚙️</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>
                Waiting for host to configure puzzle...
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const trayPieces = pieces.filter(p => p.currentIndex === null);
  const totalCells = gridSize * gridSize;

  // Render a puzzle piece given its data
  const renderPiece = (piece) => {
    // Dynamically calculate local coordinates based on CURRENT responsive PIECE_SIZE
    const col = piece.correctIndex % gridSize;
    const row = Math.floor(piece.correctIndex / gridSize);
    const localBgPosX = col * PIECE_SIZE;
    const localBgPosY = row * PIECE_SIZE;

    return (
      <div
        key={piece.id}
        draggable={!piece.locked}
        onDragStart={(e) => handleDragStart(e, piece.id)}
        onDragEnd={handleDragEnd}
        style={{
          width: PIECE_SIZE,
          height: PIECE_SIZE,
          backgroundImage: `url(${puzzleImg})`,
          backgroundPosition: `-${localBgPosX}px -${localBgPosY}px`,
          backgroundSize: `${puzzleSize}px ${puzzleSize}px`,
          boxShadow: piece.locked ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 4px 6px rgba(0,0,0,0.5)',
          cursor: 'none',
          opacity: piece.locked ? 1 : 0.95,
          filter: piece.locked ? 'none' : 'brightness(1.1)',
          flexShrink: 0,
        }}
      />
    );
  };

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: '15px', left: '15px',
        display: 'flex', gap: '15px', zIndex: 100
      }}>
        <div className="glass-panel" style={{ padding: '5px 15px', textAlign: 'center' }}>
          <div style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Time</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{completed && timeTaken ? formatTime(Math.floor(timeTaken / 1000)) : formatTime(elapsedTime)}</div>
        </div>
        <div className="glass-panel" style={{ padding: '5px 15px', textAlign: 'center' }}>
          <div style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Moves</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{moves}</div>
        </div>
      </div>

      {completed && (
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="glass-panel"
          style={{ position: 'absolute', zIndex: 200, padding: '3rem', textAlign: 'center', boxShadow: '0 0 50px rgba(188, 19, 254, 0.4)' }}
        >
          <h2 className="neon-text-purple" style={{ fontSize: '3rem', marginBottom: '1rem' }}>PUZZLE SOLVED! 🎉</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', margin: '2rem 0', fontSize: '1.2rem' }}>
             <div><span style={{ color: 'var(--text-muted)' }}>Time:</span> {formatTime(Math.floor(timeTaken / 1000))}</div>
             <div><span style={{ color: 'var(--text-muted)' }}>Moves:</span> {moves}</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn" style={{ border: '1px solid var(--text-muted)' }} onClick={() => peerSync.sendAction('RETURN_HOME')}>LOBBY</button>
            {isHost && (
              <button className="btn btn-primary" onClick={() => peerSync.sendAction('ACTION_RESTART_PUZZLE')}>NEW PUZZLE</button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Play Area */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', width: '100%', maxWidth: '1200px', padding: '0 20px', marginTop: '40px' }}>
        
        {/* The Grid Board */}
        <div 
          style={{
            width: puzzleSize,
            height: puzzleSize,
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: '2px solid var(--neon-purple)',
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            boxShadow: '0 0 20px rgba(188, 19, 254, 0.2)'
          }} 
        >
          {Array.from({ length: totalCells }).map((_, index) => {
            const pieceInCell = pieces.find(p => p.currentIndex === index);
            
            return (
              <div 
                key={index} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                style={{ 
                  width: PIECE_SIZE, 
                  height: PIECE_SIZE, 
                  border: '1px dashed rgba(255,255,255,0.1)',
                  boxSizing: 'border-box'
                }}
              >
                {pieceInCell && renderPiece(pieceInCell)}
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: Math.max(puzzleSize + 100, 400), width: '100%', maxWidth: '350px', flex: 1 }}>
          
          {/* The Tray */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDropToTray}
            className="glass-panel"
            style={{
              flex: 1,
              padding: '10px',
              overflowY: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'flex-start',
              justifyContent: 'center',
              gap: '10px',
              border: '2px dashed rgba(255,255,255,0.2)'
            }}
          >
            {trayPieces.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', width: '100%', textAlign: 'center', marginTop: '2rem' }}>
                Tray is empty
              </div>
            ) : (
              trayPieces.map(piece => renderPiece(piece))
            )}
          </div>

          {/* Reference Image */}
          <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'var(--neon-purple)', marginBottom: '10px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Reference Image
            </div>
            <img 
              src={puzzleImg} 
              alt="Reference" 
              style={{ 
                width: '180px', 
                height: '180px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }} 
            />
          </div>
        </div>

      </div>

      <button 
        onClick={() => setShowSecret(true)}
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          opacity: 0.1,
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        💔
      </button>

      {showSecret && <SecretMessage onClose={() => setShowSecret(false)} />}
    </div>
  );
};
