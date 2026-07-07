import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseBrowser } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Task, Habit, Goal, FocusSession, DailyLog, Profile, LifeArea, Badge, UserBadge } from '@/types/types';

import { getToday } from '@/lib/utils';

// ==================== AUTH HOOKS ====================
export function useAuth() {
  const user = useAppStore((state) => state.user);
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      // Mocking auth to always return our local CEO user since auth is removed
      return user;
    },
    initialData: user,
  });
}

// ==================== TASK HOOKS ====================
export function useTasks(date?: string) {
  const targetDate = date || getToday();
  return useQuery({
    queryKey: ['tasks', targetDate],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('tasks')
        .select('*, life_areas(name, color, slug)')
        .eq('due_date', targetDate)
        .order('priority', { ascending: false })
        .order('sort_order');
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('tasks')
        .select('*, life_areas(name, color, slug), goals(title)')
        .neq('status', 'completed')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabaseBrowser
        .from('tasks')
        .insert({ ...task, user_id: userId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task created' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to create task' })
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async ({ id, xpReward = 10 }: { id: string; xpReward: number }) => {
      const { data, error } = await supabaseBrowser
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Add XP via RPC
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      await supabaseBrowser.rpc('add_xp', {
        user_uuid: userId,
        xp_amount: xpReward,
        xp_source: 'task_completion',
        source_uuid: id,
        xp_description: `Completed task: ${data.title}`,
      });
      return data as Task;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(task => task.id === id ? { ...task, status: 'completed' } : task);
      });
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Task completed!' });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'error', title: 'Failed to complete task' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabaseBrowser
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task updated' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update task' })
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task deleted' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete task' })
  });
}

// ==================== HABIT HOOKS ====================
export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('habits')
        .select('*, life_areas(name, color, slug)')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Habit[];
    },
  });
}

export function useHabitLogs(habitId: string, date?: string) {
  const targetDate = date || getToday();
  return useQuery({
    queryKey: ['habit-logs', habitId, targetDate],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .eq('completed_date', targetDate)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
  });
}

export function useCompleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async ({ habitId, userId }: { habitId: string; userId: string }) => {
      const today = getToday();
      const { data: existing } = await supabaseBrowser
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .eq('completed_date', today)
        .single();
      if (existing) {
        await supabaseBrowser.from('habit_logs').delete().eq('id', existing.id);
        return { action: 'unchecked', habitId };
      }
      const { data, error } = await supabaseBrowser
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: userId, completed_date: today })
        .select()
        .single();
      if (error) throw error;
      await supabaseBrowser.rpc('add_xp', {
        user_uuid: userId,
        xp_amount: 15,
        xp_source: 'habit_completion',
        source_uuid: habitId,
        xp_description: 'Habit completed',
      });
      return { action: 'checked', habitId, log: data };
    },
    onMutate: async ({ habitId }) => {
      const today = getToday();
      await queryClient.cancelQueries({ queryKey: ['habit-logs', habitId, today] });
      queryClient.setQueryData(['habit-logs', habitId, today], (old: any) => {
        return old ? null : { id: 'optimistic', habit_id: habitId, completed_date: today };
      });
    },
    onSuccess: (result) => {
      if (result.action === 'checked') addToast({ type: 'success', title: 'Habit completed! +15 XP' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to complete habit' });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs', variables.habitId] });
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async (habit: Partial<Habit>) => {
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabaseBrowser
        .from('habits')
        .insert({ ...habit, user_id: userId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit created' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to create habit' })
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const { data, error } = await supabaseBrowser
        .from('habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit updated' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update habit' })
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser
        .from('habits')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit deleted' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete habit' })
  });
}

// ==================== GOAL HOOKS ====================
export function useGoals(status: 'active' | 'completed' = 'active') {
  return useQuery({
    queryKey: ['goals', status],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('goals')
        .select('*, life_areas(name, color, slug, icon), key_results(*)')
        .eq('status', status)
        .order('priority', { ascending: false })
        .order('target_date');
      if (error) throw error;
      return data as unknown as Goal[];
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async (goal: Partial<Goal> & { key_results?: { title: string; target_value: number; unit: string }[] }) => {
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { key_results, ...goalData } = goal;
      const { data: newGoal, error } = await supabaseBrowser
        .from('goals')
        .insert({ ...goalData, user_id: userId } as any)
        .select()
        .single();
      if (error) throw error;
      if (key_results && key_results.length > 0) {
        const krs = key_results.map((kr, i) => ({ ...kr, goal_id: newGoal.id, sort_order: i }));
        await supabaseBrowser.from('key_results').insert(krs);
      }
      return newGoal as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      addToast({ type: 'success', title: 'Goal created' });
    },
  });
}

// ==================== FOCUS SESSION HOOKS ====================
export function useFocusSessions() {
  return useQuery({
    queryKey: ['focus-sessions'],
    queryFn: async () => {
      const today = getToday();
      const { data, error } = await supabaseBrowser
        .from('focus_sessions')
        .select('*, tasks(title), life_areas(name, color)')
        .gte('started_at', `${today}T00:00:00`)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as FocusSession[];
    },
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: Partial<FocusSession>) => {
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabaseBrowser
        .from('focus_sessions')
        .insert({ ...session, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as FocusSession;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['focus-sessions'] }),
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FocusSession> }) => {
      const { data, error } = await supabaseBrowser
        .from('focus_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const xpAmount = Math.floor((updates.actual_duration || 0));
      if (xpAmount > 0) {
        await supabaseBrowser.rpc('add_xp', {
          user_uuid: data.user_id,
          xp_amount: xpAmount,
          xp_source: 'focus_session',
          source_uuid: id,
          xp_description: `Focus session: ${xpAmount} minutes`,
        });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
      addToast({ type: 'success', title: 'Focus session completed!' });
    },
  });
}

// ==================== DAILY LOG HOOKS ====================
export function useDailyLog(date?: string) {
  const targetDate = date || getToday();
  return useQuery({
    queryKey: ['daily-log', targetDate],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('daily_logs')
        .select('*')
        .eq('log_date', targetDate)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as DailyLog | null;
    },
  });
}

export function useUpsertDailyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Partial<DailyLog> & { log_date: string }) => {
      const userId = useAppStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabaseBrowser
        .from('daily_logs')
        .upsert({ ...log, user_id: userId } as any, { onConflict: 'user_id,log_date' })
        .select()
        .single();
      if (error) throw error;
      return data as DailyLog;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ['daily-log', data.log_date] }),
  });
}

// ==================== LIFE AREA HOOKS ====================
export function useLifeAreas() {
  return useQuery({
    queryKey: ['life-areas'],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('life_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as LifeArea[];
    },
  });
}

// ==================== GAMIFICATION HOOKS ====================
export function useUserBadges() {
  return useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser
        .from('user_badges')
        .select('*, badges(*)')
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as (UserBadge & { badge: Badge })[];
    },
  });
}

export function useCheckBadges() {
  return useMutation({
    mutationFn: async () => [], // Simplified since RPC requires specific setup
  });
}

// ==================== ANALYTICS HOOKS ====================
export function useAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (period === '7d' ? 7 : period === '30d' ? 30 : 90));
      const { data: dailyLogs, error: logError } = await supabaseBrowser
        .from('daily_logs')
        .select('*')
        .gte('log_date', startDate.toISOString().split('T')[0])
        .lte('log_date', endDate.toISOString().split('T')[0])
        .order('log_date');
      if (logError) throw logError;
      return { daily: dailyLogs || [], weekly: [] };
    },
  });
}
