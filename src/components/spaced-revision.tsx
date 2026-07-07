'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Plus, CheckCircle2, Circle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecallItem {
  id: string;
  topic: string;
  notes: string;
  isRevealed: boolean;
  isRecalled: boolean;
  addedAt: string;
}

const INITIAL_ITEMS: RecallItem[] = [
  { id: '1', topic: 'Spring Boot Dependency Injection', notes: '@Autowired vs Constructor Injection. Constructor is preferred for mandatory dependencies.', isRevealed: false, isRecalled: false, addedAt: new Date().toISOString() },
  { id: '2', topic: 'FII vs DII Behaviour', notes: 'FIIs usually drive the trend. DIIs act as counter-balance. Watch for overlapping buying.', isRevealed: false, isRecalled: false, addedAt: new Date().toISOString() },
];

export function SpacedRevision() {
  const [items, setItems] = useState<RecallItem[]>(INITIAL_ITEMS);
  const [newItemTopic, setNewItemTopic] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flowstate-recall');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recall items', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('flowstate-recall', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const pendingItems = items.filter(i => !i.isRecalled);
  const recalledItems = items.filter(i => i.isRecalled);

  const toggleReveal = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, isRevealed: !item.isRevealed } : item
    ));
  };

  const markRecalled = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, isRecalled: true, isRevealed: false } : item
    ));
  };
  
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTopic.trim()) return;
    
    const newItem: RecallItem = {
      id: Date.now().toString(),
      topic: newItemTopic,
      notes: newItemNotes,
      isRevealed: false,
      isRecalled: false,
      addedAt: new Date().toISOString(),
    };
    
    setItems([newItem, ...items]);
    setNewItemTopic('');
    setNewItemNotes('');
    setIsAdding(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Active Recall</h2>
            <p className="text-xs text-muted-foreground">30 mins daily · Don't look at notes!</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAdd} className="p-4 border-b border-border bg-accent/30 space-y-3">
              <input
                type="text"
                placeholder="What did you learn today?"
                value={newItemTopic}
                onChange={(e) => setNewItemTopic(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <textarea
                placeholder="Notes (to check against later)"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newItemTopic.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Save Item
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Pending Items */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            To Recall Today ({pendingItems.length})
          </h3>
          <div className="space-y-3">
            {pendingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No items to recall. You're all caught up!</p>
            ) : (
              pendingItems.map((item) => (
                <RecallCard 
                  key={item.id} 
                  item={item} 
                  onToggleReveal={() => toggleReveal(item.id)} 
                  onMarkRecalled={() => markRecalled(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Recalled Items (Collapsed view) */}
        {recalledItems.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Recalled ({recalledItems.length})
            </h3>
            <div className="space-y-2">
              {recalledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm line-through truncate flex-1">{item.topic}</span>
                  <button onClick={() => removeItem(item.id)} className="p-1 hover:text-red-400 opacity-50 hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function RecallCard({ 
  item, 
  onToggleReveal, 
  onMarkRecalled, 
  onRemove 
}: { 
  item: RecallItem, 
  onToggleReveal: () => void, 
  onMarkRecalled: () => void,
  onRemove: () => void
}) {
  return (
    <div className="group border border-border rounded-xl p-4 bg-background hover:border-primary/30 transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium text-sm">{item.topic}</h4>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button 
          onClick={onMarkRecalled}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg text-xs font-medium transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          I Remembered
        </button>
        <button 
          onClick={onToggleReveal}
          className="px-3 py-2 bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium transition-colors"
        >
          {item.isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {item.isRevealed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
              {item.notes || <span className="italic">No notes provided.</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
