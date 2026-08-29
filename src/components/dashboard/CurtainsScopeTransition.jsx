import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './CurtainsScopeTransition.css';

const VIEW_ORDER = ['home', 'timetable', 'attendance', 'calendar', 'marks', 'games'];

/**
 * CurtainsScopeTransition
 * Implements Motion.dev's "Curtains: Scope" page transition pattern:
 * - Scoped strictly to the content viewport/stage container (keeping TopBar & Mobile Tab Bar stable).
 * - Layered curtain blades (accent blade + main surface blade) sweep across the container.
 * - Direction-aware: sweeps forward/backward matching the bottom bar tab sequence.
 * - Content swaps seamlessly at the peak cover point (t = 190ms) and reveals cleanly.
 */
export function CurtainsScopeTransition({ activeView, children, className = '' }) {
  const [displayedView, setDisplayedView] = useState(activeView);
  const [transitionKey, setTransitionKey] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevViewRef = useRef(activeView);

  useEffect(() => {
    if (activeView === displayedView) return;

    const prevIdx = VIEW_ORDER.indexOf(prevViewRef.current);
    const nextIdx = VIEW_ORDER.indexOf(activeView);
    const dir = (nextIdx !== -1 && prevIdx !== -1 && nextIdx < prevIdx) ? 'backward' : 'forward';
    
    setDirection(dir);
    prevViewRef.current = activeView;
    setIsAnimating(true);
    setTransitionKey((k) => k + 1);

    // Exact midpoint: swap the view content while the curtain is 100% covering the stage
    const swapTimer = setTimeout(() => {
      setDisplayedView(activeView);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 190);

    // Transition completion
    const completeTimer = setTimeout(() => {
      setIsAnimating(false);
    }, 420);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(completeTimer);
    };
  }, [activeView, displayedView]);

  const isForward = direction === 'forward';
  const curtainEase = [0.76, 0, 0.24, 1];

  return (
    <div className={`curtains-scope-stage ${className}`}>
      {/* Scoped Page Content */}
      <div className="curtains-scope-stage__content">
        {children(displayedView)}
      </div>

      {/* Scoped Curtain Overlay (Rendered strictly inside the container) */}
      <AnimatePresence>
        {isAnimating && (
          <div key={`curtain-${transitionKey}`} className="curtains-scope-overlay" aria-hidden="true">
            {/* Layer 1: Leading Accent Blade */}
            <motion.div
              className="curtains-blade curtains-blade--accent"
              initial={{
                x: isForward ? '100%' : '-100%',
              }}
              animate={{
                x: [
                  isForward ? '100%' : '-100%',
                  '0%',
                  isForward ? '-100%' : '100%',
                ],
              }}
              transition={{
                duration: 0.38,
                times: [0, 0.48, 1],
                ease: curtainEase,
              }}
            />

            {/* Layer 2: Main Opaque Curtain */}
            <motion.div
              className="curtains-blade curtains-blade--main"
              initial={{
                x: isForward ? '104%' : '-104%',
              }}
              animate={{
                x: [
                  isForward ? '104%' : '-104%',
                  '0%',
                  isForward ? '-104%' : '104%',
                ],
              }}
              transition={{
                duration: 0.41,
                times: [0, 0.48, 1],
                ease: curtainEase,
              }}
            >
              {/* Subtle Motion Emblem in the curtain's center */}
              <div className="curtains-blade__brand">
                <span className="curtains-blade__brand-dot" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CurtainsScopeTransition;
