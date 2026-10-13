'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Play,
  Plus,
  Flame,
  Timer,
  Target,
  ArrowRight,
  Sparkles,
  Edit2,
  Trash2,
  Zap,
  Repeat,
  Check,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  useTasks,
  useHabits,
  useCompleteHabit,
  useFocusSessions,
  useDailyLog,
  useAuth,
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
} from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDuration, getToday, formatDateFull } from '@/lib/utils';
import { PriorityDot } from './ui/priority-dot';
import { TaskModal } from './modals/task-modal';
import type { Task, Priority } from '@/types/types';
import Link from 'next/link';

export function Dashboard() {
  const router = useRouter();
  const { data: user } = useAuth();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: habits } = useHabits();
  const { data: sessions } = useFocusSessions();
  const { data: dailyLog } = useDailyLog();
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const completeHabit = useCompleteHabit();

  const dailyFocusTargetMinutes = useAppStore((state) => state.dailyFocusTargetMinutes);
  const minimumDayTarget = useAppStore((state) => state.minimumDayTarget);
  const setFocusTimerState = useAppStore((state) => state.setFocusTimerState);
  const addToast = useAppStore((state) => state.addToast);

  // Local state for modals and inline input
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState<Priority>('high');
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Time and Greeting
  const todayStr = getToday();
  const todayFormatted = formatDateFull(todayStr);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Metrics from real records
  const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const pendingTasks = tasks?.filter((t) => t.status !== 'completed') || [];
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Real focus minutes from completed sessions
  const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];
  const focusMinutes = completedSessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
  const focusHoursFormatted = formatDuration(focusMinutes);
  const focusPercent = Math.min(Math.round((focusMinutes / dailyFocusTargetMinutes) * 100), 100);

  // Minimum Successful Day calculation
  const targetTasks = minimumDayTarget.targetTasks || 1;
  const targetSessions = minimumDayTarget.targetSessions || 2;
  const hasMetTaskGoal = completedTasks >= targetTasks;
  const hasMetSessionGoal = completedSessions.length >= targetSessions;
  const isMinimumDayAchieved = hasMetTaskGoal && hasMetSessionGoal;

  // Prioritize tasks (urgent > high > medium > low, then pending)
  const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    const diff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    if (diff !== 0) return diff;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  // Recommended next task (the #1 pending priority)
  const recommendedNextTask = sortedPendingTasks[0] || null;

  // Top 3 Priorities for Today
  const topPriorities = tasks && tasks.length > 0
    ? [...tasks]
        .sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          const diff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
          if (diff !== 0) return diff;
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
        .slice(0, 3)
    : [];

  const dailyScores = useAppStore((state) => state.dailyScores);

  const handleTaskToggle = (task: Task) => {
    if (task.status === 'completed') {
      completeTask.mutate({ id: task.id, status: 'pending' });
    } else {
      const priorityXP: Record<string, number> = { urgent: 40, high: 30, medium: 20, low: 10 };
      completeTask.mutate({ id: task.id, xpReward: priorityXP[task.priority] || 20, status: 'completed' });
    }
  };

  const handleStartFocus = (task?: Task | null) => {
    const targetTask = task || recommendedNextTask;
    setFocusTimerState({
      focusSelectedTask: targetTask ? targetTask.id : null,
      focusDuration: targetTask?.estimated_minutes || 25,
    });
    router.push('/focus');
  };

  const handleInlineAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) return;

    createTask.mutate(
      {
        title: inlineTaskTitle.trim(),
        priority: inlinePriority,
        due_date: todayStr,
        status: 'pending',
      },
      {
        onSuccess: () => {
          setInlineTaskTitle('');
        },
      }
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* 1. Header with dynamic greeting and local date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Good {getTimeOfDay()},{' '}
            <span className="text-primary font-semibold">
              {user?.full_name?.split(' ')[0] || user?.username || 'Champion'}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium">
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/focus"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent/80 text-foreground transition-all"
          >
            <Timer className="w-4 h-4 text-primary" />
            <span>Focus Room</span>
          </Link>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent/80 text-foreground transition-all"
          >
            <span>Review</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* 2. Prominent Primary Action: Start Focus */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card border-2 border-primary/20 hover:border-primary/40 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <Zap className="w-3.5 h-3.5" />
              Execution Center
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {recommendedNextTask
                ? `Ready to focus on "${recommendedNextTask.title}"?`
                : 'Enter your focus flow'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {recommendedNextTask
                ? `Recommended next priority · ${recommendedNextTask.estimated_minutes || 25} min session`
                : 'Start a distraction-reduced block and build deep momentum.'}
            </p>
          </div>

          <button
            onClick={() => handleStartFocus(recommendedNextTask)}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl text-base shadow-sm hover:shadow transition-all cursor-pointer flex-shrink-0"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Focus</span>
          </button>
        </div>
      </motion.div>

      {/* 3. Recommended Next Task Banner (if suitable task exists) */}
      {recommendedNextTask && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Immediate Next Action
            </span>
            <PriorityDot priority={recommendedNextTask.priority} />
          </div>

          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={() => handleTaskToggle(recommendedNextTask)}
                className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="Mark as completed"
              >
                <Circle className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="font-semibold text-base text-foreground leading-snug">
                  {recommendedNextTask.title}
                </p>
                {(recommendedNextTask.notes || recommendedNextTask.description) && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {recommendedNextTask.notes || recommendedNextTask.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleStartFocus(recommendedNextTask)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Focus Now</span>
              </button>
              <button
                onClick={() => {
                  setSelectedTaskForModal(recommendedNextTask);
                  setIsTaskModalOpen(true);
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
                title="Edit priority"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Top 3 Priorities for the Day */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Today&apos;s Priorities</h2>
            <p className="text-xs text-muted-foreground">Focus on maximum 3 critical tasks</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-accent text-muted-foreground rounded-lg">
            {completedTasks} of {totalTasks} done
          </span>
        </div>

        {/* Priority List Cards */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
          {topPriorities.length > 0 ? (
            topPriorities.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between p-4 transition-colors hover:bg-accent/40",
                    isCompleted && "bg-muted/30 opacity-70"
                  )}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleTaskToggle(task)}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground hover:border-primary"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold text-foreground truncate", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      {(task.notes || task.description) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.notes || task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <PriorityDot priority={task.priority} />
                    {!isCompleted && (
                      <button
                        onClick={() => handleStartFocus(task)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="Start focus on this task"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedTaskForModal(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this task?')) {
                          deleteTask.mutate(task.id);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-foreground">Start with one small task.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active priorities for today. Define what really matters to set your day up for clarity.
              </p>
              <button
                onClick={() => inlineInputRef.current?.focus()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first task
              </button>
            </div>
          )}
        </div>

        {/* Inline Quick-Add Task Input */}
        <form onSubmit={handleInlineAddTask} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineTaskTitle}
              onChange={(e) => setInlineTaskTitle(e.target.value)}
              placeholder="+ Add a priority for today... (Press Enter)"
              className="w-full pl-3.5 pr-20 py-2.5 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <select
                value={inlinePriority}
                onChange={(e) => setInlinePriority(e.target.value as Priority)}
                className="bg-accent text-foreground text-xs font-medium rounded-lg px-2 py-1 border border-border focus:outline-none cursor-pointer"
                title="Priority"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!inlineTaskTitle.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          >
            Add
          </button>
        </form>
      </div>

      {/* 5. Minimum Successful Day Card */}
      <div className={cn(
        "rounded-2xl border p-5 transition-all shadow-sm",
        isMinimumDayAchieved
          ? "bg-emerald-500/5 border-emerald-500/30"
          : "bg-card border-border"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "p-1.5 rounded-lg",
                isMinimumDayAchieved ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
              )}>
                <Award className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-foreground">
                Minimum Successful Day Target
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {isMinimumDayAchieved
                ? 'Target achieved! Any additional focus is pure bonus — protect your energy.'
                : '1 meaningful task completed and 2 focus sessions. Consistency beats intensity.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold flex-shrink-0">
            <div className="text-right">
              <p className={hasMetTaskGoal ? "text-emerald-500" : "text-foreground"}>
                {completedTasks}/{targetTasks} Tasks
              </p>
              <p className={hasMetSessionGoal ? "text-emerald-500" : "text-foreground"}>
                {completedSessions.length}/{targetSessions} Sessions
              </p>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Task requirement</span>
              <span>{hasMetTaskGoal ? 'Completed ✓' : `${completedTasks}/${targetTasks}`}</span>
            </div>
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-300", hasMetTaskGoal ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${Math.min((completedTasks / targetTasks) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Focus sessions</span>
              <span>{hasMetSessionGoal ? 'Completed ✓' : `${completedSessions.length}/${targetSessions}`}</span>
            </div>
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-300", hasMetSessionGoal ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${Math.min((completedSessions.length / targetSessions) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Focus Time & Progress Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Focus Duration Summary */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Focus Time Today
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {focusHoursFormatted} / {formatDuration(dailyFocusTargetMinutes)}
            </span>
          </div>

          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${focusPercent}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {focusMinutes > 0
              ? `${completedSessions.length} recorded focus session${completedSessions.length !== 1 ? 's' : ''} completed today.`
              : 'Your progress starts with one focused session.'}
          </p>
        </div>

        {/* Task Progress Summary */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Task Completion
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {completedTasks} / {totalTasks} ({taskRate}%)
            </span>
          </div>

          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${taskRate}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {completedTasks > 0
              ? `${completedTasks} priority completed today. Great pace!`
              : 'Complete your highest priority item first.'}
          </p>
        </div>
      </div>

      {/* 7. Optional Habit Section */}
      {habits && habits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Daily Habits</h2>
            <Link href="/habits" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Manage Habits
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {habits.slice(0, 6).map((habit) => {
              const isDone = !!dailyScores[todayStr]?.[`habit_${habit.id}`];
              return (
                <div
                  key={habit.id}
                  onClick={() => completeHabit.mutate({ habitId: habit.id, userId: user?.id || '' })}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer",
                    isDone
                      ? "bg-accent/40 border-primary/30"
                      : "bg-card border-border hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isDone ? "bg-primary text-primary-foreground" : "border border-muted-foreground"
                    )}>
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <p className={cn("text-xs font-semibold text-foreground truncate", isDone && "line-through text-muted-foreground")}>
                      {habit.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground ml-2 flex-shrink-0">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{habit.streak_current || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. Contextual Empty States (when applicable) */}
      {completedSessions.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">
            Your progress starts with one focused session.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Give yourself 25 minutes of undistracted time to start making progress on what matters.
          </p>
          <button
            onClick={() => handleStartFocus(recommendedNextTask)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start your first session</span>
          </button>
        </div>
      )}

      {/* Edit Priority Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTaskForModal(null);
        }}
        task={selectedTaskForModal}
      />
    </div>
  );
}