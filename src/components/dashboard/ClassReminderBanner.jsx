import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BellIcon, ClockIcon } from './Icons.jsx';
import { useNotifications } from '../../context/NotificationContext.tsx';
import { formatCountdown } from '../../utils/reminderEngine';
import './ClassReminderBanner.css';

function ClassReminderBanner({ onNavigate }) {
  const {
    activeReminders,
    dismissReminder,
    testReminder,
    dismissTestReminder,
    notificationsEnabled,
  } = useNotifications();

  const currentReminder = notificationsEnabled
    ? testReminder || (activeReminders.length > 0 ? activeReminders[0] : null)
    : null;

  const isTest = Boolean(testReminder);
  const remainingSecs = currentReminder?.startsInSeconds;
  const countdownStr = formatCountdown(remainingSecs);

  return (
    <AnimatePresence>
      {currentReminder && (
        <motion.div
          key={currentReminder.id}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="reminder-banner-wrapper"
        >
          <div className="bcard reminder-banner">
            <div className="reminder-banner__left">
              <div className="reminder-banner__pulse-box">
                <span className="reminder-banner__pulse-dot" />
                <BellIcon width={18} height={18} />
              </div>

              <div className="reminder-banner__info">
                <div className="reminder-banner__tagline">
                  <span className="bchip bchip--warning reminder-banner__chip">
                    {isTest ? 'TEST CLASS REMINDER' : 'UPCOMING CLASS'}
                  </span>
                  <span className="reminder-banner__countdown num">
                    <ClockIcon width={13} height={13} />
                    <span>Starts in <strong>{countdownStr}</strong></span>
                  </span>
                </div>

                <h4 className="reminder-banner__title">
                  {currentReminder.courseTitle}
                  <span className="reminder-banner__code num"> ({currentReminder.courseCode})</span>
                </h4>

                <div className="reminder-banner__meta">
                  <span>Starts at <strong>{currentReminder.startTime}</strong></span>
                  {currentReminder.faculty && <span>• {currentReminder.faculty}</span>}
                  {currentReminder.slotName && <span>• Slot {currentReminder.slotName}</span>}
                </div>
              </div>
            </div>

            <div className="reminder-banner__right">
              <div className="reminder-banner__room-badge">
                <span className="reminder-banner__room-label">ROOM NO</span>
                <span className="reminder-banner__room-number num">{currentReminder.room || 'TBA'}</span>
                <span className="reminder-banner__room-type">{currentReminder.slotType || 'Venue'}</span>
              </div>

              <div className="reminder-banner__actions">
                {onNavigate && (
                  <button
                    className="bbtn bbtn--outline reminder-banner__btn"
                    onClick={() => onNavigate('timetable')}
                  >
                    Timetable
                  </button>
                )}
                <button
                  className="bbtn reminder-banner__btn reminder-banner__btn--dismiss"
                  onClick={() => {
                    if (isTest) {
                      dismissTestReminder();
                    } else {
                      dismissReminder(currentReminder.id);
                    }
                  }}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ClassReminderBanner;
