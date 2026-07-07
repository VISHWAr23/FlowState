'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle2,
  Flame,
  Timer,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAnalytics, useAuth } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

const PERIODS = [
  { label: '7 Days', value: '7d' as const },
  { label: '30 Days', value: '30d' as const },
  { label: '90 Days', value: '90d' as const },
];

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: analytics, isLoading } = useAnalytics(period);
  const { data: user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dailyData = analytics?.daily.map((d: any) => ({
    date: new Date(d.date || d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tasks: d.tasks_completed,
    tasks_planned: d.tasks_planned,
    habits: d.habits_completed,
    focus: d.focus_hours,
    xp: d.xp_earned,
    score: d.productivity_score,
  })) || [];

  const weeklyData = analytics?.weekly.map((w: any) => ({
    week: new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completion: w.completion_rate,
    consistency: w.consistency_score,
    focus: w.focus_score,
    goals: w.goal_score,
    overall: w.productivity_score,
  })) || [];

  // Calculate averages
  const totalTasksCompleted = dailyData.reduce((acc, d) => acc + d.tasks, 0);
  const totalTasksPlanned = dailyData.reduce((acc, d) => acc + d.tasks_planned, 0);
  const avgCompletion = totalTasksPlanned > 0
    ? Math.round((totalTasksCompleted / totalTasksPlanned) * 100)
    : 0;

  const totalXP = dailyData.reduce((acc, d) => acc + d.xp, 0);
  const totalFocus = dailyData.reduce((acc, d) => acc + d.focus, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your productivity patterns</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="Completion Rate"
          value={`${avgCompletion}%`}
          icon={CheckCircle2}
          color="text-blue-500"
          trend="up"
        />
        <ScoreCard
          title="Consistency"
          value={`${weeklyData[weeklyData.length - 1]?.consistency || 0}%`}
          icon={Flame}
          color="text-orange-500"
          trend="up"
        />
        <ScoreCard
          title="Focus Score"
          value={`${weeklyData[weeklyData.length - 1]?.focus || 0}%`}
          icon={Timer}
          color="text-purple-500"
          trend="neutral"
        />
        <ScoreCard
          title="Goal Progress"
          value={`${weeklyData[weeklyData.length - 1]?.goals || 0}%`}
          icon={Target}
          color="text-green-500"
          trend="up"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Productivity Score Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="#3b82f6"
                  fill="url(#scoreGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Daily Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="habits" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Focus Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Focus Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Life Area Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Life Area Balance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { area: 'Career', value: 85 },
                { area: 'Learning', value: 70 },
                { area: 'Fitness', value: 60 },
                { area: 'Finance', value: 75 },
                { area: 'Relationships', value: 90 },
                { area: 'Projects', value: 65 },
              ]}>
                <PolarGrid stroke="rgba(0,0,0,0.1)" />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            icon={TrendingUp}
            title="Peak Performance"
            description="You complete 23% more tasks on days with morning planning rituals."
            color="text-blue-500"
          />
          <InsightCard
            icon={Flame}
            title="Streak Power"
            description="Habits with 7+ day streaks have 85% long-term adherence."
            color="text-orange-500"
          />
          <InsightCard
            icon={Timer}
            title="Focus Sweet Spot"
            description="Your best flow ratings occur in 50-minute sessions."
            color="text-purple-500"
          />
          <InsightCard
            icon={Target}
            title="Goal Alignment"
            description="Tasks linked to goals are 40% more likely to be completed."
            color="text-green-500"
          />
        </div>
      </motion.div>
    </div>
  );
}

function ScoreCard({ title, value, icon: Icon, color, trend }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("w-5 h-5", color)} />
        {trend !== 'neutral' && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs",
            trend === 'up' ? "text-green-500" : "text-red-500"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
    </div>
  );
}

function InsightCard({ icon: Icon, title, description, color }: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color.replace('text-', 'bg-').replace('500', '500/10'))}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
