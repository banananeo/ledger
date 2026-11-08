import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { TodoDraft, TodoItem } from '../types';
import { MAX_TASKS, createTodoId, kindLabel, normalizeDraft } from '../utils/todo.ts';
import {
  TODOS_STORAGE_KEY,
  loadReminderLog,
  loadTodos,
  saveReminderLog,
  saveTodos,
} from '../utils/todoStorage.ts';
import { todayISO } from '../utils/calendar.js';
import { useNotifications } from './NotificationContext.tsx';
import { sendMobileClassNotification } from '../utils/mobilePush.ts';

interface TodoContextType {
  todos: TodoItem[];
  storageError: string | null;
  dismissStorageError: () => void;
  addTodo: (draft: TodoDraft) => TodoItem | null;
  updateTodo: (id: string, draft: TodoDraft) => boolean;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  clearCompleted: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const STORAGE_WARNING =
  'Tasks are stored for this session only — browser storage is unavailable or full.';

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodos());
  const [storageError, setStorageError] = useState<string | null>(null);

  // Latest values for stable callbacks/intervals.
  const todosRef = useRef<TodoItem[]>(todos);
  todosRef.current = todos;

  const { notificationsEnabled, soundEnabled } = useNotifications();
  const notificationsEnabledRef = useRef(notificationsEnabled);
  notificationsEnabledRef.current = notificationsEnabled;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Persist on change; the initial hydration read is never written back.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    if (!saveTodos(todos)) setStorageError(STORAGE_WARNING);
  }, [todos]);

  // Keep two open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TODOS_STORAGE_KEY) return;
      setTodos(loadTodos());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addTodo = useCallback((draft: TodoDraft): TodoItem | null => {
    const clean = normalizeDraft(draft);
    if (!clean.title) return null;
    if (todosRef.current.length >= MAX_TASKS) return null;

    const todo: TodoItem = {
      id: createTodoId(),
      title: clean.title,
      dueDate: clean.dueDate,
      kind: clean.kind,
      priority: clean.priority,
      courseCode: clean.courseCode,
      notes: clean.notes,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTodos((prev) => [todo, ...prev]);
    return todo;
  }, []);

  const updateTodo = useCallback((id: string, draft: TodoDraft): boolean => {
    const clean = normalizeDraft(draft);
    if (!clean.title) return false;
    if (!todosRef.current.some((todo) => todo.id === id)) return false;
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, ...clean } : todo)));
    return true;
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.id !== id) return todo;
        const completed = !todo.completed;
        return { ...todo, completed, completedAt: completed ? new Date().toISOString() : null };
      }),
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  }, []);

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  // Due-today reminders reuse the class-reminder notification pipeline.
  useEffect(() => {
    const checkDueTasks = () => {
      if (!notificationsEnabledRef.current) return;

      const today = todayISO();
      const due = todosRef.current.filter((todo) => !todo.completed && todo.dueDate === today);
      if (due.length === 0) return;

      const log = loadReminderLog();
      const notified = new Set(log[today] || []);
      let changed = false;

      for (const todo of due) {
        if (notified.has(todo.id)) continue;

        const details = [kindLabel(todo.kind)];
        if (todo.courseCode) details.push(todo.courseCode);
        if (todo.notes) details.push(todo.notes.replace(/\s+/g, ' ').slice(0, 100));

        void sendMobileClassNotification({
          title: `📚 Due today: ${todo.title}`,
          body: `${details.join(' · ')} · Open Ledger → Academic Calendar`,
          tag: `ledger-todo-${todo.id}`,
          data: { url: '/?view=calendar', view: 'calendar' },
          playSound: soundEnabledRef.current,
          vibrate: true,
        }).catch(() => {
          // Notifications are best-effort.
        });

        notified.add(todo.id);
        changed = true;
      }

      if (changed) saveReminderLog({ ...log, [today]: [...notified] });
    };

    checkDueTasks();
    const interval = window.setInterval(checkDueTasks, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const value = useMemo<TodoContextType>(
    () => ({
      todos,
      storageError,
      dismissStorageError,
      addTodo,
      updateTodo,
      toggleTodo,
      deleteTodo,
      clearCompleted,
    }),
    [todos, storageError, dismissStorageError, addTodo, updateTodo, toggleTodo, deleteTodo, clearCompleted],
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
}
