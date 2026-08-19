import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftIcon, RefreshIcon, UserIcon, LogoutIcon, SunIcon, MoonIcon } from './Icons.jsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import './TopBar.css';

const TITLES = {
  home: 'Home',
  timetable: 'Timetable',
  attendance: 'Attendance',
  calendar: 'Academic Calendar',
  marks: 'Internal Marks',
};

function initials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function TopBar({ view, onBack, onRefresh, refreshing, profile, onLogout }) {
  const isHome = view === 'home';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const profileName = profile?.name;
  const regNo = profile?.registrationNumber;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <header className="topbar">
      <div className="topbar__left">
        {!isHome && (
          <button className="bbtn bbtn--outline bbtn--icon topbar__back" onClick={onBack} aria-label="Back to home">
            <ArrowLeftIcon width={18} height={18} />
          </button>
        )}
        <h1 className="topbar__title">{TITLES[view] || 'Ledger'}</h1>
      </div>
      <div className="topbar__right" ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="bbtn bbtn--outline bbtn--icon topbar__theme"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <SunIcon width={17} height={17} /> : <MoonIcon width={17} height={17} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <button
          className="bbtn bbtn--outline bbtn--icon topbar__sync"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Sync now"
          title="Sync with SRM Academia"
        >
          <RefreshIcon width={17} height={17} className={refreshing ? 'topbar__spin' : ''} />
        </button>

        <button
          className="bbtn bbtn--outline bbtn--icon topbar__logout"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon width={17} height={17} />
        </button>

        <button
          className="topbar__avatar-btn"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Account menu"
          aria-expanded={showMenu}
        >
          <div className="topbar__avatar" title={profileName || 'Profile'}>
            {profileName ? initials(profileName) : <UserIcon width={16} height={16} />}
          </div>
        </button>

        {showMenu && (
          <div className="topbar__dropdown bcard">
            <div className="topbar__dropdown-header">
              <div className="topbar__dropdown-name">{profileName || 'Student'}</div>
              {regNo && <div className="topbar__dropdown-reg">{regNo}</div>}
            </div>
            <div className="topbar__dropdown-divider" />
            <button
              className="topbar__dropdown-item"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === 'dark' ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
            <button
              className="topbar__dropdown-item topbar__dropdown-item--danger"
              onClick={() => {
                setShowMenu(false);
                onLogout();
              }}
            >
              <LogoutIcon width={16} height={16} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;


