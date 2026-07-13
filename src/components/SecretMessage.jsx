import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const SecretMessage = ({ onClose }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  const fullMessage = "My lady, I hope you enjoying 😁😉";

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(c => !c), 400);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const currentChars = [...displayedText];
    const totalChars = [...fullMessage];
    
    if (currentChars.length < totalChars.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(totalChars.slice(0, currentChars.length + 1).join(''));
      }, Math.random() * 50 + 50); // Variable typing speed
      return () => clearTimeout(timeout);
    } else {
      // Auto close after 5 seconds of finishing
      const closeTimeout = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(closeTimeout);
    }
  }, [displayedText, fullMessage, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 99999, // Above everything
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }}
    >
      <div 
        className="retro-text chromatic-text animate-flicker" 
        style={{ 
          color: 'var(--neon-blue)', 
          fontSize: '2rem', 
          maxWidth: '80%', 
          textAlign: 'center',
          lineHeight: '1.5'
        }}
      >
        {displayedText}
        <span style={{ opacity: showCursor ? 1 : 0, color: 'var(--neon-blue)' }}>_</span>
      </div>
      
      {displayedText.length === fullMessage.length && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={onClose}
          className="retro-text"
          style={{
            marginTop: '3rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          [ CLICK TO RETURN ]
        </motion.button>
      )}
    </motion.div>
  );
};
