import React from 'react';
import ProgressRing from '../../ProgressRing.jsx';
import { getAttendanceMargin, getStatusTone, marginMessage, marginTone,REQUIRED_PERCENTAGE } from '../../../utils/attendance.js';
import './AttendanceView.css';

function AttendanceView({ attendance = [] }) {
  if (attendance.length === 0) {
    return (
      <div className="bcard attendance__empty-card">
        <p>No attendance data came back from Academia.</p>
      </div>
    );
  }

  const overall = attendance.reduce((sum, r) => sum + r.attendancePercentage, 0) / attendance.length;
  const atRisk = attendance.filter((r) => r.attendancePercentage < REQUIRED_PERCENTAGE).length;
  const sorted = [...attendance].sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  return (
    <div className="attendance">
      <div className="bcard attendance__summary">
        <div>
          <p className="eyebrow">Overall</p>
          <p className="attendance__summary-value num">{overall.toFixed(1)}%</p>
        </div>
        <div className="attendance__summary-divider" />
        <div>
          <p className="eyebrow">Required</p>
          <p className="attendance__summary-value num">{REQUIRED_PERCENTAGE}%</p>
        </div>
        <div className="attendance__summary-divider" />
        <div>
          <p className="eyebrow">Below line</p>
          <p className={`attendance__summary-value num${atRisk > 0 ? ' attendance__summary-value--danger' : ''}`}>
            {atRisk}
          </p>
        </div>
      </div>

      <ul className="attendance__list">
        {sorted.map((r) => {
          const margin = getAttendanceMargin(r.classesConducted, r.classesAbsent);
          const tone = margin.status === 'unknown' ? getStatusTone(r.attendancePercentage) : marginTone(margin);
          const attended = r.classesConducted ? r.classesConducted - r.classesAbsent : null;

          return (
            <li key={r.courseCode + r.slot} className="bcard attendance__card">
              <ProgressRing percentage={r.attendancePercentage} size={60} stroke={5} />
              <div className="attendance__card-main">
                <p className="attendance__card-title">{r.courseTitle || r.courseCode}</p>
                <p className="attendance__card-sub">
                  {r.courseCode} · {r.slot}
                  {attended !== null && ` · ${attended}/${r.classesConducted} classes attended`}
                </p>
              </div>
              <span className={`bchip bchip--${tone} attendance__card-margin`}>
                {marginMessage(margin)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AttendanceView;
