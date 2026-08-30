import React from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const BRAND = 'Ledger';

export function SplashScreen({ progress = 100 }) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
    >
      <motion.div
        className="splash-content"
        initial={{ opacity: 0, scale: 0.88, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo assembly: box drops in, then the icon settles with a spring */}
        <motion.div
          layoutId="ledger-logo"
          className="splash-logo-box"
          initial={{ rotate: -8, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.08 }}
        >
          <motion.img
            src="/icon.svg"
            alt="Ledger"
            className="splash-logo-img"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.22 }}
          />
        </motion.div>

        {/* Letter-by-letter brand reveal */}
        <motion.div className="splash-brand" aria-label={`${BRAND}.`}>
          {BRAND.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.32 + i * 0.035, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
          <motion.span
            className="splash-brand-dot"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 12, delay: 0.32 + BRAND.length * 0.035 + 0.05 }}
          >
            .
          </motion.span>
        </motion.div>

        <motion.p
          className="splash-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          SRM Academia
        </motion.p>

        <div className="splash-loader-bar">
          <motion.div
            className="splash-loader-progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: clamped / 100 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ transformOrigin: '0% 50%' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SplashScreen;