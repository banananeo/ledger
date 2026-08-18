import React from 'react';
import { getStatusTone } from '../../../utils/attendance.js';
import './CoursesView.css';

function CoursesView({ courses = [], attendance = [] }) {
  if (courses.length === 0) {
    return (
      <div className="bcard courses__empty-card">
        <p>No course catalog data came back from Academia.</p>
      </div>
    );
  }

  const attendanceByCode = new Map(attendance.map((r) => [r.courseCode, r.attendancePercentage]));

  return (
    <ul className="courses__list">
      {courses.map((course) => {
        const pct = attendanceByCode.get(course.courseCode);
        return (
          <li key={course.courseCode} className="bcard courses__card">
            <div className="courses__card-head">
              <div>
                <p className="courses__card-title">{course.courseTitle}</p>
                <p className="courses__card-code num">{course.courseCode}</p>
              </div>
              <div className="courses__card-head-right">
                {pct !== undefined && (
                  <span className={`bchip bchip--${getStatusTone(pct)} num`}>
                    {pct.toFixed(1)}%
                  </span>
                )}
                <span className="bchip">{course.credits} credits</span>
              </div>
            </div>

            <ul className="courses__slots">
              {course.slots.map((slot) => (
                <li key={slot.slotCode} className="courses__slot">
                  <span className={`bchip courses__slot-type${slot.slotType === 'Practical' ? ' bchip--warning' : ''}`}>
                    {slot.slotCode}
                  </span>
                  <div className="courses__slot-info">
                    <p className="courses__slot-faculty">{slot.faculty}</p>
                    <p className="courses__slot-room">
                      {slot.room} · {slot.slotType}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export default CoursesView;
