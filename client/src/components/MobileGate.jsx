import { useState, useEffect } from 'react';

// Threshold below which the full app is replaced with the mobile gate.
// 900px catches tablets in portrait too -- this app is genuinely desktop-first.
const DESKTOP_MIN_PX = 900;

function MobileGate({ children }) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_MIN_PX);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isDesktop) return children;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #05071a 0%, #0a0d2e 40%, #060818 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center', color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>&#x26BD;</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c518', marginBottom: '0.75rem' }}>
        Open on a Computer
      </h1>
      <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', maxWidth: '28ch', lineHeight: 1.6 }}>
        WC Tracker is designed for desktop. Please visit on a larger screen for the full experience.
      </p>
    </div>
  );
}

export default MobileGate;
