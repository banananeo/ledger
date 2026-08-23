import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GamepadIcon, RefreshIcon, DiceIcon } from './Icons.jsx';
import './AcademiaDownBanner.css';

export function AcademiaDownBanner({ error, onRetry, onPlayGame }) {
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="academia-down-banner bcard"
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      >
        <div className="academia-down-banner__left">
          <div className="academia-down-banner__icon-box">
            <span className="academia-down-banner__emoji">💤</span>
          </div>

          <div className="academia-down-banner__content">
            <div className="academia-down-banner__tagline">
              <span className="bchip bchip--warning">ACADEMIA SERVER DOWN</span>
              <span className="academia-down-banner__tip">Offline Mode Active</span>
            </div>
            <h4 className="academia-down-banner__title">
              Academia is taking a nap! Want to play a game while waiting?
            </h4>
            <p className="academia-down-banner__desc">
              {error} — Test your luck with <strong>Bunk Roulette</strong> or beat your high score in <strong>Retro Snake</strong>.
            </p>
          </div>
        </div>

        <div className="academia-down-banner__actions">
          <button
            className="bbtn bbtn--good academia-down-banner__btn"
            onClick={() => onPlayGame && onPlayGame('roulette')}
          >
            <DiceIcon width={16} height={16} />
            <span>Spin Bunk Roulette</span>
          </button>

          <button
            className="bbtn bbtn--outline academia-down-banner__btn"
            onClick={() => onPlayGame && onPlayGame('snake')}
          >
            <GamepadIcon width={16} height={16} />
            <span>Play Snake</span>
          </button>

          {onRetry && (
            <button
              className="bbtn bbtn--outline academia-down-banner__btn"
              onClick={onRetry}
              title="Retry sync"
            >
              <RefreshIcon width={15} height={15} />
              <span>Retry</span>
            </button>
          )}

          <button
            className="academia-down-banner__close"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AcademiaDownBanner;
