import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState } from '../components/ui/LoadingState';
import { BreatherTimer } from '../components/planner/BreatherTimer';
import { useActiveTimeTracker } from '../hooks/useActiveTimeTracker';
import {
  CalendarCheck,
  Plus,
  CheckCircle,
  Circle,
  Trash2,
  Clock,
  Coffee,
  Info,
  Edit3,
  Bell,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { StudyTask, UserSettings } from '../types';

const CATEGORIES = ['All', 'Study', 'Reading', 'Revision', 'Assignment', 'Break'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];
type StatusFilter = 'all' | 'active' | 'completed';

const STARTER_PROMPTS = [
  { title: 'Review lecture slides for 25 mins', estimated_minutes: 25, category: 'Revision' },
  { title: 'Read textbook chapter section', estimated_minutes: 45, category: 'Reading' },
  { title: 'Outline next week’s study goals', estimated_minutes: 15, category: 'Study' },
  { title: 'Take a restful tea or stretch break', estimated_minutes: 10, category: 'Break' },
];

export const PlannerPage: React.FC = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const statusTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Add Task Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [category, setCategory] = useState<string>('Study');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Edit Task Dialog state
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<number>(25);
  const [editCategory, setEditCategory] = useState<string>('Study');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const breatherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [taskList, userSettings] = await Promise.allSettled([
          api.getTasks(),
          api.getSettings(),
        ]);

        if (taskList.status === 'fulfilled') {
          setTasks(taskList.value);
        }
        if (userSettings.status === 'fulfilled') {
          setSettings(userSettings.value);
        } else {
          setSettings({
            nickname: 'Student',
            break_reminders_enabled: true,
            reminder_interval_minutes: 45,
            share_anonymous_analytics: false,
            data_retention_days: 30,
          });
        }
      } catch {
        // Suppress client console leaks
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const {
    activeVisibleMinutes,
    isPromptVisible,
    dismissPrompt,
    snoozePrompt,
  } = useActiveTimeTracker({
    intervalMinutes: settings?.reminder_interval_minutes || 45,
    enabled: Boolean(settings?.break_reminders_enabled),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const newTask = await api.createTask({
        title: title.trim(),
        estimated_minutes: estimatedMinutes,
        category,
      });
      setTasks((prev) => [newTask, ...prev]);
      setTitle('');
      setShowAddForm(false);
    } catch {
      const localTask: StudyTask = {
        id: 'local-' + Date.now(),
        title: title.trim(),
        estimated_minutes: estimatedMinutes,
        category,
        completed: false,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [localTask, ...prev]);
      setTitle('');
      setShowAddForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddStarter = async (starter: (typeof STARTER_PROMPTS)[number]) => {
    try {
      const newTask = await api.createTask(starter);
      setTasks((prev) => [newTask, ...prev]);
    } catch {
      const localTask: StudyTask = {
        id: 'local-' + Date.now(),
        ...starter,
        completed: false,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [localTask, ...prev]);
    }
  };

  const handleToggle = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    try {
      await api.toggleTask(taskId);
    } catch {
      // Kept in optimistic state for resilience
    }
  };

  const handleDelete = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch {
      // Kept in optimistic state
    }
  };

  const handleOpenEdit = (task: StudyTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditMinutes(task.estimated_minutes);
    setEditCategory(task.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    setIsSavingEdit(true);
    const updatedPayload = {
      title: editTitle.trim(),
      estimated_minutes: editMinutes,
      category: editCategory,
    };

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id ? { ...t, ...updatedPayload } : t
      )
    );

    try {
      await api.updateTask(editingTask.id, updatedPayload);
      setEditingTask(null);
    } catch {
      setEditingTask(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'active' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, categoryFilter]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.length - completedCount;

  const statusTabs: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: `All (${tasks.length})` },
    { value: 'active', label: `Active (${activeCount})` },
    { value: 'completed', label: `Completed (${completedCount})` },
  ];

  const handleStatusTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % statusTabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + statusTabs.length) % statusTabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = statusTabs.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      setStatusFilter(statusTabs[nextIdx].value);
      statusTabRefs.current[nextIdx]?.focus();
    }
  };

  if (loading) {
    return <LoadingState message="Loading your study-life balance planner..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          tag="Study-Life Balance Planner"
          title="Intentional Pacing"
          description="Gentle structure without productivity anxiety. Small, consistent steps honor your focus and wellbeing."
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<Plus className="w-4 h-4" />}
          aria-expanded={showAddForm}
        >
          {showAddForm ? 'Close Form' : 'Add Study Session'}
        </Button>
      </div>

      {/* Foreground Pacing Prompt */}
      {isPromptVisible && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-card bg-[var(--color-surface-subtle)] border-2 border-[var(--color-lavender-border)] shadow-soft animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-main)]">
                Gentle Pacing Suggestion
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                You&apos;ve been actively focusing for ~{activeVisibleMinutes} minutes in Calmspace. Stepping away for a 5-minute pause can help rest your eyes and reset your attention.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                dismissPrompt();
                breatherRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              leftIcon={<Coffee className="w-4 h-4" />}
            >
              Take 5-min Breather
            </Button>
            <Button variant="outline" size="sm" onClick={() => snoozePrompt(15)}>
              Remind in 15m
            </Button>
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label="Dismiss pacing reminder"
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] rounded-button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5-Minute Breather Timer */}
      <div ref={breatherRef}>
        <BreatherTimer initialMinutes={5} />
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <Card padding="lg" className="border-2 border-[var(--color-lavender-border)] animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Plan a gentle study block
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              aria-label="Cancel adding study block"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                What would you like to focus on?
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read Chapter 4 of Organic Chemistry"
                className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-duration" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                  Estimated duration
                </label>
                <select
                  id="task-duration"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] text-sm text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value={15}>15 mins (Quick review)</option>
                  <option value={25}>25 mins (Pomodoro block)</option>
                  <option value={45}>45 mins (Deep read)</option>
                  <option value={60}>60 mins (Extended session)</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-category" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                  Session Category
                </label>
                <select
                  id="task-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] text-sm text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="Study">Study</option>
                  <option value="Reading">Reading</option>
                  <option value="Revision">Revision</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Break">Rest / Breather</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                Save Session Block
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Task Filters & Counts */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]">
          <div
            role="tablist"
            aria-label="Filter tasks by completion status"
            className="flex items-center gap-1 p-1 bg-[var(--color-surface)] rounded-button border border-[var(--color-border)] shadow-subtle shrink-0"
          >
            {statusTabs.map((tab, idx) => {
              const isSelected = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  ref={(el) => {
                    statusTabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setStatusFilter(tab.value)}
                  onKeyDown={(e) => handleStatusTabKeyDown(e, idx)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-button transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-primary-fill)] text-white shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter tasks by category"
            className="flex items-center gap-1.5 overflow-x-auto py-1"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[var(--color-urgent-bg)] text-[var(--color-urgent-text)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <Card padding="lg" className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] mx-auto">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-bold text-[var(--color-text-main)]">
                {tasks.length === 0 ? 'No study blocks scheduled right now' : 'No tasks match your selected filter'}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {tasks.length === 0
                  ? 'Plan a small, manageable block or pick a gentle starter below to get momentum without overwhelm.'
                  : 'Try switching your status or category filters above to view other planned tasks.'}
              </p>
            </div>

            {tasks.length === 0 && (
              <div className="pt-2 max-w-lg mx-auto">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">
                  Gentle Starter Ideas
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddStarter(prompt)}
                      className="px-3.5 py-2 text-sm font-medium rounded-full bg-[var(--color-surface)] border border-[var(--color-border-dark)] text-[var(--color-text-main)] hover:bg-[var(--color-lavender-light)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>{prompt.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-card border transition-all flex items-center justify-between gap-3 ${
                  task.completed
                    ? 'bg-[var(--color-bg)] border-[var(--color-border)] opacity-70'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-subtle hover:border-[var(--color-border-dark)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id)}
                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-transform active:scale-90 shrink-0"
                    aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as completed'}
                  >
                    {task.completed ? (
                      <CheckCircle className="w-5 h-5 text-[var(--color-sage-text)]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium block truncate ${
                        task.completed ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-main)]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-text-secondary)] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {task.estimated_minutes} mins
                      </span>
                      <span>•</span>
                      <span className="bg-[var(--color-lavender-soft)] text-[var(--color-primary)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {task.category}
                      </span>
                      {!task.completed && (
                        <span className="text-xs text-[var(--color-amber-text)] bg-[var(--color-amber-light)] px-2.5 py-0.5 rounded-full border border-[var(--color-amber-border)]">
                          Gentle pace • Take your time
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(task)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] p-2 rounded-button hover:bg-[var(--color-bg)] transition-colors"
                    aria-label={`Edit task: ${task.title}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-danger-text)] p-2 rounded-button hover:bg-[var(--color-danger-soft)] transition-colors"
                    aria-label={`Delete task: ${task.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Task Modal Dialog */}
      <Dialog
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit Study Block"
        description="Update your session focus, estimated time, or category."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 mt-3">
          <div>
            <label htmlFor="edit-task-title" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
              Task Focus
            </label>
            <input
              id="edit-task-title"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-task-duration" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Estimated duration
              </label>
              <select
                id="edit-task-duration"
                value={editMinutes}
                onChange={(e) => setEditMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] text-sm text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value={15}>15 mins (Quick review)</option>
                <option value={25}>25 mins (Pomodoro block)</option>
                <option value={45}>45 mins (Deep read)</option>
                <option value={60}>60 mins (Extended session)</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-task-category" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Category
              </label>
              <select
                id="edit-task-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] text-sm text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="Study">Study</option>
                <option value="Reading">Reading</option>
                <option value="Revision">Revision</option>
                <option value="Assignment">Assignment</option>
                <option value="Break">Rest / Breather</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reminder & Pacing Notice */}
      <div className="flex items-start gap-2.5 p-4 rounded-card bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
        <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-1" />
        <div className="space-y-1">
          <p>
            <strong className="text-[var(--color-text-main)]">Intentional in-app pacing:</strong> Calmspace provides gentle in-app pacing suggestions during active study sessions according to your settings ({settings?.reminder_interval_minutes || 45} mins).
          </p>
          <p className="text-[var(--color-text-muted)]">
            We respect your attention: no external push notifications, no browser alerts when the tab is closed, and zero productivity guilt.
          </p>
        </div>
      </div>
    </div>
  );
};
