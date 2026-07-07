'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Flame,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useTasks, useHabits, useGoals, useFocusSessions, useDailyLog, useAuth } from '@/hooks';
import { cn, formatDuration, getToday } from '@/lib/utils';
import Link from 'next/link';
import { DailyScorecard } from './daily-scorecard';
import { SpacedRevision } from './spaced-revision';
import { PriorityDot } from './ui/priority-dot';
import { useCompleteTask } from '@/hooks';

export function Dashboard() {
  const { data: user } = useAuth();
  const { data: tasks } = useTasks();
  const { data: habits } = useHabits();
  const { data: goals } = useGoals();
  const { data: sessions } = useFocusSessions();
  const { data: dailyLog } = useDailyLog();
  const completeTask = useCompleteTask();

  const handleTaskComplete = (task: any) => {
    if (task.status === 'completed') return;
    const priorityValues: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
    const xp = (priorityValues[task.priority] || 2) * 10;
    completeTask.mutate({ id: task.id, xpReward: xp });
  };

  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedHabits = dailyLog?.habits_completed || 0;
  const totalHabits = habits?.length || 0;

  const activeGoals = goals?.filter(g => g.status === 'active').length || 0;
  const completedGoals = goals?.filter(g => g.status === 'completed').length || 0;

  const focusMinutes = sessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0;
  const focusHours = Math.floor(focusMinutes / 60);

  const today = getToday();
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {getTimeOfDay()}, {user?.full_name?.split(' ')[0] || 'Champion'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {dayName}, {dateStr} · Let&apos;s make today count
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/daily"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Start Day
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tasks Done"
          value={`${completedTasks}/${totalTasks}`}
          subtitle={`${taskRate}% completion`}
          icon={CheckCircle2}
          color="bg-blue-500"
          trend={taskRate >= 50 ? 'up' : 'neutral'}
          delay={0}
        />
        <MetricCard
          title="Habits"
          value={`${completedHabits}/${totalHabits}`}
          subtitle="Daily streak"
          icon={Flame}
          color="bg-orange-500"
          trend="up"
          delay={0.1}
        />
        <MetricCard
          title="Focus Time"
          value={focusHours > 0 ? `${focusHours}h ${focusMinutes % 60}m` : `${focusMinutes}m`}
          subtitle="Deep work today"
          icon={Timer}
          color="bg-purple-500"
          trend={focusMinutes > 0 ? 'up' : 'neutral'}
          delay={0.2}
        />
        <MetricCard
          title="Active Goals"
          value={String(activeGoals)}
          subtitle={`${completedGoals} completed`}
          icon={Target}
          color="bg-green-500"
          trend="neutral"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Central Feed */}
        <div className="xl:col-span-2 space-y-6">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <DailyScorecard />
          </motion.div>

          {/* Today's Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
            <Link href="/daily" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            {tasks && tasks.length > 0 ? (
              tasks.slice(0, 5).map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleTaskComplete(task)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                    task.status === 'completed' ? "opacity-50 bg-accent/50" : "hover:bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    task.status === 'completed'
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  )}>
                    {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", task.status === 'completed' && "line-through")}>
                      {task.title}
                    </p>
                  </div>
                  <PriorityDot priority={task.priority} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks for today</p>
                <Link href="/daily" className="text-primary text-sm hover:underline mt-2 inline-block">
                  Plan your day
                </Link>
              </div>
            )}
          </div>
        </motion.div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="h-[400px]" // Give it a fixed height or let it expand
          >
            <SpacedRevision />
          </motion.div>


          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <QuickAction href="/focus" icon={Timer} label="Start Focus Session" color="text-purple-500" />
              <QuickAction href="/habits" icon={Flame} label="Log Habits" color="text-orange-500" />
              <QuickAction href="/goals" icon={Target} label="Review Goals" color="text-green-500" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, trend, delay }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `${color}/10`)}>
          <Icon className={cn("w-5 h-5", color.replace('bg-', 'text-'))} />
        </div>
        {trend !== 'neutral' && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs",
            trend === 'up' ? "text-green-500" : "text-red-500"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function QuickAction({ href, icon: Icon, label, color }: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group"
    >
      <Icon className={cn("w-4 h-4", color)} />
      <span className="text-sm font-medium">{label}</span>
      <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
