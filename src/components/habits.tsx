'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Plus, Repeat, TrendingUp, Edit2, Trash2, Check } from 'lucide-react';
import { useHabits, useCompleteHabit, useDeleteHabit, useTodayHabitLogs, useAuth } from '@/hooks';
import { cn, getToday } from '@/lib/utils';
import { HabitModal } from './modals/habit-modal';
import type { Habit } from '@/types';

export function HabitGrid() {
  const today = getToday();
  const { data: habits, isLoading } = useHabits();
  const { data: todayLogs } = useTodayHabitLogs(today);
  const { data: user } = useAuth();
  const completeHabit = useCompleteHabit();
  const deleteHabit = useDeleteHabit();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [filterView, setFilterView] = useState<'today' | 'all'>('today');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 (Mon-Sun)

  const todayHabits = habits?.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'specific_days') return h.specific_days.includes(adjustedDay);
    return true;
  }) || [];

  const visibleHabits = filterView === 'all' ? (habits || []) : todayHabits;
  const completedHabitIds = new Set((todayLogs || []).map((l) => l.habit_id));
  const completedTodayCount = todayHabits.filter((h) => completedHabitIds.has(h.id)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Habits</h1>
          <p className="text-muted-foreground mt-1">
            Build consistency, one day at a time
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-accent rounded-lg p-1 border border-border">
            <button
              type="button"
              onClick={() => setFilterView('today')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                filterView === 'today' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Today ({todayHabits.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterView('all')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                filterView === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({habits?.length || 0})
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedHabit(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleHabits.map((habit, index) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            isCompleted={completedHabitIds.has(habit.id)}
            onToggle={() => completeHabit.mutate({ habitId: habit.id, userId: user?.id || '' })}
            onEdit={() => { setSelectedHabit(habit); setIsModalOpen(true); }}
            onDelete={() => deleteHabit.mutate(habit.id)}
            delay={index * 0.04}
          />
        ))}
      </div>

      {visibleHabits.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No habits {filterView === 'today' ? 'for today' : 'yet'}</p>
          <p className="text-sm mt-1">Create your first habit to start building consistency</p>
        </div>
      )}
      
      <HabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} habit={selectedHabit} />
    </div>
  );
}

function HabitCard({ habit, isCompleted, onToggle, onEdit, onDelete, delay }: {
  habit: Habit;
  isCompleted: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  delay: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      className={cn(
        "relative p-5 rounded-2xl border-2 transition-all duration-200 text-left group cursor-pointer",
        isCompleted
          ? "border-opacity-100 bg-opacity-5"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
      )}
      style={isCompleted ? { borderColor: habit.color, backgroundColor: habit.color + '10' } : {}}
      onClick={onToggle}
    >
      {/* Action Buttons: Always accessible on desktop & mobile without checkmark overlap */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmDelete ? (
          <div className="flex items-center gap-1 bg-background/95 border border-destructive/30 rounded-lg px-1.5 py-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="text-[11px] font-bold text-red-500 hover:underline px-1 cursor-pointer"
              aria-label={`Confirm delete ${habit.title}`}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-1 cursor-pointer"
              aria-label="Cancel delete"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 bg-background/85 hover:bg-background rounded-lg border border-border shadow-xs transition-colors cursor-pointer"
              aria-label={`Edit ${habit.title}`}
              title="Edit habit"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 bg-background/85 hover:bg-red-500/10 rounded-lg border border-border hover:border-red-500/30 shadow-xs transition-colors cursor-pointer"
              aria-label={`Delete ${habit.title}`}
              title="Delete habit"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
            </button>
          </>
        )}
      </div>

      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
        isCompleted ? "text-white" : "bg-accent"
      )} style={isCompleted ? { backgroundColor: habit.color } : {}}>
        {isCompleted ? (
          <Check className="w-6 h-6 stroke-[3]" />
        ) : (
          <Flame className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      <h3 className={cn(
        "font-semibold text-sm mb-1 pr-2",
        isCompleted && "text-foreground"
      )}>
        {habit.title}
      </h3>

      {habit.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{habit.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
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

        <span className="text-[11px] font-medium text-muted-foreground">
          {isCompleted ? 'Done ✓' : 'Tap to complete'}
        </span>
      </div>
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
