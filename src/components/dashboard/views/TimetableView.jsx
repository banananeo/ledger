import React, { useMemo, useState } from 'react';
import DayBadge from '../DayBadge.jsx';
import { DownloadIcon, ClockIcon } from '../Icons.jsx';
import { todayISO, findEntryForDate, allEntries } from '../../../utils/calendar.js';
import TimetableExportModal from '../TimetableExportModal.jsx';
import './TimetableView.css';

function dayNumber(dayLabel) {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : String(dayLabel || '');
}

function formatDatePretty(isoStr) {
  if (!isoStr) return null;
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TimetableView({ schedule = [], calendar, profile }) {
  const todayDateISO = todayISO();
  const todayDayOrder = findEntryForDate(calendar, todayDateISO)?.dayOrder;

  const initialIndex = useMemo(() => {
    if (!todayDayOrder) return 0;
    const idx = schedule.findIndex((d) => dayNumber(d.dayLabel) === String(todayDayOrder));
    return idx >= 0 ? idx : 0;
  }, [schedule, todayDayOrder]);

  const [index, setIndex] = useState(initialIndex);
  const [showExportModal, setShowExportModal] = useState(false);

  if (!schedule || schedule.length === 0) {
    return (
      <div className="bcard timetable__empty-card">
        <p>No timetable data came back from Academia.</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, schedule.length - 1);
  const day = schedule[safeIndex];
  const currentDayNum = dayNumber(day?.dayLabel);
  const isToday = todayDayOrder && currentDayNum === String(todayDayOrder);
  const entries = day?.entries || [];

  // Calculate the upcoming / associated calendar date for this Day Order
  const dateInfo = useMemo(() => {
    if (isToday) {
      return {
        label: `Today • ${formatDatePretty(todayDateISO)}`,
        isToday: true,
      };
    }

    if (!calendar) return null;
    const entriesList = allEntries(calendar);
    const matches = entriesList.filter((e) => String(e.dayOrder) === String(currentDayNum));

    if (matches.length === 0) return null;

    // Find next upcoming date >= today
    const upcoming = matches.find((e) => e.date >= todayDateISO);
    if (upcoming) {
      return {
        label: `Next: ${formatDatePretty(upcoming.date)}`,
        isToday: false,
      };
    }

    // Otherwise show latest date
    const latest = matches[matches.length - 1];
    return {
      label: formatDatePretty(latest.date),
      isToday: false,
    };
  }, [calendar, currentDayNum, isToday, todayDateISO]);

  const goTo = (next) => setIndex(Math.max(0, Math.min(schedule.length - 1, next)));

  return (
    <div className="timetable">
      {/* Top Bar & Download Button */}
      <div className="timetable__header-bar">
        <p className="timetable__note">
          Regular timetable for Day Orders 1–5.
        </p>

        <button
          className="bbtn timetable__download-trigger-btn"
          onClick={() => setShowExportModal(true)}
          title="Download full weekly timetable poster as PNG"
        >
          <DownloadIcon width={16} height={16} />
          <span>Download Timetable Image</span>
        </button>
      </div>

      {/* Quick Day Tabs */}
      <div className="timetable__day-tabs-wrap">
        <div className="timetable__day-tabs" role="tablist" aria-label="Day Order selection">
          {schedule.map((d, i) => {
            const dNum = dayNumber(d.dayLabel);
            const isDayToday = todayDayOrder && dNum === String(todayDayOrder);
            const isSelected = i === safeIndex;
            return (
              <button
                key={d.dayLabel || i}
                role="tab"
                aria-selected={isSelected}
                className={`timetable__day-tab ${isSelected ? 'timetable__day-tab--active' : ''} ${isDayToday ? 'timetable__day-tab--today' : ''}`}
                onClick={() => setIndex(i)}
              >
                <span>Day {dNum}</span>
                {isDayToday && <span className="timetable__tab-dot" title="Today's Day Order" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Day Order Stepper Card */}
      <div className="bcard timetable__stepper">
        <div className="timetable__stepper-center">
          <DayBadge
            day={currentDayNum}
            size="lg"
            tone={isToday ? 'sky' : 'yellow'}
          />

          <div className="timetable__stepper-meta">
            {isToday ? (
              <span className="bchip bchip--good timetable__status-chip">
                Today's Day Order
              </span>
            ) : dateInfo ? (
              <span className="bchip bchip--sky timetable__status-chip">
                {dateInfo.label}
              </span>
            ) : null}

            <span className="timetable__count num">
              {entries.length} {entries.length === 1 ? 'class' : 'classes'} scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Class List */}
      {entries.length === 0 ? (
        <div className="bcard timetable__empty-card">
          <p>No classes scheduled for Day {currentDayNum}.</p>
        </div>
      ) : (
        <ul className="timetable__list">
          {entries.map((p, i) => (
            <li key={`${p.slotCode}-${i}`} className="bcard timetable__period">
              <div className="timetable__period-header-row">
                <div className="timetable__period-time-badge">
                  <ClockIcon width={13} height={13} />
                  <span className="num">{p.startTime}</span>
                  <span className="timetable__period-time-sep">–</span>
                  <span className="num">{p.endTime}</span>
                </div>

                <span className={`bchip timetable__period-type${p.slotType === 'Practical' ? ' bchip--warning' : p.slotType === 'Training' ? ' bchip--good' : ''}`}>
                  {p.slotType || 'Theory'}
                </span>
              </div>

              <div className="timetable__period-body">
                <h4 className="timetable__period-title">{p.courseTitle}</h4>
                <div className="timetable__period-meta">
                  <span className="timetable__period-room-tag">
                    Room {p.room || 'TBA'}
                  </span>
                  {p.faculty && (
                    <span className="timetable__period-faculty">
                      {p.faculty}
                    </span>
                  )}
                  {p.slotName && (
                    <span className="timetable__period-slot">
                      Slot {p.slotName}
                    </span>
                  )}
                </div>
              </div>
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


