import React, { useId, useMemo, useState } from 'react';
import { ListTodoIcon, PlusIcon, TrashIcon, PencilIcon, XIcon } from '../Icons.jsx';
import { useNotifications } from '../../../context/NotificationContext.tsx';
import { useTodos } from '../../../context/TodoContext.tsx';
import { todayISO } from '../../../utils/calendar.js';
import {
  KIND_OPTIONS,
  MAX_NOTES_LENGTH,
  MAX_TASKS,
  MAX_TITLE_LENGTH,
  PRIORITY_OPTIONS,
  filterTodos,
  formatDueDate,
  isDueToday,
  isOverdue,
  isValidDateStr,
  kindLabel,
  priorityLabel,
  relativeDueLabel,
  sortTodos,
  todoStats,
} from '../../../utils/todo.ts';
import './CalendarTasks.css';

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

const EMPTY_MESSAGES = {
  open: 'No open tasks yet — add your first exam or assignment.',
  today: 'Nothing due today.',
  overdue: 'Nothing overdue. Nicely done.',
  done: 'No completed tasks yet.',
  all: 'No tasks yet — add your first exam or assignment.',
};

function TaskForm({ initial, courses, submitLabel, onSubmit, onCancel }) {
  const uid = useId();
  const [title, setTitle] = useState(initial?.title || '');
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [kind, setKind] = useState(initial?.kind || 'assignment');
  const [priority, setPriority] = useState(initial?.priority || 'medium');
  const [courseCode, setCourseCode] = useState(initial?.courseCode || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Enter a task title.');
      return;
    }
    if (!dueDate) {
      setError('Pick a due date.');
      return;
    }
    if (!isValidDateStr(dueDate)) {
      setError('Pick a valid due date.');
      return;
    }
    const failure = onSubmit({ title: cleanTitle, dueDate, kind, priority, courseCode, notes });
    if (failure) setError(failure);
  };

  return (
    <form
      className="ctasks__form"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
      noValidate
    >
      <p className="ctasks__form-title">{initial?.id ? 'Edit task' : 'New task'}</p>
      <div className="ctasks__form-grid">
        <div className="ctasks__field ctasks__field--wide">
          <label className="ctasks__label" htmlFor={`${uid}-title`}>Task</label>
          <input
            id={`${uid}-title`}
            className="ctasks__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. DBMS internal exam — Units 1–3"
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
            required
          />
        </div>

        <div className="ctasks__field ctasks__field--date">
          <label className="ctasks__label" htmlFor={`${uid}-date`}>Due date</label>
          <input
            id={`${uid}-date`}
            className="ctasks__input num"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </div>

        <div className="ctasks__field">
          <label className="ctasks__label" htmlFor={`${uid}-kind`}>Type</label>
          <select id={`${uid}-kind`} className="ctasks__input" value={kind} onChange={(event) => setKind(event.target.value)}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="ctasks__field">
          <label className="ctasks__label" htmlFor={`${uid}-priority`}>Priority</label>
          <select id={`${uid}-priority`} className="ctasks__input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {courses.length > 0 && (
          <div className="ctasks__field ctasks__field--wide">
            <label className="ctasks__label" htmlFor={`${uid}-course`}>Course (optional)</label>
            <select id={`${uid}-course`} className="ctasks__input" value={courseCode} onChange={(event) => setCourseCode(event.target.value)}>
              <option value="">No course</option>
              {courses.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.title ? `${course.code} — ${course.title}` : course.code}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ctasks__field ctasks__field--wide">
          <label className="ctasks__label" htmlFor={`${uid}-notes`}>Notes (optional)</label>
          <textarea
            id={`${uid}-notes`}
            className="ctasks__input"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Room, syllabus, submission link…"
            maxLength={MAX_NOTES_LENGTH}
          />
        </div>
      </div>

      {error && <p className="ctasks__form-error" role="alert">{error}</p>}

      <div className="ctasks__form-actions">
        <button className="bbtn" type="submit">{submitLabel}</button>
        <button className="bbtn bbtn--outline" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function TaskRow({ todo, today, onEdit }) {
  const { toggleTodo, deleteTodo } = useTodos();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const overdue = isOverdue(todo, today);
  const dueToday = isDueToday(todo, today);
  const dueTone = todo.completed
    ? 'ctasks__due--done'
    : overdue
      ? 'ctasks__due--overdue'
      : dueToday
        ? 'ctasks__due--today'
        : '';
  const dueLabel = todo.completed
    ? todo.dueDate ? formatDueDate(todo.dueDate, today) : 'No date'
    : relativeDueLabel(todo.dueDate, today);
  const priorityTone = todo.priority === 'high' ? ' bchip--danger' : todo.priority === 'medium' ? ' bchip--warning' : '';

  return (
    <li className={`ctasks__row ctasks__row--priority-${todo.priority}${todo.completed ? ' ctasks__row--done' : ''}`}>
      <label className="ctasks__check">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo(todo.id)}
          aria-label={todo.completed ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
        />
      </label>

      <div className="ctasks__row-main">
        <div className="ctasks__row-titleline">
          <span className="ctasks__row-title">{todo.title}</span>
        </div>
        <div className="ctasks__row-meta">
          <span className={`ctasks__due ${dueTone}`}>{dueLabel}</span>
          <span className="bchip ctasks__chip">{kindLabel(todo.kind)}</span>
          <span className={`bchip ctasks__chip${priorityTone}`}>{priorityLabel(todo.priority)}</span>
          {todo.courseCode && <span className="bchip ctasks__chip num">{todo.courseCode}</span>}
        </div>
        {todo.notes && <p className="ctasks__row-notes">{todo.notes}</p>}
      </div>

      <div className={`ctasks__row-actions${confirmingDelete ? ' ctasks__row-actions--confirming' : ''}`}>
        {confirmingDelete ? (
          <>
            <button
              type="button"
              className="ctasks__icon-btn ctasks__icon-btn--danger ctasks__icon-btn--confirm"
              onClick={() => deleteTodo(todo.id)}
              aria-label={`Confirm delete "${todo.title}"`}
              title="Confirm delete"
            >
              <TrashIcon width={16} height={16} />
            </button>
            <button
              type="button"
              className="ctasks__icon-btn"
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancel delete"
              title="Cancel"
            >
              <XIcon width={16} height={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ctasks__icon-btn"
              onClick={() => onEdit(todo.id)}
              aria-label={`Edit "${todo.title}"`}
              title="Edit task"
            >
              <PencilIcon width={16} height={16} />
            </button>
            <button
              type="button"
              className="ctasks__icon-btn ctasks__icon-btn--danger"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete "${todo.title}"`}
              title="Delete task"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function DayTasks({ date }) {
  const { todos, toggleTodo } = useTodos();
  const dayTodos = useMemo(() => sortTodos(todos.filter((todo) => todo.dueDate === date)), [todos, date]);

  if (!date || dayTodos.length === 0) return null;
  const openCount = dayTodos.filter((todo) => !todo.completed).length;

  return (
    <div className="ctasks__day">
      <h5 className="ctasks__day-title">
        Your tasks · {openCount} open / {dayTodos.length}
      </h5>
      <ul className="ctasks__day-list">
        {dayTodos.map((todo) => (
          <li key={todo.id} className={`ctasks__day-row${todo.completed ? ' ctasks__day-row--done' : ''}`}>
            <label className="ctasks__day-label">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                aria-label={todo.completed ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
              />
              <span className="ctasks__day-title-text">{todo.title}</span>
              <span className="bchip ctasks__chip">{kindLabel(todo.kind)}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalendarTasks({ selectedDate, courses = [] }) {
  const today = todayISO();
  const { todos, storageError, dismissStorageError, addTodo, updateTodo, clearCompleted } = useTodos();
  const { notificationsEnabled, permission, requestPermission } = useNotifications();

  const [filter, setFilter] = useState('open');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const stats = useMemo(() => todoStats(todos, today), [todos, today]);
  const visible = useMemo(() => filterTodos(todos, filter, today), [todos, filter, today]);
  const editingTodo = useMemo(
    () => (editingId ? todos.find((todo) => todo.id === editingId) || null : null),
    [todos, editingId],
  );

  const courseOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    for (const course of courses || []) {
      const code = String(course?.courseCode || '').trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      options.push({ code, title: String(course?.courseTitle || '').trim() });
    }
    return options.sort((a, b) => a.code.localeCompare(b.code));
  }, [courses]);

  const counts = {
    open: stats.open,
    today: stats.dueToday,
    overdue: stats.overdue,
    done: stats.completed,
    all: stats.total,
  };

  const defaultDueDate = isValidDateStr(selectedDate) ? selectedDate : today;
  const canNotify = typeof window !== 'undefined' && 'Notification' in window;

  const openAddForm = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const startEditing = (id) => {
    setFormOpen(false);
    setEditingId(id);
  };

  const handleSave = (draft) => {
    if (editingTodo) {
      if (!updateTodo(editingTodo.id, draft)) return 'Could not save this task.';
    } else {
      if (!addTodo(draft)) return `You already have ${MAX_TASKS} tasks. Delete some to add more.`;
      if (filter === 'done' || filter === 'today' || filter === 'overdue') setFilter('open');
    }
    closeForm();
    return null;
  };

  return (
    <section className="bcard ctasks" aria-labelledby="ctasks-heading">
      <div className="ctasks__head">
        <div className="ctasks__head-left">
          <div className="ctasks__icon-badge">
            <ListTodoIcon width={20} height={20} />
          </div>
          <div>
            <p className="eyebrow">Personal To-Do</p>
            <h3 className="ctasks__title" id="ctasks-heading">My Tasks</h3>
            <p className="ctasks__sub">Exams, assignments and anything else you want to remember.</p>
          </div>
        </div>

        <div className="ctasks__head-right">
          <div className="ctasks__stats">
            <span className="bchip num">{stats.open} Open</span>
            {stats.dueToday > 0 && <span className="bchip bchip--warning num">{stats.dueToday} Today</span>}
            {stats.overdue > 0 && <span className="bchip bchip--danger num">{stats.overdue} Overdue</span>}
          </div>
          <button className="bbtn ctasks__add-btn" type="button" onClick={openAddForm}>
            <PlusIcon width={16} height={16} />
            <span>Add task</span>
          </button>
        </div>
      </div>

      {storageError && (
        <div className="ctasks__notice" role="status">
          <span>{storageError}</span>
          <button type="button" className="bbtn bbtn--outline ctasks__mini-btn" onClick={dismissStorageError}>
            Dismiss
          </button>
        </div>
      )}

      {notificationsEnabled && canNotify && permission !== 'granted' && (
        <div className="ctasks__notice ctasks__notice--soft" role="status">
          <span>Browser alerts are off — due-today tasks will only chime while Ledger is open.</span>
          <button
            type="button"
            className="bbtn bbtn--outline ctasks__mini-btn"
            onClick={() => { void requestPermission(); }}
          >
            Enable alerts
          </button>
        </div>
      )}

      {formOpen && !editingTodo && (
        <TaskForm
          key="new"
          initial={{ dueDate: defaultDueDate, kind: 'assignment', priority: 'medium', courseCode: '', notes: '', title: '' }}
          courses={courseOptions}
          submitLabel="Add task"
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      )}

      {editingTodo && (
        <TaskForm
          key={editingTodo.id}
          initial={editingTodo}
          courses={courseOptions}
          submitLabel="Save task"
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      )}

      <div className="ctasks__toolbar">
        <div className="ctasks__filters" role="group" aria-label="Filter tasks">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`ctasks__filter${filter === option.id ? ' ctasks__filter--active' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              <span>{option.label}</span>
              <span className="num ctasks__filter-count">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        {stats.completed > 0 && (
          <button type="button" className="ctasks__clear" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="ctasks__empty" role="status">
          <p>{EMPTY_MESSAGES[filter] || EMPTY_MESSAGES.all}</p>
          {(filter === 'open' || filter === 'all') && (
            <button type="button" className="bbtn ctasks__empty-btn" onClick={openAddForm}>
              <PlusIcon width={16} height={16} />
              <span>Add a task</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="ctasks__list">
            {visible.map((todo) => (
              <TaskRow key={todo.id} todo={todo} today={today} onEdit={startEditing} />
            ))}
          </ul>
          {!formOpen && !editingTodo && (
            <button type="button" className="bbtn bbtn--outline ctasks__add-footer" onClick={openAddForm}>
              <PlusIcon width={16} height={16} />
              <span>Add another task</span>
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default CalendarTasks;
