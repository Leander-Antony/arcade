import { useState, useEffect } from 'react';

const BOOT_LINES = [
  "> SYSTEM INITIALIZING...",
  "> LOADING FIRST_EXPERIENCE.EXE...",
  "> SYNCING P2P PROTOCOLS...",
  "> WELCOME TO THE ARCADE."
];

export const BootSequence = ({ onComplete }) => {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(c => !c), 400);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (currentLineIndex >= BOOT_LINES.length) {
      setTimeout(() => {
        onComplete();
      }, 1000); // Wait 1s after finishing typing before booting
      return;
    }

    const currentLine = BOOT_LINES[currentLineIndex];

    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          if (!newLines[currentLineIndex]) newLines[currentLineIndex] = '';
          newLines[currentLineIndex] = currentLine.substring(0, currentCharIndex + 1);
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, Math.random() * 50 + 30); // Random typing speed

      return () => clearTimeout(timeout);
    } else {
      // Line finished
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, 500); // Pause between lines
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, onComplete]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '2rem 10%',
        fontFamily: '"Courier New", Courier, monospace', // Retro terminal font
        color: 'var(--neon-green)',
        fontSize: '1.5rem',
        textShadow: '0 0 5px var(--neon-green)'
      }}
    >
      {displayedLines.map((line, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          {line}
          {i === currentLineIndex && <span style={{ opacity: showCursor ? 1 : 0 }}>_</span>}
        </div>
      ))}
      {currentLineIndex >= BOOT_LINES.length && <span style={{ opacity: showCursor ? 1 : 0 }}>_</span>}
    </div>
  );
};
