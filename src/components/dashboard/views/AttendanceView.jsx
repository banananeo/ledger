import React, { useState, useMemo, useEffect } from 'react';
import { Settings2, TriangleAlert, Check } from 'lucide-react';
import {
  getAttendanceMargin,
  marginMessage,
  marginTone,
  REQUIRED_PERCENTAGE,
} from '../../../utils/attendance.js';
import './AttendanceView.css';

const LAB_SPLIT_STORAGE_KEY = 'ledger_attendance_lab_misses';

function parseDayNum(dayLabel) {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : String(dayLabel || '');
}

function isPracticalEntry(entry) {
  return [entry?.slotType, entry?.rawType, entry?.slotCode, entry?.slot]
    .some((value) => String(value || '').toLowerCase().includes('practical') || String(value || '').toUpperCase().startsWith('P'));
}

function timeInMinutes(value) {
  const match = String(value || '').trim().match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (!meridiem && hours < 8) hours += 12;
  return hours * 60 + minutes;
}

function AttendanceView({ attendance = [], schedule = [], calendar }) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'risk' | 'safe'
  const [sortBy, setSortBy] = useState('lowest'); // 'lowest' | 'highest' | 'code'
  const [simulatedDayOrder, setSimulatedDayOrder] = useState(null); // null | '1' | '2' | '3' | '4' | '5'
  const [labMisses, setLabMisses] = useState(() => {
    try {
      const saved = window.localStorage.getItem(LAB_SPLIT_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LAB_SPLIT_STORAGE_KEY, JSON.stringify(labMisses));
    } catch {
      // Keep the current session usable if local storage is unavailable.
    }
  }, [labMisses]);

  const labInfoByCourse = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const labInfo = new Map();
    const scheduleByDay = new Map((Array.isArray(schedule) ? schedule : []).map((day) => [parseDayNum(day.dayLabel), day]));
    (calendar?.months || []).flatMap((month) => month.entries || []).forEach((entry) => {
      if (!entry?.date || entry.date >= todayStr || !entry.dayOrder) return;
      const day = scheduleByDay.get(String(entry.dayOrder));
      const labsByCourse = new Map();
      (day?.entries || []).forEach((scheduled) => {
        if (scheduled?.slotType !== 'Practical') return;
        const code = String(scheduled.courseCode || '').trim().toUpperCase();
        if (!code) return;
        if (!labsByCourse.has(code)) labsByCourse.set(code, []);
        labsByCourse.get(code).push(scheduled);
      });
      labsByCourse.forEach((entries, code) => {
        const ordered = entries
          .map((item) => ({ item, start: timeInMinutes(item.startTime), end: timeInMinutes(item.endTime) }))
          .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
        const current = labInfo.get(code) || { labHours: 0, sessions: 0, sessionLengths: [] };
        current.labHours += ordered.length;
        let sessionLength = 0;
        ordered.forEach(({ start, end }, index) => {
          const contiguous = index > 0 && start === ordered[index - 1].end;
          if (!contiguous) {
            if (sessionLength > 0) current.sessionLengths.push(sessionLength);
            sessionLength = 1;
            current.sessions += 1;
          } else {
            sessionLength += 1;
          }
        });
        if (sessionLength > 0) current.sessionLengths.push(sessionLength);
        labInfo.set(code, current);
      });
    });
    return new Map(Array.from(labInfo, ([code, info]) => {
      const counts = new Map();
      info.sessionLengths.forEach((length) => counts.set(length, (counts.get(length) || 0) + 1));
      let hoursPerSession = info.sessionLengths[0] || 0;
      let highestCount = 0;
      counts.forEach((count, length) => {
        if (count > highestCount) {
          highestCount = count;
          hoursPerSession = length;
        }
      });
      return [code, { labHours: info.labHours, sessions: info.sessions, hoursPerSession }];
    }));
  }, [calendar, schedule]);

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
    const labHoursMissedMap = new Map();
    scheduledEntries.forEach((entry) => {
      const code = (entry.courseCode || '').toUpperCase().trim();
      const isLab =
        String(entry.slotType).toLowerCase().includes('practical') ||
        String(entry.rawType).toLowerCase().includes('practical') ||
        String(entry.slotCode || '').startsWith('P');
      const hours = isLab ? 2 : 1;
      hoursMissedMap.set(code, (hoursMissedMap.get(code) || 0) + hours);
      if (isLab) labHoursMissedMap.set(code, (labHoursMissedMap.get(code) || 0) + hours);
    });

    let totalSkippedHours = 0;
    let affectedCoursesCount = 0;

    // Map each course in attendance to simulated figures
    const simulatedCourses = safeAttendance.map((course) => {
      const code = (course.courseCode || '').toUpperCase().trim();
      // Match by exact courseCode or partial match
      let missedHours = hoursMissedMap.get(code) || 0;
      let missedLabHours = labHoursMissedMap.get(code) || 0;
      if (missedHours === 0) {
        for (const [k, v] of hoursMissedMap.entries()) {
          if (k && (code.includes(k) || k.includes(code))) {
            missedHours = v;
            missedLabHours = labHoursMissedMap.get(k) || 0;
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
        missedLabHours,
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

  const setLabMissCount = (courseCode, value) => {
    const code = String(courseCode || '').trim().toUpperCase();
    setLabMisses((current) => {
      const next = { ...current };
      if (value === '') delete next[code];
      else next[code] = value;
      return next;
    });
  };

  if (safeAttendance.length === 0) {
    return (
      <div className="bcard attendance__empty-card">
        <p>No attendance data came back from Academia.</p>
      </div>
    );
  }

  return (
    <div className="attendance">
      <header className="view-intro">
        <div className="view-intro__meta"><span>STUDENT PORTAL / CONNECTED</span><span>Sample data</span></div>
        <h2>Attendance</h2>
        <p>Know your margins. Plan your next class.</p>
      </header>
      {/* Overall attendance summary */}
      <div className="bcard attendance__summary">
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
          {totalConducted > 0 && <span className="attendance__summary-count num">{simulation ? simulation.simTotalAttended || totalAttended : totalAttended} / {simulation ? (totalConducted + simulation.totalSkippedHours) : totalConducted}</span>}
        </div>
        <p className="attendance__summary-sub">Attended / conducted · weighted by conducted count</p>
        <div className="attendance__summary-divider" />
        <div className="attendance__summary-bottom"><span>Below 75% Cutoff</span><span className="attendance__summary-badge">{simulation ? simulation.simAtRisk : atRiskList.length} {(simulation ? simulation.simAtRisk : atRiskList.length) === 1 ? 'course' : 'courses'}</span></div>
        {simulation && simulation.newAtRiskCount > 0 && <span className="attendance__summary-simulation">+{simulation.newAtRiskCount} new at risk if skipped</span>}
      </div>

      {/* Attendance Predictor Feature Card */}
      <div className="bcard attendance-predictor">
        <div className="attendance-predictor__header">
          <div className="attendance-predictor__title-group">
            <div>
              <div className="attendance-predictor__title-row">
                <h3 className="attendance-predictor__title">Attendance Predictor</h3>
                <span className="attendance-predictor__live">LIVE MARGIN SIMULATION</span>
              </div>
              <p className="attendance-predictor__sub">
                Choose a day order to preview skipping its classes. Your current counts stay unchanged.
              </p>
            </div>
          </div>
          <span className="attendance-predictor__settings" aria-hidden="true"><Settings2 size={18} /></span>

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

        {!simulation && <p className="attendance-predictor__status">NO SIMULATION APPLIED</p>}

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
            <span>All Courses</span><small>{safeAttendance.length}</small>
          </button>
          <button
            className={`attendance__tab attendance__tab--risk${
              filterTab === 'risk' ? ' attendance__tab--active' : ''
            }`}
            onClick={() => setFilterTab('risk')}
          >
            <span>Below 75%</span><small>{simulation ? simulation.simAtRisk : atRiskList.length}</small>
          </button>
          <button
            className={`attendance__tab${filterTab === 'safe' ? ' attendance__tab--active' : ''}`}
            onClick={() => setFilterTab('safe')}
          >
            <span>Safe ≥75%</span><small>{simulation ? safeAttendance.length - simulation.simAtRisk : safeList.length}</small>
          </button>
        </div>

        <div className="attendance__tools">
          <span className="attendance__course-count">{String(displayCourses.length).padStart(2, '0')} COURSES</span>
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
            const courseCode = String(r.courseCode || '').trim().toUpperCase();
            const isJointCourse = /J$/i.test(courseCode);
            const lab = labInfoByCourse.get(courseCode) || { labHours: 0, sessions: 0, hoursPerSession: 0 };
            const hasLabSplit = Object.prototype.hasOwnProperty.call(labMisses, courseCode);
            const missedLabSessions = hasLabSplit ? Number(labMisses[courseCode]) : null;
            const splitConducted = r.conducted + (simulation ? r.missedHours : 0);
            const splitAbsent = r.absent + (simulation ? r.missedHours : 0);
            const splitLabConducted = lab.labHours;
            const splitLabAbsent = (missedLabSessions || 0) * lab.hoursPerSession;
            let splitError = !hasLabSplit
              ? ''
              : !Number.isInteger(missedLabSessions) || missedLabSessions < 0
                ? 'Enter a whole number of missed lab sessions.'
                : lab.sessions === 0 || lab.labHours === 0
                  ? 'No past lab sessions were found in your timetable and calendar.'
                  : missedLabSessions > lab.sessions
                    ? `You can enter at most ${lab.sessions} missed lab session${lab.sessions === 1 ? '' : 's'}.`
                    : splitLabConducted > splitConducted
                      ? 'Lab sessions exceed the course classes conducted, so the split cannot be calculated.'
                      : splitLabAbsent > splitAbsent
                        ? 'The lab absences exceed the total absences reported for this course.'
                        : splitLabAbsent > splitLabConducted
                          ? 'Lab absences exceed lab classes conducted.'
                          : '';
            let split = !splitError && hasLabSplit ? {
              theoryConducted: splitConducted - splitLabConducted,
              theoryAbsent: splitAbsent - splitLabAbsent,
              labConducted: splitLabConducted,
              labAbsent: splitLabAbsent,
            } : null;
            if (split && (split.theoryConducted < 0 || split.theoryAbsent < 0 || split.theoryAbsent > split.theoryConducted)) {
              splitError = 'Attendance totals do not support a valid Theory and Lab split.';
              split = null;
            }

            return (
              <li
                key={`${r.courseCode || 'c'}-${r.slot || 's'}-${idx}`}
                className={`bcard attendance__card${
                  simulation && r.isAffected ? ' attendance__card--simulated' : ''
                }`}
              >
                <div className="attendance__course-meta"><span>{courseCode || 'COURSE NAME'}{r.courseType ? ` / ${r.courseType.toUpperCase()}` : ''}</span><span className={currentPct < REQUIRED_PERCENTAGE ? 'is-risk' : currentPct === REQUIRED_PERCENTAGE ? 'is-cutoff' : 'is-safe'}>{currentPct < REQUIRED_PERCENTAGE ? 'BELOW 75%' : currentPct === REQUIRED_PERCENTAGE ? 'AT CUTOFF' : 'SAFE ≥75%'}</span></div>

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
                    <strong className={currentPct < REQUIRED_PERCENTAGE || currentPct === REQUIRED_PERCENTAGE ? 'is-risk' : 'is-safe'}>{currentPct.toFixed(1)}%</strong>
                    {r.conducted > 0 && <span className="num">{r.attended} / {simulation ? r.conducted + r.missedHours : r.conducted} attended</span>}
                  </div>
                </div>

                <div className="attendance__progress" role="progressbar" aria-label={`${r.courseTitle || r.courseCode} attendance`} aria-valuenow={Math.round(currentPct)} aria-valuemin={0} aria-valuemax={100}><span className={currentPct <= REQUIRED_PERCENTAGE ? 'is-risk' : 'is-safe'} style={{ width: `${Math.max(0, Math.min(100, currentPct))}%` }} /></div>
                <div className={`attendance__margin-note ${currentPct < REQUIRED_PERCENTAGE || currentPct === REQUIRED_PERCENTAGE ? 'is-risk' : 'is-safe'}`}>{currentPct < REQUIRED_PERCENTAGE || currentPct === REQUIRED_PERCENTAGE ? <TriangleAlert size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}<span>{marginMessage(currentMargin)}</span></div>

                {isJointCourse && (
                  <div className="attendance__lab-split">
                    <div className="attendance__lab-split-control">
                      <label htmlFor={`lab-misses-${idx}`}>Lab classes missed</label>
                      <input
                        id={`lab-misses-${idx}`}
                        type="number"
                        min="0"
                        max={lab.sessions || undefined}
                        step="1"
                        inputMode="numeric"
                        value={hasLabSplit ? labMisses[courseCode] : ''}
                        placeholder="Enter count"
                        onChange={(event) => setLabMissCount(courseCode, event.target.value)}
                      />
                      <span>{lab.sessions} past lab session{lab.sessions === 1 ? '' : 's'} · usually {lab.hoursPerSession} class{lab.hoursPerSession === 1 ? '' : 'es'} each</span>
                      {hasLabSplit && (
                        <button type="button" className="attendance__lab-clear" onClick={() => setLabMissCount(courseCode, '')}>
                          Clear split
                        </button>
                      )}
                    </div>
                    {splitError && <p className="attendance__lab-error" role="status">{splitError}</p>}
                    {split && (
                      <div className="attendance__lab-results">
                        {[
                          ['Theory', split.theoryConducted, split.theoryAbsent],
                          ['Lab', split.labConducted, split.labAbsent],
                        ].map(([label, conducted, absent]) => {
                          const percentage = conducted > 0 ? ((conducted - absent) / conducted) * 100 : 0;
                          const margin = getAttendanceMargin(conducted, absent);
                          return (
                            <div className="attendance__lab-result" key={label}>
                              <strong>{label}</strong>
                              <span className="num">{percentage.toFixed(1)}% · {conducted - absent}/{conducted}</span>
                              <span className={`bchip bchip--${marginTone(margin)}`}>{marginMessage(margin)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="attendance__connection"><span aria-hidden="true" />ACADEMIA + STUDENT PORTAL CONNECTED</div>
    </div>
  );
}

export default AttendanceView;

