export const CrtOverlay = () => {
  return (
    <div 
      className="crt-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999, // Ensure it sits on top of everything but the cursor
        background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)'
      }}
    >
      <div className="scanline" />
    </div>
  );
};
