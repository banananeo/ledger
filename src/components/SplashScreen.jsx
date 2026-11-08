import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const INTRO_MS = 2200;
const SAFETY_MS = 4000;

export function SplashScreen({ onDone = () => {} } = {}) {
  const doneRef = useRef(onDone);
  const firedRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ));
  doneRef.current = onDone;

  const fireDone = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    doneRef.current?.();
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduce = Boolean(mediaQuery?.matches);
    setReducedMotion(reduce);

    const onPreferenceChange = (event) => setReducedMotion(event.matches);
    mediaQuery?.addEventListener?.('change', onPreferenceChange);

    const introTimer = window.setTimeout(fireDone, reduce ? 1000 : INTRO_MS);
    const safetyTimer = window.setTimeout(fireDone, SAFETY_MS);

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(safetyTimer);
      mediaQuery?.removeEventListener?.('change', onPreferenceChange);
    };
    // The splash lifetime is tied to its mount, while the latest callback is kept in doneRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="splash-screen splash-logo-only"
      data-animate={reducedMotion ? 'false' : 'true'}
      onClick={fireDone}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fireDone();
        }
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      role="button"
      tabIndex={0}
      aria-label="Loading Ledger — activate to skip"
      title="Tap to skip"
    >
      <div className="slo-paper-grid" aria-hidden="true" />
      <div className="slo-stack">
        <div className="slo-brand" aria-label="Ledger">
          ledger
          <span className="slo-letter-dot">
            .
          </span>
        </div>

        <div
          className="slo-accent-track"
          aria-hidden="true"
        />

        <p
          className="slo-status"
        >
          SRM ACADEMIA
        </p>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
