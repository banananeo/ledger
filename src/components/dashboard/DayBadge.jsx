import React from 'react';
import './DayBadge.css';

function DayBadge({ day, size = 'md', tone = 'yellow' }) {
  const number = String(day ?? '–').replace(/^Day\s*/i, '');
  return (
    <div className={`day-badge day-badge--${size} day-badge--${tone}`}>
      <span className="day-badge__label">Day</span>
      <span className="day-badge__number">{number}</span>
    </div>
  );
}

export default DayBadge;
