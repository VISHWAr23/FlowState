'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getToday } from '@/lib/utils';
import type { TimeBlock } from '@/types/types';

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: TimeBlock | null;
  selectedDate?: string | null;
}


export function TimeBlockModal({ isOpen, onClose, block, selectedDate }: TimeBlockModalProps) {
  const [title, setTitle] = useState('');
  const [startHour, setStartHour] = useState(8.5);
  const [durationHours, setDurationHours] = useState(1);
  const [color, setColor] = useState('bg-primary/10 text-primary border-primary/20');
  const [recurrence, setRecurrence] = useState<'today' | 'daily'>('today');
  
  const addTimeBlock = useAppStore((state) => state.addTimeBlock);
  const updateTimeBlock = useAppStore((state) => state.updateTimeBlock);
  const deleteTimeBlock = useAppStore((state) => state.deleteTimeBlock);

  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setStartHour(block.startHour);
      setDurationHours(block.durationHours);
      setColor(block.color);
      setRecurrence(block.date ? 'today' : 'daily');
    } else {
      setTitle('');
      setStartHour(8.5);
      setDurationHours(1);
      setColor('bg-primary/10 text-primary border-primary/20');
      setRecurrence('today');
    }
  }, [block, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    
    const blockData = {
      title,
      startHour,
      durationHours,
      color,
      days: recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [],
      date: recurrence === 'today' ? (selectedDate || getToday()) : undefined,
    };

    if (block) {
      updateTimeBlock(block.id, blockData);
    } else {
      addTimeBlock(blockData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (block && confirm('Are you sure you want to delete this block?')) {
      deleteTimeBlock(block.id);
      onClose();
    }
  };

  const PRESET_COLORS = [
    { label: 'Blue', value: 'bg-primary/10 text-primary border-primary/20' },
    { label: 'Dark', value: 'bg-zinc-800 text-zinc-100 border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-300' },
    { label: 'Gray', value: 'bg-muted text-foreground border-border' },
    { label: 'Purple', value: 'bg-secondary text-secondary-foreground border-secondary' },
    { label: 'Green', value: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { label: 'Orange', value: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  ];

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
              <h2 className="text-lg font-semibold">{block ? 'Edit Time Block' : 'New Time Block'}</h2>
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
                  placeholder="e.g., Deep Work Session"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Start Hour</label>
                  <input
                    type="number"
                    min="0"
                    max="23.75"
                    step="0.25"
                    value={startHour}
                    onChange={(e) => setStartHour(parseFloat(e.target.value) || 8.5)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Duration (Hours)</label>
                  <input
                    type="number"
                    min="0.25"
                    max="12"
                    step="0.25"
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Theme Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COLORS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setColor(preset.value)}
                      className={`text-xs p-2 rounded-lg border text-center transition-all ${preset.value} ${color === preset.value ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Recurrence</label>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  <button
                    onClick={() => setRecurrence('today')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${recurrence === 'today' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Today Only
                  </button>
                  <button
                    onClick={() => setRecurrence('daily')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${recurrence === 'daily' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Daily
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              {block ? (
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
                  {block ? 'Save Changes' : 'Create Block'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
