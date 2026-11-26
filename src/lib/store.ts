import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateLevel, getLevelTitle } from '@/types/types';
import type { Profile, LifeArea, Goal, Task, Habit, FocusSession, DailyLog, Badge, UserBadge, TimeBlock } from '@/types/types';

export interface DistractionSettings {
  phoneAwayCheck: boolean;
}

export interface MinimumDayTarget {
  targetTasks: number;
  targetSessions: number;
}

interface AppState {
  // Auth
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  resetUserStore: () => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;

  // Notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Focus Mode
  isFocusMode: boolean;
  activeFocusSession: FocusSession | null;
  setFocusMode: (active: boolean) => void;
  setActiveFocusSession: (session: FocusSession | null) => void;

  // Focus Timer Client State
  focusTimerActive: boolean;
  focusTimerPaused: boolean;
  focusSessionId: string | null;
  focusSelectedTask: string | null;
  focusDuration: number; // in minutes
  focusStartedAt: number | null; // timestamp
  focusPausedAt: number | null; // timestamp
  focusElapsedBeforePause: number; // seconds
  interruptionNotes: string[];
  setFocusTimerState: (state: Partial<AppState>) => void;
  resetFocusTimer: () => void;
  addInterruptionNote: (note: string) => void;

  // Distraction & Routine Settings
  distractionSettings: DistractionSettings;
  setDistractionSettings: (settings: Partial<DistractionSettings>) => void;
  minimumDayTarget: MinimumDayTarget;
  setMinimumDayTarget: (target: Partial<MinimumDayTarget>) => void;
  dailyFocusTargetMinutes: number;
  setDailyFocusTargetMinutes: (minutes: number) => void;

  // Local Offline & Fallback Data Stores
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;

  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  focusSessions: FocusSession[];
  setFocusSessions: (sessions: FocusSession[]) => void;
  addFocusSession: (session: FocusSession) => void;
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => void;

  dailyLogs: Record<string, DailyLog>;
  upsertDailyLogState: (date: string, log: Partial<DailyLog>) => void;

  // Gamification
  showLevelUp: boolean;
  levelUpData: { level: number; title: string } | null;
  triggerLevelUp: (level: number, title: string) => void;
  dismissLevelUp: () => void;
  awardXp: (amount: number, reason: string) => void;

  // Preferences
  preferredView: 'list' | 'board' | 'calendar';
  setPreferredView: (view: 'list' | 'board' | 'calendar') => void;

  // Timetable Custom Blocks
  timeBlocks: TimeBlock[];
  setTimeBlocks: (blocks: TimeBlock[]) => void;
  addTimeBlock: (block: Omit<TimeBlock, 'id'> & { id?: string }) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;

  // Daily Scorecard Local State
  dailyScores: Record<string, Record<string, boolean>>;
  updateDailyScore: (date: string, scoreId: string, value: boolean) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      resetUserStore: () =>
        set({
          user: null,
          tasks: [],
          habits: [],
          goals: [],
          focusSessions: [],
          dailyLogs: {},
          timeBlocks: [],
          dailyScores: {},
          interruptionNotes: [],
          focusTimerActive: false,
          focusTimerPaused: false,
          focusSessionId: null,
          focusSelectedTask: null,
          activeFocusSession: null,
          isFocusMode: false,
        }),

      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      activeModal: null,
      modalData: null,
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => get().removeToast(id), toast.duration || 4000);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      isFocusMode: false,
      activeFocusSession: null,
      setFocusMode: (active) => set({ isFocusMode: active }),
      setActiveFocusSession: (session) => set({ activeFocusSession: session }),

      focusTimerActive: false,
      focusTimerPaused: false,
      focusSessionId: null,
      focusSelectedTask: null,
      focusDuration: 25,
      focusStartedAt: null,
      focusPausedAt: null,
      focusElapsedBeforePause: 0,
      interruptionNotes: [],
      setFocusTimerState: (newState) => set((state) => ({ ...state, ...newState })),
      resetFocusTimer: () => set({
        focusTimerActive: false,
        focusTimerPaused: false,
        focusSessionId: null,
        focusSelectedTask: null,
        focusStartedAt: null,
        focusPausedAt: null,
        focusElapsedBeforePause: 0,
        interruptionNotes: [],
      }),
      addInterruptionNote: (note) => set((state) => ({
        interruptionNotes: [...state.interruptionNotes, note]
      })),

      distractionSettings: {
        phoneAwayCheck: true,
      },
      setDistractionSettings: (settings) => set((state) => ({
        distractionSettings: { ...state.distractionSettings, ...settings }
      })),

      minimumDayTarget: {
        targetTasks: 1,
        targetSessions: 2,
      },
      setMinimumDayTarget: (target) => set((state) => ({
        minimumDayTarget: { ...state.minimumDayTarget, ...target }
      })),

      dailyFocusTargetMinutes: 120, // 2 hours default
      setDailyFocusTargetMinutes: (minutes) => set({ dailyFocusTargetMinutes: minutes }),

      // Tasks
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => {
        const exists = state.tasks.some(t => t.id === task.id);
        if (exists) return { tasks: state.tasks.map(t => t.id === task.id ? task : t) };
        return { tasks: [task, ...state.tasks] };
      }),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),

      // Habits
      habits: [],
      setHabits: (habits) => set({ habits }),
      addHabit: (habit) => set((state) => {
        const exists = state.habits.some(h => h.id === habit.id);
        if (exists) return { habits: state.habits.map(h => h.id === habit.id ? habit : h) };
        return { habits: [...state.habits, habit] };
      }),
      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updates, updated_at: new Date().toISOString() } : h)
      })),
      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter(h => h.id !== id)
      })),

      // Goals
      goals: [],
      setGoals: (goals) => set({ goals }),
      addGoal: (goal) => set((state) => {
        const exists = state.goals.some(g => g.id === goal.id);
        if (exists) return { goals: state.goals.map(g => g.id === goal.id ? goal : g) };
        return { goals: [...state.goals, goal] };
      }),
      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g)
      })),
      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      })),

      // Focus Sessions
      focusSessions: [],
      setFocusSessions: (sessions) => set({ focusSessions: sessions }),
      addFocusSession: (session) => set((state) => {
        const exists = state.focusSessions.some(s => s.id === session.id);
        if (exists) return { focusSessions: state.focusSessions.map(s => s.id === session.id ? session : s) };
        return { focusSessions: [session, ...state.focusSessions] };
      }),
      updateFocusSession: (id, updates) => set((state) => ({
        focusSessions: state.focusSessions.map(s => s.id === id ? { ...s, ...updates } : s)
      })),

      // Daily Logs
      dailyLogs: {},
      upsertDailyLogState: (date, log) => set((state) => {
        const current = state.dailyLogs[date] || {
          id: `log-${date}`,
          user_id: state.user?.id || '11111111-1111-1111-1111-111111111111',
          log_date: date,
          productivity_score: 80,
          focus_hours: 0,
          tasks_completed: 0,
          tasks_planned: 0,
          habits_completed: 0,
          xp_earned: 0,
          morning_completed_at: null,
          evening_completed_at: null,
          top_wins: [],
          gratitude_note: null,
          day_rating: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          dailyLogs: {
            ...state.dailyLogs,
            [date]: { ...current, ...log, updated_at: new Date().toISOString() }
          }
        };
      }),

      // Gamification
      showLevelUp: false,
      levelUpData: null,
      triggerLevelUp: (level, title) => set({ showLevelUp: true, levelUpData: { level, title } }),
      dismissLevelUp: () => set({ showLevelUp: false, levelUpData: null }),
      awardXp: (amount, reason) => {
        if (!amount || amount <= 0) return;
        set((state) => {
          if (!state.user) return state;
          const newXp = (state.user.xp || 0) + amount;
          const newLevel = calculateLevel(newXp);
          const currentLevel = state.user.level || 1;
          if (newLevel > currentLevel) {
            setTimeout(() => {
              get().triggerLevelUp(newLevel, getLevelTitle(newLevel));
            }, 0);
          }
          return {
            user: {
              ...state.user,
              xp: newXp,
              level: newLevel,
            }
          };
        });
        if (typeof window !== 'undefined') {
          fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason }),
          }).catch(() => {});
        }
      },

      preferredView: 'list',
      setPreferredView: (view) => set({ preferredView: view }),

      timeBlocks: [],
      setTimeBlocks: (blocks) => set({ timeBlocks: blocks }),
      addTimeBlock: (block) => set((state) => {
        const id = block.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }));
        const nextBlock = { ...block, id };
        const exists = state.timeBlocks.some(tb => tb.id === id);
        if (exists) return { timeBlocks: state.timeBlocks.map(tb => tb.id === id ? nextBlock : tb) };
        return { timeBlocks: [...state.timeBlocks, nextBlock] };
      }),
      updateTimeBlock: (id, updates) => set((state) => ({
        timeBlocks: state.timeBlocks.map(tb => tb.id === id ? { ...tb, ...updates } : tb)
      })),
      deleteTimeBlock: (id) => set((state) => ({
        timeBlocks: state.timeBlocks.filter(tb => tb.id !== id)
      })),

      dailyScores: {},
      updateDailyScore: (date, scoreId, value) => set((state) => ({
        dailyScores: {
          ...state.dailyScores,
          [date]: {
            ...(state.dailyScores[date] || {}),
            [scoreId]: value
          }
        }
      })),
    }),
    {
      name: 'flowstate-store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            tasks: persistedState.tasks || [],
            habits: persistedState.habits || [],
            goals: persistedState.goals || [],
            focusSessions: persistedState.focusSessions || [],
            dailyLogs: persistedState.dailyLogs || {},
            distractionSettings: persistedState.distractionSettings || { phoneAwayCheck: true },
            minimumDayTarget: persistedState.minimumDayTarget || { targetTasks: 1, targetSessions: 2 },
            dailyFocusTargetMinutes: persistedState.dailyFocusTargetMinutes || 120,
            interruptionNotes: persistedState.interruptionNotes || [],
          };
        }
        return persistedState;
      },
      partialize: (state) => ({ 
        preferredView: state.preferredView,
        focusTimerActive: state.focusTimerActive,
        focusTimerPaused: state.focusTimerPaused,
        focusSessionId: state.focusSessionId,
        focusSelectedTask: state.focusSelectedTask,
        focusDuration: state.focusDuration,
        focusStartedAt: state.focusStartedAt,
        focusPausedAt: state.focusPausedAt,
        focusElapsedBeforePause: state.focusElapsedBeforePause,
        interruptionNotes: state.interruptionNotes,
        distractionSettings: state.distractionSettings,
        minimumDayTarget: state.minimumDayTarget,
        dailyFocusTargetMinutes: state.dailyFocusTargetMinutes,
      }),
    }
  )
);
