import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons.jsx';
import { buildMonthGrid, monthIndexForDate, monthLabel, todayISO } from '../../../utils/calendar.js';
import './CalendarView.css';

function categoryClass(category) {
  if (category === 'holiday') return 'calendar__cell--holiday';
  if (category === 'working-day') return 'calendar__cell--working';
  if (category === 'event') return 'calendar__cell--event';
  return '';
}

function CalendarView({ calendar }) {
  const months = calendar?.months || [];
  const today = todayISO();
  const [index, setIndex] = useState(() => monthIndexForDate(months, today));
  const month = months[index];
  const { weeks, weekdays } = useMemo(() => buildMonthGrid(month), [month]);

  if (months.length === 0) {
    return (
      <div className="bcard calendar__empty-card">
        <p>No calendar data came back from Academia.</p>
      </div>
    );
  }

  const goTo = (next) => setIndex(Math.max(0, Math.min(months.length - 1, next)));
  const highlights = month?.entries
    ? month.entries
        .filter((e) => e.category !== 'empty' && e.category !== 'working-day' && e.title)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="calendar">
      {calendar?.academicYearLabel && (
        <p className="calendar__note">
          {calendar.plannerType === 'ODD' ? 'Odd' : 'Even'} semester · {calendar.academicYearLabel}
        </p>
      )}

      <div className="bcard calendar__stepper">
        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>

        <h2 className="calendar__month-label">{monthLabel(month)}</h2>

        <button
          className="bbtn bbtn--outline bbtn--icon"
          onClick={() => goTo(index + 1)}
          disabled={index === months.length - 1}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="bcard calendar__grid-card">
        <div className="calendar__weekdays">
          {weekdays.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="calendar__weeks">
          {weeks.map((week, wi) => (
            <div className="calendar__week" key={wi}>
              {week.map((cell, ci) =>
                cell ? (
                  <div
                    key={cell.date}
                    className={`calendar__cell ${categoryClass(cell.category)}${cell.date === today ? ' calendar__cell--today' : ''}`}
                    title={cell.title || undefined}
                  >
                    <span className="calendar__cell-num num">{Number(cell.date.slice(-2))}</span>
                    {cell.category === 'working-day' && cell.dayOrder && (
                      <span className="calendar__cell-do num">D{cell.dayOrder}</span>
                    )}
                    {cell.category === 'holiday' && <span className="calendar__cell-dot" />}
                  </div>
                ) : (
                  <div key={`pad-${wi}-${ci}`} className="calendar__cell calendar__cell--pad" />
                ),
              )}
            </div>
          ))}
        </div>

        <div className="calendar__legend">
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--working" />
            Working day
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--holiday" />
            Holiday
          </span>
          <span>
            <i className="calendar__legend-swatch calendar__legend-swatch--event" />
            Event
          </span>
        </div>
      </div>

      <div className="bcard calendar__highlights">
        <p className="eyebrow">This month</p>
        {highlights.length === 0 ? (
          <p className="calendar__highlights-empty">No holidays or events listed for {monthLabel(month)}.</p>
        ) : (
          <ul className="calendar__highlights-list">
            {highlights.map((e) => (
              <li key={e.date} className="calendar__highlights-item">
                <span className="num calendar__highlights-date">{e.date}</span>
                <span>{e.title}</span>
                <span className={`bchip${e.category === 'holiday' ? ' bchip--good' : ''}`}>
                  {e.category.replace('-', ' ')}
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
