'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Timer,
  Zap,
  Target,
  TrendingUp,
  Coffee,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTasks, useStartFocusSession, useEndFocusSession, useFocusSessions } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn, formatDuration } from '@/lib/utils';

const PRESETS = [
  { name: 'Pomodoro', minutes: 25, color: 'bg-red-500' },
  { name: 'Deep Work', minutes: 50, color: 'bg-purple-500' },
  { name: 'Flow State', minutes: 90, color: 'bg-blue-500' },
];

export function FocusTimer() {
  const {
    focusTimerActive: isActive,
    focusTimerPaused: isPaused,
    focusSessionId: sessionId,
    focusSelectedTask: selectedTask,
    focusDuration: selectedDuration,
    focusStartedAt,
    focusElapsedBeforePause,
    setFocusTimerState,
    resetFocusTimer
  } = useAppStore();

  const [now, setNow] = useState(Date.now());
  const [flowRating, setFlowRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const { data: tasks } = useTasks();
  const { data: sessions } = useFocusSessions();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();
  const addToast = useAppStore((state) => state.addToast);

  const totalFocusMinutes = sessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0;

  let elapsed = focusElapsedBeforePause;
  if (isActive && !isPaused && focusStartedAt) {
    elapsed += Math.floor((now - focusStartedAt) / 1000);
  }
  const timeLeft = Math.max(0, selectedDuration * 60 - elapsed);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft]);

  const handleStart = async () => {
    const task = tasks?.find(t => t.id === selectedTask);

    const session = await startSession.mutateAsync({
      task_id: selectedTask || null,
      life_area_id: task?.life_area_id || null,
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
      addToast({ type: 'info', title: 'Focus session started', description: `${selectedDuration} minutes of deep work` });
    }
  };

  const handlePause = () => {
    if (!isPaused) {
      setFocusTimerState({
        focusTimerPaused: true,
        focusPausedAt: Date.now(),
        focusElapsedBeforePause: focusElapsedBeforePause + Math.floor((Date.now() - (focusStartedAt || Date.now())) / 1000),
      });
    } else {
      setFocusTimerState({
        focusTimerPaused: false,
        focusStartedAt: Date.now(),
        focusPausedAt: null,
      });
    }
  };

  const handleStop = () => {
    setFocusTimerState({ focusTimerActive: false, focusTimerPaused: false });
    setShowRating(true);
  };

  const handleComplete = () => {
    setFocusTimerState({ focusTimerActive: false, focusTimerPaused: false });
    setShowRating(true);
  };

  const handleRateAndSave = async () => {
    if (!sessionId) return;

    const actualDuration = selectedDuration * 60 - timeLeft;

    await endSession.mutateAsync({
      id: sessionId,
      updates: {
        ended_at: new Date().toISOString(),
        actual_duration: Math.floor(actualDuration / 60),
        status: 'completed',
        flow_rating: flowRating,
      },
    });

    setShowRating(false);
    resetFocusTimer();
    setFlowRating(0);
    addToast({ type: 'success', title: 'Focus session saved!', description: `+${Math.floor(actualDuration / 60)} XP earned` });
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Focus Session</h1>
        <p className="text-muted-foreground mt-1">
          {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m total focus time today
        </p>
      </div>

      {/* Timer Card */}
      <div className="bg-card rounded-3xl border border-border p-8">
        {!isActive && !showRating && (
          <div className="space-y-6">
            {/* Duration Presets */}
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setFocusTimerState({ focusDuration: preset.minutes });
                  }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    selectedDuration === preset.minutes
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <p className="font-semibold">{preset.name}</p>
                  <p className="text-sm text-muted-foreground">{preset.minutes} min</p>
                </button>
              ))}
            </div>

            {/* Task Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Link to Task (optional)</label>
              <select
                value={selectedTask || ''}
                onChange={(e) => setFocusTimerState({ focusSelectedTask: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">No specific task</option>
                {tasks?.map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Focus Session
            </button>
          </div>
        )}

        {isActive && (
          <div className="text-center space-y-8">
            {/* Progress Ring */}
            <div className="relative w-64 h-64 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-accent"
                />
                <motion.circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="text-sm text-muted-foreground mt-2">
                  {isPaused ? 'Paused' : 'Focusing...'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePause}
                className="p-4 rounded-full bg-accent hover:bg-accent/80 transition-colors"
              >
                {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </button>
              <button
                onClick={handleStop}
                className="p-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                <Square className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-4 rounded-full bg-accent hover:bg-accent/80 transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}

        {showRating && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Session Complete!</h3>
            <p className="text-muted-foreground">How was your focus?</p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFlowRating(rating)}
                  className={cn(
                    "w-10 h-10 rounded-lg font-semibold transition-all",
                    flowRating === rating
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-accent text-muted-foreground hover:bg-accent/80"
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>

            <button
              onClick={handleRateAndSave}
              disabled={flowRating === 0}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Save Session
            </button>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      {sessions && sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Today&apos;s Sessions</h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {sessions.map((session: any) => (
              <div key={session.id} className="flex items-center gap-4 p-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  session.status === 'completed' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  <Timer className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {session.task?.title || 'Focus Session'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(session.actual_duration || 0)} · {session.status}
                  </p>
                </div>
                {session.flow_rating && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    {session.flow_rating}/10
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
