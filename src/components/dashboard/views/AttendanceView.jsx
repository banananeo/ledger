import React, { useState, useMemo } from 'react';
import ProgressRing from '../../ProgressRing.jsx';
import {
  getAttendanceMargin,
  getStatusTone,
  marginMessage,
  marginTone,
  REQUIRED_PERCENTAGE,
} from '../../../utils/attendance.js';
import './AttendanceView.css';

function parseDayNum(dayLabel) {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : String(dayLabel || '');
}

function AttendanceView({ attendance = [], schedule = [] }) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'risk' | 'safe'
  const [sortBy, setSortBy] = useState('lowest'); // 'lowest' | 'highest' | 'code'
  const [simulatedDayOrder, setSimulatedDayOrder] = useState(null); // null | '1' | '2' | '3' | '4' | '5'

  // Extract base attendance records
  const safeAttendance = useMemo(() => {
    return (Array.isArray(attendance) ? attendance : []).map((r) => {
      const pct = Number(r.attendancePercentage) || 0;
      const conducted = Number(r.classesConducted) || 0;
      const absent = Number(r.classesAbsent) || 0;
      const attended = conducted > 0 ? Math.max(0, conducted - absent) : Math.round((pct / 100) * 30);
      return {
        ...r,
        numericPct: pct,
        conducted: conducted > 0 ? conducted : 30,
        absent,
        attended,
      };
    });
  }, [attendance]);

  // Determine available day orders from schedule
  const dayOrders = useMemo(() => {
    const orders = new Set(['1', '2', '3', '4', '5']);
    if (Array.isArray(schedule)) {
      schedule.forEach((d) => {
        const num = parseDayNum(d.dayLabel);
        if (num && ['1', '2', '3', '4', '5'].includes(num)) {
          orders.add(num);
        }
      });
    }
    return Array.from(orders).sort((a, b) => Number(a) - Number(b));
  }, [schedule]);

  // Predictor Simulation Engine
  const simulation = useMemo(() => {
    if (!simulatedDayOrder) return null;

    // Find schedule entries for this day order
    let scheduledEntries = [];
    if (Array.isArray(schedule)) {
      const dayObj = schedule.find((d) => parseDayNum(d.dayLabel) === String(simulatedDayOrder));
      if (dayObj?.entries && dayObj.entries.length > 0) {
        scheduledEntries = dayObj.entries;
      }
    }

    // Fallback template entries if schedule is empty
    if (scheduledEntries.length === 0 && safeAttendance.length > 0) {
      // Map courses deterministically to day orders for simulation
      const dayIdx = (Number(simulatedDayOrder) - 1) % 5;
      scheduledEntries = safeAttendance
        .filter((_, idx) => idx % 5 === dayIdx || (idx + 1) % 5 === dayIdx)
        .map((c) => ({
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          slotType: c.courseType === 'Practical' ? 'Practical' : 'Theory',
          slot: c.slot || 'A1',
        }));
    }

    // Calculate hours to skip per course code
    const hoursMissedMap = new Map();
    scheduledEntries.forEach((entry) => {
      const code = (entry.courseCode || '').toUpperCase().trim();
      const isLab =
        String(entry.slotType).toLowerCase().includes('practical') ||
        String(entry.rawType).toLowerCase().includes('practical') ||
        String(entry.slotCode || '').startsWith('P');
      const hours = isLab ? 2 : 1;
      hoursMissedMap.set(code, (hoursMissedMap.get(code) || 0) + hours);
    });

    let totalSkippedHours = 0;
    let affectedCoursesCount = 0;

    // Map each course in attendance to simulated figures
    const simulatedCourses = safeAttendance.map((course) => {
      const code = (course.courseCode || '').toUpperCase().trim();
      // Match by exact courseCode or partial match
      let missedHours = hoursMissedMap.get(code) || 0;
      if (missedHours === 0) {
        for (const [k, v] of hoursMissedMap.entries()) {
          if (k && (code.includes(k) || k.includes(code))) {
            missedHours = v;
            break;
          }
        }
      }

      const origConducted = course.conducted;
      const origAttended = course.attended;
      const origAbsent = course.absent;
      const origPct = course.numericPct;
      const origMargin = getAttendanceMargin(origConducted, origAbsent);

      if (missedHours > 0) {
        totalSkippedHours += missedHours;
        affectedCoursesCount += 1;
      }

      const newConducted = origConducted + missedHours;
      const newAttended = origAttended; // not attended because skipped
      const newAbsent = origAbsent + missedHours;
      const newPct = (newAttended / (newConducted || 1)) * 100;
      const newMargin = getAttendanceMargin(newConducted, newAbsent);
      const pctDrop = origPct - newPct;

      return {
        ...course,
        missedHours,
        origPct,
        newPct,
        pctDrop,
        origMargin,
        newMargin,
        isAffected: missedHours > 0,
      };
    });

    // Simulated overall metrics
    const origTotalConducted = safeAttendance.reduce((sum, r) => sum + r.conducted, 0);
    const origTotalAttended = safeAttendance.reduce((sum, r) => sum + r.attended, 0);
    const origOverall =
      origTotalConducted > 0
        ? (origTotalAttended / origTotalConducted) * 100
        : safeAttendance.reduce((sum, r) => sum + r.numericPct, 0) / (safeAttendance.length || 1);

    const simTotalConducted = origTotalConducted + totalSkippedHours;
    const simTotalAttended = origTotalAttended;
    const simOverall =
      simTotalConducted > 0
        ? (simTotalAttended / simTotalConducted) * 100
        : simulatedCourses.reduce((sum, r) => sum + r.newPct, 0) / (simulatedCourses.length || 1);

    const origAtRisk = safeAttendance.filter((r) => r.numericPct < REQUIRED_PERCENTAGE).length;
    const simAtRisk = simulatedCourses.filter((r) => r.newPct < REQUIRED_PERCENTAGE).length;

    return {
      dayOrder: simulatedDayOrder,
      scheduledEntries,
      totalSkippedHours,
      affectedCoursesCount,
      simulatedCourses,
      origOverall,
      simOverall,
      overallDrop: origOverall - simOverall,
      origAtRisk,
      simAtRisk,
      newAtRiskCount: Math.max(0, simAtRisk - origAtRisk),
    };
  }, [simulatedDayOrder, schedule, safeAttendance]);

  // Overall attendance calculations
  const totalConducted = safeAttendance.reduce((sum, r) => sum + r.conducted, 0);
  const totalAttended = safeAttendance.reduce((sum, r) => sum + r.attended, 0);

  const overall =
    safeAttendance.length > 0
      ? totalConducted > 0
        ? (totalAttended / totalConducted) * 100
        : safeAttendance.reduce((sum, r) => sum + r.numericPct, 0) / safeAttendance.length
      : 0;

  const atRiskList = safeAttendance.filter((r) => r.numericPct < REQUIRED_PERCENTAGE);
  const safeList = safeAttendance.filter((r) => r.numericPct >= REQUIRED_PERCENTAGE);

  // Active courses display (simulated if day order selected, else live)
  const displayCourses = useMemo(() => {
    let list = simulation ? simulation.simulatedCourses : safeAttendance;

    if (filterTab === 'risk') {
      list = list.filter((r) => (simulation ? r.newPct : r.numericPct) < REQUIRED_PERCENTAGE);
    } else if (filterTab === 'safe') {
      list = list.filter((r) => (simulation ? r.newPct : r.numericPct) >= REQUIRED_PERCENTAGE);
    }

    const sorted = [...list];
    if (sortBy === 'lowest') {
      sorted.sort((a, b) => (simulation ? a.newPct - b.newPct : a.numericPct - b.numericPct));
    } else if (sortBy === 'highest') {
      sorted.sort((a, b) => (simulation ? b.newPct - a.newPct : b.numericPct - a.numericPct));
    } else if (sortBy === 'code') {
      sorted.sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
    }

    return sorted;
  }, [safeAttendance, simulation, filterTab, sortBy]);

  if (safeAttendance.length === 0) {
    return (
      <div className="bcard attendance__empty-card">
        <p>No attendance data came back from Academia.</p>
      </div>
    );
  }

  return (
    <div className="attendance">
      {/* Attendance Metrics Top Summary */}
      <div className="bcard attendance__summary">
        <div className="attendance__summary-col">
          <p className="eyebrow">Overall Attendance</p>
          <div className="attendance__summary-main">
            <p
              className={`attendance__summary-value num${
                (simulation ? simulation.simOverall : overall) < REQUIRED_PERCENTAGE
                  ? ' attendance__summary-value--danger'
                  : ''
              }`}
            >
              {(simulation ? simulation.simOverall : overall).toFixed(1)}%
            </p>
            {simulation && (
              <span className="bchip bchip--warning attendance__sim-delta num">
                -{simulation.overallDrop.toFixed(1)}% if skipped
              </span>
            )}
          </div>
          {totalConducted > 0 && (
            <span className="attendance__summary-sub num">
              {simulation ? simulation.simTotalAttended || totalAttended : totalAttended}/
              {simulation ? (totalConducted + simulation.totalSkippedHours) : totalConducted} classes attended
            </span>
          )}
        </div>

        <div className="attendance__summary-divider" />

        <div className="attendance__summary-col">
          <p className="eyebrow">Below 75% Cutoff</p>
          <div className="attendance__summary-main">
            <p
              className={`attendance__summary-value num${
                (simulation ? simulation.simAtRisk : atRiskList.length) > 0
                  ? ' attendance__summary-value--danger'
                  : ''
              }`}
            >
              {simulation ? simulation.simAtRisk : atRiskList.length}{' '}
              {(simulation ? simulation.simAtRisk : atRiskList.length) === 1 ? 'Course' : 'Courses'}
            </p>
            {simulation && simulation.newAtRiskCount > 0 && (
              <span className="bchip bchip--danger attendance__sim-delta">
                +{simulation.newAtRiskCount} new at risk!
              </span>
            )}
          </div>
          <span className="attendance__summary-sub">
            {(simulation ? simulation.simAtRisk : atRiskList.length) === 0
              ? 'All courses safe'
              : 'Needs attention for exam eligibility'}
          </span>
        </div>
      </div>

      {/* Attendance Predictor Feature Card */}
      <div className="bcard attendance-predictor">
        <div className="attendance-predictor__header">
          <div className="attendance-predictor__title-group">
            <div className="attendance-predictor__icon-wrap">
              <span>⚡</span>
            </div>
            <div>
              <div className="attendance-predictor__title-row">
                <h3 className="attendance-predictor__title">Attendance Predictor</h3>
                <span className="bchip bchip--sky">Live Margin Simulation</span>
              </div>
              <p className="attendance-predictor__sub">
                Select a Day Order to preview your updated attendance and margin if you skip classes today.
              </p>
            </div>
          </div>

          {simulatedDayOrder && (
            <button
              className="bbtn bbtn--outline bbtn--sm attendance-predictor__reset-btn"
              onClick={() => setSimulatedDayOrder(null)}
              title="Reset simulation to real attendance"
            >
              <span>✕ Reset Simulation</span>
            </button>
          )}
        </div>

        {/* Day Order Picker Buttons */}
        <div className="attendance-predictor__picker">
          <span className="attendance-predictor__picker-label">Simulate Skip on:</span>
          <div className="attendance-predictor__day-btns">
            {dayOrders.map((d) => (
              <button
                key={d}
                className={`attendance-predictor__day-btn${
                  simulatedDayOrder === d ? ' attendance-predictor__day-btn--active' : ''
                }`}
                onClick={() => setSimulatedDayOrder(simulatedDayOrder === d ? null : d)}
              >
                <span className="attendance-predictor__day-tag">Day</span>
                <span className="attendance-predictor__day-num num">{d}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Simulation Impact Breakdown */}
        {simulation && (
          <div className="attendance-predictor__impact-panel">
            <div className="attendance-predictor__impact-header">
              <div>
                <span className="eyebrow">Simulated Impact on Day {simulation.dayOrder}</span>
                <h4 className="attendance-predictor__impact-title">
                  Skipping {simulation.totalSkippedHours} class
                  {simulation.totalSkippedHours === 1 ? '' : 'es'} across {simulation.affectedCoursesCount}{' '}
                  subject{simulation.affectedCoursesCount === 1 ? '' : 's'}
                </h4>
              </div>
              <div className="attendance-predictor__impact-stats">
                <div className="attendance-predictor__stat-pill">
                  <span className="attendance-predictor__stat-label">Overall Drop</span>
                  <span className="attendance-predictor__stat-val num text-danger">
                    {simulation.origOverall.toFixed(1)}% → {simulation.simOverall.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* List of affected courses on this day order */}
            <div className="attendance-predictor__impact-grid">
              {simulation.simulatedCourses
                .filter((c) => c.isAffected)
                .map((c, i) => {
                  const isNowRisk = c.newPct < REQUIRED_PERCENTAGE;
                  const wasSafe = c.origPct >= REQUIRED_PERCENTAGE;
                  const droppedToRisk = wasSafe && isNowRisk;
                  const simMarginTone = marginTone(c.newMargin);

                  return (
                    <div
                      key={`${c.courseCode}-${i}`}
                      className={`attendance-predictor__impact-item${
                        droppedToRisk ? ' attendance-predictor__impact-item--danger' : ''
                      }`}
                    >
                      <div className="attendance-predictor__item-main">
                        <div className="attendance-predictor__item-header">
                          <strong className="attendance-predictor__item-title">
                            {c.courseTitle || c.courseCode}
                          </strong>
                          <span className="bchip bchip--neutral num">{c.courseCode}</span>
                        </div>
                        <p className="attendance-predictor__item-meta">
                          Missed: <strong>{c.missedHours} hr{c.missedHours > 1 ? 's' : ''}</strong> · {c.slot || 'Standard Slot'}
                        </p>
                      </div>

                      <div className="attendance-predictor__item-impacts">
                        <div className="attendance-predictor__pct-box">
                          <span className="attendance-predictor__pct-old num">{c.origPct.toFixed(1)}%</span>
                          <span className="attendance-predictor__pct-arrow">→</span>
                          <span className={`attendance-predictor__pct-new num ${isNowRisk ? 'text-danger' : 'text-ink'}`}>
                            {c.newPct.toFixed(1)}%
                          </span>
                          <span className="attendance-predictor__pct-drop num">
                            (-{c.pctDrop.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="attendance-predictor__margin-box">
                          <span className={`bchip bchip--${simMarginTone} attendance-predictor__margin-chip`}>
                            {droppedToRisk ? '⚠️ Drops below 75%!' : marginMessage(c.newMargin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Sort Bar (Search removed as requested) */}
      <div className="attendance__controls">
        <div className="attendance__tabs">
          <button
            className={`attendance__tab${filterTab === 'all' ? ' attendance__tab--active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Courses ({safeAttendance.length})
          </button>
          <button
            className={`attendance__tab attendance__tab--risk${
              filterTab === 'risk' ? ' attendance__tab--active' : ''
            }`}
            onClick={() => setFilterTab('risk')}
          >
            Below 75% ({simulation ? simulation.simAtRisk : atRiskList.length})
          </button>
          <button
            className={`attendance__tab${filterTab === 'safe' ? ' attendance__tab--active' : ''}`}
            onClick={() => setFilterTab('safe')}
          >
            Safe ≥75% ({simulation ? safeAttendance.length - simulation.simAtRisk : safeList.length})
          </button>
        </div>

        <div className="attendance__tools">
          <select
            className="attendance__sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort attendance"
          >
            <option value="lowest">Lowest % First</option>
            <option value="highest">Highest % First</option>
            <option value="code">Course Code</option>
          </select>
        </div>
      </div>

      {/* Course Attendance List */}
      {displayCourses.length === 0 ? (
        <div className="bcard attendance__empty-card">
          <p>No courses match your current filter.</p>
        </div>
      ) : (
        <ul className="attendance__list">
          {displayCourses.map((r, idx) => {
            const currentPct = simulation ? r.newPct : r.numericPct;
            const currentMargin = simulation ? r.newMargin : getAttendanceMargin(r.conducted, r.absent);
            const tone =
              currentMargin.status === 'unknown'
                ? getStatusTone(currentPct)
                : marginTone(currentMargin);

            return (
              <li
                key={`${r.courseCode || 'c'}-${r.slot || 's'}-${idx}`}
                className={`bcard attendance__card${
                  simulation && r.isAffected ? ' attendance__card--simulated' : ''
                }`}
              >
                <ProgressRing percentage={currentPct} size={64} stroke={6} />

                <div className="attendance__card-main">
                  <div className="attendance__card-header-line">
                    <p className="attendance__card-title">{r.courseTitle || r.courseCode}</p>
                    {r.courseType && (
                      <span className="bchip bchip--neutral attendance__type-chip">
                        {r.courseType}
                      </span>
                    )}
                    {simulation && r.isAffected && (
                      <span className="bchip bchip--warning attendance__sim-tag">
                        Day {simulation.dayOrder} (-{r.pctDrop.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="attendance__card-sub">
                    <span className="attendance__meta-item num">
                      <strong>{r.courseCode}</strong>
                    </span>
                    {r.slot && (
                      <span className="attendance__meta-item">
                        Slot: <strong>{r.slot}</strong>
                      </span>
                    )}
                    {r.conducted > 0 && (
                      <span className="attendance__meta-item num">
                        {r.attended}/{simulation ? r.conducted + r.missedHours : r.conducted} attended
                      </span>
                    )}
                  </div>
                </div>

                <div className="attendance__card-right">
                  <span className={`bchip bchip--${tone} attendance__card-margin`}>
                    {marginMessage(currentMargin)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AttendanceView;

