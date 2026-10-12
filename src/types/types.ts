// FlowState Type Definitions
// Last Updated: 2026-06-01

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
  level: number;
  xp: number;
  total_focus_minutes: number;
  current_streak: number;
  longest_streak: number;
  daily_xp_cap: number;
  weekly_review_day: number;
  morning_reminder: string | null;
  evening_reminder: string | null;
}

export interface LifeArea {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  target_hours_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  life_area_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived' | 'cancelled';
  priority: number;
  start_date: string;
  target_date: string;
  completed_at: string | null;
  progress: number;
  xp_reward: number;
  created_at: string;
  updated_at: string;
  life_area?: LifeArea;
  key_results?: KeyResult[];
}

export interface KeyResult {
  id: string;
  goal_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  life_area_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  notes?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  energy_level: 'low' | 'medium' | 'high' | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  due_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  source: string;
  xp_reward: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // CEO Manual Spaced Revision
  needs_review?: boolean;
  last_reviewed_at?: string | null;
  life_area?: LifeArea;
  goal?: Goal;
}

export interface Habit {
  id: string;
  user_id: string;
  goal_id: string | null;
  life_area_id: string | null;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'specific_days';
  specific_days: number[];
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'anytime';
  target_duration_minutes: number | null;
  color: string;
  icon: string;
  streak_current: number;
  streak_longest: number;
  total_completions: number;
  xp_reward: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  life_area?: LifeArea;
  goal?: Goal;
  logs?: HabitLog[];
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;
  completed_at: string;
  duration_minutes: number | null;
  notes: string | null;
  mood: number | null;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  goal_id: string | null;
  life_area_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_duration: number;
  actual_duration: number | null;
  status: 'active' | 'completed' | 'interrupted' | 'abandoned' | 'cancelled';
  session_type?: string;
  interruptions?: number;
  interruption_notes?: string[] | null;
  flow_rating: number | null;
  notes: string | null;
  reflection_notes?: string | null;
  xp_earned?: number;
  created_at: string;
  task?: Task;
  goal?: Goal;
  life_area?: LifeArea;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  morning_completed_at: string | null;
  evening_completed_at: string | null;
  day_rating: number | null;
  energy_rating: number | null;
  mood: string | null;
  top_wins: string[] | null;
  lessons_learned: string | null;
  gratitude_note: string | null;
  focus_hours: number;
  tasks_completed: number;
  tasks_planned: number;
  habits_completed: number;
  habits_planned: number;
  xp_earned: number;
  productivity_score: number | null;
  
  // CEO Manual Daily Scorecard
  score_online_class?: boolean;
  score_coding?: boolean;
  score_project?: boolean;
  score_english?: boolean;
  score_typewriting?: boolean;
  score_market_journal?: boolean;
  score_recall?: boolean;
  score_exercise?: boolean;
  score_sleep?: boolean;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  completed_at: string | null;
  completion_rate: number | null;
  consistency_score: number | null;
  focus_score: number | null;
  goal_score: number | null;
  productivity_score: number | null;
  wins: string[] | null;
  challenges: string[] | null;
  adjustments: string | null;
  next_week_priorities: string[] | null;
  time_allocation: Record<string, number> | null;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'consistency' | 'milestone' | 'explorer' | 'master';
  icon: string;
  color: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  is_new: boolean;
  badge?: Badge;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export interface ProductivityScore {
  completion_rate: number;
  consistency_score: number;
  focus_score: number;
  goal_score: number;
  overall: number;
}

export interface AnalyticsData {
  daily: {
    date: string;
    tasks_completed: number;
    tasks_planned: number;
    habits_completed: number;
    focus_hours: number;
    xp_earned: number;
    productivity_score: number;
  }[];
  weekly: {
    week_start: string;
    completion_rate: number;
    consistency_score: number;
    focus_score: number;
    goal_score: number;
    productivity_score: number;
  }[];
  area_distribution: {
    area_id: string;
    area_name: string;
    area_color: string;
    task_count: number;
    focus_hours: number;
    habit_completions: number;
  }[];
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type GoalStatus = 'active' | 'completed' | 'archived' | 'cancelled';
export type HabitFrequency = 'daily' | 'weekly' | 'specific_days';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface TimeBlock {
  id: string;
  title: string;
  startHour: number;
  durationHours: number;
  color: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc. (for recurring blocks)
  date?: string; // YYYY-MM-DD for one-off blocks (today only)
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; value: number }> = {
  low: { label: 'Low', color: '#6b7280', value: 1 },
  medium: { label: 'Medium', color: '#3b82f6', value: 2 },
  high: { label: 'High', color: '#f59e0b', value: 3 },
  urgent: { label: 'Urgent', color: '#ef4444', value: 4 },
};

export const ENERGY_CONFIG: Record<EnergyLevel, { label: string; color: string; icon: string }> = {
  low: { label: 'Low Energy', color: '#6b7280', icon: 'BatteryWarning' },
  medium: { label: 'Medium Energy', color: '#eab308', icon: 'BatteryMedium' },
  high: { label: 'High Energy', color: '#22c55e', icon: 'BatteryFull' },
};

export const AREA_ICONS: Record<string, string> = {
  career: 'Briefcase',
  learning: 'BookOpen',
  fitness: 'Dumbbell',
  finance: 'Wallet',
  relationships: 'Heart',
  'personal-projects': 'Lightbulb',
};

export const XP_REWARDS = {
  task_complete: { low: 10, medium: 20, high: 35, urgent: 50 },
  habit_complete: 15,
  focus_session: (minutes: number) => Math.floor(minutes),
  daily_planning: 20,
  weekly_review: 50,
  goal_milestone_25: 100,
  goal_milestone_50: 200,
  goal_milestone_75: 300,
  goal_complete: 500,
  streak_7: 50,
  streak_30: 200,
  streak_100: 1000,
};

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Novice',
  11: 'Apprentice',
  21: 'Practitioner',
  31: 'Specialist',
  41: 'Expert',
  51: 'Master',
  61: 'Sage',
  71: 'Legend',
  81: 'Titan',
  91: 'Ascendant',
};

export function getLevelTitle(level: number): string {
  const thresholds = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91];
  const applicable = thresholds.filter(t => t <= level);
  const key = applicable[applicable.length - 1] || 1;
  return LEVEL_TITLES[key] || 'Novice';
}

export function calculateLevel(xp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100;
}

export function xpProgressInLevel(xp: number, level: number): number {
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const needed = nextLevelXp - currentLevelXp;
  const have = xp - currentLevelXp;
  return Math.min(100, Math.max(0, Math.round((have / needed) * 100)));
}
