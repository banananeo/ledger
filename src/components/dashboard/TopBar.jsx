import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftIcon, RefreshIcon, UserIcon, LogoutIcon, BellIcon, BellOffIcon } from './Icons.jsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import './TopBar.css';

const TITLES = {
  home: 'Home',
  timetable: 'Timetable',
  attendance: 'Attendance',
  games: 'Games & Roulette',
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
  const { notificationsEnabled, activeReminders, testReminder, setIsDrawerOpen } = useNotifications();

  const profileName = profile?.name;
  const regNo = profile?.registrationNumber;
  const hasActiveAlert = (activeReminders.length > 0) || Boolean(testReminder);

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
        {isHome ? (
          <div className="topbar__logo">
            <motion.div layoutId="ledger-logo" className="topbar__logo-icon-box">
              <img src="/icon.svg" alt="Ledger" className="topbar__logo-img" />
            </motion.div>
            <span className="topbar__logo-text">
              Ledger<span className="topbar__logo-dot">.</span>
            </span>
          </div>
        ) : (
          <button className="bbtn bbtn--outline bbtn--icon topbar__back" onClick={onBack} aria-label="Back to home" title="Back to home">
            <ArrowLeftIcon width={18} height={18} />
          </button>
        )}
      </div>
      <div className="topbar__right" ref={menuRef}>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="bbtn bbtn--outline bbtn--icon topbar__notif"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Class Reminders"
          title="Class Reminders & Notification Settings"
          style={{ position: 'relative' }}
        >
          {notificationsEnabled ? <BellIcon width={17} height={17} /> : <BellOffIcon width={17} height={17} />}
          {hasActiveAlert && (
            <span className="topbar__notif-badge" />
          )}
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


