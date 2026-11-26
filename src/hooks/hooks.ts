import { useEffect, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutateFunction,
  type UseMutateAsyncFunction,
} from '@tanstack/react-query';
import { supabaseBrowser, isSupabaseOnline, isPlaceholderUrl } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type {
  Task,
  Habit,
  Goal,
  FocusSession,
  DailyLog,
  LifeArea,
  Badge,
  UserBadge,
  TimeBlock,
  HabitLog,
} from '@/types/types';
import { getToday, toLocalDateString, generateUUID, isUUID } from '@/lib/utils';

// Life area defaults (used until user's Supabase life_areas load)
export const DEFAULT_LIFE_AREAS: LifeArea[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Career & Work',
    slug: 'career',
    description: 'Professional growth and execution',
    color: '#3b82f6',
    icon: 'Briefcase',
    sort_order: 1,
    is_default: true,
    is_active: true,
    target_hours_per_week: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Learning & Skills',
    slug: 'learning',
    description: 'Technical knowledge and English practice',
    color: '#8b5cf6',
    icon: 'BookOpen',
    sort_order: 2,
    is_default: true,
    is_active: true,
    target_hours_per_week: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Health & Fitness',
    slug: 'fitness',
    description: 'Physical energy, gym, and mental clarity',
    color: '#22c55e',
    icon: 'Dumbbell',
    sort_order: 3,
    is_default: true,
    is_active: true,
    target_hours_per_week: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Finance',
    slug: 'finance',
    description: 'Financial independence and capital',
    color: '#eab308',
    icon: 'Wallet',
    sort_order: 4,
    is_default: true,
    is_active: true,
    target_hours_per_week: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Personal Projects',
    slug: 'personal-projects',
    description: 'FlowState and software building',
    color: '#f97316',
    icon: 'Lightbulb',
    sort_order: 5,
    is_default: true,
    is_active: true,
    target_hours_per_week: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function ensureUUID(id?: string | null): string {
  if (id && isUUID(id)) return id;
  return generateUUID();
}

const activeTabRefetchInterval = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return 60000;
  }
  return false;
};

function withAssignedUUID<TVariables extends { id?: string | null }, TData, TError, TContext>(
  mutation: ReturnType<typeof useMutation<TData, TError, TVariables, TContext>>
) {
  const mutate: UseMutateFunction<TData, TError, TVariables, TContext> = (variables, options) => {
    return mutation.mutate({ ...variables, id: ensureUUID(variables?.id) }, options);
  };
  const mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext> = (variables, options) => {
    return mutation.mutateAsync({ ...variables, id: ensureUUID(variables?.id) }, options);
  };
  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}

async function parseError(res: Response, fallbackMsg: string): Promise<string> {
  try {
    const json = await res.json();
    return json.error || fallbackMsg;
  } catch {
    return fallbackMsg;
  }
}

// ==================== REALTIME CROSS-DEVICE SYNC ====================
export function useRealtimeSync(userId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseOnline() || isPlaceholderUrl) return;

    const channel = supabaseBrowser
      .channel(`user-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habits'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habit-logs'] });
          queryClient.invalidateQueries({ queryKey: ['habits'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['goals'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['daily-log'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_blocks', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['auth'] });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ==================== ONE-TIME LEGACY LOCAL STORAGE MIGRATION ====================
export function useMigrateLocalData(userId?: string | null) {
  const migratedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || migratedRef.current || typeof window === 'undefined') return;
    migratedRef.current = true;

    const migrationKey = `flowstate_db_migrated_${userId}`;
    if (localStorage.getItem(migrationKey)) return;

    (async () => {
      try {
        const rawStore = localStorage.getItem('flowstate-store');
        if (rawStore) {
          const parsed = JSON.parse(rawStore);
          const s = parsed?.state || {};
          const oldTasks: Task[] = Array.isArray(s.tasks) ? s.tasks : [];
          const oldHabits: Habit[] = Array.isArray(s.habits) ? s.habits : [];
          const oldGoals: Goal[] = Array.isArray(s.goals) ? s.goals : [];
          const oldBlocks: TimeBlock[] = Array.isArray(s.timeBlocks) ? s.timeBlocks : [];

          for (const t of oldTasks) {
            await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...t, id: ensureUUID(t.id) }),
            }).catch(() => {});
          }
          for (const h of oldHabits) {
            await fetch('/api/habits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...h, id: ensureUUID(h.id) }),
            }).catch(() => {});
          }
          for (const g of oldGoals) {
            await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...g, id: ensureUUID(g.id) }),
            }).catch(() => {});
          }
          for (const b of oldBlocks) {
            await fetch('/api/time-blocks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...b, id: ensureUUID(b.id) }),
            }).catch(() => {});
          }
        }

        localStorage.setItem(migrationKey, 'true');
        queryClient.invalidateQueries();
      } catch {
        // Ignore parse errors
      }
    })();
  }, [userId, queryClient]);
}

// ==================== AUTH HOOKS ====================
export function useAuth() {
  const storeUser = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to fetch user profile'));
      }
      const data = await res.json();
      const currentUser = data?.user || null;
      if (currentUser) {
        const prevUser = useAppStore.getState().user;
        if (prevUser?.id && prevUser.id !== currentUser.id) {
          useAppStore.getState().resetUserStore();
        }
        setUser(currentUser);
      }
      return currentUser;
    },
    staleTime: 30000,
    refetchInterval: activeTabRefetchInterval,
  });

  return {
    ...query,
    data: query.data ?? storeUser,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetUserStore = useAppStore((state) => state.resetUserStore);

  return async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    if (isSupabaseOnline() && !isPlaceholderUrl) {
      await supabaseBrowser.auth.signOut().catch(() => {});
    }
    resetUserStore();
    queryClient.clear();
    window.location.href = '/login';
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAppStore((state) => state.setUser);
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (updates: {
      full_name?: string;
      username?: string;
      email?: string;
      timezone?: string;
      weekly_review_day?: number;
      daily_xp_cap?: number;
      morning_reminder?: string | null;
      evening_reminder?: string | null;
      preferences?: Record<string, unknown>;
    }) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update profile in database'));
      }
      const data = await res.json();
      return data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['auth'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      addToast({ type: 'success', title: 'Saved to database' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: 'Failed to save changes', description: error.message });
    },
  });
}

// ==================== TASK HOOKS (DB-ONLY) ====================
export function useTasks(date?: string, enabled = true) {
  const targetDate = date || getToday();

  return useQuery<Task[]>({
    queryKey: ['tasks', targetDate],
    queryFn: async (): Promise<Task[]> => {
      const res = await fetch(`/api/tasks?date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load tasks from database'));
      }
      const json = await res.json();
      return (json.tasks || []) as Task[];
    },
    enabled,
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useAllTasks(enabled = true) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: async (): Promise<Task[]> => {
      const res = await fetch('/api/tasks?all=true');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load tasks from database'));
      }
      const json = await res.json();
      return (json.tasks || []) as Task[];
    },
    enabled,
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  const mutation = useMutation({
    onMutate: async (task: Partial<Task>) => {
      const targetDate = task.due_date ? task.due_date.split('T')[0] : getToday();
      const previous = queryClient.getQueryData<Task[]>(['tasks', targetDate]);

      const optimisticTask: Task = {
        id: ensureUUID(task.id),
        user_id: useAppStore.getState().user?.id || '',
        goal_id: task.goal_id || null,
        life_area_id: task.life_area_id || null,
        parent_task_id: null,
        title: task.title || 'New Task',
        description: task.description || task.notes || null,
        notes: task.notes || task.description || null,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        energy_level: task.energy_level || null,
        estimated_minutes: task.estimated_minutes || 25,
        actual_minutes: 0,
        due_date: targetDate,
        scheduled_start: null,
        scheduled_end: null,
        completed_at: null,
        is_recurring: false,
        recurrence_rule: null,
        source: 'user',
        xp_reward: 20,
        sort_order: task.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(['tasks', targetDate], (old = []) => [
        optimisticTask,
        ...old.filter((t) => t.id !== optimisticTask.id),
      ]);

      return { previous, targetDate };
    },
    mutationFn: async (task: Partial<Task>) => {
      const targetDate = task.due_date ? task.due_date.split('T')[0] : getToday();
      const taskId = ensureUUID(task.id);

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, id: taskId, due_date: targetDate }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save task to Supabase'));
      }
      const data = await res.json();
      return data.task as Task;
    },
    onSuccess: (savedTask) => {
      addToast({ type: 'success', title: 'Task saved to database' });
      if (savedTask) {
        const targetDate = savedTask.due_date ? savedTask.due_date.split('T')[0] : getToday();
        queryClient.setQueryData<Task[]>(['tasks', targetDate], (old = []) =>
          old.map((t) => (t.id === savedTask.id ? savedTask : t))
        );
        queryClient.setQueryData<Task[]>(['tasks', 'all'], (old) =>
          old ? [savedTask, ...old.filter((t) => t.id !== savedTask.id)] : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.targetDate) {
        queryClient.setQueryData(['tasks', ctx.targetDate], ctx.previous);
      }
      addToast({ type: 'error', title: 'Could not save task', description: err.message });
    },
  });

  return withAssignedUUID(mutation);
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const awardXp = useAppStore((state) => state.awardXp);

  return useMutation({
    onMutate: async ({
      id,
      status,
    }: {
      id: string;
      xpReward?: number;
      status?: 'completed' | 'pending';
    }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      const targetStatus = status || 'completed';
      const completedAt = targetStatus === 'completed' ? new Date().toISOString() : null;

      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, status: targetStatus, completed_at: completedAt, updated_at: new Date().toISOString() } : t
        )
      );

      return { snapshots };
    },
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      xpReward?: number;
      status?: 'completed' | 'pending';
    }) => {
      const targetStatus = status || 'completed';
      const completedAt = targetStatus === 'completed' ? new Date().toISOString() : null;
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: targetStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update task in database'));
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (data?.task) {
        queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
          old?.map((t) => (t.id === data.task.id ? data.task : t))
        );
      }
      if (vars.status === 'completed') {
        const xp = vars.xpReward || 20;
        awardXp(xp, 'Task Completed');
        addToast({ type: 'success', title: `Task completed! +${xp} XP` });
      } else {
        addToast({ type: 'info', title: 'Task restored to pending' });
      }
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      addToast({ type: 'error', title: 'Database update failed', description: err.message });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
      );
      return { snapshots };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update task'));
      }
      return res.json();
    },
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Task updated' });
      if (data?.task) {
        queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
          old?.map((t) => (t.id === data.task.id ? data.task : t))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      addToast({ type: 'error', title: 'Update failed', description: err.message });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
        old?.filter((t) => t.id !== id)
      );
      return { snapshots };
    },
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to delete task'));
      }
      return id;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Task deleted' });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      addToast({ type: 'error', title: 'Delete failed', description: err.message });
    },
  });
}

// ==================== HABIT HOOKS (DB-ONLY) ====================
export function useHabits(enabled = true) {
  return useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async (): Promise<Habit[]> => {
      const res = await fetch('/api/habits');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load habits from database'));
      }
      const json = await res.json();
      return (json.habits || []) as Habit[];
    },
    enabled,
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useTodayHabitLogs(date?: string) {
  const targetDate = date || getToday();

  return useQuery<HabitLog[]>({
    queryKey: ['habit-logs', 'date', targetDate],
    queryFn: async (): Promise<HabitLog[]> => {
      const res = await fetch(`/api/habit-logs?date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load habit logs from database'));
      }
      const json = await res.json();
      return (json.logs || []) as HabitLog[];
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useHabitLogs(habitId: string, date?: string) {
  const targetDate = date || getToday();

  return useQuery<HabitLog | null>({
    queryKey: ['habit-logs', habitId, targetDate],
    queryFn: async (): Promise<HabitLog | null> => {
      const res = await fetch(`/api/habit-logs?date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load habit log'));
      }
      const json = await res.json();
      const logs = (json.logs || []) as HabitLog[];
      return logs.find((l) => l.habit_id === habitId) || null;
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useCompleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const awardXp = useAppStore((state) => state.awardXp);

  return useMutation({
    onMutate: async ({ habitId, userId }: { habitId: string; userId: string }) => {
      const today = getToday();
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['habit-logs', 'date', today] }),
        queryClient.cancelQueries({ queryKey: ['habits'] }),
      ]);
      const previousLogs = queryClient.getQueryData<HabitLog[]>(['habit-logs', 'date', today]);
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);

      const wasCompleted = Boolean(previousLogs?.some((l) => l.habit_id === habitId));

      queryClient.setQueryData<HabitLog[]>(['habit-logs', 'date', today], (old = []) => {
        if (wasCompleted) {
          return old.filter((l) => l.habit_id !== habitId);
        }
        return [
          ...old,
          {
            id: generateUUID(),
            habit_id: habitId,
            user_id: userId,
            completed_date: today,
            completed_at: new Date().toISOString(),
            duration_minutes: null,
            notes: null,
            mood: null,
          },
        ];
      });

      queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
        old.map((h) => {
          if (h.id !== habitId) return h;
          if (wasCompleted) {
            return {
              ...h,
              streak_current: Math.max(0, (h.streak_current || 1) - 1),
              total_completions: Math.max(0, (h.total_completions || 1) - 1),
            };
          }
          const nextStreak = (h.streak_current || 0) + 1;
          return {
            ...h,
            streak_current: nextStreak,
            streak_longest: Math.max(nextStreak, h.streak_longest || 0),
            total_completions: (h.total_completions || 0) + 1,
          };
        })
      );

      return { previousLogs, previousHabits, today };
    },
    mutationFn: async ({ habitId }: { habitId: string; userId: string }) => {
      const today = getToday();
      const res = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: today }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update habit completion in database'));
      }
      return res.json();
    },
    onSuccess: (data, vars, ctx) => {
      const today = ctx?.today || getToday();
      if (data?.habit) {
        queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
          old.map((h) => (h.id === data.habit.id ? data.habit : h))
        );
      }
      if (data?.completed && data?.log) {
        queryClient.setQueryData<HabitLog[]>(['habit-logs', 'date', today], (old = []) => [
          ...old.filter((l) => l.habit_id !== vars.habitId),
          data.log as HabitLog,
        ]);
        const xp = data?.habit?.xp_reward || 15;
        awardXp(xp, 'Habit Completed');
        addToast({ type: 'success', title: `Habit completed! +${xp} XP` });
      } else {
        queryClient.setQueryData<HabitLog[]>(['habit-logs', 'date', today], (old = []) =>
          old.filter((l) => l.habit_id !== vars.habitId)
        );
        addToast({ type: 'info', title: 'Habit marked as incomplete' });
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previousLogs !== undefined) {
        queryClient.setQueryData(['habit-logs', 'date', ctx.today], ctx.previousLogs);
      }
      if (ctx?.previousHabits !== undefined) {
        queryClient.setQueryData(['habits'], ctx.previousHabits);
      }
      addToast({ type: 'error', title: 'Habit sync failed', description: err.message });
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  const mutation = useMutation({
    onMutate: async (habit: Partial<Habit>) => {
      const previous = queryClient.getQueryData<Habit[]>(['habits']);
      const optimisticHabit: Habit = {
        id: ensureUUID(habit.id),
        user_id: useAppStore.getState().user?.id || '',
        goal_id: habit.goal_id || null,
        life_area_id: habit.life_area_id || null,
        title: habit.title || 'New Habit',
        description: habit.description || null,
        frequency: habit.frequency || 'daily',
        specific_days: habit.specific_days || [1, 2, 3, 4, 5, 6, 7],
        time_of_day: habit.time_of_day || 'anytime',
        target_duration_minutes: habit.target_duration_minutes || null,
        color: habit.color || '#3b82f6',
        icon: habit.icon || 'Flame',
        streak_current: 0,
        streak_longest: 0,
        total_completions: 0,
        xp_reward: 15,
        is_active: true,
        sort_order: habit.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) => [
        ...old.filter((h) => h.id !== optimisticHabit.id),
        optimisticHabit,
      ]);
      return { previous };
    },
    mutationFn: async (habit: Partial<Habit>) => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...habit, id: ensureUUID(habit.id) }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to create habit in database'));
      }
      const data = await res.json();
      return data.habit as Habit;
    },
    onSuccess: (savedHabit) => {
      addToast({ type: 'success', title: 'Habit saved to database' });
      if (savedHabit) {
        queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
          old.map((h) => (h.id === savedHabit.id ? savedHabit : h))
        );
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['habits'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Failed to save habit', description: err.message });
    },
  });

  return withAssignedUUID(mutation);
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previous = queryClient.getQueryData<Habit[]>(['habits']);
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
        old.map((h) => (h.id === id ? { ...h, ...updates, updated_at: new Date().toISOString() } : h))
      );
      return { previous };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update habit'));
      }
      return res.json();
    },
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Habit updated' });
      if (data?.habit) {
        queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
          old.map((h) => (h.id === data.habit.id ? data.habit : h))
        );
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['habits'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Habit update failed', description: err.message });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previous = queryClient.getQueryData<Habit[]>(['habits']);
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) => old.filter((h) => h.id !== id));
      return { previous };
    },
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/habits?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to delete habit'));
      }
      return id;
    },
    onSuccess: (deletedId) => {
      addToast({ type: 'success', title: 'Habit deleted' });
      queryClient.setQueriesData<HabitLog[]>({ queryKey: ['habit-logs'] }, (old) =>
        old?.filter((l) => l.habit_id !== deletedId)
      );
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['habits'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Delete failed', description: err.message });
    },
  });
}

// ==================== GOAL HOOKS (DB-ONLY) ====================
export function useGoals(status: 'active' | 'completed' = 'active') {
  return useQuery<Goal[]>({
    queryKey: ['goals', status],
    queryFn: async (): Promise<Goal[]> => {
      const res = await fetch('/api/goals');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load goals from database'));
      }
      const json = await res.json();
      const allGoals = (json.goals || []) as Goal[];
      return allGoals.filter((g) => g.status === status);
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  const mutation = useMutation({
    onMutate: async (
      goal: Partial<Goal> & { key_results?: { title: string; target_value: number; unit: string }[] }
    ) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const targetStatus = (goal.status as 'active' | 'completed') || 'active';
      const previous = queryClient.getQueryData<Goal[]>(['goals', targetStatus]);
      const goalId = ensureUUID(goal.id);
      const now = new Date().toISOString();
      const optimisticGoal: Goal = {
        id: goalId,
        user_id: useAppStore.getState().user?.id || '',
        life_area_id: goal.life_area_id || DEFAULT_LIFE_AREAS[0].id,
        title: goal.title || 'Untitled Goal',
        description: goal.description || null,
        status: targetStatus,
        priority: goal.priority ?? 3,
        start_date: goal.start_date || now.split('T')[0],
        target_date: goal.target_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        completed_at: null,
        progress: goal.progress ?? 0,
        xp_reward: goal.xp_reward ?? 500,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<Goal[]>(['goals', targetStatus], (old = []) => [
        optimisticGoal,
        ...old.filter((g) => g.id !== goalId),
      ]);
      return { previous, targetStatus };
    },
    mutationFn: async (
      goal: Partial<Goal> & { key_results?: { title: string; target_value: number; unit: string }[] }
    ) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goal, id: ensureUUID(goal.id) }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save goal in database'));
      }
      const data = await res.json();
      return data.goal as Goal;
    },
    onSuccess: (savedGoal, _vars, ctx) => {
      addToast({ type: 'success', title: 'Goal saved to database' });
      const statusKey = (savedGoal?.status as 'active' | 'completed') || ctx?.targetStatus || 'active';
      if (savedGoal) {
        queryClient.setQueryData<Goal[]>(['goals', statusKey], (old = []) => [
          savedGoal,
          ...old.filter((g) => g.id !== savedGoal.id),
        ]);
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.targetStatus) {
        queryClient.setQueryData(['goals', ctx.targetStatus], ctx.previous);
      }
      addToast({ type: 'error', title: 'Goal creation failed', description: err.message });
    },
  });

  return withAssignedUUID(mutation);
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const snapshots = queryClient.getQueriesData<Goal[]>({ queryKey: ['goals'] });
      queryClient.setQueriesData<Goal[]>({ queryKey: ['goals'] }, (old) =>
        old?.map((g) => (g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g))
      );
      return { snapshots };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update goal'));
      }
      return res.json();
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Goal updated' });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      addToast({ type: 'error', title: 'Goal update failed', description: err.message });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const snapshots = queryClient.getQueriesData<Goal[]>({ queryKey: ['goals'] });
      queryClient.setQueriesData<Goal[]>({ queryKey: ['goals'] }, (old) =>
        old?.filter((g) => g.id !== id)
      );
      return { snapshots };
    },
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to delete goal'));
      }
      return id;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Goal deleted' });
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      addToast({ type: 'error', title: 'Goal deletion failed', description: err.message });
    },
  });
}

// ==================== FOCUS SESSION HOOKS (DB-ONLY) ====================
export function useFocusSessions() {
  const today = getToday();

  return useQuery<FocusSession[]>({
    queryKey: ['focus-sessions'],
    queryFn: async (): Promise<FocusSession[]> => {
      const res = await fetch('/api/focus-sessions?days=2');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load focus sessions from database'));
      }
      const json = await res.json();
      const allSessions = (json.focusSessions || []) as FocusSession[];
      return allSessions.filter((s) => (s.started_at || '').split('T')[0] === today);
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (session: Partial<FocusSession>) => {
      const res = await fetch('/api/focus-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...session, id: ensureUUID(session.id) }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to start focus session in database'));
      }
      const data = await res.json();
      return data.focusSession as FocusSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
    },
  });

  return withAssignedUUID(mutation);
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const awardXp = useAppStore((state) => state.awardXp);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FocusSession> }) => {
      const res = await fetch('/api/focus-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save focus session to database'));
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      const minutes = vars.updates.actual_duration || 0;
      if (minutes > 0 && vars.updates.status === 'completed') {
        awardXp(minutes, 'Focus Time');
        addToast({ type: 'success', title: `Focus session saved! +${minutes} XP` });
      } else if (vars.updates?.status === 'cancelled') {
        addToast({ type: 'info', title: 'Focus session cancelled' });
      }
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Could not save focus session', description: err.message });
    },
  });
}

export function useDeleteFocusSession() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['focus-sessions'] });
      const previous = queryClient.getQueryData<FocusSession[]>(['focus-sessions']);
      queryClient.setQueryData<FocusSession[]>(['focus-sessions'], (old = []) =>
        old.filter((s) => s.id !== id)
      );
      return { previous };
    },
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/focus-sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to delete focus session'));
      }
      return id;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Focus session removed' });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['focus-sessions'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Failed to delete session', description: err.message });
    },
  });
}

// ==================== DAILY LOG HOOKS (DB-ONLY) ====================
export function useDailyLog(date?: string) {
  const targetDate = date || getToday();

  return useQuery<DailyLog | null>({
    queryKey: ['daily-log', targetDate],
    queryFn: async (): Promise<DailyLog | null> => {
      const res = await fetch('/api/daily-logs');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load daily log from database'));
      }
      const json = await res.json();
      const logs = (json.logs || []) as DailyLog[];
      return logs.find((l) => l.log_date === targetDate) || null;
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useUpsertDailyLog() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (log: Partial<DailyLog> & { log_date: string }) => {
      const previous = queryClient.getQueryData<DailyLog | null>(['daily-log', log.log_date]);
      queryClient.setQueryData<DailyLog | null>(['daily-log', log.log_date], (old) => ({
        ...(old || ({} as DailyLog)),
        ...log,
        scores: log.scores ? { ...(old?.scores || {}), ...log.scores } : old?.scores,
      }));
      return { previous, logDate: log.log_date };
    },
    mutationFn: async (log: Partial<DailyLog> & { log_date: string }) => {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...log, date: log.log_date }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save daily log to database'));
      }
      const data = await res.json();
      return data.log as DailyLog;
    },
    onSuccess: (saved) => {
      if (saved?.log_date) {
        queryClient.setQueryData(['daily-log', saved.log_date], saved);
        queryClient.invalidateQueries({ queryKey: ['daily-log', saved.log_date] });
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.logDate) {
        queryClient.setQueryData(['daily-log', ctx.logDate], ctx.previous);
      }
      addToast({ type: 'error', title: 'Daily log save failed', description: err.message });
    },
  });
}

// ==================== TIME BLOCKS HOOKS (DB-ONLY) ====================
export function useTimeBlocks() {
  return useQuery<TimeBlock[]>({
    queryKey: ['time-blocks'],
    queryFn: async (): Promise<TimeBlock[]> => {
      const res = await fetch('/api/time-blocks');
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load timetable from database'));
      }
      const json = await res.json();
      return (json.timeBlocks || []) as TimeBlock[];
    },
    refetchInterval: activeTabRefetchInterval,
  });
}

export function useCreateTimeBlock() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  const mutation = useMutation({
    onMutate: async (block: Omit<TimeBlock, 'id'> & { id?: string }) => {
      await queryClient.cancelQueries({ queryKey: ['time-blocks'] });
      const previous = queryClient.getQueryData<TimeBlock[]>(['time-blocks']);
      const blockId = ensureUUID(block.id);
      const optimisticBlock: TimeBlock = { ...block, id: blockId };
      queryClient.setQueryData<TimeBlock[]>(['time-blocks'], (old = []) => [
        ...old.filter((b) => b.id !== blockId),
        optimisticBlock,
      ]);
      return { previous };
    },
    mutationFn: async (block: Omit<TimeBlock, 'id'> & { id?: string }) => {
      const res = await fetch('/api/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...block, id: ensureUUID(block.id) }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save time block to database'));
      }
      const data = await res.json();
      return data.timeBlock as TimeBlock;
    },
    onSuccess: (savedBlock) => {
      addToast({ type: 'success', title: 'Schedule block saved' });
      if (savedBlock) {
        queryClient.setQueryData<TimeBlock[]>(['time-blocks'], (old = []) =>
          old.map((b) => (b.id === savedBlock.id ? savedBlock : b))
        );
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['time-blocks'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Save failed', description: err.message });
    },
  });

  return withAssignedUUID(mutation);
}

export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<TimeBlock> }) => {
      await queryClient.cancelQueries({ queryKey: ['time-blocks'] });
      const previous = queryClient.getQueryData<TimeBlock[]>(['time-blocks']);
      queryClient.setQueryData<TimeBlock[]>(['time-blocks'], (old = []) =>
        old.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
      return { previous };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TimeBlock> }) => {
      const res = await fetch('/api/time-blocks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update schedule block'));
      }
      return res.json();
    },
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Schedule block updated' });
      if (data?.timeBlock) {
        queryClient.setQueryData<TimeBlock[]>(['time-blocks'], (old = []) =>
          old.map((b) => (b.id === data.timeBlock.id ? data.timeBlock : b))
        );
      }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['time-blocks'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Update failed', description: err.message });
    },
  });
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);

  return useMutation({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['time-blocks'] });
      const previous = queryClient.getQueryData<TimeBlock[]>(['time-blocks']);
      queryClient.setQueryData<TimeBlock[]>(['time-blocks'], (old = []) => old.filter((b) => b.id !== id));
      return { previous };
    },
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/time-blocks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to delete schedule block'));
      }
      return id;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Schedule block deleted' });
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['time-blocks'], ctx.previous);
      }
      addToast({ type: 'error', title: 'Delete failed', description: err.message });
    },
  });
}

// ==================== LIFE AREA HOOKS ====================
export function useLifeAreas() {
  return useQuery<LifeArea[]>({
    queryKey: ['life-areas'],
    queryFn: async () => {
      const res = await fetch('/api/life-areas');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.lifeAreas) && json.lifeAreas.length > 0) {
          return json.lifeAreas as LifeArea[];
        }
      }
      return DEFAULT_LIFE_AREAS;
    },
    initialData: DEFAULT_LIFE_AREAS,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== GAMIFICATION HOOKS ====================
export function useUserBadges() {
  const user = useAppStore((state) => state.user);

  return useQuery<(UserBadge & { badge: Badge })[]>({
    queryKey: ['user-badges'],
    queryFn: async () => {
      if (isSupabaseOnline() && !isPlaceholderUrl && user?.id) {
        try {
          const { data, error } = await supabaseBrowser
            .from('user_badges')
            .select('*, badges(*)')
            .eq('user_id', user.id)
            .order('earned_at', { ascending: false });

          if (!error && data) {
            return data as unknown as (UserBadge & { badge: Badge })[];
          }
        } catch {
          // Fall through
        }
      }
      return [];
    },
    initialData: [],
    staleTime: 60000,
  });
}

export function useCheckBadges() {
  return useMutation({
    mutationFn: async () => [],
  });
}

// ==================== ANALYTICS HOOKS (DB-ONLY) ====================
function aggregateAnalyticsData(days: number, sessions: FocusSession[], tasks: Task[]) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const dailyMap: Record<
    string,
    {
      date: string;
      tasks_completed: number;
      tasks_planned: number;
      habits_completed: number;
      focus_minutes: number;
      focus_hours: number;
      completed_sessions: number;
      cancelled_sessions: number;
    }
  > = {};

  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = toLocalDateString(d);
    dailyMap[dateStr] = {
      date: dateStr,
      tasks_completed: 0,
      tasks_planned: 0,
      habits_completed: 0,
      focus_minutes: 0,
      focus_hours: 0,
      completed_sessions: 0,
      cancelled_sessions: 0,
    };
  }

  sessions.forEach((s) => {
    const sDate = (s.started_at || '').split('T')[0];
    if (dailyMap[sDate]) {
      if (s.status === 'completed') {
        dailyMap[sDate].focus_minutes += s.actual_duration || 0;
        dailyMap[sDate].completed_sessions += 1;
      } else if (s.status === 'cancelled') {
        dailyMap[sDate].cancelled_sessions += 1;
      }
    }
  });

  tasks.forEach((t) => {
    const tDate = (t.due_date || t.created_at || '').split('T')[0];
    if (dailyMap[tDate]) {
      dailyMap[tDate].tasks_planned += 1;
      if (t.status === 'completed') {
        dailyMap[tDate].tasks_completed += 1;
      }
    }
  });

  const daily = Object.values(dailyMap).map((d) => ({
    ...d,
    focus_hours: Number((d.focus_minutes / 60).toFixed(1)),
  }));

  return {
    daily,
    weekly: [],
    totalFocusMinutes: sessions
      .filter((s) => s.status === 'completed')
      .reduce((acc, s) => acc + (s.actual_duration || 0), 0),
    completedSessionsCount: sessions.filter((s) => s.status === 'completed').length,
    cancelledSessionsCount: sessions.filter((s) => s.status === 'cancelled').length,
    totalTasksCompleted: tasks.filter((t) => t.status === 'completed').length,
  };
}

export function useAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  return useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const [sessionsRes, tasksRes] = await Promise.all([
        fetch(`/api/focus-sessions?days=${days}`),
        fetch('/api/tasks?all=true'),
      ]);

      if (!sessionsRes.ok) {
        throw new Error(await parseError(sessionsRes, 'Failed to load sessions for analytics'));
      }
      if (!tasksRes.ok) {
        throw new Error(await parseError(tasksRes, 'Failed to load tasks for analytics'));
      }

      const sJson = await sessionsRes.json();
      const tJson = await tasksRes.json();

      return aggregateAnalyticsData(
        days,
        (sJson.focusSessions || []) as FocusSession[],
        (tJson.tasks || []) as Task[]
      );
    },
    refetchInterval: activeTabRefetchInterval,
  });
}
