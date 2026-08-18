import React from 'react';
import { HomeIcon, ClockIcon, CheckRingIcon, AwardIcon, RefreshIcon, LogoutIcon } from './Icons.jsx';
import './Sidebar.css';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'timetable', label: 'Timetable', Icon: ClockIcon },
  { id: 'attendance', label: 'Attendance', Icon: CheckRingIcon },
  { id: 'marks', label: 'Marks', Icon: AwardIcon },
];

function Sidebar({ view, onNavigate, onRefresh, refreshing, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__mark">
        Ledger<span className="sidebar__mark-dot">.</span>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`sidebar__item${view === id ? ' sidebar__item--active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon width={18} height={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button className="sidebar__item" onClick={onRefresh} disabled={refreshing}>
          <RefreshIcon width={18} height={18} className={refreshing ? 'sidebar__spin' : ''} />
          <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
        </button>
        <button className="sidebar__item" onClick={onLogout}>
          <LogoutIcon width={18} height={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
