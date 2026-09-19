import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const TOTAL_MS = 2400;
const SAFETY_MS = 4000;
const BRAND = 'Ledger';

export function SplashScreen({ onDone = () => {}, progress = 100 } = {}) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const firedRef = useRef(false);

  const fireDone = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    doneRef.current?.();
  };

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? 1100 : TOTAL_MS;
    const t1 = setTimeout(fireDone, total);
    const t2 = setTimeout(fireDone, SAFETY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void progress;

  return (
    <motion.div
      className="splash-screen splash-logo-only"
      onClick={fireDone}
      onTouchEnd={fireDone}
      initial={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.94, y: -24, filter: 'blur(12px)', transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      role="button"
      aria-label="Loading Ledger — tap to skip"
      title="Tap to skip"
    >
      <div className="slo-glow" aria-hidden="true" />
      <div className="slo-grid" aria-hidden="true" />
      <div className="slo-vignette" aria-hidden="true" />

      <div className="slo-stack">
        <p className="slo-eyebrow">SRM Academia</p>

        <div className="slo-logo-card">
          <span className="slo-shimmer" aria-hidden="true" />
          <svg className="slo-mark" viewBox="0 0 120 120" aria-label="Ledger">
            <path
              className="slo-l-draw"
              d="M34 22 H88 M34 22 V98 M34 62 H74"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle className="slo-dot" cx="96" cy="96" r="9" />
          </svg>
        </div>

        <div className="slo-brand" aria-label={`${BRAND}.`}>
          {BRAND.split('').map((ch, i) => (
            <span key={i} className="slo-letter" style={{ animationDelay: `${0.55 + i * 0.045}s` }}>
              {ch}
            </span>
          ))}
          <span className="slo-letter slo-letter-dot" style={{ animationDelay: `${0.55 + BRAND.length * 0.045}s` }}>
            .
          </span>
        </div>

        <div className="slo-loader" aria-hidden="true">
          <div className="slo-loader-fill" />
        </div>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
