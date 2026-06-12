import { useState, useEffect } from 'react';

function GlowOrb({ prob, color, label, flag }) {
  const [displayed, setDisplayed] = useState(0);

  // Count-up animation
  useEffect(() => {
    setDisplayed(0);
    const target   = prob ?? 50;
    const duration = 900;
    const steps    = 40;
    const interval = duration / steps;
    let current    = 0;

    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        setDisplayed(target);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [prob]);

  // Orb size scales 60px (50% confidence) → 110px (88% confidence)
  const size = prob != null ? 60 + Math.round((prob - 50) * 1.0) : 75;
  const clampedSize = Math.max(60, Math.min(110, size));

  return (
    <div className="oracle-orb-wrap">
      <div
        className="oracle-orb"
        style={{
          '--orb-color':   color,
          '--orb-size':    `${clampedSize}px`,
        }}
      >
        {flag && <img src={flag} alt="" className="oracle-orb__flag" />}
      </div>
      <p className="oracle-orb__pct">{displayed}%</p>
      <p className="oracle-orb__label">{label}</p>
    </div>
  );
}

export default GlowOrb;
