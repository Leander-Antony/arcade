import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { peerSync } from '../network/PeerSync';
import { motion } from 'framer-motion';

const PUZZLE_IMG = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const PUZZLE_SIZE = 600;
const GRID = 3;
const PIECE_SIZE = PUZZLE_SIZE / GRID;

export const PuzzleCoop = () => {
  const { isHost, gameData } = useGameStore();
  const pieces = gameData?.pieces || [];
  const completed = gameData?.completed || false;
  
  const [localDragging, setLocalDragging] = useState(null);

  // HOST init
  useEffect(() => {
    if (!isHost) return;
    const initialPieces = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        // Random positions away from center target
        const isLeft = Math.random() > 0.5;
        const rx = isLeft ? Math.random() * 200 - 300 : Math.random() * 200 + PUZZLE_SIZE + 100;
        const ry = Math.random() * (window.innerHeight - PIECE_SIZE);

        initialPieces.push({
          id: `${r}-${c}`,
          targetX: c * PIECE_SIZE,
          targetY: r * PIECE_SIZE,
          x: rx,
          y: ry,
          locked: false
        });
      }
    }
    useGameStore.getState().setGameData({ pieces: initialPieces, completed: false, startTime: Date.now() });
    peerSync.sendState(useGameStore.getState());
  }, [isHost]);

  const handleDrag = (id, e, info) => {
    if (localDragging !== id) setLocalDragging(id);
    
    // We send relative offset from the center container to ensure it works across sizes
    // But for simplicity in this prototype, let's just send the absolute pixel coords 
    // relative to the parent container.
    // Framer motion gives us `info.offset`, but we want absolute pos.
    // Better: We track `x` and `y` locally and sync onDragEnd to avoid crazy network spam.
  };

  const handleDragEnd = (id, e, info) => {
    setLocalDragging(null);
    // Find the piece
    const piece = pieces.find(p => p.id === id);
    if (!piece || piece.locked) return;

    // Calculate new position (Framer motion drag updates the visual, but we need to tell host)
    // info.point is absolute screen coordinates. Let's send a generic move request based on offset.
    const newX = piece.x + info.offset.x;
    const newY = piece.y + info.offset.y;

    peerSync.sendAction('ACTION_DROP_PIECE', { id, x: newX, y: newY });
  };

  return (
    <div className="w-full h-full flex-center flex-col" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {completed && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="glass-panel"
          style={{ position: 'absolute', zIndex: 100, padding: '3rem', textAlign: 'center' }}
        >
          <h2 className="neon-text-purple" style={{ fontSize: '3rem', marginBottom: '1rem' }}>PUZZLE COMPLETE!</h2>
          <button className="btn btn-primary" onClick={() => peerSync.sendAction('RETURN_HOME')}>BACK TO LOBBY</button>
        </motion.div>
      )}

      {/* Target Board outline */}
      <div style={{
        position: 'absolute',
        width: PUZZLE_SIZE,
        height: PUZZLE_SIZE,
        border: '2px dashed var(--neon-purple)',
        opacity: 0.3,
        left: `calc(50% - ${PUZZLE_SIZE/2}px)`,
        top: `calc(50% - ${PUZZLE_SIZE/2}px)`,
        pointerEvents: 'none'
      }} />

      {/* Pieces Container (Full screen to allow dragging anywhere, but 0,0 is top-left) */}
      <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
        {pieces.map(piece => {
          
          const isMeDragging = localDragging === piece.id;

          return (
            <motion.div
              key={piece.id}
              drag={!piece.locked}
              dragMomentum={false}
              onDrag={handleDrag}
              onDragEnd={(e, info) => handleDragEnd(piece.id, e, info)}
              animate={{ 
                // Only animate position if I am NOT dragging it, to avoid stuttering
                x: isMeDragging ? undefined : piece.x, 
                y: isMeDragging ? undefined : piece.y 
              }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                width: PIECE_SIZE,
                height: PIECE_SIZE,
                backgroundImage: `url(${PUZZLE_IMG})`,
                backgroundPosition: `-${piece.targetX}px -${piece.targetY}px`,
                backgroundSize: `${PUZZLE_SIZE}px ${PUZZLE_SIZE}px`,
                boxShadow: piece.locked ? 'none' : (isMeDragging ? '0 0 20px var(--neon-purple)' : '0 0 5px rgba(0,0,0,0.5)'),
                zIndex: piece.locked ? 1 : (isMeDragging ? 50 : 10),
                cursor: piece.locked ? 'default' : 'none',
                opacity: piece.locked ? 0.9 : 1
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
