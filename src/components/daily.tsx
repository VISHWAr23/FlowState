'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Plus,
  Sunrise,
  Sunset,
  Star,
  Zap,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  Flag,
  Edit2,
  Calendar,
} from 'lucide-react';
import { useTasks, useDailyLog, useUpsertDailyLog, useCompleteTask, useCreateTask, useLifeAreas } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, getToday, formatDate } from '@/lib/utils';
import { TaskModal } from './modals/task-modal';
import type { Task } from '@/types';
import { PRIORITY_CONFIG, type Priority } from '@/types';
import { PriorityDot } from './ui/priority-dot';

export function DailyExecution() {
  const [showMorningRitual, setShowMorningRitual] = useState(true);
  const [showEveningRitual, setShowEveningRitual] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');

  const [wins, setWins] = useState<string[]>(['', '', '']);
  const [dayRating, setDayRating] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string>('');
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(getToday());

  const { data: tasks, isLoading } = useTasks(selectedDate);
  const { data: dailyLog } = useDailyLog(selectedDate);
  const { data: areas } = useLifeAreas();
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();
  const upsertLog = useUpsertDailyLog();
  const addToast = useAppStore((state) => state.addToast);

  const today = getToday();
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day - 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };
  
  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  // Morning ritual completion
  const morningDone = !!dailyLog?.morning_completed_at;
  const eveningDone = !!dailyLog?.evening_completed_at;

  const handleMorningComplete = () => {
    upsertLog.mutate({
      log_date: selectedDate,
      morning_completed_at: new Date().toISOString(),
    }, {
      onSuccess: () => {
        addToast({ type: 'success', title: 'Morning ritual complete! +20 XP' });
      }
    });
  };

  const handleEveningComplete = () => {
    upsertLog.mutate({
      log_date: selectedDate,
      evening_completed_at: new Date().toISOString(),
      top_wins: wins.filter(w => w.trim() !== ''),
      day_rating: dayRating,
      gratitude_note: gratitude,
    }, {
      onSuccess: () => {
        addToast({ type: 'success', title: 'Evening ritual complete! +20 XP' });
      }
    });
  };

  const handleTaskComplete = (task: Task) => {
    if (task.status === 'completed') {
      completeTask.mutate({ id: task.id, status: 'pending' });
    } else {
      const xp = PRIORITY_CONFIG[task.priority as Priority]?.value * 10 || 10;
      completeTask.mutate({ id: task.id, xpReward: xp, status: 'completed' });
    }
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    const title = newTaskInput.trim();
    setNewTaskInput('');
    createTask.mutate({
      title,
      priority: 'medium',
      due_date: selectedDate,
      status: 'pending',
    });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between text-center mb-4">
        <button onClick={handlePrevDay} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{formatDate(selectedDate)}</h1>
          <p className="text-muted-foreground">
            {completedTasks}/{totalTasks} tasks completed · {dailyLog?.focus_hours || 0}h focus time
          </p>
        </div>
        <button onClick={handleNextDay} className="p-2 hover:bg-accent rounded-lg transition-colors" disabled={selectedDate >= today}>
          <ArrowRight className={cn("w-5 h-5", selectedDate >= today ? "text-muted-foreground/30" : "text-muted-foreground")} />
        </button>
      </div>

      {/* Morning Ritual */}
      <AnimatePresence>
        {!morningDone && showMorningRitual && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Sunrise className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Morning Ritual</h2>
                <p className="text-sm text-muted-foreground">5 minutes to set your intention</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <RitualStep number={1} text="Review today's top 3 priorities" />
              <RitualStep number={2} text="Check your habit commitments" />
              <RitualStep number={3} text="Set your focus intention" />
              <RitualStep number={4} text="Visualize a successful day" />
            </div>

            <button
              onClick={handleMorningComplete}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              I&apos;m ready to conquer today
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Input */}
      <div className="relative">
        <input
          type="text"
          value={newTaskInput}
          onChange={(e) => setNewTaskInput(e.target.value)}
          placeholder="What needs to be done today?"
          className="w-full px-4 py-4 pl-12 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTaskInput.trim()) {
              handleAddTask();
            }
          }}
        />
        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Today&apos;s Tasks
          </h2>
          <span className="text-sm text-muted-foreground">
            {completedTasks}/{totalTasks} done
          </span>
        </div>

        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
          ) : tasks && tasks.length > 0 ? (
            tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-4 group hover:bg-accent/30 transition-colors",
                  task.status === 'completed' && "opacity-50"
                )}
              >
                <div 
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer",
                    task.status === 'completed'
                      ? "bg-primary border-primary scale-110"
                      : "border-muted-foreground hover:border-primary"
                  )}
                  onClick={() => handleTaskComplete(task)}
                >
                  {task.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>

                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                >
                  <p className={cn(
                    "text-sm font-medium hover:text-primary transition-colors",
                    task.status === 'completed' && "line-through text-muted-foreground hover:text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.estimated_minutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_minutes}m
                      </span>
                    )}
                  </div>
                </div>

                <PriorityDot priority={task.priority} />
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No tasks for today</p>
              <p className="text-sm mt-1">Add your first task above</p>
            </div>
          )}
        </div>
      </div>

      {/* Evening Ritual */}
      <AnimatePresence>
        {morningDone && !eveningDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Sunset className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Evening Shutdown</h2>
                <p className="text-sm text-muted-foreground">Reflect and prepare for tomorrow</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Today&apos;s Wins (3 things)</label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Win #${i + 1}`}
                      value={wins[i]}
                      onChange={(e) => {
                        const newWins = [...wins];
                        newWins[i] = e.target.value;
                        setWins(newWins);
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Day Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setDayRating(star)}
                      className="p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Star className={cn(
                        "w-6 h-6 transition-colors",
                        star <= dayRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                      )} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Gratitude Note</label>
                <textarea
                  placeholder="What are you grateful for today?"
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                />
              </div>
            </div>

            <button
              onClick={handleEveningComplete}
              className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Complete Day & Earn XP
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {eveningDone && dailyLog && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-800"
        >
          <div className="text-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">Day Complete!</h3>
            <p className="text-green-600 dark:text-green-400 mt-1">
              You earned {dailyLog.xp_earned || 0} XP today. Great work!
            </p>
          </div>

          <div className="space-y-4 border-t border-green-200 dark:border-green-800 pt-6 mt-6">
            {dailyLog.top_wins && dailyLog.top_wins.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Today's Wins</h4>
                <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
                  {dailyLog.top_wins.map((win, i) => (
                    <li key={i}>{win}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {dailyLog.day_rating && (
              <div>
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Day Rating</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn(
                      "w-5 h-5",
                      star <= dailyLog.day_rating! ? "text-yellow-500 fill-yellow-500" : "text-green-300 dark:text-green-700"
                    )} />
                  ))}
                </div>
              </div>
            )}

            {dailyLog.gratitude_note && (
              <div>
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Gratitude Note</h4>
                <p className="text-sm text-green-700 dark:text-green-300 italic">"{dailyLog.gratitude_note}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} task={selectedTask} />
    </div>
  );
}

function RitualStep({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-orange-600">{number}</span>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
