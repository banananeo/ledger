const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Every calendar entry across every month, sorted by date.
export function allEntries(calendar) {
  return (calendar?.months || [])
    .flatMap((m) => m.entries)
    .filter((e) => e.category !== "empty")
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findEntryForDate(calendar, dateStr) {
  for (const month of calendar?.months || []) {
    const hit = month.entries.find((e) => e.date === dateStr);
    if (hit) return hit;
  }
  return null;
}

// Index of the month containing `dateStr`, else 0.
export function monthIndexForDate(months, dateStr) {
  const idx = (months || []).findIndex((m) => m.entries.some((e) => e.date === dateStr));
  return idx >= 0 ? idx : 0;
}

// Sun-first week grid for a given month object, padded with nulls.
export function buildMonthGrid(month) {
  if (!month) return { weeks: [], weekdays: WEEKDAYS };
  const byDate = new Map(month.entries.map((e) => [e.date, e]));
  const first = new Date(month.year, month.monthIndex - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(month.year, month.monthIndex, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month.year}-${String(month.monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(
      byDate.get(date) || {
        date,
        day: "",
        title: null,
        category: "empty",
        dayOrder: null,
      },
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, weekdays: WEEKDAYS };
}

export function monthLabel(month) {
  if (!month) return "";
  const names = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };
  return `${names[month.monthIndex] || month.label} ${month.year}`;
}
