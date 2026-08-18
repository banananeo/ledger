import React from 'react';
import { ArrowLeftIcon, RefreshIcon, UserIcon } from './Icons.jsx';
import './TopBar.css';

const TITLES = {
  home: 'Home',
  timetable: 'Timetable',
  attendance: 'Attendance',
  marks: 'Internal Marks',
};

function initials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function TopBar({ view, onBack, onRefresh, refreshing, profileName }) {
  const isHome = view === 'home';
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
      <div className="topbar__right">
        <button
          className="bbtn bbtn--outline bbtn--icon topbar__sync"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Sync now"
          title="Sync with SRM Academia"
        >
          <RefreshIcon width={17} height={17} className={refreshing ? 'topbar__spin' : ''} />
        </button>
        <div className="topbar__avatar" title={profileName || 'Profile'}>
          {profileName ? initials(profileName) : <UserIcon width={16} height={16} />}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
