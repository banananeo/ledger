import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LedgerLogoIcon,
  ClockIcon,
  CheckRingIcon,
  CalendarIcon,
  AwardIcon,
  GamepadIcon,
} from './Icons.jsx';
import './MobileRadialMenu.css';

// All 6 Navigation items for the radial dial, with Home using the Ledger Logo
export const RADIAL_ITEMS = [
  { id: 'home', label: 'Home', Icon: LedgerLogoIcon, angle: 165 },
  { id: 'timetable', label: 'Timetable', Icon: ClockIcon, angle: 135 },
  { id: 'attendance', label: 'Attendance', Icon: CheckRingIcon, angle: 105 },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon, angle: 75 },
  { id: 'marks', label: 'Marks', Icon: AwardIcon, angle: 45 },
  { id: 'games', label: 'Games', Icon: GamepadIcon, angle: 15 },
];

export function MobileRadialMenu({ view, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const containerRef = useRef(null);

  // Close on outside pointer interaction
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoveredItem(null);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHoveredItem(null);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id, event) => {
    onNavigate(id, event);
    setIsOpen(false);
    setHoveredItem(null);
  };

  const isHomeView = view === 'home';
  const currentItem = RADIAL_ITEMS.find((item) => item.id === view) || RADIAL_ITEMS[0];
  const CurrentIcon = currentItem.Icon;

  // Active or hovered item for center label display
  const activeDisplayItem = hoveredItem || currentItem;
  const DisplayIcon = activeDisplayItem.Icon;

  // Responsive radial radius - balanced for perfect arc symmetry and clearance
  const radius = typeof window !== 'undefined' && window.innerWidth <= 360 ? 98 : 112;

  return (
    <>
      {/* Dimmed Blurred Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="radial-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              setIsOpen(false);
              setHoveredItem(null);
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <nav className="radial-wrapper" ref={containerRef} aria-label="Mobile Navigation Menu">
        {/* Radial Items Arc */}
        <AnimatePresence>
          {isOpen && (
            <div className="radial-arc-stage">
              {RADIAL_ITEMS.map((item, index) => {
                const { Icon } = item;
                const isActive = view === item.id;
                const isHomeButton = item.id === 'home';

                // Calculate polar coordinates for semi-circle fanout
                const rad = (item.angle * Math.PI) / 180;
                const targetX = Math.round(Math.cos(rad) * radius);
                const targetY = Math.round(-Math.sin(rad) * radius);

                return (
                  <motion.div
                    key={item.id}
                    className="radial-item-anchor"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
                    animate={{
                      x: targetX,
                      y: targetY,
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      x: 0,
                      y: 0,
                      opacity: 0,
                      scale: 0.2,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 22,
                      mass: 1,
                      delay: index * 0.03,
                    }}
                  >
                    <motion.button
                      className={`radial-option-btn${isActive ? ' radial-option-btn--active' : ''}${isHomeButton ? ' radial-option-btn--home' : ''
                        }`}
                      onClick={(e) => handleSelect(item.id, e)}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onFocus={() => setHoveredItem(item)}
                      onBlur={() => setHoveredItem(null)}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                      aria-label={item.label}
                      title={item.label}
                    >
                      {/* Subtle Ambient Glow Aura */}
                      <span className="radial-option__aura" />

                      {/* Icon */}
                      <span className="radial-option__icon-box">
                        <Icon width={21} height={21} className="radial-option__icon" />
                      </span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Floating Radial Trigger Button — Shows the current page's button icon when closed, and the destination label in the centre when open */}
        <motion.div
          className="radial-trigger-container"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        >
          <button
            className={`radial-trigger-btn${isOpen ? ' radial-trigger-btn--open' : ''}${isHomeView && !isOpen ? ' radial-trigger-btn--home-view' : ''
              }`}
            onClick={() => {
              setIsOpen((prev) => !prev);
              setHoveredItem(null);
            }}
            aria-label={isOpen ? `Close Navigation Menu (${activeDisplayItem.label})` : `Navigation Menu (${currentItem.label})`}
            aria-expanded={isOpen}
            title={isOpen ? activeDisplayItem.label : currentItem.label}
          >
            {/* Subtle Cyan Pulse Ring */}
            {!isOpen && <span className="radial-trigger__pulse-ring" />}

            {/* Central Content: Shows the corresponding page icon when closed, and the destination label in the centre when open */}
            <div className="radial-trigger__content">
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key={`label-${activeDisplayItem.id}`}
                    className="radial-trigger__label-wrap"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <DisplayIcon width={14} height={14} className="radial-trigger__label-icon" />
                    <span className="radial-trigger__label-text">{activeDisplayItem.label}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`icon-${currentItem.id}`}
                    className="radial-trigger__icon-wrap"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <CurrentIcon width={22} height={22} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        </motion.div>
      </nav>
    </>
  );
}

export default MobileRadialMenu;
