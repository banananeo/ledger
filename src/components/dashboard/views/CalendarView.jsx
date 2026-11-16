import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '../Icons.jsx';
import { buildMonthGrid, monthIndexForDate, monthLabel, todayISO } from '../../../utils/calendar.js';
import { tasksByDate } from '../../../utils/todo.ts';
import { useTodos } from '../../../context/TodoContext.tsx';
import CalendarTasks from './CalendarTasks.jsx';
import './CalendarView.css';

function categoryClass(category) {
  if (category === 'holiday') return 'calendar__cell--holiday';
  if (category === 'working-day') return 'calendar__cell--working';
  if (category === 'event') return 'calendar__cell--event';
  return '';
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CalendarView({ calendar, schedule = [] }) {
  const months = calendar?.months || [];
  const today = todayISO();
  const currentMonthIdx = useMemo(() => monthIndexForDate(months, today), [months, today]);
  const [index, setIndex] = useState(() => currentMonthIdx);
  const [selectedDate, setSelectedDate] = useState(() => today);
  const { todos } = useTodos();
  const [dayPopup, setDayPopup] = useState(null);
  const gridRef = useRef(null);
  const lastTouchRef = useRef({ date: '', time: 0 });
  const openTasksByDate = useMemo(() => tasksByDate(todos), [todos]);

  const month = months[index];
  const { weeks, weekdays } = useMemo(() => buildMonthGrid(month), [month]);

  // Selected entry lookup
  const selectedEntry = useMemo(() => {
    if (!month?.entries || !selectedDate) return null;
    return month.entries.find((e) => e.date === selectedDate) || null;
  }, [month, selectedDate]);

  const popupEntry = dayPopup
    ? month?.entries?.find((entry) => entry.date === dayPopup.date) || { date: dayPopup.date, dayOrder: null, title: null, category: 'empty' }
    : null;
  const popupClasses = popupEntry?.dayOrder
    ? schedule.find((day) => String(day.dayLabel).match(/\d+/)?.[0] === String(popupEntry.dayOrder))?.entries || []
    : [];

  useEffect(() => {
    if (!dayPopup) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDayPopup(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dayPopup]);

  const openDaySummary = (event, entry) => {
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    const cellRect = event.currentTarget.getBoundingClientRect();
    const popupWidth = Math.max(180, Math.min(280, gridRect.width - 24, window.innerWidth - 32));
    const maxLeft = Math.max(8, gridRect.width - popupWidth - 8);
    const left = Math.max(8, Math.min(maxLeft, cellRect.left - gridRect.left + cellRect.width / 2 - popupWidth / 2));
    let top = cellRect.bottom - gridRect.top + 8;
    if (top + 210 > gridRect.height) {
      top = Math.max(8, cellRect.top - gridRect.top - 218);
    }
    setSelectedDate(entry.date);
    setDayPopup({ date: entry.date, left, top, width: popupWidth });
  };

  const handleDateTouch = (event, entry) => {
    if (event.pointerType !== 'touch') return;
    const now = Date.now();
    const lastTouch = lastTouchRef.current;
    if (lastTouch.date === entry.date && now - lastTouch.time < 450) {
      openDaySummary(event, entry);
      lastTouchRef.current = { date: '', time: 0 };
    } else {
      lastTouchRef.current = { date: entry.date, time: now };
    }
  };

  // Monthly stats
  const stats = useMemo(() => {
    if (!month?.entries) return { workingDays: 0, holidays: 0, events: 0 };
    let workingDays = 0;
    let holidays = 0;
    let events = 0;
    for (const e of month.entries) {
      if (e.category === 'working-day') workingDays++;
      else if (e.category === 'holiday') holidays++;
      else if (e.category === 'event') events++;
    }
    return { workingDays, holidays, events };
  }, [month]);

  if (months.length === 0) {
    return (
      <div className="calendar">
        <header className="view-intro">
          <div className="view-intro__meta"><span>{calendar?.plannerType || 'ODD'} SEMESTER / {calendar?.academicYearLabel || 'Calendar unavailable'}</span></div>
          <h2>Calendar</h2>
          <p>Academic Schedule &amp; Day Orders</p>
        </header>
        <div className="bcard calendar__empty-card"><p>No academic calendar data available from Academia.</p></div>
        <CalendarTasks selectedDate={today} courses={schedule.flatMap((day) => day.entries || [])} />
      </div>
    );
  }

  const goTo = (next) => {
    setDayPopup(null);
    const nextIdx = Math.max(0, Math.min(months.length - 1, next));
    setIndex(nextIdx);
    // select first valid day of that month
    const targetMonth = months[nextIdx];
    if (targetMonth?.entries?.length) {
      const defaultDay = targetMonth.entries.find((e) => e.date === today) || targetMonth.entries[0];
      setSelectedDate(defaultDay.date);
    }
  };

  const jumpToToday = () => {
    setDayPopup(null);
    setIndex(currentMonthIdx);
    setSelectedDate(today);
  };

  const highlights = month?.entries
    ? month.entries
      .filter((e) => e.category !== 'empty' && e.category !== 'working-day' && e.title)
      .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="calendar">
      <header className="view-intro">
        <div className="view-intro__meta"><span>{calendar?.plannerType || 'ODD'} SEMESTER / {calendar?.academicYearLabel || '2026-27'}</span></div>
        <h2>Calendar</h2>
      </header>
      <div className="calendar__header-bar">
        {index !== currentMonthIdx && (
          <button className="bbtn bbtn--outline calendar__today-btn" onClick={jumpToToday}>
            Jump to Today
          </button>
        )}
      </div>

      {/* Month Stepper & Navigation */}
      <div className="bcard calendar__stepper">
        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>

        <div className="calendar__stepper-center">
          <h3 className="calendar__month-label">{monthLabel(month)}</h3>
          <div className="calendar__stats-row">
            <span className="bchip bchip--good num">{stats.workingDays} Working Days</span>
            {stats.holidays > 0 && <span className="bchip bchip--danger num">{stats.holidays} Holidays</span>}
            {stats.events > 0 && <span className="bchip bchip--warning num">{stats.events} Events</span>}
          </div>
        </div>

        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(index + 1)}
          disabled={index === months.length - 1}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Main Calendar Grid */}
      <div className="bcard calendar__grid-card" ref={gridRef}>
        <div className="calendar__weekdays">
          {weekdays.map((w) => (
            <span key={w} className={w === 'Sun' ? 'calendar__weekday--sun' : ''}>
              {w}
            </span>
          ))}
        </div>

        <div className="calendar__weeks">
          {weeks.map((week, wi) => (
            <div className="calendar__week" key={wi}>
              {week.map((cell, ci) => {
                if (!cell) {
                  return <div key={`pad-${wi}-${ci}`} className="calendar__cell calendar__cell--pad" />;
                }
                const isSelected = cell.date === selectedDate;
                const isToday = cell.date === today;
                const isWorking = cell.category === 'working-day' && cell.dayOrder;
                const tasksDue = openTasksByDate.get(cell.date) || [];

                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`calendar__cell ${categoryClass(cell.category)}${isToday ? ' calendar__cell--today' : ''}${isSelected ? ' calendar__cell--selected' : ''}`}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      setDayPopup((current) => current?.date === cell.date ? current : null);
                    }}
                    onDoubleClick={(event) => openDaySummary(event, cell)}
                    onPointerDown={(event) => handleDateTouch(event, cell)}
                    title={`${cell.date}${tasksDue.length ? ` · ${tasksDue.length} open task${tasksDue.length === 1 ? '' : 's'}` : ''} · Double-click to view classes`}
                    aria-label={`${formatDateDisplay(cell.date)}${cell.dayOrder ? `, Day Order ${cell.dayOrder}` : ''}${tasksDue.length ? `, ${tasksDue.length} open task${tasksDue.length === 1 ? '' : 's'}` : ''}. Double-click for class summary.`}
                  >
                    <span className="calendar__cell-num num">{Number(cell.date.slice(-2))}</span>
                    {tasksDue.length > 0 && (
                      <span
                        className={`calendar__cell-taskdot${tasksDue.some((task) => task.dueDate < today) ? ' calendar__cell-taskdot--overdue' : ''}`}
                        aria-hidden="true"
                      />
                    )}

                    {isWorking ? (
                      <span className="calendar__cell-do num">D{cell.dayOrder}</span>
                    ) : cell.category === 'holiday' ? (
                      <span className="calendar__cell-tag calendar__cell-tag--holiday">Holiday</span>
                    ) : cell.category === 'event' ? (
                      <span className="calendar__cell-tag calendar__cell-tag--event">Event</span>
                    ) : (
                      <span className="calendar__cell-do-empty" />
                    )}

                    {isToday && <span className="calendar__today-dot" title="Today" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {dayPopup && popupEntry && (
          <div
            className="calendar__day-popover"
            role="dialog"
            aria-label={`Classes for ${formatDateDisplay(popupEntry.date)}`}
            style={{ left: dayPopup.left, top: dayPopup.top, width: dayPopup.width }}
          >
            <div className="calendar__day-popover-head">
              <div>
                <span className="eyebrow">Class Summary</span>
                <strong>{formatDateDisplay(popupEntry.date)}</strong>
              </div>
              <button type="button" aria-label="Close class summary" onClick={() => setDayPopup(null)}>×</button>
            </div>
            <p className="calendar__day-popover-count">
              {popupClasses.length
                ? `${popupClasses.length} ${popupClasses.length === 1 ? 'class' : 'classes'}${popupEntry.dayOrder ? ` · Day Order ${popupEntry.dayOrder}` : ''}`
                : 'No classes scheduled'}
            </p>
            {popupClasses.length > 0 && (
              <ul className="calendar__day-popover-list">
                {popupClasses.slice(0, 3).map((classEntry, classIndex) => {
                  const time = classEntry.timeLabel || [classEntry.startTime, classEntry.endTime].filter(Boolean).join('–');
                  return (
                    <li key={`${classEntry.slotCode || classEntry.courseCode}-${classIndex}`}>
                      <span>{classEntry.courseTitle || classEntry.courseCode}</span>
                      <small>{time}{classEntry.room ? `${time ? ' · ' : ''}${classEntry.room}` : ''}</small>
                    </li>
                  );
                })}
              </ul>
            )}
            {popupClasses.length > 3 && <p className="calendar__day-popover-more">+{popupClasses.length - 3} more classes</p>}
            {popupEntry.title && <p className="calendar__day-popover-note">{popupEntry.title}</p>}
          </div>
        )}

        {/* Legend */}
        <div className="calendar__legend">
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--working" />
            Working Day (Day Order)
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--holiday" />
            Holiday
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--event" />
            Exam / Event
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--today" />
            Today
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--tasks" />
            Open task
          </span>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedEntry && (
        <div className="bcard calendar__selected-card">
          <div className="calendar__selected-head">
            <div className="calendar__selected-date-info">
              <span className="eyebrow">Date Details</span>
              <h4 className="calendar__selected-date-title">{formatDateDisplay(selectedEntry.date)}</h4>
            </div>
            <div className="calendar__selected-badges">
              {selectedEntry.date === today && <span className="bchip bchip--good">Today</span>}
              {selectedEntry.dayOrder && (
                <span className="bchip bchip--sky num">Day Order {selectedEntry.dayOrder}</span>
              )}
              <span
                className={`bchip ${selectedEntry.category === 'holiday' ? 'bchip--danger' : selectedEntry.category === 'working-day' ? 'bchip--good' : 'bchip--warning'}`}
              >
                {selectedEntry.category === 'working-day'
                  ? 'Instructional Working Day'
                  : selectedEntry.category === 'holiday'
                    ? 'Holiday'
                    : selectedEntry.category === 'event'
                      ? 'Academic Event / Exam'
                      : 'Non-instructional Day'}
              </span>
            </div>
          </div>

          {selectedEntry.title && (
            <div className="calendar__selected-body">
              <p className="calendar__selected-desc">
                <strong>Schedule Note:</strong> {selectedEntry.title}
              </p>
            </div>
          )}
        </div>
      )}

      <CalendarTasks
        selectedDate={selectedDate}
        courses={schedule.flatMap((day) => day.entries || [])}
      />

      {/* Month Highlights / Schedule Notice */}
      <div className="bcard calendar__highlights">
        <div className="calendar__highlights-head">
          <CalendarIcon width={18} height={18} />
          <h4 className="calendar__highlights-title">Important Dates & Holidays in {monthLabel(month)}</h4>
        </div>
        {highlights.length === 0 ? (
          <p className="calendar__highlights-empty">No special holidays or academic events listed for {monthLabel(month)}.</p>
        ) : (
          <ul className="calendar__highlights-list">
            {highlights.map((e) => (
              <li
                key={e.date}
                className={`calendar__highlights-item${e.date === selectedDate ? ' calendar__highlights-item--active' : ''}`}
                onClick={() => setSelectedDate(e.date)}
              >
                <div className="calendar__highlights-date-col">
                  <span className="num calendar__highlights-date">{Number(e.date.slice(-2))}</span>
                  {e.dayOrder && <span className="calendar__highlights-do num">Day {e.dayOrder}</span>}
                </div>
                <span className="calendar__highlights-text">{e.title}</span>
                <span className={`bchip${e.category === 'holiday' ? ' bchip--danger' : ' bchip--warning'}`}>
                  {e.category === 'holiday' ? 'Holiday' : 'Event'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
