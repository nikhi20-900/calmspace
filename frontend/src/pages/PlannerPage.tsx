import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
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
} from 'lucide-react';
import { api } from '../services/api';
import { StudyTask } from '../types';

export const PlannerPage: React.FC = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // New task inputs
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [category, setCategory] = useState('Study');
  const [isCreating, setIsCreating] = useState(false);

  // Break timer state
  const [breakTimerActive, setBreakTimerActive] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(300); // 5 mins

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await api.getTasks();
        setTasks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  useEffect(() => {
    let interval: any;
    if (breakTimerActive && breakSecondsLeft > 0) {
      interval = setInterval(() => {
        setBreakSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (breakSecondsLeft === 0) {
      setBreakTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [breakTimerActive, breakSecondsLeft]);

  const handleToggle = async (taskId: string) => {
    try {
      const updated = await api.toggleTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your study planner..." />;
  }

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          tag="Study-Life Balance Planner"
          title="Intentional Pacing"
          description="Gentle structure without productivity anxiety. Small, consistent steps honour your focus and well-being."
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {showAddForm ? 'Close Form' : 'Add Study Session'}
        </Button>
      </div>

      {/* Break Companion Banner */}
      <Card padding="md" className="bg-gradient-to-r from-[#F2F1FD] to-[#DCE9DF]/30 border-[#D9D5F4]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#5554B8] shadow-subtle shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25233B]">
                Mindful Breather Reminder
              </h2>
              <p className="text-xs text-[#625F78]">
                {breakTimerActive
                  ? `Breather in progress: ${Math.floor(breakSecondsLeft / 60)}:${(breakSecondsLeft % 60).toString().padStart(2, '0')} remaining`
                  : 'Would you like to take a short 5-minute break away from your screens?'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {breakTimerActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBreakTimerActive(false);
                  setBreakSecondsLeft(300);
                }}
              >
                End Break Early
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBreakSecondsLeft(300);
                  setBreakTimerActive(true);
                }}
              >
                Start 5-min Breather
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Add Task Form (Conditional) */}
      {showAddForm && (
        <Card padding="lg" className="border-2 border-[#5554B8]/30 animate-fade-in">
          <h2 className="text-base font-bold text-[#25233B] mb-3">
            Plan a gentle study block
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-xs font-semibold text-[#625F78] mb-1">
                What are you focusing on?
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
                  Estimated duration (minutes)
                </label>
                <select
                  id="task-duration"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white"
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
                  className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] bg-white"
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
                Save Session Block
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Task List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[#625F78]">
          <span>Current Study Blocks ({tasks.length})</span>
          <span>{completedCount} completed</span>
        </div>

        {tasks.length === 0 ? (
          <Card padding="md" className="text-center py-8 text-xs text-[#625F78]">
            No study sessions currently planned. Click "Add Study Session" above when you're ready.
          </Card>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-card border transition-all flex items-center justify-between gap-3 ${
                task.completed
                  ? 'bg-[#F7F6FB] border-[#E8E6F1] opacity-60'
                  : 'bg-white border-[#E8E6F1] shadow-subtle hover:border-[#D5D1E5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(task.id)}
                  className="text-[#5554B8] hover:text-[#4645A7] transition-transform active:scale-90"
                  aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as completed'}
                >
                  {task.completed ? (
                    <CheckCircle className="w-5 h-5 text-[#245532]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#8E8AA7]" />
                  )}
                </button>

                <div>
                  <span
                    className={`text-sm font-medium block ${
                      task.completed ? 'line-through text-[#625F78]' : 'text-[#25233B]'
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#625F78]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimated_minutes} mins
                    </span>
                    <span>•</span>
                    <span className="bg-[#E9E7FB] text-[#5554B8] px-2 py-0.2 rounded-full text-[10px] font-medium">
                      {task.category}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className="text-[#8E8AA7] hover:text-red-600 p-1.5 rounded-button hover:bg-red-50 transition-colors"
                aria-label="Delete study task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Reminder Notice */}
      <div className="flex items-start gap-2 p-3.5 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] text-xs text-[#625F78]">
        <Info className="w-4 h-4 text-[#5554B8] shrink-0 mt-0.5" />
        <p>
          <strong>In-app reminders:</strong> Calmspace provides gentle in-app pacing suggestions during your active sessions. We respect your attention and never send unsolicited external push notifications.
        </p>
      </div>
    </div>
  );
};
