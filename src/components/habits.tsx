'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Plus, Repeat, TrendingUp, Edit2 } from 'lucide-react';
import { useHabits, useCompleteHabit, useHabitLogs } from '@/hooks';
import { useAuth } from '@/hooks';
import { cn, getToday } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { HabitModal } from './modals/habit-modal';
import type { Habit } from '@/types';

export function HabitGrid() {
  const { data: habits, isLoading } = useHabits();
  const { data: user } = useAuth();
  const completeHabit = useCompleteHabit();
  const dailyScores = useAppStore((state) => state.dailyScores);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const today = getToday();
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 (Mon-Sun)

  // Filter habits that should be done today
  const todayHabits = habits?.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'specific_days') return h.specific_days.includes(adjustedDay);
    return true;
  }) || [];

  const completedTodayCount = todayHabits.filter(h => !!dailyScores[today]?.[`habit_${h.id}`]).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Habits</h1>
          <p className="text-muted-foreground mt-1">
            Build consistency, one day at a time
          </p>
        </div>
        <button 
          onClick={() => { setSelectedHabit(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Today's Habits"
          value={String(todayHabits.length)}
          icon={Repeat}
          color="text-blue-500"
        />
        <StatCard
          label="Completed"
          value={String(completedTodayCount)}
          icon={TrendingUp}
          color="text-green-500"
        />
        <StatCard
          label="Best Streak"
          value={String(Math.max(...(habits?.map(h => h.streak_longest) || [0])))}
          icon={Flame}
          color="text-orange-500"
        />
        <StatCard
          label="Total Completions"
          value={String(habits?.reduce((acc, h) => acc + h.total_completions, 0) || 0)}
          icon={Repeat}
          color="text-purple-500"
        />
      </div>

      {/* Habit Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {todayHabits.map((habit, index) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            userId={user?.id}
            onToggle={() => completeHabit.mutate({ habitId: habit.id, userId: user?.id || '' })}
            onEdit={() => { setSelectedHabit(habit); setIsModalOpen(true); }}
            delay={index * 0.05}
          />
        ))}
      </div>

      {todayHabits.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No habits for today</p>
          <p className="text-sm mt-1">Create your first habit to start building consistency</p>
        </div>
      )}
      
      <HabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} habit={selectedHabit} />
    </div>
  );
}

function HabitCard({ habit, userId, onToggle, onEdit, delay }: {
  habit: Habit;
  userId?: string;
  onToggle: () => void;
  onEdit: () => void;
  delay: number;
}) {
  const isCompletedFromStore = useAppStore((state) => !!state.dailyScores[getToday()]?.[`habit_${habit.id}`]);
  const { data: log } = useHabitLogs(habit.id);
  const isCompleted = isCompletedFromStore || !!log;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      className={cn(
        "relative p-5 rounded-2xl border-2 transition-all duration-300 text-left group",
        isCompleted
          ? "border-opacity-100 bg-opacity-5"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md cursor-pointer"
      )}
      style={isCompleted ? { borderColor: habit.color, backgroundColor: habit.color + '10' } : {}}
      onClick={onToggle}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-background rounded-lg border border-border shadow-sm backdrop-blur-sm transition-all z-10"
      >
        <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      </button>
      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
        isCompleted ? "text-white" : "bg-accent"
      )} style={isCompleted ? { backgroundColor: habit.color } : {}}>
        <Flame className={cn("w-6 h-6", !isCompleted && "text-muted-foreground")} />
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-sm mb-1",
        isCompleted && "text-foreground"
      )}>
        {habit.title}
      </h3>

      {/* Streak */}
      <div className="flex items-center gap-1.5">
        <Flame className={cn(
          "w-4 h-4",
          habit.streak_current > 0 ? "text-orange-500" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-sm font-medium",
          habit.streak_current > 0 ? "text-orange-500" : "text-muted-foreground"
        )}>
          {habit.streak_current} day{habit.streak_current !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Completed Checkmark */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: habit.color }}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
