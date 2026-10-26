import React from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS } from './Sidebar.jsx';
import './MobileTabBar.css';

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.id !== 'games');

function MobileTabBar({ view, onNavigate }) {
  return (
    <nav className="mtab-wrapper" aria-label="Main navigation">
      <div className="mtab-glass">
        {MOBILE_NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = view === id;
          return (
            <motion.button
              key={id}
              type="button"
              className={`mtab-btn${isActive ? ' mtab-btn--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => onNavigate(id, e)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            >
              {isActive && (
                <motion.div
                  layoutId="apple-liquid-glass-pill"
                  className="mtab-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 460,
                    damping: 34,
                    mass: 0.75,
                  }}
                >
                </motion.div>
              )}
              <motion.span
                className="mtab-btn__icon-wrapper"
                animate={{
                  scale: isActive ? 1.12 : 1,
                  y: isActive ? -1 : 0
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              >
                <Icon width={20} height={20} className="mtab-btn__icon" />
              </motion.span>
              <span className="mtab-btn__label">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileTabBar;


