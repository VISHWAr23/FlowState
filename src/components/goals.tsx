'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import { useGoals, useCreateGoal, useLifeAreas } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDate } from '@/lib/utils';
import type { Goal, KeyResult } from '@/types';

export function GoalsView() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: goals, isLoading } = useGoals(activeTab);
  const { data: areas } = useLifeAreas();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground mt-1">
            Track your monthly objectives and key results
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : goals && goals.length > 0 ? (
          goals.map((goal, index) => (
            <GoalCard key={goal.id} goal={goal as any} index={index} />
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No {activeTab} goals</p>
            <p className="text-sm mt-1">
              {activeTab === 'active' ? 'Create your first goal to get started' : 'Complete some goals to see them here'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGoalModal onClose={() => setShowCreateModal(false)} areas={areas || []} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal, index }: { goal: Goal & { life_area?: any, key_results?: any[] }; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const area = goal.life_area;
  const progress = goal.progress || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Area Color Indicator */}
          <div
            className="w-1 h-12 rounded-full flex-shrink-0"
            style={{ backgroundColor: area?.color || '#6b7280' }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {area && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: area.color + '20', color: area.color }}
                >
                  {area.name}
                </span>
              )}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                goal.priority >= 4 ? "bg-red-100 text-red-700" :
                goal.priority >= 3 ? "bg-yellow-100 text-yellow-700" :
                "bg-blue-100 text-blue-700"
              )}>
                P{goal.priority}
              </span>
            </div>

            <h3 className="font-semibold text-lg">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-accent rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: area?.color || '#3b82f6' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Due {formatDate(goal.target_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flag className="w-4 h-4" />
                <span>{goal.key_results?.length || 0} key results</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{goal.xp_reward} XP</span>
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Key Results */}
      <AnimatePresence>
        {expanded && goal.key_results && goal.key_results.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-border"
          >
            <div className="p-5 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Key Results</h4>
              {goal.key_results.map((kr, i) => (
                <KeyResultRow key={kr.id} kr={kr} color={area?.color || '#3b82f6'} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function KeyResultRow({ kr, color, index }: { kr: KeyResult; color: string; index: number }) {
  const krProgress = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3"
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
        krProgress >= 100 ? "border-green-500 bg-green-500" : "border-muted-foreground"
      )}>
        {krProgress >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{kr.title}</span>
          <span className="text-sm font-medium">{kr.current_value}/{kr.target_value} {kr.unit}</span>
        </div>
        <div className="h-1.5 bg-accent rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, krProgress)}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function CreateGoalModal({ onClose, areas }: { onClose: () => void; areas: any[] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState('');
  const [priority, setPriority] = useState(3);
  const [targetDate, setTargetDate] = useState('');
  const [keyResults, setKeyResults] = useState([{ title: '', target_value: 100, unit: '%' }]);

  const createGoal = useCreateGoal();
  const addToast = useAppStore((state) => state.addToast);

  const handleSubmit = () => {
    if (!title || !areaId || !targetDate) return;

    createGoal.mutate({
      title,
      description,
      life_area_id: areaId,
      priority,
      target_date: targetDate,
      start_date: new Date().toISOString().split('T')[0],
      key_results: keyResults.filter(kr => kr.title) as any,
    }, {
      onSuccess: () => {
        onClose();
        addToast({ type: 'success', title: 'Goal created successfully' });
      }
    });
  };

  const addKeyResult = () => {
    setKeyResults([...keyResults, { title: '', target_value: 100, unit: '%' }]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Create New Goal</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Launch Product MVP"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does success look like?"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Life Area</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                  <option value={4}>Urgent</option>
                  <option value={5}>Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Key Results */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Key Results</label>
              <div className="space-y-2">
                {keyResults.map((kr, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => {
                        const newKRs = [...keyResults];
                        newKRs[i].title = e.target.value;
                        setKeyResults(newKRs);
                      }}
                      placeholder={`Key result ${i + 1}`}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="number"
                      value={kr.target_value}
                      onChange={(e) => {
                        const newKRs = [...keyResults];
                        newKRs[i].target_value = Number(e.target.value);
                        setKeyResults(newKRs);
                      }}
                      className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addKeyResult}
                className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add key result
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title || !areaId || !targetDate}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Create Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
