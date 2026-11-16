import type {
  AppData,
  AttendanceRecord,
  CourseCatalogEntry,
  MarkRecord,
  ScheduleDay,
  StudentProfile,
} from '../types';
import { getAttendanceMargin, REQUIRED_PERCENTAGE } from './attendance.js';
import { parseTimeToMinutes } from './reminderEngine.ts';

export interface WrappedCourseStat {
  courseCode: string;
  courseTitle: string;
  courseType: string;
  faculty: string;
  conducted: number;
  absent: number;
  attended: number;
  percentage: number;
  hasCounts: boolean;
  safeMargin: number;
  recoveryDebt: number;
  status: 'safe' | 'tight' | 'risk' | 'unknown';
}

export interface FacultySuperlative {
  faculty: string;
  courseCode: string;
  courseTitle: string;
  attended: number;
  absent: number;
  conducted: number;
  percentage: number;
  hasCounts: boolean;
}

export interface MorningRhythmStats {
  morningAttendancePct: number;
  afternoonAttendancePct: number;
  morningSlotsPerCycle: number;
  eightAmSlotsPerCycle: number;
  afternoonSlotsPerCycle: number;
  rhythmBadge: string;
  rhythmNote: string;
}

export interface CourseMomentumItem {
  courseCode: string;
  courseTitle: string;
  firstTitle: string;
  firstPct: number;
  latestTitle: string;
  latestPct: number;
  deltaPct: number;
}

export interface HighRoiCourseStat {
  courseCode: string;
  courseTitle: string;
  obtained: number;
  max: number;
  marksPercentage: number;
  bunks: number;
  attendancePercentage: number;
  hasCounts: boolean;
}

export interface MarksInsightStats {
  hasMarks: boolean;
  gradedCoursesCount: number;
  totalObtained: number;
  totalMax: number;
  overallMarksPct: number;
  highRoiCourse: HighRoiCourseStat | null;
  biggestClimber: CourseMomentumItem | null;
  courseTrends: CourseMomentumItem[];
  averageDeltaPct: number | null;
}

export interface WrappedArchetype {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  description: string;
  accentTone: 'cobalt' | 'lime' | 'terracotta' | 'mint';
}

export interface WrappedAnalytics {
  hasData: boolean;
  hasCountData: boolean;
  studentName: string;
  firstName: string;
  registrationNumber: string;
  semesterLabel: string;
  semesterTag: string;
  departmentLabel: string;
  overallPercentage: number;
  attendanceQuote: string;
  totalConducted: number;
  totalAttended: number;
  totalBunked: number;
  minutesInClass: number;
  hoursInClass: number;
  minutesBunked: number;
  hoursBunked: number;
  safeBunkBank: number;
  recoveryDebtTotal: number;
  coursesCount: number;
  safeCoursesCount: number;
  tightCoursesCount: number;
  atRiskCoursesCount: number;
  mostBunkedCourse: WrappedCourseStat | null;
  mostLoyalCourse: WrappedCourseStat | null;
  tightropeCourse: WrappedCourseStat | null;
  mostSeenFaculty: FacultySuperlative | null;
  mostGhostedFaculty: FacultySuperlative | null;
  morningRhythm: MorningRhythmStats;
  marksInsights: MarksInsightStats;
  topRoom: { room: string; sessionsPerCycle: number } | null;
  busiestDayOrder: { dayLabel: string; count: number } | null;
  topMarkCourse: {
    courseCode: string;
    courseTitle: string;
    percentage: number;
    obtained: number;
    max: number;
  } | null;
  internalMarksAverage: number | null;
  archetype: WrappedArchetype;
  courses: WrappedCourseStat[];
}

function buildCourseTitleMap(
  attendance: AttendanceRecord[] = [],
  courses: CourseCatalogEntry[] = [],
  schedule: ScheduleDay[] = []
): Map<string, string> {
  const map = new Map<string, string>();
  const register = (code?: string, title?: string) => {
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanTitle = String(title || '').trim();
    if (cleanCode && cleanTitle && !map.has(cleanCode)) {
      map.set(cleanCode, cleanTitle);
    }
  };
  courses.forEach((c) => register(c.courseCode, c.courseTitle));
  attendance.forEach((a) => register(a.courseCode, a.courseTitle));
  schedule.forEach((d) =>
    (d.entries || []).forEach((e) => register(e.courseCode, e.courseTitle))
  );
  return map;
}

function cleanFacultyName(raw?: string): string {
  const val = String(raw || '').trim();
  if (!val || val.toLowerCase() === 'unknown' || val.toLowerCase() === 'tba' || val === '-') {
    return '';
  }
  return val.replace(/\s+/g, ' ');
}

function buildCourseFacultyMap(
  courses: CourseCatalogEntry[] = [],
  schedule: ScheduleDay[] = []
): Map<string, string> {
  const map = new Map<string, string>();

  courses.forEach((course) => {
    const code = String(course.courseCode || '').trim().toUpperCase();
    if (!code) return;
    const slots = Array.isArray(course.slots) ? course.slots : [];
    const theorySlot = slots.find(
      (s) => cleanFacultyName(s.faculty) && String(s.slotType || '').toLowerCase() !== 'practical'
    );
    const anySlot = slots.find((s) => cleanFacultyName(s.faculty));
    const chosen = cleanFacultyName(theorySlot?.faculty || anySlot?.faculty);
    if (chosen && !map.has(code)) {
      map.set(code, chosen);
    }
  });

  schedule.forEach((day) => {
    (day.entries || []).forEach((entry) => {
      const code = String(entry.courseCode || '').trim().toUpperCase();
      const fac = cleanFacultyName(entry.faculty);
      if (code && fac && !map.has(code)) {
        map.set(code, fac);
      }
    });
  });

  return map;
}

function computeMorningRhythm(
  courses: WrappedCourseStat[],
  schedule: ScheduleDay[]
): MorningRhythmStats {
  const morningCodes = new Set<string>();
  const afternoonCodes = new Set<string>();
  let morningSlotsPerCycle = 0;
  let eightAmSlotsPerCycle = 0;
  let afternoonSlotsPerCycle = 0;

  schedule.forEach((day) => {
    (day.entries || []).forEach((entry) => {
      const code = String(entry.courseCode || '').trim().toUpperCase();
      const startMin = parseTimeToMinutes(entry.startTime);
      if (startMin == null) return;

      // Slots before 09:40 AM (480 = 08:00, 530 = 08:50) count as early morning
      if (startMin < 580) {
        morningSlotsPerCycle += 1;
        if (startMin <= 490) eightAmSlotsPerCycle += 1;
        if (code) morningCodes.add(code);
      } else {
        afternoonSlotsPerCycle += 1;
        if (code) afternoonCodes.add(code);
      }
    });
  });

  const calcGroupPct = (codeSet: Set<string>, fallbackAll: WrappedCourseStat[]): number => {
    const matched = fallbackAll.filter((c) => codeSet.has(c.courseCode));
    const pool = matched.length > 0 ? matched : fallbackAll;
    if (pool.length === 0) return 0;
    const totalCond = pool.reduce((s, c) => s + c.conducted, 0);
    const totalAtt = pool.reduce((s, c) => s + c.attended, 0);
    if (totalCond > 0) return (totalAtt / totalCond) * 100;
    return pool.reduce((s, c) => s + c.percentage, 0) / pool.length;
  };

  const morningAttendancePct = calcGroupPct(morningCodes, courses);
  const afternoonAttendancePct = calcGroupPct(afternoonCodes, courses);
  const diff = afternoonAttendancePct - morningAttendancePct;

  let rhythmBadge = 'ALL-DAY STEADY';
  let rhythmNote = 'Consistent attendance from first bell to last slot.';

  if (morningAttendancePct >= 82 && diff <= 2.5) {
    rhythmBadge = '8 AM WARRIOR';
    rhythmNote = 'First-hour alarms never stood a chance against you.';
  } else if (diff >= 3.5) {
    rhythmBadge = 'SNOOZE STRATEGIST';
    rhythmNote = `Your attendance jumps +${diff.toFixed(1)}% once morning slots are over.`;
  } else if (morningAttendancePct > afternoonAttendancePct + 2.5) {
    rhythmBadge = 'EARLY BIRD ANCHOR';
    rhythmNote = `Stronger in the morning (+${Math.abs(diff).toFixed(1)}%) than post-lunch lectures.`;
  }

  return {
    morningAttendancePct,
    afternoonAttendancePct,
    morningSlotsPerCycle,
    eightAmSlotsPerCycle,
    afternoonSlotsPerCycle,
    rhythmBadge,
    rhythmNote,
  };
}

function computeMarksInsights(
  marks: MarkRecord[],
  courses: WrappedCourseStat[],
  titleMap: Map<string, string>
): MarksInsightStats {
  const courseByCode = new Map<string, WrappedCourseStat>();
  courses.forEach((c) => courseByCode.set(c.courseCode, c));

  let totalObtained = 0;
  let totalMax = 0;
  let gradedCoursesCount = 0;

  const roiCandidates: HighRoiCourseStat[] = [];
  const courseTrends: CourseMomentumItem[] = [];

  marks.forEach((m) => {
    const code = String(m.courseCode || '').trim().toUpperCase();
    const courseStat = courseByCode.get(code);
    const title = courseStat?.courseTitle || titleMap.get(code) || code || 'Course';

    const obtained = Number(m.totalMarksObtained);
    const max = Number(m.totalMarksMaximum);

    if (Number.isFinite(obtained) && Number.isFinite(max) && max > 0) {
      totalObtained += obtained;
      totalMax += max;
      gradedCoursesCount += 1;

      const marksPercentage = (obtained / max) * 100;
      roiCandidates.push({
        courseCode: code,
        courseTitle: title,
        obtained: Number(obtained.toFixed(1)),
        max: Number(max.toFixed(1)),
        marksPercentage,
        bunks: courseStat?.absent ?? 0,
        attendancePercentage: courseStat?.percentage ?? 100,
        hasCounts: courseStat?.hasCounts ?? false,
      });
    }

    // Check assessment-to-assessment momentum (e.g. CT1 -> CT2)
    const validAssessments = (Array.isArray(m.assessments) ? m.assessments : [])
      .map((a) => {
        const aObt = parseFloat(String(a.obtainedMarks));
        const aMax = parseFloat(String(a.maximumMarks));
        if (!Number.isFinite(aObt) || !Number.isFinite(aMax) || aMax <= 0) return null;
        return {
          title: String(a.title || 'Test').trim(),
          pct: (aObt / aMax) * 100,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (validAssessments.length >= 2) {
      const first = validAssessments[0];
      const second = validAssessments[1];
      courseTrends.push({
        courseCode: code,
        courseTitle: title,
        firstTitle: first.title,
        firstPct: first.pct,
        latestTitle: second.title,
        latestPct: second.pct,
        deltaPct: second.pct - first.pct,
      });
    }
  });

  const overallMarksPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  // High-ROI Subject: Rewards high internal score combined with bunks taken
  let highRoiCourse: HighRoiCourseStat | null = null;
  if (roiCandidates.length > 0) {
    const withBunks = roiCandidates.filter((c) => c.bunks > 0 && c.marksPercentage >= 55);
    const pool = withBunks.length > 0 ? withBunks : roiCandidates;
    const sortedRoi = [...pool].sort((a, b) => {
      const scoreA = a.marksPercentage * (1 + Math.min(a.bunks, 18) * 0.045);
      const scoreB = b.marksPercentage * (1 + Math.min(b.bunks, 18) * 0.045);
      return scoreB - scoreA;
    });
    highRoiCourse = sortedRoi[0] || null;
  }

  const biggestClimber =
    courseTrends.length > 0
      ? [...courseTrends].sort((a, b) => b.deltaPct - a.deltaPct)[0]
      : null;

  const averageDeltaPct =
    courseTrends.length > 0
      ? courseTrends.reduce((sum, t) => sum + t.deltaPct, 0) / courseTrends.length
      : null;

  return {
    hasMarks: gradedCoursesCount > 0,
    gradedCoursesCount,
    totalObtained: Number(totalObtained.toFixed(1)),
    totalMax: Number(totalMax.toFixed(1)),
    overallMarksPct,
    highRoiCourse,
    biggestClimber,
    courseTrends,
    averageDeltaPct,
  };
}

function computeArchetype(params: {
  overallPercentage: number;
  totalBunked: number;
  atRiskCoursesCount: number;
  tightCoursesCount: number;
  internalMarksAverage: number | null;
  hasCountData: boolean;
}): WrappedArchetype {
  const {
    overallPercentage,
    totalBunked,
    atRiskCoursesCount,
    tightCoursesCount,
    internalMarksAverage,
  } = params;

  if (atRiskCoursesCount === 0 && overallPercentage >= 75 && totalBunked >= 10) {
    return {
      id: 'tactical-ghost',
      title: 'The Tactical Ghost',
      badge: 'PRECISION BUNKER',
      tagline: 'Maximum freedom. Zero casualties.',
      description:
        'You skipped classes like a grandmaster playing chess—cashing in your bunks while keeping every single course safely above the 75% line.',
      accentTone: 'lime',
    };
  }

  if (
    atRiskCoursesCount === 0 &&
    (tightCoursesCount >= 1 || (overallPercentage >= 75 && overallPercentage < 78.5))
  ) {
    return {
      id: 'edge-runner',
      title: 'The 75.0% Tightrope Walker',
      badge: 'LIVING DANGEROUSLY',
      tagline: 'Why have extra attendance when 75.0% is enough?',
      description:
        'Every morning alarm is a high-stakes decision. You are balanced right on the academic razor’s edge—and somehow still upright.',
      accentTone: 'terracotta',
    };
  }

  if (internalMarksAverage !== null && internalMarksAverage >= 76 && totalBunked >= 6) {
    return {
      id: 'clutch-strategist',
      title: 'The Clutch Strategist',
      badge: 'HIGH ROI SCHOLAR',
      tagline: 'Skipped the noise, aced the internals.',
      description:
        'You proved that seat time does not equal scoreboard time—reclaiming hours off campus while keeping your internal assessments sharp.',
      accentTone: 'cobalt',
    };
  }

  if (overallPercentage >= 90 && atRiskCoursesCount === 0) {
    return {
      id: 'front-bench-sovereign',
      title: 'The Front-Bench Sovereign',
      badge: 'UNSHAKEABLE STREAK',
      tagline: 'The faculty know your name, your seat, and your aura.',
      description:
        'Rain, 8 AM lectures, or surprise Day Orders—nothing fazed you. Your bunk bank is overflowing and your detention risk is absolute zero.',
      accentTone: 'mint',
    };
  }

  if (atRiskCoursesCount > 0) {
    return {
      id: 'comeback-architect',
      title: 'The Comeback Architect',
      badge: 'REDEMPTION ARC',
      tagline: 'The bunks were legendary. Now begins the climb.',
      description:
        'You chose peace, sleep, and side-quests over the lecture hall. A few courses dipped into the red zone, setting up the ultimate semester comeback story.',
      accentTone: 'terracotta',
    };
  }

  return {
    id: 'balanced-navigator',
    title: 'The Campus Pace-Setter',
    badge: 'BALANCED RHYTHM',
    tagline: 'Steady attendance with room to breathe.',
    description:
      'Never too stressed, never reckless. You kept a healthy buffer above 75% while taking well-timed breaks whenever the week got heavy.',
    accentTone: 'cobalt',
  };
}

export function computeWrappedAnalytics(data?: Partial<AppData> | null): WrappedAnalytics {
  const profile: Partial<StudentProfile> = data?.profile || {};
  const attendance: AttendanceRecord[] = Array.isArray(data?.attendance) ? data!.attendance! : [];
  const marks: MarkRecord[] = Array.isArray(data?.marks) ? data!.marks! : [];
  const schedule: ScheduleDay[] = Array.isArray(data?.schedule) ? data!.schedule! : [];
  const coursesCatalog: CourseCatalogEntry[] = Array.isArray(data?.courses) ? data!.courses! : [];

  const titleMap = buildCourseTitleMap(attendance, coursesCatalog, schedule);
  const facultyMap = buildCourseFacultyMap(coursesCatalog, schedule);

  const studentName = String(profile.name || 'Student').trim();
  const firstName = studentName.split(/\s+/)[0] || 'Student';
  const registrationNumber = String(profile.registrationNumber || '').trim();
  const semesterRaw = String(profile.semester || '').trim();
  const semesterNumMatch = semesterRaw.match(/\d+/);
  const semesterTag = semesterNumMatch
    ? `SEMESTER ${String(semesterNumMatch[0]).padStart(2, '0')}`
    : data?.calendar?.plannerType
      ? `${data.calendar.plannerType} SEMESTER`
      : 'SEMESTER';
  const semesterLabel = semesterNumMatch
    ? `Semester ${semesterNumMatch[0]}`
    : data?.calendar?.plannerType
      ? `${data.calendar.plannerType} Semester`
      : 'Current Semester';
  const departmentLabel = String(profile.department || profile.program || 'SRM Academia').trim();

  const courses: WrappedCourseStat[] = attendance.map((r) => {
    const code = String(r.courseCode || '').trim().toUpperCase();
    const rawPct = Number(r.attendancePercentage);
    const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0;
    const rawConducted = Number(r.classesConducted);
    const rawAbsent = Number(r.classesAbsent);
    const hasCounts =
      Number.isFinite(rawConducted) &&
      Number.isFinite(rawAbsent) &&
      rawConducted > 0 &&
      rawAbsent >= 0 &&
      rawAbsent <= rawConducted;

    const conducted = hasCounts ? rawConducted : 0;
    const absent = hasCounts ? rawAbsent : 0;
    const attended = hasCounts ? Math.max(0, conducted - absent) : 0;
    const calculatedPct = hasCounts && conducted > 0 ? (attended / conducted) * 100 : pct;

    const margin = hasCounts
      ? getAttendanceMargin(conducted, absent)
      : {
          status: (calculatedPct >= 77 ? 'safe' : calculatedPct >= 75 ? 'tight' : 'risk') as
            | 'safe'
            | 'tight'
            | 'risk',
          value: 0,
        };

    return {
      courseCode: code || 'COURSE',
      courseTitle:
        String(r.courseTitle || '').trim() || titleMap.get(code) || code || 'Course',
      courseType: String(r.courseType || 'Theory').trim(),
      faculty: facultyMap.get(code) || 'Assigned Faculty',
      conducted,
      absent,
      attended,
      percentage: calculatedPct,
      hasCounts,
      safeMargin: margin.status === 'safe' ? margin.value : 0,
      recoveryDebt: margin.status === 'risk' ? margin.value : 0,
      status: margin.status as WrappedCourseStat['status'],
    };
  });

  const hasCountData = courses.length > 0 && courses.some((c) => c.hasCounts);
  const totalConducted = courses.reduce((sum, c) => sum + c.conducted, 0);
  const totalAttended = courses.reduce((sum, c) => sum + c.attended, 0);
  const totalBunked = courses.reduce((sum, c) => sum + c.absent, 0);

  const overallPercentage =
    courses.length > 0
      ? hasCountData && totalConducted > 0
        ? (totalAttended / totalConducted) * 100
        : courses.reduce((sum, c) => sum + c.percentage, 0) / courses.length
      : 0;

  const minutesInClass = totalAttended * 50;
  const hoursInClass = Number((minutesInClass / 60).toFixed(1));
  const minutesBunked = totalBunked * 50;
  const hoursBunked = Number((minutesBunked / 60).toFixed(1));

  const safeBunkBank = courses.reduce((sum, c) => sum + c.safeMargin, 0);
  const recoveryDebtTotal = courses.reduce((sum, c) => sum + c.recoveryDebt, 0);

  const safeCoursesCount = courses.filter((c) => c.percentage >= REQUIRED_PERCENTAGE).length;
  const tightCoursesCount = courses.filter(
    (c) => c.status === 'tight' || (c.percentage >= 75 && c.percentage < 77.5)
  ).length;
  const atRiskCoursesCount = courses.filter((c) => c.percentage < REQUIRED_PERCENTAGE).length;

  let mostBunkedCourse: WrappedCourseStat | null = null;
  let mostLoyalCourse: WrappedCourseStat | null = null;
  let tightropeCourse: WrappedCourseStat | null = null;

  if (courses.length > 0) {
    const byBunks = [...courses].sort((a, b) => {
      if (a.hasCounts && b.hasCounts && b.absent !== a.absent) {
        return b.absent - a.absent;
      }
      return a.percentage - b.percentage;
    });
    mostBunkedCourse = byBunks[0] || null;

    const byLoyalty = [...courses].sort((a, b) => {
      if (Math.abs(b.percentage - a.percentage) > 0.05) {
        return b.percentage - a.percentage;
      }
      return b.attended - a.attended;
    });
    mostLoyalCourse = byLoyalty[0] || null;

    const byTightrope = [...courses].sort(
      (a, b) => Math.abs(a.percentage - REQUIRED_PERCENTAGE) - Math.abs(b.percentage - REQUIRED_PERCENTAGE)
    );
    tightropeCourse = byTightrope[0] || null;
  }

  // Faculty superlatives (#1 Most Seen & #1 Most Ghosted Professor)
  let mostSeenFaculty: FacultySuperlative | null = null;
  let mostGhostedFaculty: FacultySuperlative | null = null;

  if (courses.length > 0) {
    const bySeen = [...courses].sort((a, b) => {
      if (a.hasCounts && b.hasCounts && b.attended !== a.attended) {
        return b.attended - a.attended;
      }
      return b.percentage - a.percentage;
    });
    const topSeen = bySeen[0];
    if (topSeen) {
      mostSeenFaculty = {
        faculty: topSeen.faculty,
        courseCode: topSeen.courseCode,
        courseTitle: topSeen.courseTitle,
        attended: topSeen.attended,
        absent: topSeen.absent,
        conducted: topSeen.conducted,
        percentage: topSeen.percentage,
        hasCounts: topSeen.hasCounts,
      };
    }

    if (mostBunkedCourse) {
      mostGhostedFaculty = {
        faculty: mostBunkedCourse.faculty,
        courseCode: mostBunkedCourse.courseCode,
        courseTitle: mostBunkedCourse.courseTitle,
        attended: mostBunkedCourse.attended,
        absent: mostBunkedCourse.absent,
        conducted: mostBunkedCourse.conducted,
        percentage: mostBunkedCourse.percentage,
        hasCounts: mostBunkedCourse.hasCounts,
      };
    }
  }

  const morningRhythm = computeMorningRhythm(courses, schedule);
  const marksInsights = computeMarksInsights(marks, courses, titleMap);

  const roomCounts = new Map<string, number>();
  let busiestDayOrder: { dayLabel: string; count: number } | null = null;

  schedule.forEach((day) => {
    const entries = Array.isArray(day.entries) ? day.entries : [];
    const dayNumMatch = String(day.dayLabel || '').match(/\d+/);
    const cleanDayLabel = dayNumMatch ? `Day ${dayNumMatch[0]}` : String(day.dayLabel || 'Day');

    if (!busiestDayOrder || entries.length > busiestDayOrder.count) {
      if (entries.length > 0) {
        busiestDayOrder = { dayLabel: cleanDayLabel, count: entries.length };
      }
    }

    entries.forEach((entry) => {
      const room = String(entry.room || '').trim();
      if (room && room.toUpperCase() !== 'TBA' && room !== '-') {
        roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
      }
    });
  });

  let topRoom: { room: string; sessionsPerCycle: number } | null = null;
  roomCounts.forEach((count, room) => {
    if (!topRoom || count > topRoom.sessionsPerCycle) {
      topRoom = { room, sessionsPerCycle: count };
    }
  });

  const scoredMarks = marks
    .map((m) => {
      const obtained = Number(m.totalMarksObtained);
      const max = Number(m.totalMarksMaximum);
      if (!Number.isFinite(obtained) || !Number.isFinite(max) || max <= 0) return null;
      const code = String(m.courseCode || '').trim().toUpperCase();
      return {
        courseCode: code,
        courseTitle: titleMap.get(code) || code,
        percentage: (obtained / max) * 100,
        obtained,
        max,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const topMarkCourse =
    scoredMarks.length > 0
      ? [...scoredMarks].sort((a, b) => b.percentage - a.percentage)[0]
      : null;

  const internalMarksAverage =
    scoredMarks.length > 0
      ? scoredMarks.reduce((sum, m) => sum + m.percentage, 0) / scoredMarks.length
      : null;

  const archetype = computeArchetype({
    overallPercentage,
    totalBunked,
    atRiskCoursesCount,
    tightCoursesCount,
    internalMarksAverage,
    hasCountData,
  });

  const attendanceQuote =
    atRiskCoursesCount === 0 && overallPercentage >= 88
      ? 'Ironclad consistency—passing every threshold with room to spare.'
      : atRiskCoursesCount === 0 && overallPercentage >= 75
        ? 'Right in the sweet spot—passing every threshold without overdoing it.'
        : 'Living on the edge—setting up the ultimate semester comeback arc.';

  return {
    hasData: courses.length > 0,
    hasCountData,
    studentName,
    firstName,
    registrationNumber,
    semesterLabel,
    semesterTag,
    departmentLabel,
    overallPercentage,
    attendanceQuote,
    totalConducted,
    totalAttended,
    totalBunked,
    minutesInClass,
    hoursInClass,
    minutesBunked,
    hoursBunked,
    safeBunkBank,
    recoveryDebtTotal,
    coursesCount: courses.length,
    safeCoursesCount,
    tightCoursesCount,
    atRiskCoursesCount,
    mostBunkedCourse,
    mostLoyalCourse,
    tightropeCourse,
    mostSeenFaculty,
    mostGhostedFaculty,
    morningRhythm,
    marksInsights,
    topRoom,
    busiestDayOrder,
    topMarkCourse,
    internalMarksAverage,
    archetype,
    courses,
  };
}
