import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseBrowser, isSupabaseOnline } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Task, Habit, Goal, FocusSession, DailyLog, LifeArea, Badge, UserBadge } from '@/types/types';
import { getToday, toLocalDateString } from '@/lib/utils';

// Fire-and-forget background sync that never blocks user interaction
function bgSync(action: () => PromiseLike<any>) {
  if (!isSupabaseOnline()) return;
  Promise.resolve()
    .then(async () => {
      await action();
    })
    .catch(() => {
      // Ignored for resilience - local state is already persisted
    });
}

export const DEFAULT_LIFE_AREAS: LifeArea[] = [
  {
    id: 'area-career',
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
    id: 'area-learning',
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
    id: 'area-fitness',
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
    id: 'area-finance',
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
    id: 'area-projects',
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

// ==================== AUTH HOOKS ====================
export function useAuth() {
  const storeUser = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return null;
        const data = await res.json();
        const currentUser = data?.user || null;
        if (currentUser) {
          setUser(currentUser);
        }
        return currentUser;
      } catch {
        return storeUser;
      }
    },
    initialData: storeUser || undefined,
    initialDataUpdatedAt: 0,
    staleTime: 10 * 1000,
  });

  return {
    ...query,
    data: query.data || storeUser,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetUserStore = useAppStore((state) => state.resetUserStore);

  return async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
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
    mutationFn: async (updates: { full_name?: string; username?: string; email?: string; timezone?: string }) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      return data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['auth'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      addToast({ type: 'success', title: 'Profile updated successfully' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: 'Failed to update profile', description: error.message });
    },
  });
}

// ==================== TASK HOOKS ====================
export function useTasks(date?: string) {
  const targetDate = date || getToday();
  const localTasks = useAppStore((state) => state.tasks);

  return useQuery({
    queryKey: ['tasks', targetDate],
    queryFn: async () => {
      const getLocalForDate = () =>
        useAppStore.getState().tasks.filter((t) => {
          const taskDate = t.due_date ? t.due_date.split('T')[0] : getToday();
          return taskDate === targetDate;
        });

      try {
        const res = await fetch(`/api/tasks${targetDate ? `?date=${encodeURIComponent(targetDate)}` : ''}`);
        if (res.ok) {
          const json = await res.json();
          if (json.tasks && Array.isArray(json.tasks)) {
            json.tasks.forEach((t: Task) => useAppStore.getState().addTask(t));
            return json.tasks as Task[];
          }
        }
      } catch {
        // Fallback to local
      }

      if (!isSupabaseOnline()) {
        return getLocalForDate();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('tasks')
          .select('*, life_areas(name, color, slug)')
          .eq('due_date', targetDate)
          .order('priority', { ascending: false })
          .order('sort_order');
        if (error) throw error;
        if (data && data.length > 0) {
          data.forEach((t) => useAppStore.getState().addTask(t as Task));
        }
        return (data as Task[]) || getLocalForDate();
      } catch {
        return getLocalForDate();
      }
    },
    initialData: () =>
      localTasks.filter((t) => {
        const taskDate = t.due_date ? t.due_date.split('T')[0] : getToday();
        return taskDate === targetDate;
      }),
  });
}

export function useAllTasks() {
  const localTasks = useAppStore((state) => state.tasks);

  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const getLocalAll = () => useAppStore.getState().tasks.filter((t) => t.status !== 'completed');

      if (!isSupabaseOnline()) {
        return getLocalAll();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('tasks')
          .select('*, life_areas(name, color, slug), goals(title)')
          .neq('status', 'completed')
          .order('priority', { ascending: false });
        if (error) throw error;
        return (data as Task[]) || getLocalAll();
      } catch {
        return getLocalAll();
      }
    },
    initialData: () => localTasks.filter((t) => t.status !== 'completed'),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const addTask = useAppStore((state) => state.addTask);

  return useMutation({
    onMutate: async (task: Partial<Task>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const targetDate = task.due_date ? task.due_date.split('T')[0] : getToday();

      const newTask: Task = {
        id: task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
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
        actual_minutes: task.actual_minutes || 0,
        due_date: targetDate,
        scheduled_start: task.scheduled_start || null,
        scheduled_end: task.scheduled_end || null,
        completed_at: null,
        is_recurring: false,
        recurrence_rule: null,
        source: 'manual',
        xp_reward: 10,
        sort_order: task.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Instant optimistic update in Zustand store
      addTask(newTask);

      // 2. Instant optimistic update in TanStack Query cache (0ms!)
      queryClient.setQueryData<Task[]>(['tasks', targetDate], (old = []) => [newTask, ...old]);
      queryClient.setQueryData<Task[]>(['tasks', 'all'], (old = []) => [newTask, ...old]);

      addToast({ type: 'success', title: 'Task created' });
      return { newTask, targetDate };
    },
    mutationFn: async (task: Partial<Task>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const targetDate = task.due_date ? task.due_date.split('T')[0] : getToday();

      const newTask: Task = {
        id: task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
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
        actual_minutes: task.actual_minutes || 0,
        due_date: targetDate,
        scheduled_start: task.scheduled_start || null,
        scheduled_end: task.scheduled_end || null,
        completed_at: null,
        is_recurring: false,
        recurrence_rule: null,
        source: 'manual',
        xp_reward: 10,
        sort_order: task.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Non-blocking background sync
      bgSync(async () => {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask),
        }).catch(() => {});
        if (isSupabaseOnline()) {
          await supabaseBrowser.from('tasks').insert(newTask as any);
        }
      });
      return newTask;
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateTask = useAppStore((state) => state.updateTask);
  const awardXp = useAppStore((state) => state.awardXp);

  return useMutation({
    onMutate: async ({ id, xpReward = 10, status }: { id: string; xpReward?: number; status?: 'completed' | 'pending' }) => {
      const existingTask = useAppStore.getState().tasks.find((t) => t.id === id);
      const isAlreadyCompleted = existingTask?.status === 'completed';
      const targetStatus = status || (isAlreadyCompleted ? 'pending' : 'completed');
      const completedAt = targetStatus === 'completed' ? new Date().toISOString() : null;

      // 1. Instant optimistic Zustand update
      updateTask(id, { status: targetStatus, completed_at: completedAt });
      if (targetStatus === 'completed') {
        awardXp(xpReward, 'Task Completed');
        addToast({ type: 'success', title: `Task completed! +${xpReward} XP` });
      } else {
        addToast({ type: 'info', title: 'Task restored to pending' });
      }

      // 2. Instant optimistic React Query cache update across all dates
      const updateList = (old: Task[] = []) =>
        old.map((t) => (t.id === id ? { ...t, status: targetStatus, completed_at: completedAt } : t));

      const targetDate = existingTask?.due_date ? existingTask.due_date.split('T')[0] : getToday();
      queryClient.setQueryData<Task[]>(['tasks', targetDate], updateList);
      queryClient.setQueryData<Task[]>(['tasks', getToday()], updateList);
      queryClient.setQueryData<Task[]>(['tasks', 'all'], (old = []) => {
        if (targetStatus === 'completed') {
          return old.filter((t) => t.id !== id);
        } else {
          return existingTask ? [{ ...existingTask, status: 'pending', completed_at: null }, ...old] : old;
        }
      });

      return { id, targetStatus, completedAt, xpReward };
    },
    mutationFn: async ({ id, xpReward = 10, status }: { id: string; xpReward?: number; status?: 'completed' | 'pending' }) => {
      const existingTask = useAppStore.getState().tasks.find((t) => t.id === id);
      const targetStatus = status || (existingTask?.status === 'completed' ? 'completed' : 'pending');
      const completedAt = targetStatus === 'completed' ? new Date().toISOString() : null;

      bgSync(async () => {
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: targetStatus, completed_at: completedAt }),
        }).catch(() => {});

        if (isSupabaseOnline()) {
          await supabaseBrowser
            .from('tasks')
            .update({ status: targetStatus, completed_at: completedAt })
            .eq('id', id);

          const userId = useAppStore.getState().user?.id;
          if (userId && targetStatus === 'completed') {
            await supabaseBrowser.rpc('add_xp', {
              user_uuid: userId,
              xp_amount: xpReward,
              xp_source: 'task_completion',
              source_uuid: id,
              xp_description: `Completed task`,
            });
          }
        }
      });
      return { id, status: targetStatus };
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateTask = useAppStore((state) => state.updateTask);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      // 1. Instant optimistic Zustand update
      updateTask(id, updates);

      // 2. Instant optimistic React Query cache update
      const updateList = (old: Task[] = []) =>
        old.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));

      const existingTask = useAppStore.getState().tasks.find((t) => t.id === id);
      const targetDate = updates.due_date ? updates.due_date.split('T')[0] : existingTask?.due_date?.split('T')[0] || getToday();
      queryClient.setQueryData<Task[]>(['tasks', targetDate], updateList);
      queryClient.setQueryData<Task[]>(['tasks', getToday()], updateList);
      queryClient.setQueryData<Task[]>(['tasks', 'all'], updateList);

      addToast({ type: 'success', title: 'Task updated' });
      return { id, updates };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      bgSync(async () => {
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
        }).catch(() => {});
        if (isSupabaseOnline()) {
          await supabaseBrowser.from('tasks').update(updates).eq('id', id);
        }
      });
      return { id, ...updates };
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteTask = useAppStore((state) => state.deleteTask);

  return useMutation({
    onMutate: async (id: string) => {
      const existingTask = useAppStore.getState().tasks.find((t) => t.id === id);
      const targetDate = existingTask?.due_date ? existingTask.due_date.split('T')[0] : getToday();

      // 1. Instant optimistic Zustand update
      deleteTask(id);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Task[]>(['tasks', targetDate], (old = []) => old.filter((t) => t.id !== id));
      queryClient.setQueryData<Task[]>(['tasks', getToday()], (old = []) => old.filter((t) => t.id !== id));
      queryClient.setQueryData<Task[]>(['tasks', 'all'], (old = []) => old.filter((t) => t.id !== id));

      addToast({ type: 'success', title: 'Task removed' });
      return { id };
    },
    mutationFn: async (id: string) => {
      bgSync(async () => {
        await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
        if (isSupabaseOnline()) {
          await supabaseBrowser.from('tasks').delete().eq('id', id);
        }
      });
      return id;
    },
  });
}

// ==================== HABIT HOOKS ====================
export function useHabits() {
  const localHabits = useAppStore((state) => state.habits);

  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const getLocalHabits = () => useAppStore.getState().habits;

      if (!isSupabaseOnline()) {
        return getLocalHabits();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('habits')
          .select('*, life_areas(name, color, slug)')
          .eq('is_active', true)
          .order('sort_order');
        if (error) throw error;
        if (data && data.length > 0) {
          data.forEach((h) => useAppStore.getState().addHabit(h as Habit));
        }
        return (data as Habit[]) || getLocalHabits();
      } catch {
        return getLocalHabits();
      }
    },
    initialData: () => localHabits,
  });
}

export function useHabitLogs(habitId: string, date?: string) {
  const targetDate = date || getToday();
  const dailyScores = useAppStore((state) => state.dailyScores);

  return useQuery({
    queryKey: ['habit-logs', habitId, targetDate],
    queryFn: async () => {
      const isChecked = !!useAppStore.getState().dailyScores[targetDate]?.[`habit_${habitId}`];
      const localResult = isChecked
        ? { id: `local-${habitId}`, habit_id: habitId, completed_date: targetDate }
        : null;

      if (!isSupabaseOnline()) {
        return localResult;
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('habit_logs')
          .select('*')
          .eq('habit_id', habitId)
          .eq('completed_date', targetDate)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || localResult;
      } catch {
        return localResult;
      }
    },
    initialData: () => {
      const checked = dailyScores[targetDate]?.[`habit_${habitId}`];
      return checked ? { id: `local-${habitId}`, habit_id: habitId, completed_date: targetDate } : null;
    },
  });
}

export function useCompleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateHabit = useAppStore((state) => state.updateHabit);
  const awardXp = useAppStore((state) => state.awardXp);
  const updateDailyScore = useAppStore((state) => state.updateDailyScore);

  return useMutation({
    onMutate: async ({ habitId, userId }: { habitId: string; userId: string }) => {
      const today = getToday();
      const habit = useAppStore.getState().habits.find((h) => h.id === habitId);
      const isCurrentlyCompleted = !!useAppStore.getState().dailyScores[today]?.[`habit_${habitId}`];
      const nextCompleted = !isCurrentlyCompleted;

      // 1. Instant optimistic Zustand update
      updateDailyScore(today, `habit_${habitId}`, nextCompleted);

      const currentStreak = habit?.streak_current || 0;
      const newStreak = isCurrentlyCompleted ? Math.max(0, currentStreak - 1) : currentStreak + 1;
      const newCompletions = isCurrentlyCompleted
        ? Math.max(0, (habit?.total_completions || 1) - 1)
        : (habit?.total_completions || 0) + 1;

      const updatedFields = {
        streak_current: newStreak,
        streak_longest: Math.max(newStreak, habit?.streak_longest || 0),
        total_completions: newCompletions,
      };
      updateHabit(habitId, updatedFields);

      if (nextCompleted) {
        awardXp(15, 'Habit Completed');
        addToast({ type: 'success', title: 'Habit completed! +15 XP' });
      } else {
        addToast({ type: 'info', title: 'Habit marked as incomplete' });
      }

      // 2. Instant optimistic React Query cache update (0ms!)
      queryClient.setQueryData(['habit-logs', habitId, today], () =>
        nextCompleted ? { id: `local-${habitId}`, habit_id: habitId, completed_date: today } : null
      );
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
        old.map((h) => (h.id === habitId ? { ...h, ...updatedFields } : h))
      );

      return { habitId, nextCompleted, today, userId };
    },
    mutationFn: async ({ habitId, userId }: { habitId: string; userId: string }) => {
      const today = getToday();
      bgSync(async () => {
        const { data: existing } = await supabaseBrowser
          .from('habit_logs')
          .select('*')
          .eq('habit_id', habitId)
          .eq('completed_date', today)
          .single();

        if (existing) {
          await supabaseBrowser.from('habit_logs').delete().eq('id', existing.id);
        } else {
          await supabaseBrowser
            .from('habit_logs')
            .insert({ habit_id: habitId, user_id: userId, completed_date: today });
        }
      });
      return { habitId };
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const addHabit = useAppStore((state) => state.addHabit);

  return useMutation({
    onMutate: async (habit: Partial<Habit>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const newHabit: Habit = {
        id: habit.id || `habit-${Date.now()}`,
        user_id: userId,
        goal_id: habit.goal_id || null,
        life_area_id: habit.life_area_id || null,
        title: habit.title || 'New Habit',
        description: habit.description || null,
        frequency: habit.frequency || 'daily',
        specific_days: habit.specific_days || [1, 2, 3, 4, 5, 6, 7],
        time_of_day: habit.time_of_day || 'morning',
        target_duration_minutes: habit.target_duration_minutes || null,
        color: habit.color || '#3b82f6',
        icon: habit.icon || 'Repeat',
        streak_current: 0,
        streak_longest: 0,
        total_completions: 0,
        xp_reward: 15,
        is_active: true,
        sort_order: habit.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Instant optimistic Zustand update
      addHabit(newHabit);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) => [...old, newHabit]);

      addToast({ type: 'success', title: 'Habit created' });
      return { newHabit };
    },
    mutationFn: async (habit: Partial<Habit>) => {
      const newHabit = habit as Habit;
      bgSync(() => supabaseBrowser.from('habits').insert(newHabit as any));
      return newHabit;
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateHabit = useAppStore((state) => state.updateHabit);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      // 1. Instant optimistic Zustand update
      updateHabit(id, updates);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) =>
        old.map((h) => (h.id === id ? { ...h, ...updates } : h))
      );

      addToast({ type: 'success', title: 'Habit updated' });
      return { id, updates };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      bgSync(() => supabaseBrowser.from('habits').update(updates).eq('id', id));
      return { id, ...updates };
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteHabit = useAppStore((state) => state.deleteHabit);

  return useMutation({
    onMutate: async (id: string) => {
      // 1. Instant optimistic Zustand update
      deleteHabit(id);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Habit[]>(['habits'], (old = []) => old.filter((h) => h.id !== id));

      addToast({ type: 'success', title: 'Habit deleted' });
      return { id };
    },
    mutationFn: async (id: string) => {
      bgSync(() => supabaseBrowser.from('habits').delete().eq('id', id));
      return id;
    },
  });
}

// ==================== GOAL HOOKS ====================
export function useGoals(status: 'active' | 'completed' = 'active') {
  const localGoals = useAppStore((state) => state.goals);

  return useQuery({
    queryKey: ['goals', status],
    queryFn: async () => {
      const getLocalGoals = () => useAppStore.getState().goals.filter((g) => g.status === status);

      if (!isSupabaseOnline()) {
        return getLocalGoals();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('goals')
          .select('*, life_areas(name, color, slug, icon), key_results(*)')
          .eq('status', status)
          .order('priority', { ascending: false })
          .order('target_date');
        if (error) throw error;
        if (data && data.length > 0) {
          data.forEach((g) => useAppStore.getState().addGoal(g as unknown as Goal));
        }
        return (data as unknown as Goal[]) || getLocalGoals();
      } catch {
        return getLocalGoals();
      }
    },
    initialData: () => localGoals.filter((g) => g.status === status),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const addGoal = useAppStore((state) => state.addGoal);

  return useMutation({
    onMutate: async (goal: Partial<Goal> & { key_results?: { title: string; target_value: number; unit: string }[] }) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const goalId = goal.id || `goal-${Date.now()}`;
      const newGoal: Goal = {
        id: goalId,
        user_id: userId,
        life_area_id: goal.life_area_id || 'area-career',
        title: goal.title || 'New Goal',
        description: goal.description || null,
        status: goal.status || 'active',
        priority: goal.priority || 3,
        start_date: goal.start_date || getToday(),
        target_date: goal.target_date || getToday(),
        completed_at: null,
        progress: goal.progress || 0,
        xp_reward: goal.xp_reward || 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        key_results: (goal.key_results || []).map((kr, idx) => ({
          id: `kr-${Date.now()}-${idx}`,
          goal_id: goalId,
          title: kr.title,
          target_value: kr.target_value,
          current_value: 0,
          unit: kr.unit,
          sort_order: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      };

      // 1. Instant optimistic Zustand update
      addGoal(newGoal);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Goal[]>(['goals', newGoal.status], (old = []) => [...old, newGoal]);

      addToast({ type: 'success', title: 'Goal created' });
      return { newGoal };
    },
    mutationFn: async (goal: Partial<Goal>) => {
      const { key_results, ...goalData } = goal as any;
      bgSync(() => supabaseBrowser.from('goals').insert(goalData));
      return goal as Goal;
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateGoal = useAppStore((state) => state.updateGoal);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      // 1. Instant optimistic Zustand update
      updateGoal(id, updates);

      // 2. Instant optimistic React Query cache update
      const updateList = (old: Goal[] = []) =>
        old.map((g) => (g.id === id ? { ...g, ...updates } : g));
      queryClient.setQueryData<Goal[]>(['goals', 'active'], updateList);
      queryClient.setQueryData<Goal[]>(['goals', 'completed'], updateList);

      addToast({ type: 'success', title: 'Goal updated' });
      return { id, updates };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      bgSync(() => supabaseBrowser.from('goals').update(updates).eq('id', id));
      return { id, ...updates };
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteGoal = useAppStore((state) => state.deleteGoal);

  return useMutation({
    onMutate: async (id: string) => {
      // 1. Instant optimistic Zustand update
      deleteGoal(id);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<Goal[]>(['goals', 'active'], (old = []) => old.filter((g) => g.id !== id));
      queryClient.setQueryData<Goal[]>(['goals', 'completed'], (old = []) => old.filter((g) => g.id !== id));

      addToast({ type: 'success', title: 'Goal deleted' });
      return { id };
    },
    mutationFn: async (id: string) => {
      bgSync(() => supabaseBrowser.from('goals').delete().eq('id', id));
      return id;
    },
  });
}

// ==================== FOCUS SESSION HOOKS ====================
export function useFocusSessions() {
  const localSessions = useAppStore((state) => state.focusSessions);
  const today = getToday();

  return useQuery({
    queryKey: ['focus-sessions'],
    queryFn: async () => {
      const getLocalSessions = () =>
        useAppStore.getState().focusSessions.filter((s) => (s.started_at || '').split('T')[0] === today);

      if (!isSupabaseOnline()) {
        return getLocalSessions();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('focus_sessions')
          .select('*, tasks(title), life_areas(name, color)')
          .gte('started_at', `${today}T00:00:00`)
          .order('started_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          data.forEach((s) => useAppStore.getState().addFocusSession(s as FocusSession));
        }
        return (data as FocusSession[]) || getLocalSessions();
      } catch {
        return getLocalSessions();
      }
    },
    initialData: () => localSessions.filter((s) => (s.started_at || '').split('T')[0] === today),
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  const addFocusSession = useAppStore((state) => state.addFocusSession);

  return useMutation({
    onMutate: async (session: Partial<FocusSession>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const newSession: FocusSession = {
        id: session.id || `session-${Date.now()}`,
        user_id: userId,
        task_id: session.task_id || null,
        life_area_id: session.life_area_id || null,
        session_type: session.session_type || 'deep_work',
        planned_duration: session.planned_duration || 25,
        actual_duration: session.actual_duration || 0,
        goal_id: session.goal_id || null,
        interruptions: 0,
        interruption_notes: [],
        flow_rating: null,
        notes: null,
        reflection_notes: null,
        status: 'active',
        started_at: session.started_at || new Date().toISOString(),
        ended_at: null,
        created_at: new Date().toISOString(),
      };

      // 1. Instant optimistic Zustand update
      addFocusSession(newSession);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<FocusSession[]>(['focus-sessions'], (old = []) => [newSession, ...old]);

      return { newSession };
    },
    mutationFn: async (session: Partial<FocusSession>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const newSession: FocusSession = {
        id: session.id || `session-${Date.now()}`,
        user_id: userId,
        task_id: session.task_id || null,
        life_area_id: session.life_area_id || null,
        session_type: session.session_type || 'deep_work',
        planned_duration: session.planned_duration || 25,
        actual_duration: session.actual_duration || 0,
        goal_id: session.goal_id || null,
        interruptions: 0,
        interruption_notes: [],
        flow_rating: null,
        notes: null,
        reflection_notes: null,
        status: 'active',
        started_at: session.started_at || new Date().toISOString(),
        ended_at: null,
        created_at: new Date().toISOString(),
      };

      bgSync(() => supabaseBrowser.from('focus_sessions').insert(newSession));
      return newSession;
    },
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateFocusSession = useAppStore((state) => state.updateFocusSession);
  const awardXp = useAppStore((state) => state.awardXp);
  const upsertDailyLogState = useAppStore((state) => state.upsertDailyLogState);

  return useMutation({
    onMutate: async ({ id, updates }: { id: string; updates: Partial<FocusSession> }) => {
      // 1. Instant optimistic Zustand update
      updateFocusSession(id, updates);

      const minutes = updates.actual_duration || 0;
      if (minutes > 0) {
        awardXp(minutes, 'Focus Time');
        const today = getToday();
        upsertDailyLogState(today, {
          focus_hours: Number((minutes / 60).toFixed(1)),
        });
      }

      if (updates?.status === 'cancelled') {
        addToast({ type: 'info', title: 'Focus session cancelled' });
      } else {
        addToast({ type: 'success', title: 'Focus session completed! XP awarded' });
      }

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData<FocusSession[]>(['focus-sessions'], (old = []) =>
        old.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );

      return { id, updates };
    },
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FocusSession> }) => {
      bgSync(() => supabaseBrowser.from('focus_sessions').update(updates).eq('id', id));
      return { id, ...updates };
    },
  });
}

// ==================== DAILY LOG HOOKS ====================
export function useDailyLog(date?: string) {
  const targetDate = date || getToday();
  const localLogs = useAppStore((state) => state.dailyLogs);

  return useQuery({
    queryKey: ['daily-log', targetDate],
    queryFn: async () => {
      const getLocalLog = () => useAppStore.getState().dailyLogs[targetDate] || null;

      if (!isSupabaseOnline()) {
        return getLocalLog();
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('daily_logs')
          .select('*')
          .eq('log_date', targetDate)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          useAppStore.getState().upsertDailyLogState(targetDate, data);
        }
        return (data as DailyLog) || getLocalLog();
      } catch {
        return getLocalLog();
      }
    },
    initialData: () => localLogs[targetDate] || null,
  });
}

export function useUpsertDailyLog() {
  const queryClient = useQueryClient();
  const upsertDailyLogState = useAppStore((state) => state.upsertDailyLogState);

  return useMutation({
    onMutate: async (log: Partial<DailyLog> & { log_date: string }) => {
      // 1. Instant optimistic Zustand update
      upsertDailyLogState(log.log_date, log);

      // 2. Instant optimistic React Query cache update
      queryClient.setQueryData(['daily-log', log.log_date], (old: any) => ({
        ...(old || {}),
        ...log,
      }));

      return { log };
    },
    mutationFn: async (log: Partial<DailyLog> & { log_date: string }) => {
      bgSync(() => {
        const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
        return supabaseBrowser
          .from('daily_logs')
          .upsert({ ...log, user_id: userId } as any, { onConflict: 'user_id,log_date' });
      });
      return log as DailyLog;
    },
  });
}

// ==================== LIFE AREA HOOKS ====================
export function useLifeAreas() {
  return useQuery({
    queryKey: ['life-areas'],
    queryFn: async () => {
      if (!isSupabaseOnline()) {
        return DEFAULT_LIFE_AREAS;
      }

      try {
        const { data, error } = await supabaseBrowser
          .from('life_areas')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (error) throw error;
        if (data && data.length > 0) return data as LifeArea[];
        return DEFAULT_LIFE_AREAS;
      } catch {
        return DEFAULT_LIFE_AREAS;
      }
    },
    initialData: DEFAULT_LIFE_AREAS,
    staleTime: Infinity,
  });
}

// ==================== GAMIFICATION HOOKS ====================
export function useUserBadges() {
  return useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
      if (!isSupabaseOnline()) {
        return [];
      }
      try {
        const { data, error } = await supabaseBrowser
          .from('user_badges')
          .select('*, badges(*)')
          .order('earned_at', { ascending: false });
        if (error) throw error;
        return (data as unknown as (UserBadge & { badge: Badge })[]) || [];
      } catch {
        return [];
      }
    },
    initialData: [],
    staleTime: Infinity,
  });
}

export function useCheckBadges() {
  return useMutation({
    mutationFn: async () => [],
  });
}

// ==================== ANALYTICS HOOKS ====================
export function useAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  const localSessions = useAppStore((state) => state.focusSessions);
  const localTasks = useAppStore((state) => state.tasks);

  return useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Generate daily bucket array
      const dailyMap: Record<string, {
        date: string;
        tasks_completed: number;
        tasks_planned: number;
        habits_completed: number;
        focus_minutes: number;
        focus_hours: number;
        completed_sessions: number;
        cancelled_sessions: number;
      }> = {};

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

      // Aggregate from local focus sessions
      const sessions = useAppStore.getState().focusSessions;
      sessions.forEach((s) => {
        const sDate = (s.started_at || '').split('T')[0];
        if (dailyMap[sDate]) {
          if (s.status === 'completed') {
            dailyMap[sDate].focus_minutes += (s.actual_duration || 0);
            dailyMap[sDate].completed_sessions += 1;
          } else if (s.status === 'cancelled') {
            dailyMap[sDate].cancelled_sessions += 1;
          }
        }
      });

      // Aggregate from local tasks
      const tasks = useAppStore.getState().tasks;
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
    },
    initialData: () => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const dailyMap: Record<string, any> = {};
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

      localSessions.forEach((s) => {
        const sDate = (s.started_at || '').split('T')[0];
        if (dailyMap[sDate] && s.status === 'completed') {
          dailyMap[sDate].focus_minutes += s.actual_duration || 0;
          dailyMap[sDate].completed_sessions += 1;
        }
      });

      localTasks.forEach((t) => {
        const tDate = (t.due_date || t.created_at || '').split('T')[0];
        if (dailyMap[tDate]) {
          dailyMap[tDate].tasks_planned += 1;
          if (t.status === 'completed') dailyMap[tDate].tasks_completed += 1;
        }
      });

      const daily = Object.values(dailyMap).map((d) => ({
        ...d,
        focus_hours: Number((d.focus_minutes / 60).toFixed(1)),
      }));

      return {
        daily,
        weekly: [],
        totalFocusMinutes: localSessions
          .filter((s) => s.status === 'completed')
          .reduce((acc, s) => acc + (s.actual_duration || 0), 0),
        completedSessionsCount: localSessions.filter((s) => s.status === 'completed').length,
        cancelledSessionsCount: localSessions.filter((s) => s.status === 'cancelled').length,
        totalTasksCompleted: localTasks.filter((t) => t.status === 'completed').length,
      };
    },
  });
}
