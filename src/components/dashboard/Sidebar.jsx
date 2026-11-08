import React from 'react';
import { House, Clock3, UserRoundCheck, CalendarDays, ChartNoAxesColumnIncreasing, RefreshCw, LogOut, Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext.tsx';
import './Sidebar.css';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'timetable', label: 'Timetable', Icon: Clock3 },
  { id: 'attendance', label: 'Attendance', Icon: UserRoundCheck },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'marks', label: 'Marks', Icon: ChartNoAxesColumnIncreasing },
];

function Sidebar({ view, onNavigate, onRefresh, refreshing, onLogout, onReconnectAcademia, onConnectStudentPortal, academiaIssue, studentPortalIssue }) {
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
            onClick={(e) => onNavigate(id, e)}
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
          <Bell size={18} />
          <span>Reminders</span>
          {hasActiveAlert && (
            <span className="sidebar__notif-dot" />
          )}
        </button>
        <button className="sidebar__item" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'sidebar__spin' : ''} />
          <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
        </button>
        {academiaIssue && (
          <button className="sidebar__item" onClick={onReconnectAcademia}>
            <span aria-hidden="true">↗</span>
            <span>Reconnect Academia</span>
          </button>
        )}
        {studentPortalIssue && (
          <button className="sidebar__item" onClick={onConnectStudentPortal}>
            <span aria-hidden="true">↗</span>
            <span>Connect Student Portal</span>
          </button>
        )}
        <button className="sidebar__item" onClick={onLogout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;


