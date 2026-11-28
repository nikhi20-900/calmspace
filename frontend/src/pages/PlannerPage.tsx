import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Sparkles,
  Info,
  Edit3,
  Bell,
  X,
  AlertCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { StudyTask, UserSettings } from '../types';

const CATEGORIES = ['All', 'Study', 'Reading', 'Revision', 'Assignment', 'Break'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

const STARTER_PROMPTS = [
  { title: 'Review lecture slides for 25 mins', estimated_minutes: 25, category: 'Revision' },
  { title: 'Read textbook chapter section', estimated_minutes: 45, category: 'Reading' },
  { title: 'Outline next week’s study goals', estimated_minutes: 15, category: 'Study' },
  { title: 'Take a restful tea or stretch break', estimated_minutes: 10, category: 'Break' },
];

export const PlannerPage: React.FC = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [editNotice, setEditNotice] = useState<string | null>(null);

  // Scroll ref for breather section
  const breatherRef = useRef<HTMLDivElement>(null);

  // Load initial tasks and settings
  useEffect(() => {
    async function loadData() {
      try {
        const [taskList, userSettings] = await Promise.allSettled([
          api.getTasks(),
          api.getSettings(),
        ]);

        if (taskList.status === 'fulfilled') {
          setTasks(taskList.value);
        } else {
          setActionError(
            'Unable to load your saved study tasks from the server. Please check your connection and refresh.'
          );
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

  // Foreground active time tracking (Stage 3)
  const {
    activeVisibleMinutes,
    isPromptVisible,
    dismissPrompt,
    snoozePrompt,
  } = useActiveTimeTracker({
    intervalMinutes: settings?.reminder_interval_minutes || 45,
    enabled: Boolean(settings?.break_reminders_enabled),
  });

  // Task creation handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setActionError('Task title must contain at least 2 non-space characters.');
      return;
    }
    setIsCreating(true);
    setActionError(null);
    try {
      const newTask = await api.createTask({
        title: trimmedTitle,
        estimated_minutes: estimatedMinutes,
        category,
      });
      setTasks((prev) => [newTask, ...prev]);
      setTitle('');
      setShowAddForm(false);
    } catch (err: any) {
      setActionError(
        err?.message || 'Unable to save study session to the server. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  // 1-Click starter prompt handler
  const handleAddStarter = async (starter: (typeof STARTER_PROMPTS)[number]) => {
    setActionError(null);
    try {
      const newTask = await api.createTask(starter);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err: any) {
      setActionError(
        err?.message || 'Unable to add starter session to the server. Please try again.'
      );
    }
  };

  // Toggle task completion
  const handleToggle = async (taskId: string) => {
    setActionError(null);
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    try {
      const updated = await api.toggleTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      setTasks(previousTasks);
      setActionError(
        err?.message || 'Unable to update task completion on the server. Please try again.'
      );
    }
  };

  // Delete task
  const handleDelete = async (taskId: string) => {
    setActionError(null);
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (err: any) {
      setTasks(previousTasks);
      setActionError(
        err?.message || 'Unable to delete task from the server. Please try again.'
      );
    }
  };

  // Open edit modal
  const handleOpenEdit = (task: StudyTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditMinutes(task.estimated_minutes);
    setEditCategory(task.category);
    setEditNotice(null);
  };

  // Save edit handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle.length < 2) {
      setEditNotice('Task title must contain at least 2 non-space characters.');
      return;
    }

    setIsSavingEdit(true);
    setEditNotice(null);
    setActionError(null);
    const updatedPayload = {
      title: trimmedTitle,
      estimated_minutes: editMinutes,
      category: editCategory,
    };

    try {
      const saved = await api.updateTask(editingTask.id, updatedPayload);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? saved : t)));
      setEditingTask(null);
    } catch (err: any) {
      setEditNotice(
        err?.message || 'Unable to save changes to the server. Please check your connection and try again.'
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered task collection
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter === 'active' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;

      // Category filter
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (query && !`${t.title} ${t.category}`.toLowerCase().includes(query)) return false;

      return true;
    });
  }, [tasks, statusFilter, categoryFilter, searchQuery]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.length - completedCount;
  const plannedMinutes = tasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const remainingMinutes = tasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + task.estimated_minutes, 0);
  const completionPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

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
          description="Break study into manageable blocks. Your plan is a guide, not a deadline."
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<Plus className="w-4 h-4" />}
          aria-expanded={showAddForm}
        >
          {showAddForm ? 'Close Form' : 'Add a focus block'}
        </Button>
      </div>

      <Card padding="md" className="overflow-hidden border-[#E6E2F3] bg-gradient-to-r from-white via-[#FBFAFF] to-[#F2F0FC]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7773A2]">
              <CalendarCheck className="h-4 w-4 text-[#5554B8]" /> Your plan
            </div>
            <h2 className="mt-1 text-lg font-bold text-[#25233B]">
              {tasks.length === 0 ? 'Start with one small block' : `${activeCount} ${activeCount === 1 ? 'block' : 'blocks'} left at your pace`}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#77738F]">
              {tasks.length === 0
                ? 'Add a focus block when you’re ready. You can change or remove it later.'
                : `${remainingMinutes} minutes remain in your active plan. There’s no need to finish everything at once.`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
            <div className="rounded-xl border border-white bg-white/80 px-3 py-2.5 text-center shadow-subtle">
              <p className="text-lg font-bold text-[#25233B]">{tasks.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#89869B]">Blocks</p>
            </div>
            <div className="rounded-xl border border-white bg-white/80 px-3 py-2.5 text-center shadow-subtle">
              <p className="text-lg font-bold text-[#5554B8]">{plannedMinutes}<span className="ml-0.5 text-xs font-medium">min</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#89869B]">Planned</p>
            </div>
            <div className="rounded-xl border border-white bg-white/80 px-3 py-2.5 text-center shadow-subtle">
              <p className="text-lg font-bold text-[#38825D]">{completionPercent}<span className="text-xs font-medium">%</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#89869B]">Complete</p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E9E7F2]" role="progressbar" aria-label="Planner completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#7774CE] to-[#61A884] transition-all duration-500" style={{ width: `${completionPercent}%` }} />
        </div>
      </Card>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss planner error"
            className="p-1 rounded hover:bg-rose-100 text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stage 3: In-App Foreground Pacing Prompt (Dismissible, Foreground Only) */}
      {isPromptVisible && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-card bg-[#F9F8FD] border-2 border-[#5554B8]/30 shadow-soft animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E9E7FB] flex items-center justify-center text-[#5554B8] shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25233B]">
                Gentle Pacing Suggestion
              </h2>
              <p className="text-xs text-[#625F78] leading-relaxed mt-0.5">
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
              leftIcon={<Coffee className="w-3.5 h-3.5" />}
            >
              Take 5-min Breather
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => snoozePrompt(15)}
            >
              Remind in 15m
            </Button>
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label="Dismiss pacing reminder"
              className="p-2 text-[#625F78] hover:text-[#25233B] rounded-button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stage 1: Add Task Form (Collapsible) */}
      {showAddForm && (
        <Card padding="lg" className="border-2 border-[#5554B8]/30 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#25233B]">
              Add a focus block
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded text-[#625F78] hover:text-[#25233B]"
              aria-label="Cancel adding study block"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-xs font-semibold text-[#625F78] mb-1">
                  What’s one thing you’d like to work on?
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read Chapter 4 of Organic Chemistry"
                className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-duration" className="block text-xs font-semibold text-[#625F78] mb-1">
                  Estimated duration
                </label>
                <select
                  id="task-duration"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                >
                  <option value={15}>15 mins (Quick review)</option>
                  <option value={25}>25 mins (Pomodoro block)</option>
                  <option value={45}>45 mins (Deep read)</option>
                  <option value={60}>60 mins (Extended session)</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-category" className="block text-xs font-semibold text-[#625F78] mb-1">
                  Session Category
                </label>
                <select
                  id="task-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreating}
              >
                Add to my plan
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Task Filters & Counts */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E6F1]">
          {/* Status Tabs */}
          <div
            role="tablist"
            aria-label="Filter tasks by completion status"
            className="flex items-center gap-1 p-1 bg-white rounded-button border border-[#E8E6F1] shadow-subtle shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-button transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#5554B8] text-white shadow-xs'
                  : 'text-[#625F78] hover:text-[#25233B]'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-button transition-colors ${
                statusFilter === 'active'
                  ? 'bg-[#5554B8] text-white shadow-xs'
                  : 'text-[#625F78] hover:text-[#25233B]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'completed'}
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-button transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-[#5554B8] text-white shadow-xs'
                  : 'text-[#625F78] hover:text-[#25233B]'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Category Filter Pills */}
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
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[#25233B] text-white'
                    : 'bg-white text-[#625F78] border border-[#E8E6F1] hover:bg-[#F7F6FB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <label className="relative block w-full sm:w-48 shrink-0">
            <span className="sr-only">Search planned blocks</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#89869B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find a block"
              className="w-full rounded-full border border-[#E8E6F1] bg-white py-2 pl-9 pr-3 text-xs text-[#25233B] outline-none transition focus:border-[#8C89D4] focus:ring-2 focus:ring-[#E9E7FB]"
            />
          </label>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          /* Welcoming Empty State with Starter Prompts */
          <Card padding="lg" className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E9E7FB] flex items-center justify-center text-[#5554B8] mx-auto">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-bold text-[#25233B]">
                {tasks.length === 0
                  ? 'No study blocks scheduled right now'
                  : searchQuery.trim()
                    ? `No blocks found for “${searchQuery.trim()}”`
                    : 'No blocks match your selected filters'}
              </h2>
              <p className="text-xs text-[#625F78] leading-relaxed">
                {tasks.length === 0
                  ? 'Plan a small, manageable block or pick a gentle starter below to get momentum without overwhelm.'
                  : searchQuery.trim()
                    ? 'Try a different search phrase, or clear search to see your other blocks.'
                    : 'Try switching your status or category filters above to view other planned blocks.'}
              </p>
            </div>

            {/* Quick Starter Prompt Chips */}
            {tasks.length === 0 && (
              <div className="pt-2 max-w-lg mx-auto">
                <span className="text-[11px] font-semibold text-[#8E8AA7] uppercase tracking-wider block mb-2">
                  Gentle Starter Ideas
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddStarter(prompt)}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-white border border-[#D5D1E5] text-[#25233B] hover:bg-[#F2F1FD] hover:border-[#5554B8] transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 text-[#5554B8]" />
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
                    ? 'bg-[#F7F6FB] border-[#E8E6F1] opacity-60'
                    : 'bg-white border-[#E8E6F1] shadow-subtle hover:border-[#D5D1E5]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id)}
                    className="text-[#5554B8] hover:text-[#4645A7] transition-transform active:scale-90 shrink-0"
                    aria-label={
                      task.completed ? 'Mark task as incomplete' : 'Mark task as completed'
                    }
                  >
                    {task.completed ? (
                      <CheckCircle className="w-5 h-5 text-[#245532]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#8E8AA7]" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium block truncate ${
                        task.completed ? 'line-through text-[#625F78]' : 'text-[#25233B]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#625F78] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_minutes} mins
                      </span>
                      <span>•</span>
                      <span className="bg-[#E9E7FB] text-[#5554B8] px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        {task.category}
                      </span>
                      {/* Non-punitive pacing cue for active tasks */}
                      {!task.completed && (
                        <span className="text-[11px] text-[#7A4D05] bg-[#FFFDF9] px-2 py-0.5 rounded-full border border-[#F4DCCB]">
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
                    className="text-[#625F78] hover:text-[#25233B] p-2 rounded-button hover:bg-[#F7F6FB] transition-colors"
                    aria-label={`Edit task: ${task.title}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="text-[#8E8AA7] hover:text-red-600 p-2 rounded-button hover:bg-red-50 transition-colors"
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

      {/* The plan comes first; the breather stays available below it. */}
      <div ref={breatherRef}>
        <BreatherTimer initialMinutes={5} />
      </div>

      {/* Stage 1: Edit Task Modal Dialog */}
      <Dialog
        isOpen={Boolean(editingTask)}
        onClose={() => {
          setEditingTask(null);
          setEditNotice(null);
        }}
        title="Edit Study Block"
        description="Update your session focus, estimated time, or category."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 mt-3">
          {editNotice && (
            <div
              role="alert"
              className="p-3 rounded-button bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{editNotice}</span>
            </div>
          )}

          <div>
            <label htmlFor="edit-task-title" className="block text-xs font-semibold text-[#625F78] mb-1">
              Task Focus
            </label>
            <input
              id="edit-task-title"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-task-duration" className="block text-xs font-semibold text-[#625F78] mb-1">
                Estimated duration
              </label>
              <select
                id="edit-task-duration"
                value={editMinutes}
                onChange={(e) => setEditMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
              >
                <option value={15}>15 mins (Quick review)</option>
                <option value={25}>25 mins (Pomodoro block)</option>
                <option value={45}>45 mins (Deep read)</option>
                <option value={60}>60 mins (Extended session)</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-task-category" className="block text-xs font-semibold text-[#625F78] mb-1">
                Category
              </label>
              <select
                id="edit-task-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
              >
                <option value="Study">Study</option>
                <option value="Reading">Reading</option>
                <option value="Revision">Revision</option>
                <option value="Assignment">Assignment</option>
                <option value="Break">Rest / Breather</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E6F1]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setEditNotice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingEdit}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reminder & Pacing Notice */}
      <div className="flex items-start gap-2.5 p-4 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] text-xs text-[#625F78]">
        <Info className="w-4 h-4 text-[#5554B8] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Intentional in-app pacing:</strong> Calmspace provides gentle in-app pacing suggestions during active study sessions according to your settings ({settings?.reminder_interval_minutes || 45} mins).
          </p>
          <p className="text-[#8E8AA7]">
            We respect your attention: no external push notifications, no browser alerts when the tab is closed, and zero productivity guilt.
          </p>
        </div>
      </div>
    </div>
  );
};
