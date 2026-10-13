'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, CheckCircle2, Circle, AlertTriangle, Save, Sunrise, Sun, Sunset } from 'lucide-react';
import { cn, getToday } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface CheckItem {
  id: string;
  label: string;
  completed: boolean;
}

const INITIAL_CHECKLISTS = {
  preMarket: [
    { id: 'pre1', label: 'Global market review (US, Asian markets)', completed: false },
    { id: 'pre2', label: 'SGX/GIFT NIFTY direction', completed: false },
    { id: 'pre3', label: 'FII/DII Data analysis from yesterday', completed: false },
    { id: 'pre4', label: 'Important news & earnings', completed: false },
    { id: 'pre5', label: 'Mark Support levels on NIFTY/BankNIFTY', completed: false },
    { id: 'pre6', label: 'Mark Resistance levels', completed: false },
  ],
  duringMarket: [
    { id: 'dur1', label: 'Is the setup valid for Entry?', completed: false },
    { id: 'dur2', label: 'Is my Risk defined?', completed: false },
    { id: 'dur3', label: 'Exit plan is set (SL in system)', completed: false },
  ],
  postMarket: [
    { id: 'post1', label: 'Why did NIFTY move?', completed: false },
    { id: 'post2', label: 'Which sectors led the rally/fall?', completed: false },
    { id: 'post3', label: 'What is the biggest learning today?', completed: false },
  ]
};

type ChecklistState = typeof INITIAL_CHECKLISTS;

export function MarketChecklist() {
  const addToast = useAppStore((state) => state.addToast);
  const today = getToday();

  const [checklists, setChecklists] = useState<ChecklistState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`flowstate-market-${today}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_CHECKLISTS;
  });

  const [journal, setJournal] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`flowstate-journal-${today}`);
        if (saved) return saved;
      } catch {}
    }
    return '';
  });

  const toggleCheck = (phase: keyof ChecklistState, id: string) => {
    setChecklists((prev: ChecklistState) => {
      const next = {
        ...prev,
        [phase]: prev[phase].map((item) => 
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`flowstate-market-${today}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSaveJournal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`flowstate-journal-${today}`, journal);
    }
    addToast({ type: 'success', title: 'Journal saved successfully' });
  };

  const calculateProgress = (phase: keyof typeof INITIAL_CHECKLISTS) => {
    const items = checklists[phase];
    const completed = items.filter(i => i.completed).length;
    return (completed / items.length) * 100;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Protocol</h1>
          <p className="text-muted-foreground mt-1">Disciplined trading framework</p>
        </div>
        <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-lg text-sm font-medium border border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          No constant chart watching
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Checklists Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pre-Market */}
          <PhaseCard 
            title="Pre-Market Prep" 
            time="8:00 - 8:25 AM"
            icon={Sunrise}
            items={checklists.preMarket}
            progress={calculateProgress('preMarket')}
            onToggle={(id) => toggleCheck('preMarket', id)}
            color="blue"
          />

          {/* During Market */}
          <PhaseCard 
            title="During Market" 
            time="9:15 - 3:30 PM"
            icon={Sun}
            items={checklists.duringMarket}
            progress={calculateProgress('duringMarket')}
            onToggle={(id) => toggleCheck('duringMarket', id)}
            color="orange"
          />

          {/* Post-Market */}
          <PhaseCard 
            title="Post-Market Review" 
            time="3:30 - 3:45 PM"
            icon={Sunset}
            items={checklists.postMarket}
            progress={calculateProgress('postMarket')}
            onToggle={(id) => toggleCheck('postMarket', id)}
            color="purple"
          />
        </div>

        {/* Journal Column */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm sticky top-24">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <LineChart className="w-5 h-5 text-primary" />
              Daily Observations
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Write down your key learnings, mistakes made, and emotional state today.
            </p>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="The market moved because..."
              className="w-full h-64 p-3 rounded-lg bg-accent/50 border-none outline-none resize-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <button
              onClick={handleSaveJournal}
              className="w-full mt-4 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Journal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function PhaseCard({ 
  title, 
  time, 
  icon: Icon, 
  items, 
  progress, 
  onToggle, 
  color 
}: { 
  title: string, 
  time: string, 
  icon: any, 
  items: CheckItem[], 
  progress: number, 
  onToggle: (id: string) => void,
  color: 'blue' | 'orange' | 'purple'
}) {
  
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };

  const borderMap = {
    blue: "border-blue-500/20",
    orange: "border-orange-500/20",
    purple: "border-purple-500/20",
  };

  const bgMap = {
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{time}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="h-1.5 bg-accent rounded-full overflow-hidden mb-5">
        <motion.div 
          className={cn("h-full rounded-full", bgMap[color])}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className="flex items-start gap-3 w-full p-2.5 hover:bg-accent/50 rounded-xl transition-all text-left group"
          >
            <div className="mt-0.5 flex-shrink-0">
              {item.completed ? (
                <CheckCircle2 className={cn("w-5 h-5", colorMap[color].split(' ')[0])} />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground group-hover:border-primary transition-colors" />
              )}
            </div>
            <span className={cn(
              "text-sm transition-all",
              item.completed && "text-muted-foreground line-through opacity-70"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
