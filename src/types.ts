export interface AttendanceRecord {
  courseCode: string;
  courseTitle: string;
  courseType: string;
  slot: string;
  classesConducted: number;
  classesAbsent: number;
  attendancePercentage: number;
}

export interface MarkAssessment {
  title: string;
  obtainedMarks: string;
  maximumMarks: string;
}

export interface MarkRecord {
  courseCode: string;
  courseType: string;
  summary: string;
  assessments: MarkAssessment[];
  totalMarksObtained: number | null;
  totalMarksMaximum: number | null;
}

export interface StudentProfile {
  name: string;
  registrationNumber: string;
  batch: string;
  semester: string;
  department: string;
  section: string;
  mobileNumber: string;
  program: string;
}

export interface CourseSlot {
  slotCode: string;
  slotType: string;
  rawType: string;
  faculty: string;
  room: string;
  slotLabel: string;
}

export interface CourseCatalogEntry {
  courseCode: string;
  courseTitle: string;
  credits: string;
  slots: CourseSlot[];
}

export interface ScheduleEntry {
  slotCode: string;
  courseCode: string;
  courseTitle: string;
  slotType: string;
  rawType: string;
  room: string;
  faculty: string;
  timeLabel: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleDay {
  dayLabel: string;
  entries: ScheduleEntry[];
}

export interface CalendarEntry {
  date: string;
  day: string;
  title: string | null;
  dayOrder: string | null;
  category: "event" | "working-day" | "holiday" | "empty";
  month: string;
  monthIndex: number;
  rawMonthLabel: string;
}

export interface CalendarMonth {
  month: string;
  monthIndex: number;
  year: number;
  label: string;
  entries: CalendarEntry[];
}

export interface AcademicCalendar {
  plannerType: "ODD" | "EVEN";
  academicYearLabel: string;
  sourcePage: string;
  months: CalendarMonth[];
}

export type TodoKind = "exam" | "assignment" | "quiz" | "project" | "reading" | "other";

export type TodoPriority = "high" | "medium" | "low";

export type TodoFilter = "open" | "today" | "overdue" | "done" | "all";

export interface TodoItem {
  id: string;
  title: string;
  /** Local calendar date (YYYY-MM-DD). Null only for legacy/corrupt stored items. */
  dueDate: string | null;
  kind: TodoKind;
  priority: TodoPriority;
  /** Course code linked from the Academia course catalog; empty when unlinked. */
  courseCode: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export type TodoDraft = Pick<
  TodoItem,
  "title" | "dueDate" | "kind" | "priority" | "courseCode" | "notes"
>;

export interface AppData {
  success: boolean;
  profile?: StudentProfile;
  attendance?: AttendanceRecord[];
  marks?: MarkRecord[];
  schedule?: ScheduleDay[];
  courses?: CourseCatalogEntry[];
  calendar?: AcademicCalendar;
  session?: {
    academiaCookies?: Record<string, string>;
    studentPortalCookies?: Record<string, string>;
    /** Legacy single-provider cookie shape; retained for stored-data migration. */
    cookies?: Record<string, string>;
  };
  metadata?: {
    loginBy?: "credentials" | "cookies" | "demo" | "student-portal";
    source?: "student-portal";
    studentPortalSkipped?: boolean;
    academiaResponseTime?: Record<string, number>;
  };
}
