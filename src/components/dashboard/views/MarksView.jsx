import React from 'react';
import './MarksView.css';

function MarksView({ marks = [], courses = [], schedule = [], attendance = [], calendar }) {
  const courseNames = new Map();
  const addCourseNames = (records = []) => {
    records.forEach((course) => {
      const code = String(course.courseCode || '').trim().toUpperCase();
      const title = String(course.courseTitle || '').trim();
      if (code && title && !courseNames.has(code)) courseNames.set(code, title);
    });
  };
  addCourseNames(courses);
  addCourseNames(schedule.flatMap((day) => day.entries || []));
  addCourseNames(attendance);

  return (
    <div className="marks">
      <header className="view-intro">
        <div className="view-intro__meta"><span>STUDENT PORTAL / CONNECTED</span><span>Sample data</span></div>
        <h2>Marks</h2>
        <p>Your internal assessments: cycle tests, quizzes and labs, organised by course.</p>
      </header>
      <div className="marks__overview"><div><span>{calendar?.plannerType || 'ODD'} SEMESTER / {calendar?.academicYearLabel || '2026-27'}</span><span>{String(marks.length).padStart(2, '0')} COURSES</span></div><p>Percentages reflect the assessments shown below, not semester results.</p></div>

      {marks.length === 0 ? <div className="bcard marks__empty-card"><p>No internal assessment marks recorded in Academia for this semester yet.</p></div> : null}

      {marks.length > 0 && <ul className="marks__list">
        {marks.map((record) => {
          const hasSummary = record.summary && record.summary !== 'N/A';
          const pct =
            record.totalMarksObtained !== null && record.totalMarksMaximum !== null && record.totalMarksMaximum > 0
              ? (record.totalMarksObtained / record.totalMarksMaximum) * 100
              : null;

          return (
            <li key={record.courseCode} className="bcard marks__card">
              <div className="marks__card-meta"><span>{record.courseCode} / {record.courseType || 'THEORY'}</span><span className={`marks__band ${pct === null ? 'marks__band--pending' : pct >= 75 ? 'marks__band--high' : pct >= 50 ? 'marks__band--mid' : 'marks__band--low'}`}>{pct === null ? 'PENDING' : pct >= 75 ? 'HIGH' : pct >= 50 ? 'MIDDLE' : 'LOW'}</span></div>
              <h3 className="marks__card-title">{
                (typeof record.courseTitle === 'string' && record.courseTitle.trim()) ||
                courseNames.get(String(record.courseCode || '').trim().toUpperCase()) || record.courseCode
              }</h3>
              <div className="marks__total-row"><strong className={`marks__total ${pct !== null && pct < 50 ? 'marks__total--low' : ''}`}>{pct !== null ? `${pct.toFixed(1)}%` : '—'}</strong><span className="marks__obtained">{record.totalMarksObtained ?? '—'} / {record.totalMarksMaximum ?? '—'}<small>TOTAL OBTAINED</small></span></div>

              {record.assessments && record.assessments.length > 0 ? (
                <div className="marks__table-container">
                  <table className="marks__table">
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Obtained</th>
                        <th>Max</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.assessments.map((a, idx) => {
                        const obtained = parseFloat(a.obtainedMarks);
                        const max = parseFloat(a.maximumMarks);
                        const aPct = !isNaN(obtained) && !isNaN(max) && max > 0 ? (obtained / max) * 100 : null;

                        return (
                          <tr key={idx}>
                            <td><strong>{a.title}</strong></td>
                            <td className="num">{a.obtainedMarks}</td>
                            <td className="num">{a.maximumMarks}</td>
                            <td className="num">
                              {aPct !== null ? (
                                <span className={`marks__score-pill ${aPct >= 75 ? 'score-high' : aPct >= 50 ? 'score-mid' : 'score-low'}`}>
                                  {aPct.toFixed(0)}%
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="marks__no-tests">No individual test evaluations uploaded yet.</p>
              )}
            </li>
          );
        })}
      </ul>}
      <div className="marks__display-bands"><span>DISPLAY BANDS</span><p><i className="high" /> ≥75 high　 <i className="mid" /> ≥50 middle　 <i className="low" /> &lt;50 low</p><small>Bands are visual emphasis only, not pass/fail rules.</small></div>
      <p className="attendance__connection"><span /> ACADEMIA + STUDENT PORTAL CONNECTED</p>
    </div>
  );
}

export default MarksView;
