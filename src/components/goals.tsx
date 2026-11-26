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
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useLifeAreas } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDate } from '@/lib/utils';
import type { Goal, KeyResult } from '@/types';

export function GoalsView() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { data: goals, isLoading } = useGoals(activeTab);
  const { data: areas } = useLifeAreas();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const awardXp = useAppStore((state) => state.awardXp);

  const handleToggleGoalStatus = (goal: Goal) => {
    const completing = goal.status !== 'completed';
    updateGoal.mutate({
      id: goal.id,
      updates: {
        status: completing ? 'completed' : 'active',
        completed_at: completing ? new Date().toISOString() : null,
        progress: completing ? 100 : goal.progress,
      },
    }, {
      onSuccess: () => {
        if (completing) {
          awardXp(goal.xp_reward || 500, 'Goal Completed');
        }
      },
    });
  };

  const handleUpdateKeyResultValue = (goal: Goal & { key_results?: KeyResult[] }, krId: string, nextValue: number) => {
    const krs = goal.key_results || [];
    const updatedKRs = krs.map((kr) =>
      kr.id === krId ? { ...kr, current_value: Math.max(0, nextValue) } : kr
    );
    const totalProgress =
      updatedKRs.length > 0
        ? Math.round(
            updatedKRs.reduce((sum, kr) => {
              const pct = kr.target_value > 0 ? Math.min(100, (kr.current_value / kr.target_value) * 100) : 0;
              return sum + pct;
            }, 0) / updatedKRs.length
          )
        : goal.progress;

    updateGoal.mutate({
      id: goal.id,
      updates: {
        key_results: updatedKRs as any,
        progress: totalProgress,
      } as any,
    });
  };

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
          onClick={() => { setSelectedGoal(null); setShowGoalModal(true); }}
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
            <GoalCard
              key={goal.id}
              goal={goal as any}
              index={index}
              onEdit={() => { setSelectedGoal(goal as any); setShowGoalModal(true); }}
              onDelete={() => deleteGoal.mutate(goal.id)}
              onToggleComplete={() => handleToggleGoalStatus(goal)}
              onUpdateKR={(krId, val) => handleUpdateKeyResultValue(goal as any, krId, val)}
            />
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

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <GoalModal 
            onClose={() => setShowGoalModal(false)} 
            areas={areas || []} 
            goal={selectedGoal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({
  goal,
  index,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateKR,
}: {
  goal: Goal & { life_area?: any; key_results?: any[] };
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onUpdateKR: (krId: string, val: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const area = goal.life_area;
  const progress = goal.progress || 0;
  const isCompleted = goal.status === 'completed';

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

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleComplete}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                isCompleted
                  ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
              )}
              title={isCompleted ? 'Reopen Goal' : 'Mark Goal Complete'}
              aria-label={isCompleted ? 'Reopen Goal' : 'Mark Goal Complete'}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label={expanded ? 'Collapse Key Results' : 'Expand Key Results'}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false); }}
                className="p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                aria-label="Goal options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false); }} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-20"
                    >
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onToggleComplete(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {isCompleted ? 'Reopen' : 'Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirmDelete) {
                            setConfirmDelete(true);
                            return;
                          }
                          setMenuOpen(false);
                          setConfirmDelete(false);
                          onDelete();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> {confirmDelete ? 'Confirm?' : 'Delete'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
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
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  color={area?.color || '#3b82f6'}
                  index={i}
                  onUpdateValue={(val) => onUpdateKR(kr.id, val)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function KeyResultRow({
  kr,
  color,
  index,
  onUpdateValue,
}: {
  kr: KeyResult;
  color: string;
  index: number;
  onUpdateValue: (val: number) => void;
}) {
  const krProgress = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
  const step = kr.target_value >= 20 ? 10 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3"
    >
      <button
        type="button"
        onClick={() => onUpdateValue(krProgress >= 100 ? 0 : kr.target_value)}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors",
          krProgress >= 100 ? "border-green-500 bg-green-500" : "border-muted-foreground hover:border-primary"
        )}
        title={krProgress >= 100 ? 'Reset Key Result' : 'Mark Key Result 100%'}
      >
        {krProgress >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </button>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm">{kr.title}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateValue(Math.max(0, kr.current_value - step))}
              className="px-1.5 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 cursor-pointer"
              title="Decrease progress"
            >
              -
            </button>
            <span className="text-xs font-medium tabular-nums min-w-[60px] text-center">
              {kr.current_value}/{kr.target_value} {kr.unit}
            </span>
            <button
              type="button"
              onClick={() => onUpdateValue(Math.min(kr.target_value, kr.current_value + step))}
              className="px-1.5 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 cursor-pointer"
              title="Increase progress"
            >
              +
            </button>
          </div>
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

function GoalModal({ onClose, areas, goal }: { onClose: () => void; areas: any[]; goal?: Goal | null }) {
  const defaultTargetDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [areaId, setAreaId] = useState(goal?.life_area_id || areas[0]?.id || '');
  const [priority, setPriority] = useState(goal?.priority || 3);
  const [targetDate, setTargetDate] = useState(goal?.target_date || defaultTargetDate);

  const initialKeyResults = goal?.key_results && goal.key_results.length > 0
    ? goal.key_results.map(kr => ({ id: kr.id, title: kr.title, current_value: kr.current_value || 0, target_value: kr.target_value, unit: kr.unit || '%' }))
    : [{ id: undefined as string | undefined, title: '', current_value: 0, target_value: 100, unit: '%' }];

  const [keyResults, setKeyResults] = useState(initialKeyResults);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const handleSubmit = () => {
    if (!title.trim() || !areaId || !targetDate) return;

    const validKRs = keyResults.filter(kr => kr.title.trim());
    const computedProgress = validKRs.length > 0
      ? Math.round(
          validKRs.reduce((sum, kr) => sum + (kr.target_value > 0 ? Math.min(100, (kr.current_value / kr.target_value) * 100) : 0), 0) / validKRs.length
        )
      : (goal?.progress ?? 0);

    const goalData = {
      title: title.trim(),
      description: description.trim() || null,
      life_area_id: areaId,
      priority,
      target_date: targetDate,
      progress: computedProgress,
      key_results: validKRs as any,
    };

    onClose();
    if (goal) {
      updateGoal.mutate({ id: goal.id, updates: goalData });
    } else {
      createGoal.mutate({
        ...goalData,
        start_date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const addKeyResult = () => {
    setKeyResults([...keyResults, { id: undefined, title: '', current_value: 0, target_value: 100, unit: '%' }]);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults((prev) => prev.filter((_, i) => i !== index));
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
            <h2 className="text-xl font-bold">{goal ? 'Edit Goal' : 'Create New Goal'}</h2>
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
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => {
                        const newKRs = [...keyResults];
                        newKRs[i].title = e.target.value;
                        setKeyResults(newKRs);
                      }}
                      placeholder={`Key result ${i + 1}`}
                      className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="number"
                      min="1"
                      value={kr.target_value}
                      onChange={(e) => {
                        const newKRs = [...keyResults];
                        newKRs[i].target_value = Number(e.target.value);
                        setKeyResults(newKRs);
                      }}
                      title="Target value"
                      className="w-16 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="text"
                      value={kr.unit}
                      onChange={(e) => {
                        const newKRs = [...keyResults];
                        newKRs[i].unit = e.target.value;
                        setKeyResults(newKRs);
                      }}
                      placeholder="%"
                      title="Unit (e.g. %, tasks, hrs)"
                      className="w-14 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyResult(i)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      aria-label="Remove key result"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addKeyResult}
                className="mt-2 text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add key result
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {goal && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  deleteGoal.mutate(goal.id);
                  onClose();
                }}
                className="px-4 py-3 text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-xl font-medium text-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {confirmDelete ? 'Confirm?' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim() || !areaId || !targetDate || updateGoal.isPending || createGoal.isPending}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
