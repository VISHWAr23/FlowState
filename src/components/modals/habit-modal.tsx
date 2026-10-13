'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { useCreateHabit, useUpdateHabit, useDeleteHabit } from '@/hooks';
import type { Habit } from '@/types/types';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
}

export function HabitModal({ isOpen, onClose, habit }: HabitModalProps) {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'specific_days'>('daily');
  const [color, setColor] = useState('#3b82f6');
  
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setFrequency(habit.frequency);
      setColor(habit.color);
    } else {
      setTitle('');
      setFrequency('daily');
      setColor('#3b82f6');
    }
  }, [habit, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    
    if (habit) {
      updateHabit.mutate({
        id: habit.id,
        updates: { title, frequency, color }
      });
      onClose();
    } else {
      createHabit.mutate({
        title,
        frequency,
        color,
        icon: 'Flame',
        streak_current: 0,
        streak_longest: 0,
        total_completions: 0,
        xp_reward: 15,
        is_active: true,
        sort_order: 0,
        specific_days: [1, 2, 3, 4, 5, 6, 7],
        time_of_day: 'anytime',
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (habit && confirm('Are you sure you want to delete this habit?')) {
      deleteHabit.mutate(habit.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{habit ? 'Edit Habit' : 'New Habit'}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Read for 30 minutes"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 p-1 bg-background border border-border rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              {habit ? (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors text-sm font-medium hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {habit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
