import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseBrowser } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Task, Habit, Goal, FocusSession, DailyLog, Profile, LifeArea, Badge, UserBadge } from '@/types/types';
import { getToday, parseLocalDate, toLocalDateString } from '@/lib/utils';

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
  const user = useAppStore((state) => state.user);
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => user,
    initialData: user,
  });
}

// ==================== TASK HOOKS ====================
export function useTasks(date?: string) {
  const targetDate = date || getToday();
  const localTasks = useAppStore((state) => state.tasks);

  return useQuery({
    queryKey: ['tasks', targetDate],
    queryFn: async () => {
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
        return (data as Task[]) || [];
      } catch {
        // Fallback to local store for this date
        return localTasks.filter((t) => {
          const taskDate = t.due_date ? t.due_date.split('T')[0] : getToday();
          return taskDate === targetDate;
        });
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
      try {
        const { data, error } = await supabaseBrowser
          .from('tasks')
          .select('*, life_areas(name, color, slug), goals(title)')
          .neq('status', 'completed')
          .order('priority', { ascending: false });
        if (error) throw error;
        return (data as Task[]) || [];
      } catch {
        return localTasks.filter((t) => t.status !== 'completed');
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
    mutationFn: async (task: Partial<Task>) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
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
        due_date: task.due_date || getToday(),
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

      addTask(newTask);

      try {
        await supabaseBrowser.from('tasks').insert(newTask as any);
      } catch {
        // Local persistence handled
      }
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task created' });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateTask = useAppStore((state) => state.updateTask);
  const awardXp = useAppStore((state) => state.awardXp);

  return useMutation({
    mutationFn: async ({ id, xpReward = 10 }: { id: string; xpReward?: number }) => {
      const completedAt = new Date().toISOString();
      updateTask(id, { status: 'completed', completed_at: completedAt });
      awardXp(xpReward, 'Task Completed');

      try {
        await supabaseBrowser
          .from('tasks')
          .update({ status: 'completed', completed_at: completedAt })
          .eq('id', id);

        const userId = useAppStore.getState().user?.id;
        if (userId) {
          await supabaseBrowser.rpc('add_xp', {
            user_uuid: userId,
            xp_amount: xpReward,
            xp_source: 'task_completion',
            source_uuid: id,
            xp_description: `Completed task`,
          });
        }
      } catch {
        // Handled locally
      }
      return { id, status: 'completed' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task completed! +XP awarded' });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateTask = useAppStore((state) => state.updateTask);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      updateTask(id, updates);
      try {
        await supabaseBrowser
          .from('tasks')
          .update(updates)
          .eq('id', id);
      } catch {
        // Handled locally
      }
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task updated' });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteTask = useAppStore((state) => state.deleteTask);

  return useMutation({
    mutationFn: async (id: string) => {
      deleteTask(id);
      try {
        await supabaseBrowser.from('tasks').delete().eq('id', id);
      } catch {
        // Handled locally
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({ type: 'success', title: 'Task removed' });
    },
  });
}

// ==================== HABIT HOOKS ====================
export function useHabits() {
  const localHabits = useAppStore((state) => state.habits);

  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
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
        return (data as Habit[]) || [];
      } catch {
        return localHabits;
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
      try {
        const { data, error } = await supabaseBrowser
          .from('habit_logs')
          .select('*')
          .eq('habit_id', habitId)
          .eq('completed_date', targetDate)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } catch {
        const checked = dailyScores[targetDate]?.[`habit_${habitId}`];
        return checked ? { id: `local-${habitId}`, habit_id: habitId, completed_date: targetDate } : null;
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
    mutationFn: async ({ habitId, userId }: { habitId: string; userId: string }) => {
      const today = getToday();
      const habits = useAppStore.getState().habits;
      const habit = habits.find((h) => h.id === habitId);
      const isCurrentlyCompleted = !!useAppStore.getState().dailyScores[today]?.[`habit_${habitId}`];

      updateDailyScore(today, `habit_${habitId}`, !isCurrentlyCompleted);

      const currentStreak = habit?.streak_current || 0;
      const newStreak = isCurrentlyCompleted ? Math.max(0, currentStreak - 1) : currentStreak + 1;
      const newCompletions = isCurrentlyCompleted ? Math.max(0, (habit?.total_completions || 1) - 1) : (habit?.total_completions || 0) + 1;

      updateHabit(habitId, {
        streak_current: newStreak,
        streak_longest: Math.max(newStreak, habit?.streak_longest || 0),
        total_completions: newCompletions,
      });

      if (!isCurrentlyCompleted) {
        awardXp(15, 'Habit Completed');
      }

      try {
        const { data: existing } = await supabaseBrowser
          .from('habit_logs')
          .select('*')
          .eq('habit_id', habitId)
          .eq('completed_date', today)
          .single();

        if (existing) {
          await supabaseBrowser.from('habit_logs').delete().eq('id', existing.id);
          return { action: 'unchecked', habitId };
        } else {
          const { data } = await supabaseBrowser
            .from('habit_logs')
            .insert({ habit_id: habitId, user_id: userId, completed_date: today })
            .select()
            .single();
          return { action: 'checked', habitId, log: data };
        }
      } catch {
        return { action: isCurrentlyCompleted ? 'unchecked' : 'checked', habitId };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs'] });
      if (result.action === 'checked') {
        addToast({ type: 'success', title: 'Habit completed! +15 XP' });
      }
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const addHabit = useAppStore((state) => state.addHabit);

  return useMutation({
    mutationFn: async (habit: Partial<Habit>) => {
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

      addHabit(newHabit);

      try {
        await supabaseBrowser.from('habits').insert(newHabit as any);
      } catch {
        // Local saved
      }
      return newHabit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit created' });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateHabit = useAppStore((state) => state.updateHabit);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      updateHabit(id, updates);
      try {
        await supabaseBrowser.from('habits').update(updates).eq('id', id);
      } catch {
        // Local updated
      }
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit updated' });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteHabit = useAppStore((state) => state.deleteHabit);

  return useMutation({
    mutationFn: async (id: string) => {
      deleteHabit(id);
      try {
        await supabaseBrowser.from('habits').delete().eq('id', id);
      } catch {
        // Local deleted
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      addToast({ type: 'success', title: 'Habit deleted' });
    },
  });
}

// ==================== GOAL HOOKS ====================
export function useGoals(status: 'active' | 'completed' = 'active') {
  const localGoals = useAppStore((state) => state.goals);

  return useQuery({
    queryKey: ['goals', status],
    queryFn: async () => {
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
        return (data as unknown as Goal[]) || [];
      } catch {
        return localGoals.filter((g) => g.status === status);
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
    mutationFn: async (goal: Partial<Goal> & { key_results?: { title: string; target_value: number; unit: string }[] }) => {
      const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
      const newGoal: Goal = {
        id: goal.id || `goal-${Date.now()}`,
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
          goal_id: goal.id || `goal-${Date.now()}`,
          title: kr.title,
          target_value: kr.target_value,
          current_value: 0,
          unit: kr.unit,
          sort_order: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      };

      addGoal(newGoal);

      try {
        const { key_results, ...goalData } = newGoal;
        await supabaseBrowser.from('goals').insert(goalData as any);
      } catch {
        // Handled locally
      }
      return newGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      addToast({ type: 'success', title: 'Goal created' });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateGoal = useAppStore((state) => state.updateGoal);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      updateGoal(id, updates);
      try {
        await supabaseBrowser.from('goals').update(updates).eq('id', id);
      } catch {
        // Local handled
      }
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      addToast({ type: 'success', title: 'Goal updated' });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const deleteGoal = useAppStore((state) => state.deleteGoal);

  return useMutation({
    mutationFn: async (id: string) => {
      deleteGoal(id);
      try {
        await supabaseBrowser.from('goals').delete().eq('id', id);
      } catch {
        // Local deleted
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      addToast({ type: 'success', title: 'Goal deleted' });
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
        return (data as FocusSession[]) || [];
      } catch {
        return localSessions.filter((s) => (s.started_at || '').split('T')[0] === today);
      }
    },
    initialData: () => localSessions.filter((s) => (s.started_at || '').split('T')[0] === today),
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  const addFocusSession = useAppStore((state) => state.addFocusSession);

  return useMutation({
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

      addFocusSession(newSession);

      try {
        const { data, error } = await supabaseBrowser
          .from('focus_sessions')
          .insert(newSession)
          .select()
          .single();
        if (!error && data) return data as FocusSession;
      } catch {
        // Local handled
      }
      return newSession;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['focus-sessions'] }),
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((state) => state.addToast);
  const updateFocusSession = useAppStore((state) => state.updateFocusSession);
  const awardXp = useAppStore((state) => state.awardXp);
  const upsertDailyLogState = useAppStore((state) => state.upsertDailyLogState);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FocusSession> }) => {
      updateFocusSession(id, updates);
      const minutes = updates.actual_duration || 0;
      if (minutes > 0) {
        awardXp(minutes, 'Focus Time');
        const today = getToday();
        upsertDailyLogState(today, {
          focus_hours: Number((minutes / 60).toFixed(1)),
        });
      }

      try {
        await supabaseBrowser
          .from('focus_sessions')
          .update(updates)
          .eq('id', id);
      } catch {
        // Local handled
      }
      return { id, ...updates };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      if (data?.status === 'cancelled') {
        addToast({ type: 'info', title: 'Focus session cancelled' });
      } else {
        addToast({ type: 'success', title: 'Focus session completed!' });
      }
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
        return (data as DailyLog) || null;
      } catch {
        return localLogs[targetDate] || null;
      }
    },
    initialData: () => localLogs[targetDate] || null,
  });
}

export function useUpsertDailyLog() {
  const queryClient = useQueryClient();
  const upsertDailyLogState = useAppStore((state) => state.upsertDailyLogState);

  return useMutation({
    mutationFn: async (log: Partial<DailyLog> & { log_date: string }) => {
      upsertDailyLogState(log.log_date, log);
      try {
        const userId = useAppStore.getState().user?.id || '11111111-1111-1111-1111-111111111111';
        const { data, error } = await supabaseBrowser
          .from('daily_logs')
          .upsert({ ...log, user_id: userId } as any, { onConflict: 'user_id,log_date' })
          .select()
          .single();
        if (!error && data) return data as DailyLog;
      } catch {
        // Local handled
      }
      return log as DailyLog;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ['daily-log', data.log_date] }),
  });
}

// ==================== LIFE AREA HOOKS ====================
export function useLifeAreas() {
  return useQuery({
    queryKey: ['life-areas'],
    queryFn: async () => {
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
  });
}

// ==================== GAMIFICATION HOOKS ====================
export function useUserBadges() {
  return useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
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
      localSessions.forEach((s) => {
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
      localTasks.forEach((t) => {
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
