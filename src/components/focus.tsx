'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Timer,
  Zap,
  Target,
  Coffee,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  StickyNote,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  X,
  Plus,
} from 'lucide-react';
import { useTasks, useStartFocusSession, useEndFocusSession, useFocusSessions, useCompleteTask } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDuration, getToday } from '@/lib/utils';
import type { Task } from '@/types/types';

interface Preset {
  name: string;
  minutes: number;
  tagline: string;
}

const PRESETS: Preset[] = [
  { name: 'Pomodoro', minutes: 25, tagline: 'Classic focus interval' },
  { name: 'Deep Work', minutes: 50, tagline: 'High-cognitive intensity' },
  { name: 'Flow State', minutes: 90, tagline: 'Extended immersive building' },
  { name: '5-Minute Start', minutes: 5, tagline: 'Break starting friction' },
];

export function FocusTimer() {
  const isActive = useAppStore((state) => state.focusTimerActive);
  const isPaused = useAppStore((state) => state.focusTimerPaused);
  const sessionId = useAppStore((state) => state.focusSessionId);
  const selectedTaskId = useAppStore((state) => state.focusSelectedTask);
  const selectedDuration = useAppStore((state) => state.focusDuration);
  const focusStartedAt = useAppStore((state) => state.focusStartedAt);
  const focusPausedAt = useAppStore((state) => state.focusPausedAt);
  const focusElapsedBeforePause = useAppStore((state) => state.focusElapsedBeforePause);
  const interruptionNotes = useAppStore((state) => state.interruptionNotes);
  const distractionSettings = useAppStore((state) => state.distractionSettings);
  const setDistractionSettings = useAppStore((state) => state.setDistractionSettings);
  const setFocusTimerState = useAppStore((state) => state.setFocusTimerState);
  const resetFocusTimer = useAppStore((state) => state.resetFocusTimer);
  const addInterruptionNote = useAppStore((state) => state.addInterruptionNote);
  const addToast = useAppStore((state) => state.addToast);

  const [now, setNow] = useState(Date.now());
  const [flowRating, setFlowRating] = useState<number>(0);
  const [reflectionNote, setReflectionNote] = useState('');
  const [markTaskCompleteOnSave, setMarkTaskCompleteOnSave] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customMinutesInput, setCustomMinutesInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  // Distraction Support Modals
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [currentDistractionNote, setCurrentDistractionNote] = useState('');
  const [fiveMinuteExtended, setFiveMinuteExtended] = useState(false);

  const { data: tasks } = useTasks();
  const { data: sessions } = useFocusSessions();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();
  const completeTask = useCompleteTask();

  const linkedTask = tasks?.find((t) => t.id === selectedTaskId) || null;

  // Sound chime with Web Audio API (cross-browser, no assets needed)
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Tab visibility reconciliation (prevents timer lag when tab was inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setNow(Date.now());
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate elapsed & timeLeft robustly from timestamps
  let elapsed = focusElapsedBeforePause;
  if (isActive && !isPaused && focusStartedAt) {
    elapsed += Math.floor((now - focusStartedAt) / 1000);
  }
  const totalSeconds = selectedDuration * 60;
  const timeLeft = Math.max(0, totalSeconds - elapsed);

  // Interval ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 500);
    } else if (isActive && timeLeft === 0) {
      playChime();
      handleNaturalFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft, playChime]);

  const handleNaturalFinish = () => {
    setFocusTimerState({ focusTimerActive: false, focusTimerPaused: false });
    setShowRating(true);
    addToast({ type: 'success', title: 'Focus session completed!' });
  };

  const handleStart = async () => {
    // Prevent overlapping sessions
    if (isActive) return;

    const session = await startSession.mutateAsync({
      task_id: selectedTaskId || null,
      life_area_id: linkedTask?.life_area_id || null,
      planned_duration: selectedDuration,
      started_at: new Date().toISOString(),
    });

    if (session) {
      setFocusTimerState({
        focusSessionId: session.id,
        focusTimerActive: true,
        focusTimerPaused: false,
        focusStartedAt: Date.now(),
        focusElapsedBeforePause: 0,
      });
      setNow(Date.now());
      setFiveMinuteExtended(false);
      addToast({
        type: 'info',
        title: 'Focus session active',
        description: `${selectedDuration} minutes of undisturbed work`,
      });
    }
  };

  const handlePauseToggle = () => {
    if (!isPaused) {
      const addedElapsed = focusElapsedBeforePause + Math.floor((Date.now() - (focusStartedAt || Date.now())) / 1000);
      setFocusTimerState({
        focusTimerPaused: true,
        focusPausedAt: Date.now(),
        focusElapsedBeforePause: addedElapsed,
      });
    } else {
      setFocusTimerState({
        focusTimerPaused: false,
        focusStartedAt: Date.now(),
        focusPausedAt: null,
      });
      setNow(Date.now());
    }
  };

  // Finish early and record actual elapsed time
  const handleFinishEarly = () => {
    setFocusTimerState({ focusTimerActive: false, focusTimerPaused: false });
    setShowRating(true);
  };

  // Discard / Cancel session
  const handleConfirmCancel = async () => {
    if (sessionId) {
      const actualMinutes = Math.floor(elapsed / 60);
      await endSession.mutateAsync({
        id: sessionId,
        updates: {
          ended_at: new Date().toISOString(),
          actual_duration: actualMinutes,
          status: 'cancelled',
          interruption_notes: interruptionNotes,
        },
      });
    }
    setShowCancelConfirm(false);
    resetFocusTimer();
  };

  // Save completed session rating and reflections
  const handleSaveCompletedSession = async () => {
    const actualSeconds = selectedDuration * 60 - timeLeft;
    const actualMinutes = Math.max(1, Math.round(actualSeconds / 60));

    if (sessionId) {
      await endSession.mutateAsync({
        id: sessionId,
        updates: {
          ended_at: new Date().toISOString(),
          actual_duration: actualMinutes,
          status: 'completed',
          flow_rating: flowRating || 8,
          notes: reflectionNote.trim() || null,
          reflection_notes: reflectionNote.trim() || null,
          interruption_notes: interruptionNotes,
        },
      });
    }

    // Complete linked task if requested
    if (markTaskCompleteOnSave && selectedTaskId) {
      completeTask.mutate({ id: selectedTaskId, xpReward: 25 });
    }

    setShowRating(false);
    resetFocusTimer();
    setFlowRating(0);
    setReflectionNote('');
  };

  const handleAddDistractionNote = () => {
    if (!currentDistractionNote.trim()) return;
    addInterruptionNote(currentDistractionNote.trim());
    addToast({
      type: 'info',
      title: 'Distraction logged',
      description: 'Saved safely. Refocus on current task.',
    });
    setCurrentDistractionNote('');
    setShowDistractionModal(false);
  };

  const handleCustomDurationApply = () => {
    const mins = parseInt(customMinutesInput, 10);
    if (mins && mins > 0 && mins <= 180) {
      setFocusTimerState({ focusDuration: mins });
      setIsCustomMode(false);
    }
  };

  // Timer formatted values
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  // Real today focus minutes
  const totalFocusMinutes = sessions?.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0;

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Focus Chamber</h1>
        <p className="text-sm text-muted-foreground">
          {formatDuration(totalFocusMinutes)} focused today · Quiet momentum
        </p>
      </div>

      {/* Main Timer Display Card */}
      <div className="bg-card rounded-3xl border border-border p-6 sm:p-10 shadow-sm relative overflow-hidden">
        {/* STATE 1: READY (Setup before starting) */}
        {!isActive && !showRating && (
          <div className="space-y-8">
            {/* Preset Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Session Preset
                </label>
                <button
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  {isCustomMode ? 'Show presets' : 'Custom duration'}
                </button>
              </div>

              {isCustomMode ? (
                <div className="flex items-center gap-2 p-2 bg-accent/40 rounded-2xl border border-border">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="Enter minutes (e.g. 45)"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    className="flex-1 bg-background px-4 py-2.5 rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleCustomDurationApply}
                    className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Set
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedDuration === preset.minutes;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => setFocusTimerState({ focusDuration: preset.minutes })}
                        className={cn(
                          "p-3.5 rounded-2xl border text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"
                        )}
                      >
                        <p className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                          {preset.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{preset.minutes} min</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Task Linkage */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Focus on Task
              </label>
              <select
                value={selectedTaskId || ''}
                onChange={(e) => setFocusTimerState({ focusSelectedTask: e.target.value || null })}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">General deep work (no linked task)</option>
                {tasks?.filter(t => t.status !== 'completed').map((task) => (
                  <option key={task.id} value={task.id}>
                    [{task.priority.toUpperCase()}] {task.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Away Checklist (Distraction Support Feature) */}
            <div className="p-4 rounded-2xl bg-accent/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Phone Away Check</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distractionSettings.phoneAwayCheck}
                    onChange={(e) => setDistractionSettings({ phoneAwayCheck: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {distractionSettings.phoneAwayCheck && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Is your phone outside your line of sight and notifications muted? Friction creates focus.
                </p>
              )}
            </div>

            {/* Starting Support Message */}
            {selectedDuration === 5 && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  <strong>Five-Minute Start active:</strong> Commit only to 5 minutes of low-pressure effort. Once momentum begins, you can extend or finish.
                </p>
              </div>
            )}

            {/* Primary Start Button */}
            <button
              onClick={handleStart}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base hover:bg-primary/90 transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Begin {selectedDuration} Min Session</span>
            </button>
          </div>
        )}

        {/* STATE 2: RUNNING / PAUSED (Active Timer) */}
        {isActive && !showRating && (
          <div className="text-center space-y-8 py-2">
            {/* Current Task Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent text-xs font-semibold text-foreground max-w-sm truncate">
              <Target className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{linkedTask ? linkedTask.title : 'Deep Work Session'}</span>
            </div>

            {/* Progress Circular Timer */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-accent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-300"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight font-mono text-foreground">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-widest mt-3 px-2.5 py-0.5 rounded-full",
                  isPaused ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                )}>
                  {isPaused ? 'Session Paused' : 'In Focus'}
                </span>
              </div>
            </div>

            {/* Session Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={handlePauseToggle}
                className="p-4 rounded-2xl bg-accent hover:bg-accent/80 text-foreground transition-all cursor-pointer shadow-sm"
                title={isPaused ? "Resume session" : "Pause session"}
              >
                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
              </button>

              <button
                onClick={handleFinishEarly}
                className="px-5 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                title="Finish session and save time"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish Early</span>
              </button>

              <button
                onClick={() => setShowCancelConfirm(true)}
                className="p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                title="Cancel or discard session"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => setShowDistractionModal(true)}
                className="p-4 rounded-2xl bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer relative"
                title="Distraction Note: Park an intrusive thought"
              >
                <StickyNote className="w-5 h-5" />
                {interruptionNotes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                    {interruptionNotes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-4 rounded-2xl bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title={soundEnabled ? "Mute chime" : "Enable completion chime"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: COMPLETED (Meaningful Feedback Screen) */}
        {showRating && (
          <div className="text-center space-y-6 py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Session Complete</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You logged {Math.max(1, Math.round((selectedDuration * 60 - timeLeft) / 60))} focused minutes.
              </p>
            </div>

            {/* Flow Rating 1-10 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                How was your focus depth? (1 - 10)
              </label>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFlowRating(rating)}
                    className={cn(
                      "w-9 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer",
                      flowRating === rating
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            {/* Brief Accomplishment Reflection */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Brief Reflection (Optional)
              </label>
              <input
                type="text"
                placeholder="What did you get done or discover?"
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Option to complete linked task */}
            {selectedTaskId && linkedTask && linkedTask.status !== 'completed' && (
              <label className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 border border-border cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={markTaskCompleteOnSave}
                  onChange={(e) => setMarkTaskCompleteOnSave(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-foreground">
                  Mark linked task <strong>&quot;{linkedTask.title}&quot;</strong> as completed
                </span>
              </label>
            )}

            <button
              onClick={handleSaveCompletedSession}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Save Record & Continue
            </button>
          </div>
        )}
      </div>

      {/* Distraction Note Modal (Park thoughts without derailing focus) */}
      <AnimatePresence>
        {showDistractionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDistractionModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Park Intrusive Thought</h3>
                </div>
                <button
                  onClick={() => setShowDistractionModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Write down what distracted you so your brain lets it go. We’ll save it for later review.
              </p>

              <input
                type="text"
                autoFocus
                value={currentDistractionNote}
                onChange={(e) => setCurrentDistractionNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDistractionNote()}
                placeholder="e.g. Check electric bill after 5 PM"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDistractionModal(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDistractionNote}
                  disabled={!currentDistractionNote.trim()}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Save & Return
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Discard Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCancelConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-foreground">Discard Session?</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to cancel? Any elapsed focus time can be saved or discarded.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent rounded-lg"
                >
                  Continue Focusing
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Discard Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Today's Focus History List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Today&apos;s Focus Log</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
                      session.status === 'completed'
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    <Timer className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {session.task?.title || 'Focused Block'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.actual_duration || session.planned_duration} min · {session.status}
                    </p>
                  </div>
                </div>

                {session.flow_rating && (
                  <span className="text-xs font-semibold px-2 py-1 bg-accent text-foreground rounded-lg flex-shrink-0">
                    Flow: {session.flow_rating}/10
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No sessions logged yet today. Click &quot;Begin Session&quot; to begin your first focus block.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
