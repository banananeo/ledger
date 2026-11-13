import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const INTRO_MS = 2200;
const SAFETY_MS = 4000;

export function SplashScreen({ onDone = () => {}, greetingName, status } = {}) {
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
      className={`splash-screen splash-logo-only${greetingName !== undefined ? ' splash-screen--welcome' : ''}`}
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
      aria-label={greetingName !== undefined
        ? `Welcome${greetingName ? `, ${greetingName}` : ' to Ledger'} — activate to open the dashboard`
        : 'Loading Ledger — activate to skip'}
      title={greetingName !== undefined ? 'Tap to open your dashboard' : 'Tap to skip'}
    >
      <div className="slo-paper-grid" aria-hidden="true" />
      {greetingName !== undefined ? (
        <div className="slo-stack slo-welcome">
          <p className="slo-status">WELCOME TO LEDGER</p>
          <h1 className="slo-welcome-title">
            {greetingName ? `Welcome, ${greetingName}` : 'Your study space is ready'}
          </h1>
          <div className="slo-accent-track" aria-hidden="true" />
          <p className="slo-status">{status || 'Your dashboard is ready'}</p>
        </div>
      ) : (
        <div className="slo-stack">
          <div className="slo-brand" aria-label="Ledger">
            ledger
            <span className="slo-letter-dot">.</span>
          </div>
          <div className="slo-accent-track" aria-hidden="true" />
          <p className="slo-status">{status || 'SRM ACADEMIA'}</p>
        </div>
      )}
    </motion.div>
  );
}

export default SplashScreen;
