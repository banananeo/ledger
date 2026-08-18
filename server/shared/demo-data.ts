import type { AcademicCalendar, AttendanceRecord, CourseCatalogEntry, MarkRecord, ScheduleDay, StudentProfile } from "../types.js";

export function getDemoData() {
  const profile: StudentProfile = {
    name: "ADITYA SHARMA",
    registrationNumber: "RA2311003010482",
    batch: "Batch_1",
    semester: "4",
    department: "Computer Science and Engineering",
    section: "B1",
    mobileNumber: "9876543210",
    program: "B.Tech. Computer Science and Engineering",
  };

  const attendance: AttendanceRecord[] = [
    {
      courseCode: "21CSC204J",
      courseTitle: "Design and Analysis of Algorithms",
      courseType: "Integrated",
      slot: "A1/A2",
      classesConducted: 42,
      classesAbsent: 3,
      attendancePercentage: 92.8,
    },
    {
      courseCode: "21CSC205J",
      courseTitle: "Operating Systems",
      courseType: "Integrated",
      slot: "B1/B2",
      classesConducted: 40,
      classesAbsent: 4,
      attendancePercentage: 90.0,
    },
    {
      courseCode: "21MTH202B",
      courseTitle: "Probability and Queuing Theory",
      courseType: "Theory",
      slot: "C1",
      classesConducted: 36,
      classesAbsent: 9,
      attendancePercentage: 75.0,
    },
    {
      courseCode: "21CSC206T",
      courseTitle: "Database Management Systems",
      courseType: "Theory",
      slot: "D1",
      classesConducted: 38,
      classesAbsent: 5,
      attendancePercentage: 86.8,
    },
    {
      courseCode: "21CSC207P",
      courseTitle: "Web Programming Laboratory",
      courseType: "Practical",
      slot: "P1",
      classesConducted: 28,
      classesAbsent: 8,
      attendancePercentage: 71.4,
    },
    {
      courseCode: "21LEM101T",
      courseTitle: "Constitution of India",
      courseType: "Theory",
      slot: "E1",
      classesConducted: 20,
      classesAbsent: 2,
      attendancePercentage: 90.0,
    },
  ];

  const marks: MarkRecord[] = [
    {
      courseCode: "21CSC204J",
      courseType: "Integrated",
      summary: "88/100",
      assessments: [
        { title: "Cycle Test 1", obtainedMarks: "22", maximumMarks: "25" },
        { title: "Cycle Test 2", obtainedMarks: "23", maximumMarks: "25" },
        { title: "Surprise Test", obtainedMarks: "9", maximumMarks: "10" },
        { title: "Lab Assignment", obtainedMarks: "34", maximumMarks: "40" },
      ],
      totalMarksObtained: 88,
      totalMarksMaximum: 100,
    },
    {
      courseCode: "21CSC205J",
      courseType: "Integrated",
      summary: "84/100",
      assessments: [
        { title: "Cycle Test 1", obtainedMarks: "20", maximumMarks: "25" },
        { title: "Cycle Test 2", obtainedMarks: "22", maximumMarks: "25" },
        { title: "Surprise Test", obtainedMarks: "8", maximumMarks: "10" },
        { title: "Lab Assignment", obtainedMarks: "34", maximumMarks: "40" },
      ],
      totalMarksObtained: 84,
      totalMarksMaximum: 100,
    },
    {
      courseCode: "21MTH202B",
      courseType: "Theory",
      summary: "42/50",
      assessments: [
        { title: "Cycle Test 1", obtainedMarks: "21", maximumMarks: "25" },
        { title: "Cycle Test 2", obtainedMarks: "21", maximumMarks: "25" },
      ],
      totalMarksObtained: 42,
      totalMarksMaximum: 50,
    },
    {
      courseCode: "21CSC206T",
      courseType: "Theory",
      summary: "45/50",
      assessments: [
        { title: "Cycle Test 1", obtainedMarks: "23", maximumMarks: "25" },
        { title: "Cycle Test 2", obtainedMarks: "22", maximumMarks: "25" },
      ],
      totalMarksObtained: 45,
      totalMarksMaximum: 50,
    },
    {
      courseCode: "21CSC207P",
      courseType: "Practical",
      summary: "44/50",
      assessments: [
        { title: "Model Practical", obtainedMarks: "44", maximumMarks: "50" },
      ],
      totalMarksObtained: 44,
      totalMarksMaximum: 50,
    },
  ];

  const courses: CourseCatalogEntry[] = [
    {
      courseCode: "21CSC204J",
      courseTitle: "Design and Analysis of Algorithms",
      credits: "4.0",
      slots: [
        {
          slotCode: "A1",
          slotType: "Theory",
          rawType: "Integrated",
          faculty: "Dr. K. Senthil Kumar",
          room: "TP701",
          slotLabel: "A1",
        },
        {
          slotCode: "L1",
          slotType: "Practical",
          rawType: "Integrated",
          faculty: "Dr. K. Senthil Kumar",
          room: "UB603 LAB",
          slotLabel: "L1",
        },
      ],
    },
    {
      courseCode: "21CSC205J",
      courseTitle: "Operating Systems",
      credits: "4.0",
      slots: [
        {
          slotCode: "B1",
          slotType: "Theory",
          rawType: "Integrated",
          faculty: "Dr. M. Deepa",
          room: "TP702",
          slotLabel: "B1",
        },
        {
          slotCode: "L2",
          slotType: "Practical",
          rawType: "Integrated",
          faculty: "Dr. M. Deepa",
          room: "UB604 LAB",
          slotLabel: "L2",
        },
      ],
    },
    {
      courseCode: "21MTH202B",
      courseTitle: "Probability and Queuing Theory",
      credits: "4.0",
      slots: [
        {
          slotCode: "C1",
          slotType: "Theory",
          rawType: "Theory",
          faculty: "Dr. R. Varalakshmi",
          room: "TP701",
          slotLabel: "C1",
        },
      ],
    },
    {
      courseCode: "21CSC206T",
      courseTitle: "Database Management Systems",
      credits: "3.0",
      slots: [
        {
          slotCode: "D1",
          slotType: "Theory",
          rawType: "Theory",
          faculty: "Dr. V. Rajesh",
          room: "TP703",
          slotLabel: "D1",
        },
      ],
    },
    {
      courseCode: "21CSC207P",
      courseTitle: "Web Programming Laboratory",
      credits: "2.0",
      slots: [
        {
          slotCode: "P1",
          slotType: "Practical",
          rawType: "Practical",
          faculty: "Mrs. S. Radhika",
          room: "UB502 LAB",
          slotLabel: "P1",
        },
      ],
    },
    {
      courseCode: "21LEM101T",
      courseTitle: "Constitution of India",
      credits: "1.0",
      slots: [
        {
          slotCode: "E1",
          slotType: "Theory",
          rawType: "Theory",
          faculty: "Dr. S. Annamalai",
          room: "TP701",
          slotLabel: "E1",
        },
      ],
    },
  ];

  const schedule: ScheduleDay[] = [
    {
      dayLabel: "Day 1",
      entries: [
        {
          slotCode: "A1",
          courseCode: "21CSC204J",
          courseTitle: "Design and Analysis of Algorithms",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP701",
          faculty: "Dr. K. Senthil Kumar",
          timeLabel: "08:00 - 08:50",
          startTime: "08:00",
          endTime: "08:50",
        },
        {
          slotCode: "B1",
          courseCode: "21CSC205J",
          courseTitle: "Operating Systems",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP702",
          faculty: "Dr. M. Deepa",
          timeLabel: "08:55 - 09:45",
          startTime: "08:55",
          endTime: "09:45",
        },
        {
          slotCode: "C1",
          courseCode: "21MTH202B",
          courseTitle: "Probability and Queuing Theory",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP701",
          faculty: "Dr. R. Varalakshmi",
          timeLabel: "10:00 - 10:50",
          startTime: "10:00",
          endTime: "10:50",
        },
        {
          slotCode: "D1",
          courseCode: "21CSC206T",
          courseTitle: "Database Management Systems",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP703",
          faculty: "Dr. V. Rajesh",
          timeLabel: "10:55 - 11:45",
          startTime: "10:55",
          endTime: "11:45",
        },
      ],
    },
    {
      dayLabel: "Day 2",
      entries: [
        {
          slotCode: "E1",
          courseCode: "21LEM101T",
          courseTitle: "Constitution of India",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP701",
          faculty: "Dr. S. Annamalai",
          timeLabel: "08:00 - 08:50",
          startTime: "08:00",
          endTime: "08:50",
        },
        {
          slotCode: "A1",
          courseCode: "21CSC204J",
          courseTitle: "Design and Analysis of Algorithms",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP701",
          faculty: "Dr. K. Senthil Kumar",
          timeLabel: "08:55 - 09:45",
          startTime: "08:55",
          endTime: "09:45",
        },
        {
          slotCode: "P1",
          courseCode: "21CSC207P",
          courseTitle: "Web Programming Laboratory",
          slotType: "Practical",
          rawType: "Practical",
          room: "UB502 LAB",
          faculty: "Mrs. S. Radhika",
          timeLabel: "10:00 - 11:45",
          startTime: "10:00",
          endTime: "11:45",
        },
      ],
    },
    {
      dayLabel: "Day 3",
      entries: [
        {
          slotCode: "B1",
          courseCode: "21CSC205J",
          courseTitle: "Operating Systems",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP702",
          faculty: "Dr. M. Deepa",
          timeLabel: "08:00 - 08:50",
          startTime: "08:00",
          endTime: "08:50",
        },
        {
          slotCode: "C1",
          courseCode: "21MTH202B",
          courseTitle: "Probability and Queuing Theory",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP701",
          faculty: "Dr. R. Varalakshmi",
          timeLabel: "08:55 - 09:45",
          startTime: "08:55",
          endTime: "09:45",
        },
        {
          slotCode: "L1",
          courseCode: "21CSC204J",
          courseTitle: "Design and Analysis of Algorithms",
          slotType: "Practical",
          rawType: "Integrated",
          room: "UB603 LAB",
          faculty: "Dr. K. Senthil Kumar",
          timeLabel: "10:00 - 11:45",
          startTime: "10:00",
          endTime: "11:45",
        },
      ],
    },
    {
      dayLabel: "Day 4",
      entries: [
        {
          slotCode: "D1",
          courseCode: "21CSC206T",
          courseTitle: "Database Management Systems",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP703",
          faculty: "Dr. V. Rajesh",
          timeLabel: "08:00 - 08:50",
          startTime: "08:00",
          endTime: "08:50",
        },
        {
          slotCode: "A1",
          courseCode: "21CSC204J",
          courseTitle: "Design and Analysis of Algorithms",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP701",
          faculty: "Dr. K. Senthil Kumar",
          timeLabel: "08:55 - 09:45",
          startTime: "08:55",
          endTime: "09:45",
        },
        {
          slotCode: "L2",
          courseCode: "21CSC205J",
          courseTitle: "Operating Systems",
          slotType: "Practical",
          rawType: "Integrated",
          room: "UB604 LAB",
          faculty: "Dr. M. Deepa",
          timeLabel: "10:00 - 11:45",
          startTime: "10:00",
          endTime: "11:45",
        },
      ],
    },
    {
      dayLabel: "Day 5",
      entries: [
        {
          slotCode: "C1",
          courseCode: "21MTH202B",
          courseTitle: "Probability and Queuing Theory",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP701",
          faculty: "Dr. R. Varalakshmi",
          timeLabel: "08:00 - 08:50",
          startTime: "08:00",
          endTime: "08:50",
        },
        {
          slotCode: "B1",
          courseCode: "21CSC205J",
          courseTitle: "Operating Systems",
          slotType: "Theory",
          rawType: "Integrated",
          room: "TP702",
          faculty: "Dr. M. Deepa",
          timeLabel: "08:55 - 09:45",
          startTime: "08:55",
          endTime: "09:45",
        },
        {
          slotCode: "D1",
          courseCode: "21CSC206T",
          courseTitle: "Database Management Systems",
          slotType: "Theory",
          rawType: "Theory",
          room: "TP703",
          faculty: "Dr. V. Rajesh",
          timeLabel: "10:00 - 10:50",
          startTime: "10:00",
          endTime: "10:50",
        },
      ],
    },
  ];

  // Dynamic calendar centered around current date
  const now = new Date();
  const year = now.getFullYear();
  const currentMonthIdx = now.getMonth() + 1;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const months = [-1, 0, 1].map((offset) => {
    let m = currentMonthIdx + offset;
    let y = year;
    if (m < 1) {
      m += 12;
      y -= 1;
    } else if (m > 12) {
      m -= 12;
      y += 1;
    }
    const daysInMonth = new Date(y, m, 0).getDate();
    const entries = [];
    let dayOrderCounter = 1;

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m - 1, d);
      const isSunday = dt.getDay() === 0;
      const isSaturday = dt.getDay() === 6;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short" });

      if (isSunday) {
        entries.push({
          date: dateStr,
          day: dayName,
          title: "Sunday Holiday",
          dayOrder: null,
          category: "holiday" as const,
          month: monthNames[m - 1].slice(0, 3),
          monthIndex: m,
          rawMonthLabel: `${monthNames[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
        });
      } else if (isSaturday && (d === 8 || d === 22)) {
        entries.push({
          date: dateStr,
          day: dayName,
          title: "Second/Fourth Saturday",
          dayOrder: null,
          category: "holiday" as const,
          month: monthNames[m - 1].slice(0, 3),
          monthIndex: m,
          rawMonthLabel: `${monthNames[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
        });
      } else if (d === 15) {
        entries.push({
          date: dateStr,
          day: dayName,
          title: "Campus Tech Fest / Event",
          dayOrder: null,
          category: "event" as const,
          month: monthNames[m - 1].slice(0, 3),
          monthIndex: m,
          rawMonthLabel: `${monthNames[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
        });
      } else {
        const doNum = dayOrderCounter;
        dayOrderCounter = dayOrderCounter >= 5 ? 1 : dayOrderCounter + 1;
        entries.push({
          date: dateStr,
          day: dayName,
          title: null,
          dayOrder: String(doNum),
          category: "working-day" as const,
          month: monthNames[m - 1].slice(0, 3),
          monthIndex: m,
          rawMonthLabel: `${monthNames[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
        });
      }
    }

    return {
      month: monthNames[m - 1].slice(0, 3),
      monthIndex: m,
      year: y,
      label: `${monthNames[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
      entries,
    };
  });

  const calendar: AcademicCalendar = {
    plannerType: currentMonthIdx >= 7 ? "ODD" : "EVEN",
    academicYearLabel: `${year}-${String(year + 1).slice(2)}`,
    sourcePage: "Academic_Planner_2025_26",
    months,
  };

  return {
    success: true,
    profile,
    attendance,
    marks,
    schedule,
    courses,
    calendar,
    session: {
      cookies: {
        JSESSIONID: "DEMO_SESSION_ID_XYZ",
        _zcsrf: "DEMO_CSRF_TOKEN",
      },
    },
    metadata: {
      loginBy: "demo" as const,
      academiaResponseTime: {
        login: 120,
        profile: 85,
        attendance: 140,
        timetable: 110,
        calendar: 95,
      },
    },
  };
}
