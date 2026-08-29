import React from 'react';
import { HomeIcon, ClockIcon, CheckRingIcon, CalendarIcon, AwardIcon, GamepadIcon, RefreshIcon, LogoutIcon, BellIcon } from './Icons.jsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import './Sidebar.css';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'timetable', label: 'Timetable', Icon: ClockIcon },
  { id: 'attendance', label: 'Attendance', Icon: CheckRingIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'marks', label: 'Marks', Icon: AwardIcon },
  { id: 'games', label: 'Games', Icon: GamepadIcon },
];

function Sidebar({ view, onNavigate, onRefresh, refreshing, onLogout }) {
  const { activeReminders, testReminder, setIsDrawerOpen } = useNotifications();
  const hasActiveAlert = activeReminders.length > 0 || Boolean(testReminder);

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
        <button
          className="sidebar__item"
          onClick={() => setIsDrawerOpen(true)}
          title="Class Reminders & Notification Settings"
          style={{ position: 'relative' }}
        >
          <BellIcon width={18} height={18} />
          <span>Reminders</span>
          {hasActiveAlert && (
            <span className="sidebar__notif-dot" />
          )}
        </button>
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


