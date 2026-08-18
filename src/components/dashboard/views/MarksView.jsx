import React from 'react';
import './MarksView.css';

function MarksView({ marks = [] }) {
  if (marks.length === 0) {
    return (
      <div className="bcard marks__empty-card">
        <p>No internal assessment marks recorded in Academia for this semester yet.</p>
      </div>
    );
  }

  return (
    <div className="marks">
      <p className="marks__note">
        Internal test performances, cycle tests, surprise tests, and lab assessments recorded in SRM Academia.
      </p>

      <ul className="marks__list">
        {marks.map((record) => {
          const hasSummary = record.summary && record.summary !== 'N/A';
          const pct =
            record.totalMarksObtained !== null && record.totalMarksMaximum !== null && record.totalMarksMaximum > 0
              ? (record.totalMarksObtained / record.totalMarksMaximum) * 100
              : null;

          return (
            <li key={record.courseCode} className="bcard marks__card">
              <div className="marks__card-head">
                <div>
                  <h3 className="marks__card-title">{record.courseCode}</h3>
                  <span className="marks__card-type">{record.courseType}</span>
                </div>
                <div className="marks__card-head-right">
                  {pct !== null && (
                    <span className={`bchip num ${pct >= 75 ? 'bchip--good' : pct >= 50 ? 'bchip--warning' : 'bchip--danger'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  )}
                  <span className="bchip num">
                    {hasSummary ? record.summary : 'Pending'}
                  </span>
                </div>
              </div>

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
      </ul>
    </div>
  );
}

export default MarksView;
