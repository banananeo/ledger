import React from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS } from './Sidebar.jsx';
import './MobileTabBar.css';

function MobileTabBar({ view, onNavigate }) {
  return (
    <nav className="mtab-wrapper" aria-label="Sections">
      <div className="mtab-glass">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = view === id;
          return (
            <motion.button
              key={id}
              className={`mtab-btn${isActive ? ' mtab-btn--active' : ''}`}
              onClick={() => onNavigate(id)}
              whileTap={{ scale: 0.91 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-pill"
                  className="mtab-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                  }}
                >
                  <span className="mtab-indicator__sheen" />
                </motion.div>
              )}
              <span className="mtab-btn__icon-wrapper">
                <Icon width={19} height={19} className="mtab-btn__icon" />
              </span>
              <span className="mtab-btn__label">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileTabBar;

