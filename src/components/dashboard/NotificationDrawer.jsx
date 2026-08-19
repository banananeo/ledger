import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BellIcon,
  BellOffIcon,
  ClockIcon,
  Volume2Icon,
  VolumeXIcon,
  CheckIcon,
  RefreshIcon,
} from './Icons.jsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import { formatTimeFromMinutes } from '../../utils/reminderEngine';
import './NotificationDrawer.css';

const LEAD_OPTIONS = [5, 10, 15, 30];

function NotificationDrawer({ onNavigate }) {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    leadMinutes,
    setLeadMinutes,
    soundEnabled,
    setSoundEnabled,
    permission,
    requestPermission,
    todaysClasses,
    triggerTestReminder,
    isDrawerOpen,
    setIsDrawerOpen,
  } = useNotifications();

  if (!isDrawerOpen) return null;

  return (
    <AnimatePresence>
      <div className="notif-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
        <motion.div
          className="bcard notif-drawer"
          initial={{ opacity: 0, x: 28, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 28, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="notif-drawer__head">
            <div className="notif-drawer__title-box">
              <div className="notif-drawer__icon-circle">
                <BellIcon width={18} height={18} />
              </div>
              <div>
                <h3 className="notif-drawer__title">Class Reminders</h3>
                <p className="notif-drawer__subtitle">Timetable alerts with Room No & Countdown</p>
              </div>
            </div>
            <button
              className="bbtn bbtn--outline bbtn--icon notif-drawer__close"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="notif-drawer__body">
            {/* Master Toggle */}
            <div className="notif-drawer__toggle-row bcard">
              <div className="notif-drawer__toggle-label">
                <div className="notif-drawer__toggle-name">
                  {notificationsEnabled ? 'Reminders Active' : 'Reminders Paused'}
                </div>
                <div className="notif-drawer__toggle-desc">
                  Alerts you before classes with room number & countdown
                </div>
              </div>
              <button
                className={`bbtn ${notificationsEnabled ? 'bbtn--good' : 'bbtn--outline'}`}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                {notificationsEnabled ? <CheckIcon width={16} height={16} /> : <BellOffIcon width={16} height={16} />}
                <span>{notificationsEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Timing Selector */}
            <div className="notif-drawer__section">
              <label className="notif-drawer__section-title eyebrow">Reminder Lead Time</label>
              <div className="notif-drawer__lead-grid">
                {LEAD_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    className={`bbtn notif-drawer__lead-btn ${
                      leadMinutes === mins ? 'notif-drawer__lead-btn--active' : 'bbtn--outline'
                    }`}
                    onClick={() => setLeadMinutes(mins)}
                  >
                    <span className="num">{mins} mins</span>
                    {mins === 15 && <span className="notif-drawer__rec-pill">Default</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound & Browser Permission */}
            <div className="notif-drawer__settings-grid">
              <div className="notif-drawer__mini-setting">
                <div className="notif-drawer__mini-left">
                  {soundEnabled ? <Volume2Icon width={16} height={16} /> : <VolumeXIcon width={16} height={16} />}
                  <span>Chime Sound</span>
                </div>
                <button
                  className="bbtn bbtn--outline notif-drawer__mini-btn"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              <div className="notif-drawer__mini-setting">
                <div className="notif-drawer__mini-left">
                  <BellIcon width={16} height={16} />
                  <span>Browser Push</span>
                </div>
                {permission === 'granted' ? (
                  <span className="bchip bchip--good">Active</span>
                ) : (
                  <button
                    className="bbtn notif-drawer__mini-btn"
                    onClick={requestPermission}
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>

            {/* Test Notification Button */}
            <div className="notif-drawer__test-box">
              <button
                className="bbtn bbtn--outline notif-drawer__test-btn"
                onClick={() => {
                  triggerTestReminder();
                  setIsDrawerOpen(false);
                }}
              >
                <BellIcon width={16} height={16} />
                <span>Test 15-Min Class Reminder Popup</span>
              </button>
            </div>

            {/* Today's Schedule & Reminder Timeline */}
            <div className="notif-drawer__schedule-section">
              <div className="notif-drawer__schedule-header">
                <label className="notif-drawer__section-title eyebrow">Today's Class Reminder Timeline</label>
                <span className="bchip num">{todaysClasses.length} Classes</span>
              </div>

              {todaysClasses.length === 0 ? (
                <div className="notif-drawer__empty-list">
                  <ClockIcon width={24} height={24} />
                  <p>No classes scheduled for today.</p>
                </div>
              ) : (
                <div className="notif-drawer__list">
                  {todaysClasses.map((cls) => {
                    const reminderMin = Math.max(0, cls.startMinutes - leadMinutes);
                    const reminderTimeFormatted = formatTimeFromMinutes(reminderMin);
                    return (
                      <div key={cls.id} className="notif-drawer__item bcard">
                        <div className="notif-drawer__item-left">
                          <div className="notif-drawer__item-time num">
                            <strong>{cls.startTime}</strong>
                            <span className="notif-drawer__item-end">to {cls.endTime}</span>
                          </div>

                          <div className="notif-drawer__item-content">
                            <h4 className="notif-drawer__item-title">{cls.courseTitle}</h4>
                            <div className="notif-drawer__item-sub">
                              <span className="num">{cls.courseCode}</span>
                              {cls.faculty && <span>• {cls.faculty}</span>}
                            </div>
                            <div className="notif-drawer__item-trigger">
                              <BellIcon width={12} height={12} />
                              <span>Remind at <strong>{reminderTimeFormatted}</strong> ({leadMinutes}m before)</span>
                            </div>
                          </div>
                        </div>

                        <div className="notif-drawer__item-room">
                          <span className="notif-drawer__room-label">ROOM</span>
                          <span className="notif-drawer__room-no num">{cls.room}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default NotificationDrawer;
