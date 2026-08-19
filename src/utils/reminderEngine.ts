import { todayISO, findEntryForDate, allEntries } from './calendar.js';

export interface ClassReminderItem {
  id: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  startTime: string;
  endTime: string;
  faculty?: string;
  slotType?: string;
  slotName?: string;
  startMinutes: number;
  endMinutes: number;
  startsInMinutes: number;
  startsInSeconds: number;
  formattedStartsIn: string;
  isOngoing: boolean;
  dayLabel: string;
  dayOrder?: string | number;
}

export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  } else if (!meridiem) {
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }
  return hours * 60 + minutes;
}

export function formatTimeFromMinutes(totalMinutes: number): string {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Starts now';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (m < 60) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function extractDayNumber(dayLabel: any): string {
  const match = String(dayLabel || '').match(/\d+/);
  return match ? match[0] : String(dayLabel || '');
}

/**
 * Returns all classes scheduled for today with exact minute timestamps.
 */
export function getTodaysScheduledClasses(schedule: any[] = [], calendar: any): ClassReminderItem[] {
  const today = todayISO();
  const todayEntry = findEntryForDate(calendar, today);
  const todayDayOrder = todayEntry?.dayOrder || 1; // Fallback to Day 1 if weekend/holiday for test preview

  const todaysDayObj = schedule.find(
    (d) => extractDayNumber(d.dayLabel) === String(todayDayOrder)
  ) || schedule[0];

  if (!todaysDayObj || !todaysDayObj.entries) return [];

  const now = new Date();
  const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const items: ClassReminderItem[] = [];

  for (let i = 0; i < todaysDayObj.entries.length; i++) {
    const c = todaysDayObj.entries[i];
    const startMin = parseTimeToMinutes(c.startTime);
    if (startMin == null) continue;
    const endMin = parseTimeToMinutes(c.endTime) || startMin + 50;

    const startSeconds = startMin * 60;
    const diffSeconds = startSeconds - currentTotalSeconds;
    const diffMinutes = startMin - currentMinutes;

    const isOngoing = currentMinutes >= startMin && currentMinutes < endMin;

    items.push({
      id: `${c.courseCode}_${c.startTime}_${i}`,
      courseCode: c.courseCode || 'COURSE',
      courseTitle: c.courseTitle || c.courseCode || 'Class Lecture',
      room: c.room || 'TBA',
      startTime: c.startTime,
      endTime: c.endTime || formatTimeFromMinutes(endMin),
      faculty: c.faculty,
      slotType: c.slotType,
      slotName: c.slotName,
      startMinutes: startMin,
      endMinutes: endMin,
      startsInMinutes: diffMinutes,
      startsInSeconds: diffSeconds,
      formattedStartsIn: formatCountdown(diffSeconds),
      isOngoing,
      dayLabel: todaysDayObj.dayLabel || `Day ${todayDayOrder}`,
      dayOrder: todayDayOrder,
    });
  }

  // Sort chronologically
  items.sort((a, b) => a.startMinutes - b.startMinutes);
  return items;
}

/**
 * Returns upcoming class reminders matching the lead threshold (e.g. 15 minutes before class).
 */
export function getActiveReminders(
  schedule: any[] = [],
  calendar: any,
  leadMinutes: number = 15
): ClassReminderItem[] {
  const classes = getTodaysScheduledClasses(schedule, calendar);
  const now = new Date();
  const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const leadSeconds = leadMinutes * 60;

  return classes.filter((c) => {
    const diffSeconds = c.startMinutes * 60 - currentTotalSeconds;
    // Reminder active if starts within leadMinutes (and not ended yet)
    return diffSeconds <= leadSeconds && diffSeconds > -300; // Keep visible up to 5 mins into class
  });
}
