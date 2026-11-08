import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshIcon } from './Icons.jsx';
import './AcademiaDownBanner.css';

export function AcademiaDownBanner({ error, onRetry, onReconnectAcademia }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (error) setDismissed(false);
  }, [error]);

  const visible = Boolean(error) && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="academia-down-banner bcard"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
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
              Academia is temporarily unavailable.
            </h4>
            <p className="academia-down-banner__desc">
              {error}
            </p>
          </div>
        </div>

        <div className="academia-down-banner__actions">
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

          {onReconnectAcademia && (
            <button
              className="bbtn bbtn--outline academia-down-banner__btn"
              onClick={onReconnectAcademia}
            >
              <span>Reconnect Academia</span>
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
      )}
    </AnimatePresence>
  );
}

export default AcademiaDownBanner;
