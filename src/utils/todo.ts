import type { TodoDraft, TodoFilter, TodoItem, TodoKind, TodoPriority } from '../types';

export const MAX_TASKS = 500;
export const MAX_TITLE_LENGTH = 140;
export const MAX_NOTES_LENGTH = 500;
export const MAX_COURSE_CODE_LENGTH = 32;

export const KIND_OPTIONS: Array<{ value: TodoKind; label: string }> = [
  { value: 'exam', label: 'Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'other', label: 'Other' },
];

export const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const KINDS = new Set<string>(KIND_OPTIONS.map((option) => option.value));
const PRIORITIES = new Set<string>(PRIORITY_OPTIONS.map((option) => option.value));

export interface TodoStats {
  open: number;
  dueToday: number;
  overdue: number;
  completed: number;
  total: number;
}

export function kindLabel(kind: TodoKind): string {
  return KIND_OPTIONS.find((option) => option.value === kind)?.label || 'Task';
}

export function priorityLabel(priority: TodoPriority): string {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || 'Medium';
}

export function createTodoId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the timestamp based id below.
  }
  return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parses a YYYY-MM-DD string as a local date (never UTC). */
export function parseISODate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function isValidDateStr(value: unknown): value is string {
  return parseISODate(value) !== null;
}

/** Whole-day difference from `fromISO` to `toISO` (positive when `toISO` is later). */
export function dayDiff(fromISO: string, toISO: string): number | null {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  if (!from || !to) return null;
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

export function formatDueDate(dateStr: string, today: string): string {
  const date = parseISODate(dateStr);
  const todayDate = parseISODate(today);
  if (!date) return 'No date';
  const options: Intl.DateTimeFormatOptions =
    todayDate && date.getFullYear() === todayDate.getFullYear()
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function relativeDueLabel(dateStr: string | null, today: string): string {
  if (!dateStr) return 'No date';
  const diff = dayDiff(today, dateStr);
  if (diff == null) return 'No date';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 7) return `in ${diff} days`;
  if (diff < -1 && diff >= -7) return `${-diff} days overdue`;
  return formatDueDate(dateStr, today);
}

export function isDueToday(todo: TodoItem, today: string): boolean {
  return !todo.completed && todo.dueDate === today;
}

export function isOverdue(todo: TodoItem, today: string): boolean {
  return !todo.completed && Boolean(todo.dueDate) && String(todo.dueDate) < today;
}

export function todoStats(todos: TodoItem[], today: string): TodoStats {
  const stats: TodoStats = { open: 0, dueToday: 0, overdue: 0, completed: 0, total: todos.length };
  for (const todo of todos) {
    if (todo.completed) {
      stats.completed += 1;
      continue;
    }
    stats.open += 1;
    if (isDueToday(todo, today)) stats.dueToday += 1;
    if (isOverdue(todo, today)) stats.overdue += 1;
  }
  return stats;
}

function compareDueAsc(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function compareDueDesc(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

function priorityRank(priority: TodoPriority): number {
  if (priority === 'high') return 0;
  if (priority === 'low') return 2;
  return 1;
}

/** Open tasks first by due date (undated last), then priority; completed tasks last. */
export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    if (a.completed) {
      const dueCmp = compareDueDesc(a.dueDate, b.dueDate);
      if (dueCmp !== 0) return dueCmp;
      return String(b.completedAt || '').localeCompare(String(a.completedAt || ''));
    }

    const dueCmp = compareDueAsc(a.dueDate, b.dueDate);
    if (dueCmp !== 0) return dueCmp;

    const priorityCmp = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityCmp !== 0) return priorityCmp;

    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

export function matchesFilter(todo: TodoItem, filter: TodoFilter, today: string): boolean {
  switch (filter) {
    case 'today':
      return isDueToday(todo, today);
    case 'overdue':
      return isOverdue(todo, today);
    case 'done':
      return todo.completed;
    case 'all':
      return true;
    case 'open':
    default:
      return !todo.completed;
  }
}

export function filterTodos(todos: TodoItem[], filter: TodoFilter, today: string): TodoItem[] {
  return sortTodos(todos.filter((todo) => matchesFilter(todo, filter, today)));
}

/** Open tasks grouped by due date, for calendar grid markers. */
export function tasksByDate(todos: TodoItem[]): Map<string, TodoItem[]> {
  const map = new Map<string, TodoItem[]>();
  for (const todo of todos) {
    if (todo.completed || !todo.dueDate) continue;
    const bucket = map.get(todo.dueDate);
    if (bucket) bucket.push(todo);
    else map.set(todo.dueDate, [todo]);
  }
  return map;
}

export function normalizeDraft(draft: Partial<TodoDraft> | null | undefined): TodoDraft {
  const source = draft || {};
  const kind = typeof source.kind === 'string' && KINDS.has(source.kind) ? (source.kind as TodoKind) : 'assignment';
  const priority =
    typeof source.priority === 'string' && PRIORITIES.has(source.priority)
      ? (source.priority as TodoPriority)
      : 'medium';

  return {
    title: String(source.title ?? '').trim().slice(0, MAX_TITLE_LENGTH),
    dueDate: isValidDateStr(source.dueDate) ? source.dueDate : null,
    kind,
    priority,
    courseCode: String(source.courseCode ?? '').trim().slice(0, MAX_COURSE_CODE_LENGTH),
    notes: String(source.notes ?? '').slice(0, MAX_NOTES_LENGTH),
  };
}

/** Validates a stored record, returning null when it cannot be salvaged. */
export function sanitizeTodo(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : '';
  const title = typeof record.title === 'string' ? record.title.trim().slice(0, MAX_TITLE_LENGTH) : '';
  if (!id || !title) return null;

  const kind = typeof record.kind === 'string' && KINDS.has(record.kind) ? (record.kind as TodoKind) : 'assignment';
  const priority =
    typeof record.priority === 'string' && PRIORITIES.has(record.priority)
      ? (record.priority as TodoPriority)
      : 'medium';

  return {
    id,
    title,
    dueDate: isValidDateStr(record.dueDate) ? record.dueDate : null,
    kind,
    priority,
    courseCode: typeof record.courseCode === 'string' ? record.courseCode.trim().slice(0, MAX_COURSE_CODE_LENGTH) : '',
    notes: typeof record.notes === 'string' ? record.notes.slice(0, MAX_NOTES_LENGTH) : '',
    completed: record.completed === true,
    createdAt: typeof record.createdAt === 'string' && record.createdAt ? record.createdAt : new Date().toISOString(),
    completedAt: typeof record.completedAt === 'string' && record.completedAt ? record.completedAt : null,
  };
}
