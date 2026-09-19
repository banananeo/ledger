import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './CurtainsScopeTransition.css';

export function CurtainsScopeTransition({ activeView, children, origin = { x: 50, y: 50 }, className = '' }) {
  const [displayedView, setDisplayedView] = useState(activeView);

  void origin;

  useEffect(() => {
    setDisplayedView(activeView);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView]);

  return (
    <div className={`curtains-scope-stage ${className}`}>
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={displayedView}
          initial={{ opacity: 0, scale: 0.985, y: 8, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.99, filter: 'blur(6px)' }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="curtains-scope-stage__content"
        >
          {children(displayedView)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default CurtainsScopeTransition;
