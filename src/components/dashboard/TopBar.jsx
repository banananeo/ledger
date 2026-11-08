import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, UserRound, LogOut, Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext.tsx';
import './TopBar.css';

function initials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function TopBar({ onRefresh, refreshing, profile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { activeReminders, testReminder, setIsDrawerOpen } = useNotifications();

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
          <div className="topbar__logo">
            <div className="topbar__logo-icon-box">
              <img src="/icon.svg" alt="Ledger" className="topbar__logo-img" />
            </div>
            <span className="topbar__logo-text">
              Ledger<span className="topbar__logo-dot">.</span>
            </span>
          </div>
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
          <Bell size={18} />
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
          <RefreshCw size={18} className={refreshing ? 'topbar__spin' : ''} />
        </button>

        <button
          className="bbtn bbtn--outline bbtn--icon topbar__logout"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>

        <button
          className="topbar__avatar-btn"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Account menu"
          aria-expanded={showMenu}
        >
          <div className="topbar__avatar" title={profileName || 'Profile'}>
            {profileName ? initials(profileName) : <UserRound size={16} />}
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


