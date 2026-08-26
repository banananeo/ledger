import React from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

export function SplashScreen() {
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
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <motion.div
          className="splash-logo-box"
          initial={{ rotate: -8, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 22,
            delay: 0.08,
          }}
        >
          <img src="/icon.svg" alt="Ledger" className="splash-logo-img" />
        </motion.div>

        <motion.div
          className="splash-brand"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          Ledger<span className="splash-brand-dot">.</span>
        </motion.div>

        <motion.p
          className="splash-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          SRM Academia
        </motion.p>

        <div className="splash-loader-bar">
          <motion.div
            className="splash-loader-progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.85, ease: 'easeInOut' }}
            style={{ transformOrigin: '0% 50%' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SplashScreen;
