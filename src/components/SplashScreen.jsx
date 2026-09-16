import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const TOTAL_MS = 2400;
const SAFETY_MS = 4000;

export function SplashScreen({ onDone = () => {}, progress = 100 } = {}) {
  const [count, setCount] = useState(0);
  const [docking, setDocking] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const firedRef = useRef(false);

  const fireDone = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    doneRef.current?.();
  };

  // 000 -> 100 counter for the FLASH! beat (first ~550ms)
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const DUR = 550;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / DUR);
      setCount(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Self-timed sequence: dock flight starts just before exit so the
  // App exit slide carries it upward (reads as landing in header).
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? 1200 : TOTAL_MS;
    const dockAt = reduced ? 900 : TOTAL_MS - 280;
    const t1 = setTimeout(() => setDocking(true), dockAt);
    const t2 = setTimeout(fireDone, total);
    // Safety: never trap the user on splash (legacy prop `progress` ignored)
    const t3 = setTimeout(fireDone, SAFETY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void progress;

  return (
    <motion.div
      className={`splash-screen sig-boot${docking ? ' sig-docking' : ''}`}
      onClick={fireDone}
      onTouchEnd={fireDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -64, scale: 0.96, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
      role="button"
      aria-label="Loading Ledger — tap to skip"
      title="Tap to skip"
    >
      {/* 0: halftone storm backdrop */}
      <div className="sig-halftone" aria-hidden="true" />
      <div className="sig-vignette" aria-hidden="true" />
      <div className="sig-grain" aria-hidden="true" />

      {/* 0: kinetic FLASH! masthead + counter */}
      <div className="sig-flash-beat" aria-hidden="true">
        <div className="sig-masthead">FLASH!</div>
        <div className="sig-counter">{String(count).padStart(3, '0')}</div>
        <div className="sig-flash-sub">PRINT → PLAY → RACE → DRAW → DOCK</div>
      </div>

      {/* 1: newspaper slam — paper THROUGH the type */}
      <div className="sig-print-beat" aria-hidden="true">
        <div className="sig-print-type">PRINT</div>
        <div className="sig-paper">
          <div className="sig-paper-head" />
          <div className="sig-paper-lines" />
        </div>
      </div>

      {/* 2: balls burst out, collide, score pop */}
      <div className="sig-play-beat" aria-hidden="true">
        <div className="sig-ball sig-ball--a" />
        <div className="sig-ball sig-ball--b" />
        <div className="sig-ball sig-ball--c" />
        <div className="sig-burst" />
        <div className="sig-score">+100</div>
      </div>

      {/* 3: F1 depth charge + fly-past */}
      <div className="sig-race-beat" aria-hidden="true">
        <div className="sig-track" />
        <div className="sig-speedlines" />
        <svg className="sig-f1" viewBox="0 0 220 60" fill="none" aria-hidden="true">
          <path d="M8 44 L48 40 L62 22 L110 20 L128 32 L196 30 L210 40 L188 46 Z" fill="#E10600" />
          <path d="M62 22 L74 40 L48 40 Z" fill="#111" />
          <circle cx="60" cy="46" r="10" fill="#0c0d10" stroke="#F5F1E8" strokeWidth="3" />
          <circle cx="176" cy="46" r="10" fill="#0c0d10" stroke="#F5F1E8" strokeWidth="3" />
          <path d="M110 20 L124 8 L140 20 Z" fill="#F5F1E8" />
          <rect x="128" y="34" width="40" height="4" fill="#FFD400" />
        </svg>
        <div className="sig-race-word">RACE</div>
      </div>

      {/* 4: F! monogram stroke-draw (bone outline draws, yellow fill snaps, dot pops) */}
      <div className="sig-draw-beat">
        <svg className="sig-monogram" viewBox="0 0 120 120" aria-label="Ledger">
          <path
            className="sig-f-outline"
            d="M34 18 H92 M34 18 V102 M34 58 H78"
            fill="none"
            stroke="#F5F1E8"
            strokeWidth="9"
            strokeLinecap="square"
          />
          <path
            className="sig-f-fill"
            d="M34 18 H92 M34 18 V102 M34 58 H78"
            fill="none"
            stroke="#FFD400"
            strokeWidth="9"
            strokeLinecap="square"
          />
          <g className="sig-bang">
            <rect className="sig-bang-bar" x="92" y="30" width="10" height="44" fill="#FFD400" />
            <circle className="sig-bang-dot" cx="97" cy="92" r="8" fill="#F5F1E8" />
          </g>
        </svg>
        <div className="sig-brand">Ledger<span className="sig-brand-dot">.</span></div>
        <div className="sig-tagline">SRM ACADEMIA</div>
      </div>

      <div className="sig-skip">TAP TO SKIP</div>
    </motion.div>
  );
}

export default SplashScreen;
