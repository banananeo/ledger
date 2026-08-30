import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './CurtainsScopeTransition.css';

export function CurtainsScopeTransition({ activeView, children, origin = { x: 50, y: 50 }, className = '' }) {
  const [displayedView, setDisplayedView] = useState(activeView);
  const lockedOrigin = useRef(origin);

  if (activeView !== displayedView) {
    lockedOrigin.current = origin;
  }

  useEffect(() => {
    setDisplayedView(activeView);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView]);

  const { x, y } = lockedOrigin.current;

  return (
    <div className={`curtains-scope-stage ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={displayedView}
          initial={{ clipPath: `circle(0% at ${x}% ${y}%)` }}
          animate={{ clipPath: `circle(150% at ${x}% ${y}%)` }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
          className="curtains-scope-stage__content"
        >
          {children(displayedView)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default CurtainsScopeTransition;