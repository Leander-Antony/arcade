import React, { useEffect, useState } from 'react';
import './ArcadeBackground.css';

export const ArcadeBackground = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Normalize mouse position between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="arcade-bg-container">
      {/* Background Gradient Layer */}
      <div className="arcade-layer bg-gradient"></div>

      {/* Grid Parallax Layer */}
      <div 
        className="arcade-layer grid-layer"
        style={{
          transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.05)`
        }}
      ></div>

      {/* Energy Waves */}
      <div className="arcade-layer energy-waves"></div>

      {/* Floating Particles */}
      <div 
        className="arcade-layer particles-layer"
        style={{
          transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`
        }}
      >
        {[...Array(15)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      {/* CRT Overlay (Scanlines & Vignette) - Pointer events none */}
      <div className="arcade-layer crt-overlay"></div>
    </div>
  );
};
