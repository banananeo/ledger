import React, { useMemo, useState } from 'react';
import DayBadge from '../DayBadge.jsx';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ImageIcon } from '../Icons.jsx';
import { todayISO, findEntryForDate } from '../../../utils/calendar.js';
import TimetableExportModal from '../TimetableExportModal.jsx';
import './TimetableView.css';

function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  } else if (!meridiem) {
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }
  return hours * 60 + minutes;
}

function dayNumber(dayLabel) {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : dayLabel;
}

function TimetableView({ schedule = [], calendar, profile }) {
  const todayDayOrder = findEntryForDate(calendar, todayISO())?.dayOrder;
  const initialIndex = useMemo(() => {
    if (!todayDayOrder) return 0;
    const idx = schedule.findIndex((d) => dayNumber(d.dayLabel) === String(todayDayOrder));
    return idx >= 0 ? idx : 0;
  }, [schedule, todayDayOrder]);

  const [index, setIndex] = useState(initialIndex);
  const [showExportModal, setShowExportModal] = useState(false);

  if (schedule.length === 0) {
    return (
      <div className="bcard timetable__empty-card">
        <p>No timetable data came back from Academia.</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, schedule.length - 1);
  const day = schedule[safeIndex];
  const isToday = todayDayOrder && dayNumber(day?.dayLabel) === String(todayDayOrder);
  const entries = day?.entries || [];

  const goTo = (next) => setIndex(Math.max(0, Math.min(schedule.length - 1, next)));

  return (
    <div className="timetable">
      {/* Top Banner & Download Button */}
      <div className="timetable__header-bar">
        <p className="timetable__note">
          SRM runs on a rotating Day Order — check the academic calendar to see which Day today falls on.
        </p>

        <button
          className="bbtn timetable__download-trigger-btn"
          onClick={() => setShowExportModal(true)}
          title="Download full weekly timetable poster as PNG"
        >
          <DownloadIcon width={16} height={16} />
          <span>Download Weekly Timetable Image</span>
        </button>
      </div>

      <div className="bcard timetable__stepper">
        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(safeIndex - 1)}
          disabled={safeIndex === 0}
          aria-label="Previous day order"
        >
          <ChevronLeftIcon />
        </button>

        <div className="timetable__stepper-center">
          <DayBadge day={dayNumber(day?.dayLabel)} size="lg" tone={isToday ? 'sky' : 'yellow'} />
          {isToday && <span className="bchip bchip--good timetable__today-tag">Today</span>}
          <span className="timetable__count num">
            {entries.length} class{entries.length === 1 ? '' : 'es'}
          </span>
        </div>

        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(safeIndex + 1)}
          disabled={safeIndex === schedule.length - 1}
          aria-label="Next day order"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="bstepper__dots timetable__dots">
        {schedule.map((d, i) => (
          <button
            key={d.dayLabel}
            className={`bstepper__dot${i === safeIndex ? ' bstepper__dot--active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={d.dayLabel}
          />
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="bcard timetable__empty-card">
          <p>No classes on {day?.dayLabel}.</p>
        </div>
      ) : (
        <ul className="timetable__list">
          {entries.map((p, i) => (
            <li key={`${p.slotCode}-${i}`} className="bcard timetable__period">
              <div className="timetable__period-time">
                <span className="num">{p.startTime}</span>
                <span className="timetable__period-time-sep" />
                <span className="num">{p.endTime}</span>
              </div>
              <div className="timetable__period-main">
                <p className="timetable__period-title">{p.courseTitle}</p>
                <p className="timetable__period-sub">
                  <strong className="timetable__period-room">{p.room}</strong> · {p.faculty}
                </p>
              </div>
              <span className={`bchip timetable__period-type${p.slotType === 'Practical' ? ' bchip--warning' : ''}`}>
                {p.slotType}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Export Timetable Modal */}
      <TimetableExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        schedule={schedule}
        profile={profile}
      />
    </div>
  );
}

export default TimetableView;

