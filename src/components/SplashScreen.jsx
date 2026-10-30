import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const TOTAL_MS = 1900;
const REDUCED_MS = 900;
const SAFETY_MS = 4000;
const BRAND = 'Ledger';

export function SplashScreen({ onDone = () => {}, onSkip = null, status = 'Preparing your dashboard' } = {}) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const skipRef = useRef(onSkip);
  skipRef.current = onSkip;
  const firedRef = useRef(false);

  const fireDone = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    doneRef.current?.();
  };

  const fireSkip = () => {
    if (skipRef.current) skipRef.current();
    else fireDone();
  };

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? REDUCED_MS : TOTAL_MS;
    const t1 = setTimeout(fireDone, total);
    const t2 = setTimeout(fireDone, SAFETY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="splash-screen splash-logo-only"
      onClick={fireSkip}
      initial={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.97, y: -10, filter: 'blur(8px)', transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="slo-glow" aria-hidden="true" />
      <div className="slo-grid" aria-hidden="true" />
      <div className="slo-orbit" aria-hidden="true" />
      <div className="slo-vignette" aria-hidden="true" />

      <div className="slo-stack">
        <p className="slo-eyebrow">SRM Academia</p>

        <div className="slo-logo-card" aria-hidden="true">
          <span className="slo-shimmer" aria-hidden="true" />
          <svg className="slo-mark" viewBox="0 0 120 120" aria-hidden="true">
            <path
              className="slo-l-draw"
              d="M34 20 V98 H88"
              pathLength="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle className="slo-dot" cx="96" cy="97" r="8" />
          </svg>
        </div>

        <div className="slo-brand" aria-label={`${BRAND}.`}>
          {BRAND.split('').map((ch, i) => (
            <span key={i} className="slo-letter" style={{ '--i': i }} aria-hidden="true">
              {ch}
            </span>
          ))}
          <span className="slo-letter slo-letter-dot" style={{ '--i': BRAND.length }} aria-hidden="true">
            .
          </span>
        </div>

        <div className="slo-loader" aria-hidden="true">
          <div className="slo-loader-fill" />
        </div>

        <p className="slo-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <button
        type="button"
        className="slo-skip"
        onClick={(event) => {
          event.stopPropagation();
          fireSkip();
        }}
      >
        Skip
      </button>
    </motion.div>
  );
}

export default SplashScreen;
