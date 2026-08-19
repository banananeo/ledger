import React from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS } from './Sidebar.jsx';
import './MobileTabBar.css';

function MobileTabBar({ view, onNavigate }) {
  return (
    <nav className="mtab-wrapper" aria-label="Main Navigation">
      <div className="mtab-glass">
        {/* Specular Edge Lens Highlight */}
        <div className="mtab-glass__rim-light" />
        
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = view === id;
          return (
            <motion.button
              key={id}
              className={`mtab-btn${isActive ? ' mtab-btn--active' : ''}`}
              onClick={() => onNavigate(id)}
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
                  <span className="mtab-indicator__sheen" />
                  <span className="mtab-indicator__glow" />
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


