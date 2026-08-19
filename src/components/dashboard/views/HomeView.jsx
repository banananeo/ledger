import React from 'react';
import { motion } from 'motion/react';
import { ClockIcon, CheckRingIcon, CalendarIcon, AwardIcon } from '../Icons.jsx';
import { todayISO, findEntryForDate, allEntries } from '../../../utils/calendar.js';
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

const NAV_CARDS = [
  { id: 'timetable', label: 'Timetable', Icon: ClockIcon, tone: 'sky', blurb: 'Classes by Day Order' },
  { id: 'attendance', label: 'Attendance', Icon: CheckRingIcon, tone: 'pink', blurb: 'Per-course % and margin' },
  { id: 'calendar', label: 'Academic Calendar', Icon: CalendarIcon, tone: 'mint', blurb: 'Semester dates & day orders' },
  { id: 'marks', label: 'Marks', Icon: AwardIcon, tone: 'yellow', blurb: 'Internal tests & cycles' },
];

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
        timingNote: `${futureWorkingDay.date} · Starts at ${nextClasses[0].startTime}`,
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
  const positiveMessage = getDailyAffirmation(todayISO());

  return (
    <motion.div
      className="home"
      variants={homeContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.section className="bcard bcard--yellow home__hero" variants={homeItemVariants}>
        <div className="home__hero-info">
          <p className="eyebrow">Welcome</p>
          <h2 className="home__hero-title">{profile?.name || 'Student'}</h2>
          <p className="home__hero-affirmation">✨ {positiveMessage}</p>
        </div>
      </motion.section>

      {/* Next Class with Room Details */}
      <motion.section className="bcard home__next-class-card" variants={homeItemVariants}>
        <div className="home__next-class-head">
          <div>
            <p className="eyebrow">Next Class & Room Details</p>
            <h3 className="home__next-class-heading">
              {nextClassInfo?.isOngoing ? 'Current Ongoing Class' : 'What is My Next Class?'}
            </h3>
          </div>
          {nextClassInfo && (
            <div className="home__next-class-tags">
              <span className={`bchip bchip--${nextClassInfo.statusTone}`}>
                {nextClassInfo.status}
              </span>
              <span className="bchip num">
                {nextClassInfo.dayLabel}
              </span>
            </div>
          )}
        </div>

        {nextClassInfo?.entry ? (
          <div className="home__next-class-body">
            <div className="home__next-class-room-badge">
              <span className="home__next-class-room-label">ROOM / VENUE</span>
              <span className="home__next-class-room-number num">
                {nextClassInfo.entry.room || 'TBA'}
              </span>
              <span className="home__next-class-room-type">
                {nextClassInfo.entry.slotType || 'Lecture Hall'}
              </span>
            </div>

            <div className="home__next-class-details">
              <h4 className="home__next-class-title">
                {nextClassInfo.entry.courseTitle || nextClassInfo.entry.courseCode}
              </h4>
              
              <div className="home__next-class-meta-grid">
                <div className="home__next-class-meta-item">
                  <span className="home__next-class-meta-label">Course Code</span>
                  <span className="home__next-class-meta-val num">{nextClassInfo.entry.courseCode}</span>
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

      {/* Navigation Shortcuts */}
      <motion.section className="home__nav-grid" variants={homeItemVariants}>
        {NAV_CARDS.map(({ id, label, Icon, tone, blurb }) => (
          <motion.button
            key={id}
            className={`bcard bcard--${tone} home__nav-card`}
            onClick={() => onNavigate(id)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          >
            <Icon width={22} height={22} />
            <span className="home__nav-card-label">{label}</span>
            <span className="home__nav-card-blurb">{blurb}</span>
          </motion.button>
        ))}
      </motion.section>
    </motion.div>
  );
}

export default HomeView;
