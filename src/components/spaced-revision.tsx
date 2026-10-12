'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Plus, CheckCircle2, Circle, Eye, EyeOff, Trash2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecallItem {
  id: string;
  topic: string;
  notes: string;
  isRevealed: boolean;
  isRecalled: boolean;
  addedAt: string;
}

const INITIAL_ITEMS: RecallItem[] = [];

export function SpacedRevision() {
  const [items, setItems] = useState<RecallItem[]>(INITIAL_ITEMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newNotes, setNewNotes] = useState('');
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

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    const newItem: RecallItem = {
      id: Date.now().toString(),
      topic: newTopic.trim(),
      notes: newNotes.trim() || 'No additional notes provided.',
      isRevealed: false,
      isRecalled: false,
      addedAt: new Date().toISOString(),
    };

    setItems([newItem, ...items]);
    setNewTopic('');
    setNewNotes('');
    setIsAdding(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/recall', { method: 'POST' });
      const data = await res.json();
      
      if (data && data.topic && data.notes) {
        const newItem: RecallItem = {
          id: Date.now().toString(),
          topic: data.topic,
          notes: data.notes,
          isRevealed: false,
          isRecalled: false,
          addedAt: new Date().toISOString(),
        };
        setItems([newItem, ...items]);
      }
    } catch (error) {
      console.error('Failed to generate recall question', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">Active Recall</h2>
            <p className="text-xs text-muted-foreground">Test your memory · Don&apos;t look at notes!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>AI Generate</span>
          </button>
        </div>
      </div>

      {/* Manual Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleManualAdd}
            className="p-4 border-b border-border bg-accent/30 space-y-3"
          >
            <input
              type="text"
              placeholder="What topic or concept did you study?"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <textarea
              placeholder="Key notes (hidden until you reveal)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTopic.trim()}
                className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Save Review Item
              </button>
            </div>
          </motion.form>
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
              <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-xl">
                <p className="text-sm font-medium text-foreground">Nothing to review yet.</p>
                <p className="text-xs text-muted-foreground">
                  You can add a learning note later or click AI Generate to quiz yourself.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add a review item
                </button>
              </div>
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
              Recalled Today ({recalledItems.length})
            </h3>
            <div className="space-y-2">
              {recalledItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-foreground">{item.topic}</span>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-1 hover:text-red-500 transition-colors">
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
  item: RecallItem; 
  onToggleReveal: () => void; 
  onMarkRecalled: () => void; 
  onRemove: () => void; 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-background border border-border rounded-xl space-y-3 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-sm text-foreground">{item.topic}</h4>
        <button onClick={onRemove} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {item.isRevealed && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-accent/40 rounded-lg text-xs text-foreground whitespace-pre-wrap leading-relaxed border border-border/50"
        >
          {item.notes}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button 
          onClick={onToggleReveal}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
        >
          {item.isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{item.isRevealed ? 'Hide Notes' : 'Reveal Answer'}</span>
        </button>

        <button 
          onClick={onMarkRecalled}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>I Remembered</span>
        </button>
      </div>
    </motion.div>
  );
}
