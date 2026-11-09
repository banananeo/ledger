import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { ClockIcon, CalendarIcon, BellIcon } from '../Icons.jsx';
import { todayISO, findEntryForDate, allEntries } from '../../../utils/calendar.js';
import { useNotifications } from '../../../context/NotificationContext.tsx';
import { aiSummary } from '../../../api.ts';
import { friendlyBriefError } from '../../../utils/friendlyErrors.js';
import MarkdownText from '../../MarkdownText.jsx';
import './HomeView.css';

const homeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const homeItemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function parseTimeMinutes(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  } else if (!meridiem) {
    // In university timetables, hours 1 to 6 are afternoon (PM: 13:00 - 18:00)
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }
  return hours * 60 + minutes;
}

function dayNumber(dayLabel) {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : String(dayLabel || '');
}

function getTodayOverview(schedule = [], calendar) {
  const today = todayISO();
  const calendarEntry = findEntryForDate(calendar, today);
  const dayOrder = calendarEntry?.dayOrder;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = dayOrder
    ? schedule.find((day) => dayNumber(day.dayLabel) === String(dayOrder))
    : null;
  const classes = [...(todaySchedule?.entries || [])]
    .map((entry) => ({ ...entry, startMinutes: parseTimeMinutes(entry.startTime), endMinutes: parseTimeMinutes(entry.endTime) }))
    .filter((entry) => entry.endMinutes == null || entry.endMinutes >= currentMinutes)
    .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
  const events = ['event', 'holiday'].includes(calendarEntry?.category) && calendarEntry.title
    ? [calendarEntry.title]
    : [];

  return { classes, events, dayOrder, currentMinutes, dateLabel: new Date(`${today}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) };
}

function getNextClassInfo(schedule = [], calendar) {
  const today = todayISO();
  const todayEntry = findEntryForDate(calendar, today);
  const todayDayOrder = todayEntry?.dayOrder;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (todayDayOrder) {
    const todaysDayObj = schedule.find(
      (d) => dayNumber(d.dayLabel) === String(todayDayOrder)
    );
    const todaysClasses = todaysDayObj?.entries ? [...todaysDayObj.entries] : [];
    todaysClasses.sort((a, b) => (parseTimeMinutes(a.startTime) ?? 0) - (parseTimeMinutes(b.startTime) ?? 0));

    for (const c of todaysClasses) {
      const startMin = parseTimeMinutes(c.startTime);
      const endMin = parseTimeMinutes(c.endTime) || (startMin != null ? startMin + 50 : null);

      if (startMin != null && endMin != null) {
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          return {
            entry: c,
            status: 'Ongoing Now',
            statusTone: 'warning',
            timingNote: `Ends at ${c.endTime}`,
            dayLabel: `Day ${todayDayOrder} (Today)`,
            isOngoing: true,
          };
        }

        if (currentMinutes < startMin) {
          const diff = startMin - currentMinutes;
          const diffText = diff < 60 ? `in ${diff} min` : `at ${c.startTime}`;
          return {
            entry: c,
            status: 'Next Class Today',
            statusTone: 'good',
            timingNote: `Starts ${diffText}`,
            dayLabel: `Day ${todayDayOrder} (Today)`,
            isOngoing: false,
          };
        }
      }
    }
  }

  // If all classes today have ended or today is not a working day, find next working day in calendar
  const entries = allEntries(calendar);
  const futureWorkingDay = entries.find((e) => e.date > today && e.category === 'working-day' && e.dayOrder);

  if (futureWorkingDay && futureWorkingDay.dayOrder) {
    const nextDayObj = schedule.find(
      (d) => dayNumber(d.dayLabel) === String(futureWorkingDay.dayOrder)
    );
    const nextClasses = nextDayObj?.entries ? [...nextDayObj.entries] : [];
    nextClasses.sort((a, b) => (parseTimeMinutes(a.startTime) ?? 0) - (parseTimeMinutes(b.startTime) ?? 0));

    if (nextClasses.length > 0) {
      return {
        entry: nextClasses[0],
        status: 'Upcoming Class',
        statusTone: 'neutral',
        timingNote: `Starts at ${nextClasses[0].startTime}`,
        dayLabel: `Day ${futureWorkingDay.dayOrder}`,
        isOngoing: false,
      };
    }
  }

  // Fallback to next cyclic or available day order in timetable schedule
  if (schedule.length > 0) {
    let nextDayIndex = 0;
    if (todayDayOrder) {
      const curIdx = schedule.findIndex((d) => dayNumber(d.dayLabel) === String(todayDayOrder));
      if (curIdx >= 0 && curIdx + 1 < schedule.length) {
        nextDayIndex = curIdx + 1;
      }
    }
    const targetDay = schedule[nextDayIndex] || schedule[0];
    if (targetDay && targetDay.entries && targetDay.entries.length > 0) {
      const sorted = [...targetDay.entries].sort((a, b) => (parseTimeMinutes(a.startTime) ?? 0) - (parseTimeMinutes(b.startTime) ?? 0));
      return {
        entry: sorted[0],
        status: 'Next Scheduled Class',
        statusTone: 'neutral',
        timingNote: `Starts at ${sorted[0].startTime}`,
        dayLabel: targetDay.dayLabel,
        isOngoing: false,
      };
    }
  }

  return null;
}

const DAILY_AFFIRMATIONS = [
  "Make today count — focus on progress, not perfection.",
  "Every lecture is a step closer to your goals. Stay curious!",
  "Consistency is what transforms effort into excellence.",
  "Your potential is endless. Go make the most of today!",
  "Small daily improvements build extraordinary achievements.",
  "Believe in your capabilities and trust your journey today.",
  "Approach every class with focus, passion, and curiosity.",
  "You've got this! Step into today with confidence.",
  "Great achievements begin with small, disciplined actions.",
  "Stay focused, stay determined, and enjoy the learning curve.",
  "Today is full of new opportunities to learn and grow.",
  "Your dedication today creates the success of tomorrow.",
  "Turn every challenge into an opportunity to excel.",
  "One concept, one class, one victory at a time."
];

function getDailyAffirmation(dateStr) {
  const date = dateStr || todayISO();
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return DAILY_AFFIRMATIONS[hash % DAILY_AFFIRMATIONS.length];
}

function HomeView({ profile, attendance = [], schedule = [], marks = [], calendar, lastSynced, onNavigate }) {
  const nextClassInfo = getNextClassInfo(schedule, calendar);
  const todayOverview = getTodayOverview(schedule, calendar);
  const positiveMessage = getDailyAffirmation(todayISO());
  const { notificationsEnabled, leadMinutes, setIsDrawerOpen } = useNotifications();
  const [academicBrief, setAcademicBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');

  const generateBrief = async () => {
    if (briefLoading) return;
    setBriefLoading(true);
    setBriefError('');
    try {
      const response = await aiSummary({ profile, attendance, marks, schedule, calendar });
      const brief = String(response || '').trim();
      if (!brief) throw new Error('Ledger AI returned an empty brief. Try again.');
      setAcademicBrief(brief);
    } catch (error) {
      setBriefError(friendlyBriefError(error));
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <motion.div
      className="home"
      variants={homeContainerVariants}
      initial={false}
      animate="visible"
    >
      <motion.section className="home__hero" variants={homeItemVariants}>
        <div className="home__hero-info">
          <h2 className="home__hero-title">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'},<br />{(profile?.name || 'Student').split(' ')[0]}.</h2>
          <p className="home__hero-meta">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </motion.section>

      {/* Next Class with Room Details */}
      <motion.section className="home__next-class-card" variants={homeItemVariants}>
        <div className="home__next-class-head">
          <div>
            <p className="eyebrow">Next class &amp; room details</p>
          </div>
          {nextClassInfo && (
            <div className="home__next-class-tags">
              <span className="bchip num">
                {nextClassInfo.dayLabel.replace(/ \(.+\)/, '').toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {nextClassInfo?.entry ? (
          <div className="home__next-class-body">
            <div className="home__next-class-room-badge">
              <div className="home__next-class-feature">
                <span className="home__next-class-room-label">Room</span>
                <span className="home__next-class-room-number num">{nextClassInfo.entry.room || 'TBA'}</span>
              </div>
              <div className="home__next-class-countdown">
                <span className="bchip bchip--good">{nextClassInfo.isOngoing ? 'IN PROGRESS' : 'UP NEXT'}</span>
                <span>{nextClassInfo.status === 'Next Class Today' ? nextClassInfo.timingNote : nextClassInfo.timingNote || nextClassInfo.status}</span>
              </div>
            </div>

            <div className="home__next-class-details">
              <h4 className="home__next-class-title">
                {nextClassInfo.entry.courseTitle || nextClassInfo.entry.courseCode}
              </h4>

              <div className="home__next-class-meta-grid">
                <div className="home__next-class-meta-item">
                  <span className="home__next-class-meta-label">Course Code</span>
                  <span className="home__next-class-meta-val num">{nextClassInfo.entry.courseCode} / {nextClassInfo.entry.slotType || nextClassInfo.entry.rawType || 'CLASS'}</span>
                </div>
                <div className="home__next-class-meta-item">
                  <span className="home__next-class-meta-label">Timing</span>
                  <span className="home__next-class-meta-val num">
                    {nextClassInfo.entry.startTime} – {nextClassInfo.entry.endTime}
                  </span>
                </div>
                <div className="home__next-class-meta-item">
                  <span className="home__next-class-meta-label">Faculty</span>
                  <span className="home__next-class-meta-val">{nextClassInfo.entry.faculty || 'Assigned Faculty'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="home__next-class-empty">
            <p>No upcoming classes found in your timetable schedule.</p>
          </div>
        )}
      </motion.section>



      <motion.section className="bcard home__brief-card" variants={homeItemVariants} aria-label="Academic Brief">
        <div className="home__brief-head">
          <div className="home__brief-copy">
            <div className="home__brief-title-row">
              <h3 className="home__brief-title">Academic Brief</h3>
              <span className="home__brief-ai-tag">LEDGER AI</span>
            </div>
            <p className="home__brief-sub">Turn your schedule, attendance and marks into a short academic overview.</p>
          </div>
        </div>

        {briefError && <p className="home__brief-error" role="status">{briefError}</p>}
        {briefLoading ? (
          <div className="home__brief-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : academicBrief ? (
          <div className="home__brief-content" aria-live="polite">
            <MarkdownText className="home__brief-md" text={academicBrief} />
          </div>
        ) : null}

        <button className="bbtn bbtn--outline home__brief-action" type="button" onClick={generateBrief} disabled={briefLoading}>
          <span>{briefLoading ? 'Preparing…' : academicBrief ? 'Refresh brief' : 'Generate brief'}</span>
          <span className="home__brief-action-icon" aria-hidden="true"><Sparkles size={18} strokeWidth={1.8} /></span>
        </button>
      </motion.section>


      <motion.section className="home__today-card" variants={homeItemVariants} aria-label="Today at a glance">
        <div className="home__today-head">
          <div>
            <p className="eyebrow">Today at a glance</p>
          </div>
          <div className="home__today-summary"><span>{todayOverview.classes.length} CLASSES REMAINING</span><span>DAY {todayOverview.dayOrder || '—'}</span></div>
        </div>

        {todayOverview.classes.length || todayOverview.events.length ? (
          <div className="home__today-content">
            {todayOverview.classes.length > 0 && (
              <div className="home__today-section">
                <h4 className="home__today-section-title"><ClockIcon width={16} height={16} /> Remaining classes</h4>
                <ul className="home__today-list">
                  {todayOverview.classes.map((entry, index) => {
                    const isOngoing = entry.startMinutes != null && entry.startMinutes <= todayOverview.currentMinutes && (entry.endMinutes == null || entry.endMinutes >= todayOverview.currentMinutes);
                    return (
                      <li className="home__today-row" key={`${entry.courseCode}-${entry.slotCode}-${index}`}>
                        <span className="home__today-time num"><span>{entry.startTime}</span><small>{entry.endTime}</small></span>
                        <span className="home__today-class-name">{entry.courseTitle || entry.courseCode}</span>
                        <span className="home__today-room">{isOngoing ? 'Ongoing' : (entry.room || 'Room TBA')}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {todayOverview.events.length > 0 && (
              <div className="home__today-section">
                <h4 className="home__today-section-title"><CalendarIcon width={16} height={16} /> Calendar events</h4>
                <ul className="home__today-list">
                  {todayOverview.events.map((event) => <li className="home__today-event" key={event}>{event}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="home__today-empty">No remaining classes or calendar events scheduled today.</p>
        )}
      </motion.section>



    </motion.div>
  );
}

export default HomeView;
