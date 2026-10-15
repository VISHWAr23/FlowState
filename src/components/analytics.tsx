'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle2,
  Timer,
  Target,
  Flame,
  Calendar,
  XCircle,
  BarChart2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAnalytics, useFocusSessions, useTasks, useHabits } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDuration } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const PERIODS = [
  { label: '7 Days', value: '7d' as const },
  { label: '30 Days', value: '30d' as const },
  { label: '90 Days', value: '90d' as const },
];

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const { data: analytics, isLoading } = useAnalytics(period);
  const { data: allSessions } = useFocusSessions();
  const { data: habits } = useHabits();
  const dailyFocusTargetMinutes = useAppStore((state) => state.dailyFocusTargetMinutes);
  const allTasks = useAppStore((state) => state.tasks);
  const completedTasksList = allTasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dailyData = analytics?.daily || [];
  const totalFocusMinutes = analytics?.totalFocusMinutes || 0;
  const completedSessionsCount = analytics?.completedSessionsCount || 0;
  const cancelledSessionsCount = analytics?.cancelledSessionsCount || 0;
  const totalTasksCompleted = analytics?.totalTasksCompleted || 0;

  // Active days with focus
  const activeFocusDays = dailyData.filter((d) => d.focus_minutes > 0).length;
  const avgMinutesPerActiveDay = activeFocusDays > 0 ? Math.round(totalFocusMinutes / activeFocusDays) : 0;
  const avgSessionLength = completedSessionsCount > 0 ? Math.round(totalFocusMinutes / completedSessionsCount) : 0;

  // Format data for chart
  const chartData = dailyData.map((d) => {
    const [, month, day] = d.date.split('-');
    const label = `${Number(month)}/${Number(day)}`;
    return {
      date: label,
      fullDate: d.date,
      focusMinutes: d.focus_minutes,
      tasksCompleted: d.tasks_completed,
      sessionsCompleted: d.completed_sessions,
    };
  });

  const hasHistory = totalFocusMinutes > 0 || totalTasksCompleted > 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Review & Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Genuine metrics derived from your actual focus sessions and completed priorities
          </p>
        </div>

        <div className="flex bg-accent rounded-xl p-1 self-start sm:self-auto border border-border">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                period === p.value
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Real Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Focus Time"
          value={formatDuration(totalFocusMinutes)}
          subtitle={`${completedSessionsCount} completed session${completedSessionsCount !== 1 ? 's' : ''}`}
          icon={Timer}
          iconColor="text-blue-500"
        />

        <MetricCard
          title="Tasks Completed"
          value={String(totalTasksCompleted)}
          subtitle="Meaningful priorities finished"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
        />

        <MetricCard
          title="Avg Session Duration"
          value={avgSessionLength > 0 ? `${avgSessionLength}m` : '—'}
          subtitle={activeFocusDays > 0 ? `Across ${activeFocusDays} active day${activeFocusDays !== 1 ? 's' : ''}` : 'No sessions yet'}
          icon={Clock}
          iconColor="text-purple-500"
        />

        <MetricCard
          title="Session Adherence"
          value={
            completedSessionsCount + cancelledSessionsCount > 0
              ? `${Math.round((completedSessionsCount / (completedSessionsCount + cancelledSessionsCount)) * 100)}%`
              : '—'
          }
          subtitle={`${cancelledSessionsCount} session${cancelledSessionsCount !== 1 ? 's' : ''} interrupted`}
          icon={Target}
          iconColor="text-orange-500"
        />
      </div>

      {/* Main Charts */}
      {hasHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Focus Time Trend */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Daily Focus Time</h3>
                <p className="text-xs text-muted-foreground">Minutes focused per calendar day</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-lg">
                Target: {formatDuration(dailyFocusTargetMinutes)}/day
              </span>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(val: any) => [`${val} minutes`, 'Focus Time']}
                  />
                  <Bar dataKey="focusMinutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Task Completion */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Tasks Finished</h3>
              <p className="text-xs text-muted-foreground">Priorities completed per day</p>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--foreground)',
                    }}
                    formatter={(val: any) => [`${val} tasks`, 'Completed']}
                  />
                  <Bar dataKey="tasksCompleted" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Focus Records Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            When you complete focus sessions and tasks in FlowState, your genuine execution trends will automatically appear here.
          </p>
        </div>
      )}

      {/* Daily Task Execution History Log */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Daily Task Execution History</span>
            </h3>
            <p className="text-xs text-muted-foreground">Chronological log of finished priorities</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-2.5 py-1 bg-accent rounded-lg">
            {completedTasksList.length} completed
          </span>
        </div>

        {completedTasksList.length > 0 ? (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {completedTasksList.slice(0, 15).map((task) => (
              <div key={task.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.completed_at
                        ? new Date(task.completed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                        : task.due_date
                        ? `Due ${task.due_date}`
                        : 'Completed'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-accent text-muted-foreground">
                    {task.priority}
                  </span>
                  <span className="text-xs font-bold text-[#C8A96B] px-2 py-0.5 rounded-full bg-[#C8A96B]/10 border border-[#C8A96B]/20">
                    +{task.xp_reward || 20} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            No completed task history recorded yet. Complete priorities on your Today dashboard to populate this log.
          </div>
        )}
      </div>

      {/* Sustainable Routine Principles */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Productivity Principles</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="p-3.5 bg-accent/30 rounded-xl space-y-1">
            <p className="font-semibold text-foreground">Frictionless Starts</p>
            <p>Lower the threshold to start. 5 minutes of focused action is always better than 0 minutes.</p>
          </div>
          <div className="p-3.5 bg-accent/30 rounded-xl space-y-1">
            <p className="font-semibold text-foreground">Sustainable Daily Targets</p>
            <p>2 to 4 hours of genuine focused work per day outperforms 8 hours of distracted fatigue.</p>
          </div>
          <div className="p-3.5 bg-accent/30 rounded-xl space-y-1">
            <p className="font-semibold text-foreground">Progress Without Guilt</p>
            <p>Missed days are natural. Never face an overwhelming backlog — restart fresh with today&apos;s top priority.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
    </div>
  );
}
