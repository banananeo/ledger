import type { TodoItem } from '../types';
import { dayDiff, sanitizeTodo } from './todo.ts';
import { todayISO } from './calendar.js';

/**
 * Personal tasks are local to this device and intentionally NOT part of
 * clearStoredSession(): they are user-authored content, not session state.
 */
export const TODOS_STORAGE_KEY = 'ledger_todos_v1';

/** `{ "YYYY-MM-DD": ["todoId", ...] }` so a reminder never fires twice in a day. */
export const TODO_REMINDER_LOG_KEY = 'ledger_todo_reminders_v1';

const REMINDER_LOG_KEEP_DAYS = 7;

export type TodoReminderLog = Record<string, string[]>;

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadTodos(): TodoItem[] {
  const store = getStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(TODOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const todos: TodoItem[] = [];
    for (const entry of parsed) {
      const todo = sanitizeTodo(entry);
      if (todo) todos.push(todo);
    }
    return todos;
  } catch {
    return [];
  }
}

export function saveTodos(todos: TodoItem[]): boolean {
  const store = getStorage();
  if (!store) return false;
  try {
    store.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}

export function loadReminderLog(): TodoReminderLog {
  const store = getStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(TODO_REMINDER_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const log: TodoReminderLog = {};
    for (const [date, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(ids)) continue;
      log[date] = ids.filter((id): id is string => typeof id === 'string');
    }
    return log;
  } catch {
    return {};
  }
}

function pruneReminderLog(log: TodoReminderLog, today: string): TodoReminderLog {
  const pruned: TodoReminderLog = {};
  for (const [date, ids] of Object.entries(log)) {
    const age = dayDiff(date, today);
    if (age == null || age > REMINDER_LOG_KEEP_DAYS) continue;
    pruned[date] = ids;
  }
  return pruned;
}

export function saveReminderLog(log: TodoReminderLog): void {
  const store = getStorage();
  if (!store) return;
  try {
    const trimmed = pruneReminderLog(log, todayISO());
    store.setItem(TODO_REMINDER_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Reminder bookkeeping is best-effort; never break the dashboard over it.
  }
}
