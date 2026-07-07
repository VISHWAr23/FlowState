'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Calendar, Flag, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useCreateTask, useLifeAreas } from '@/hooks';
import { cn, getToday } from '@/lib/utils';
import { PriorityDot } from './ui/priority-dot';

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('medium');
  const [areaId, setAreaId] = useState('');
  const [dueDate, setDueDate] = useState(getToday());

  const { data: areas } = useLifeAreas();
  const createTask = useCreateTask();
  const addToast = useAppStore((state) => state.addToast);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    createTask.mutate({
      title: input,
      priority: priority as "low" | "medium" | "high" | "urgent",
      life_area_id: areaId || null,
      due_date: dueDate,
      status: 'pending',
    }, {
      onSuccess: () => {
        setInput('');
        setIsOpen(false);
        addToast({ type: 'success', title: 'Task captured!' });
      }
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg"
            >
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Quick Capture</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-accent"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Priority */}
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                        priority === p
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-muted-foreground"
                      )}
                    >
                      <PriorityDot priority={p} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">No area</option>
                    {areas?.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || createTask.isPending}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createTask.isPending ? 'Creating...' : 'Add Task'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
