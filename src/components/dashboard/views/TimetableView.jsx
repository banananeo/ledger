import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { todayISO, findEntryForDate, allEntries } from '../../../utils/calendar.js';
import { downloadTimetableImage } from '../../../utils/timetableImageGenerator';
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

function formatDateMeta(isoStr) {
  if (!isoStr) return '';
  const date = new Date(`${isoStr}T00:00:00`);
  return `${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} / ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`;
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      await downloadTimetableImage({ schedule, profile, theme: 'light' });
    } catch (error) {
      setExportError(error?.message || 'Could not generate the timetable image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!schedule || schedule.length === 0) {
    return (
      <div className="timetable">
        <header className="view-intro">
          <div className="view-intro__meta"><span>ACADEMIA / ODD SEMESTER</span></div>
          <h2>Timetable</h2>
          <p>Regular timetable for Day Orders 1–5</p>
        </header>
        <div className="timetable__empty-card"><p>No timetable data came back from Academia.</p></div>
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
      <header className="view-intro">
        <div className="view-intro__meta"><span>ACADEMIA / ODD SEMESTER</span></div>
        <h2>Timetable</h2>
        <p>Regular timetable for Day Orders 1–5</p>
      </header>
      {/* Top Bar & Download Button */}
      <div className="timetable__header-bar">
        <button
          className="timetable__download-trigger-btn"
          onClick={handleExport}
          disabled={isExporting}
          title="Download a clean timetable image"
        >
          <span>{isExporting ? 'Generating image…' : 'Download Timetable Image'}</span>
          <Download size={16} aria-hidden="true" />
        </button>
      </div>
      {exportError && <p className="timetable__export-error" role="alert">{exportError}</p>}

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
                {isDayToday && <span className="timetable__tab-today">TODAY</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Day Order Stepper Card */}
      <div className="bcard timetable__stepper">
        <div className="timetable__stepper-center timetable__day-heading">
          <div><h3>Day {currentDayNum}</h3><span>{isToday ? formatDateMeta(todayDateISO) : dateInfo?.label}</span></div>
          <span className="timetable__count num">{String(entries.length).padStart(2, '0')} CLASSES</span>
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
            <li key={`${p.slotCode}-${i}`} className={`timetable__period${isToday && i === 0 ? ' timetable__period--up-next' : ''}`}>
              <div className="timetable__period-header-row">
                <div className="timetable__period-time-badge">
                  <span className="num">{p.startTime}</span>
                  <span className="timetable__period-time-sep">–</span>
                  <span className="num">{p.endTime}</span>
                </div>

                <span className="timetable__period-type">
                  {isToday && i === 0 ? 'UP NEXT / ' : ''}{(p.slotType || 'Theory').toUpperCase()}
                </span>
              </div>

              <div className="timetable__period-body">
                <h4 className="timetable__period-title">{p.courseTitle}</h4>
                <div className="timetable__period-meta">
                  <span className="timetable__period-room-tag">
                    <small>ROOM</small>{p.room || 'TBA'}
                  </span>
                  {p.faculty && (
                    <span className="timetable__period-faculty">
                      <small>FACULTY</small>{p.faculty}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="timetable__footer-note">Day orders follow the academic calendar, not the weekday. Check Calendar for the next assigned day.</p>

    </div>
  );
}

export default TimetableView;


