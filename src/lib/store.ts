import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, LifeArea, Goal, Task, Habit, FocusSession, DailyLog, Badge, UserBadge, TimeBlock } from '@/types/types';

interface AppState {
  // Auth
  user: Profile | null;
  setUser: (user: Profile | null) => void;

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
  setFocusTimerState: (state: Partial<AppState>) => void;
  resetFocusTimer: () => void;

  // Gamification
  showLevelUp: boolean;
  levelUpData: { level: number; title: string } | null;
  triggerLevelUp: (level: number, title: string) => void;
  dismissLevelUp: () => void;

  // Preferences
  preferredView: 'list' | 'board' | 'calendar';
  setPreferredView: (view: 'list' | 'board' | 'calendar') => void;

  // Timetable Custom Blocks
  timeBlocks: TimeBlock[];
  addTimeBlock: (block: Omit<TimeBlock, 'id'>) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;
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
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'CEO',
        full_name: 'FlowState CEO',
        avatar_url: null,
        timezone: 'UTC',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        total_focus_minutes: 0,
        current_streak: 0,
        longest_streak: 0,
        daily_xp_cap: 1000,
        weekly_review_day: 0,
        morning_reminder: '08:00',
        evening_reminder: '20:00',
      } as Profile,
      setUser: (user) => set({ user }),

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
      setFocusTimerState: (newState) => set((state) => ({ ...state, ...newState })),
      resetFocusTimer: () => set({
        focusTimerActive: false,
        focusTimerPaused: false,
        focusSessionId: null,
        focusSelectedTask: null,
        focusStartedAt: null,
        focusPausedAt: null,
        focusElapsedBeforePause: 0,
      }),

      showLevelUp: false,
      levelUpData: null,
      triggerLevelUp: (level, title) => set({ showLevelUp: true, levelUpData: { level, title } }),
      dismissLevelUp: () => set({ showLevelUp: false, levelUpData: null }),

      preferredView: 'list',
      setPreferredView: (view) => set({ preferredView: view }),

      timeBlocks: [
        { id: '1', title: 'Online Classes (Primary)', startHour: 8.5, durationHours: 9, color: 'bg-primary/10 text-primary border-primary/20', days: [1, 2, 3, 4, 5] },
        { id: '2', title: 'Market Monitoring (Secondary)', startHour: 9.25, durationHours: 6.25, color: 'bg-zinc-800 text-zinc-100 border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-300 left-2 right-2 z-20 pointer-events-none shadow-md opacity-90', days: [1, 2, 3, 4, 5] },
        { id: '3', title: 'English Comm', startHour: 6.25, durationHours: 0.75, color: 'bg-muted text-foreground border-border', days: [1, 2, 3, 4, 5] },
        { id: '4', title: 'Coding Practice', startHour: 18, durationHours: 1.5, color: 'bg-secondary text-secondary-foreground border-secondary', days: [1, 2, 3, 4, 5] },
        { id: '5', title: 'Project Dev', startHour: 20, durationHours: 1.5, color: 'bg-accent text-accent-foreground border-border', days: [1, 2, 3, 4, 5] },
        { id: '6', title: 'Recall Session', startHour: 21.5, durationHours: 0.5, color: 'bg-muted text-foreground border-border', days: [1, 2, 3, 4, 5] },
      ],
      addTimeBlock: (block) => set((state) => ({ 
        timeBlocks: [...state.timeBlocks, { ...block, id: Math.random().toString(36).substring(7) }] 
      })),
      updateTimeBlock: (id, updates) => set((state) => ({
        timeBlocks: state.timeBlocks.map(tb => tb.id === id ? { ...tb, ...updates } : tb)
      })),
      deleteTimeBlock: (id) => set((state) => ({
        timeBlocks: state.timeBlocks.filter(tb => tb.id !== id)
      })),
    }),
    {
      name: 'flowstate-store',
      partialize: (state) => ({ 
        preferredView: state.preferredView,
        timeBlocks: state.timeBlocks,
        focusTimerActive: state.focusTimerActive,
        focusTimerPaused: state.focusTimerPaused,
        focusSessionId: state.focusSessionId,
        focusSelectedTask: state.focusSelectedTask,
        focusDuration: state.focusDuration,
        focusStartedAt: state.focusStartedAt,
        focusPausedAt: state.focusPausedAt,
        focusElapsedBeforePause: state.focusElapsedBeforePause,
      }),
    }
  )
);
