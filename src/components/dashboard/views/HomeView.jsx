import React from 'react';
import { ClockIcon, CheckRingIcon, AwardIcon } from '../Icons.jsx';
import { todayISO, findEntryForDate, allEntries } from '../../../utils/calendar.js';
import './HomeView.css';

const NAV_CARDS = [
  { id: 'timetable', label: 'Timetable', Icon: ClockIcon, tone: 'sky', blurb: 'Classes by Day Order' },
  { id: 'attendance', label: 'Attendance', Icon: CheckRingIcon, tone: 'pink', blurb: 'Per-course % and margin' },
  { id: 'marks', label: 'Marks', Icon: AwardIcon, tone: 'yellow', blurb: 'Internal tests & cycles' },
];

function parseTimeMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getNextClassInfo(schedule = [], calendar) {
  const today = todayISO();
  const todayEntry = findEntryForDate(calendar, today);
  const todayDayOrder = todayEntry?.dayOrder;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (todayDayOrder) {
    const todaysDayObj = schedule.find((d) => d.dayLabel === `Day ${todayDayOrder}`);
    const todaysClasses = todaysDayObj?.entries ? [...todaysDayObj.entries] : [];
    todaysClasses.sort((a, b) => (parseTimeMinutes(a.startTime) ?? 0) - (parseTimeMinutes(b.startTime) ?? 0));

    for (const c of todaysClasses) {
      const startMin = parseTimeMinutes(c.startTime) ?? 0;
      const endMin = parseTimeMinutes(c.endTime) ?? startMin + 50;

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

  // If all classes today have ended or today is not a working day, find next working day in calendar
  const entries = allEntries(calendar);
  const futureWorkingDay = entries.find((e) => e.date > today && e.category === 'working-day' && e.dayOrder);

  if (futureWorkingDay && futureWorkingDay.dayOrder) {
    const nextDayObj = schedule.find((d) => d.dayLabel === `Day ${futureWorkingDay.dayOrder}`);
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

  // Fallback to first scheduled class of any available day order
  for (const day of schedule) {
    if (day.entries && day.entries.length > 0) {
      const sorted = [...day.entries].sort((a, b) => (parseTimeMinutes(a.startTime) ?? 0) - (parseTimeMinutes(b.startTime) ?? 0));
      return {
        entry: sorted[0],
        status: 'Next Scheduled Class',
        statusTone: 'neutral',
        timingNote: `Starts at ${sorted[0].startTime}`,
        dayLabel: day.dayLabel,
        isOngoing: false,
      };
    }
  }

  return null;
}

function HomeView({ profile, attendance = [], schedule = [], marks = [], calendar, lastSynced, onNavigate }) {
  const nextClassInfo = getNextClassInfo(schedule, calendar);

  return (
    <div className="home">
      <section className="bcard bcard--yellow home__hero">
        <div className="home__hero-info">
          <p className="eyebrow">SRM Academic Record</p>
          <h2 className="home__hero-title">{profile?.name || 'Welcome'}</h2>
          {profile && (
            <p className="home__hero-meta num">
              {profile.registrationNumber} · {profile.department} {profile.section} · Sem {profile.semester}
            </p>
          )}
          {lastSynced && <p className="home__hero-synced num">Last synced {lastSynced}</p>}
        </div>
      </section>

      {/* Next Class with Room Details */}
      <section className="bcard home__next-class-card">
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
      </section>

      {/* Navigation Shortcuts */}
      <section className="home__nav-grid">
        {NAV_CARDS.map(({ id, label, Icon, tone, blurb }) => (
          <button key={id} className={`bcard bcard--${tone} home__nav-card`} onClick={() => onNavigate(id)}>
            <Icon width={22} height={22} />
            <span className="home__nav-card-label">{label}</span>
            <span className="home__nav-card-blurb">{blurb}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

export default HomeView;
