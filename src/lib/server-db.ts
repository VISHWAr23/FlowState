import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { Task, Habit, HabitLog, Goal, FocusSession, DailyLog, TimeBlock, Profile } from '@/types/types';

export interface StoredUser {
  id: string;
  username: string;
  username_lower: string;
  name: string;
  email?: string;
  email_lower?: string;
  password_hash: string;
  level: number;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  full_name: string;
  email?: string | null;
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

export interface FlowStateDbData {
  users: StoredUser[];
  tasks: Task[];
  habits: Habit[];
  habit_logs: HabitLog[];
  goals: Goal[];
  focus_sessions: FocusSession[];
  daily_logs: DailyLog[];
  time_blocks: (TimeBlock & { user_id: string })[];
  user_settings: Record<string, any>;
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DB_PATH = path.join(process.cwd(), 'data', 'flowstate_db.json');
const WRITABLE_DB_PATH = IS_SERVERLESS
  ? path.join('/tmp', 'flowstate_db.json')
  : BUNDLED_DB_PATH;

function ensureDbFile(): FlowStateDbData {
  try {
    const dir = path.dirname(WRITABLE_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // In serverless environments, initialize /tmp from bundled database if not yet present
    if (IS_SERVERLESS && !fs.existsSync(WRITABLE_DB_PATH) && fs.existsSync(BUNDLED_DB_PATH)) {
      try {
        fs.copyFileSync(BUNDLED_DB_PATH, WRITABLE_DB_PATH);
      } catch (err) {
        console.error('Failed to copy bundled database to /tmp:', err);
      }
    }

    const targetPath = fs.existsSync(WRITABLE_DB_PATH)
      ? WRITABLE_DB_PATH
      : fs.existsSync(BUNDLED_DB_PATH)
      ? BUNDLED_DB_PATH
      : null;

    if (!targetPath) {
      const initial: FlowStateDbData = {
        users: [],
        tasks: [],
        habits: [],
        habit_logs: [],
        goals: [],
        focus_sessions: [],
        daily_logs: [],
        time_blocks: [],
        user_settings: {},
      };
      try {
        fs.writeFileSync(WRITABLE_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      } catch {
        // Ignored if read-only
      }
      return initial;
    }

    const content = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      users: parsed.users || [],
      tasks: parsed.tasks || [],
      habits: parsed.habits || [],
      habit_logs: parsed.habit_logs || [],
      goals: parsed.goals || [],
      focus_sessions: parsed.focus_sessions || [],
      daily_logs: parsed.daily_logs || [],
      time_blocks: parsed.time_blocks || [],
      user_settings: parsed.user_settings || {},
    };
  } catch (error) {
    console.error('Failed to read database file, initializing fallback in-memory store:', error);
    return {
      users: [],
      tasks: [],
      habits: [],
      habit_logs: [],
      goals: [],
      focus_sessions: [],
      daily_logs: [],
      time_blocks: [],
      user_settings: {},
    };
  }
}

function saveDb(data: FlowStateDbData): void {
  try {
    const dir = path.dirname(WRITABLE_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${WRITABLE_DB_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, WRITABLE_DB_PATH);
  } catch (error) {
    console.error('Failed to save database file:', error);
  }
}

export function toPublicProfile(user: StoredUser): UserPublicProfile {
  return {
    id: user.id,
    username: user.username,
    full_name: user.name,
    email: user.email || null,
    avatar_url: null,
    timezone: 'UTC',
    preferred_language: 'en',
    created_at: user.created_at,
    updated_at: user.updated_at,
    level: user.level || 1,
    xp: user.xp || 0,
    total_focus_minutes: 0,
    current_streak: 1,
    longest_streak: 1,
    daily_xp_cap: 500,
    weekly_review_day: 0,
    morning_reminder: null,
    evening_reminder: null,
  };
}

// ==================== USER MANAGEMENT ====================

export function findUserByUsernameOrEmail(identifier: string): StoredUser | null {
  const db = ensureDbFile();
  const normalized = identifier.trim().toLowerCase();
  return (
    db.users.find(
      (u) =>
        u.username_lower === normalized ||
        (u.email_lower && u.email_lower === normalized) ||
        (u.email && u.email.trim().toLowerCase() === normalized)
    ) || null
  );
}

export function findUserByUsername(username: string): StoredUser | null {
  return findUserByUsernameOrEmail(username);
}

export function findUserById(id: string): StoredUser | null {
  const db = ensureDbFile();
  return db.users.find((u) => u.id === id) || null;
}

export function createUser(params: {
  name: string;
  username: string;
  email?: string;
  password: string;
}): UserPublicProfile {
  const db = ensureDbFile();
  const trimmedName = params.name.trim();
  const trimmedUsername = params.username.trim();
  const normalizedUsername = trimmedUsername.toLowerCase();
  const trimmedEmail = params.email ? params.email.trim() : undefined;
  const normalizedEmail = trimmedEmail ? trimmedEmail.toLowerCase() : undefined;

  // Validate uniqueness case-insensitively
  const existingUsername = db.users.find((u) => u.username_lower === normalizedUsername);
  if (existingUsername) {
    throw new Error('Username already taken');
  }

  if (normalizedEmail) {
    const existingEmail = db.users.find(
      (u) => u.email_lower === normalizedEmail || (u.email && u.email.toLowerCase() === normalizedEmail)
    );
    if (existingEmail) {
      throw new Error('Email already registered');
    }
  }

  // Hash password with bcrypt
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(params.password, salt);

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    username_lower: normalizedUsername,
    name: trimmedName,
    email: trimmedEmail,
    email_lower: normalizedEmail,
    password_hash: passwordHash,
    level: 1,
    xp: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  return toPublicProfile(newUser);
}

export function verifyUserCredentials(identifier: string, password: string): UserPublicProfile | null {
  const user = findUserByUsernameOrEmail(identifier);
  if (!user) return null;

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return null;

  return toPublicProfile(user);
}

export function updateUser(
  id: string,
  updates: { name?: string; username?: string; email?: string; timezone?: string }
): UserPublicProfile | null {
  const db = ensureDbFile();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;

  if (updates.username && updates.username.trim()) {
    const trimmedUsername = updates.username.trim();
    const normalized = trimmedUsername.toLowerCase();
    const existing = db.users.find(
      (u) => u.id !== id && u.username_lower === normalized
    );
    if (existing) {
      throw new Error('Username already taken');
    }
    user.username = trimmedUsername;
    user.username_lower = normalized;
  }

  if (updates.email !== undefined && updates.email.trim()) {
    const trimmedEmail = updates.email.trim();
    const normalized = trimmedEmail.toLowerCase();
    const existing = db.users.find(
      (u) => u.id !== id && (u.email_lower === normalized || (u.email && u.email.toLowerCase() === normalized))
    );
    if (existing) {
      throw new Error('Email already taken');
    }
    user.email = trimmedEmail;
    user.email_lower = normalized;
  }

  if (updates.name !== undefined && updates.name.trim()) {
    user.name = updates.name.trim();
  }

  user.updated_at = new Date().toISOString();
  saveDb(db);

  return toPublicProfile(user);
}

// ==================== USER DATA ISOLATION ====================

export function getUserTasks(userId: string, date?: string): Task[] {
  const db = ensureDbFile();
  let userTasks = db.tasks.filter((t) => t.user_id === userId);
  if (date) {
    userTasks = userTasks.filter((t) => {
      const taskDate = t.due_date ? t.due_date.split('T')[0] : '';
      return taskDate === date;
    });
  }
  return userTasks;
}

export function createUserTask(userId: string, taskData: Partial<Task>): Task {
  const db = ensureDbFile();
  const newTask: Task = {
    id: taskData.id || crypto.randomUUID(),
    user_id: userId, // Enforce authenticated userId
    goal_id: taskData.goal_id || null,
    life_area_id: taskData.life_area_id || null,
    parent_task_id: taskData.parent_task_id || null,
    title: taskData.title || 'Untitled Task',
    description: taskData.description || null,
    notes: taskData.notes || null,
    status: taskData.status || 'pending',
    priority: taskData.priority || 'medium',
    energy_level: taskData.energy_level || null,
    estimated_minutes: taskData.estimated_minutes || 25,
    actual_minutes: taskData.actual_minutes || null,
    due_date: taskData.due_date || new Date().toISOString().split('T')[0],
    scheduled_start: taskData.scheduled_start || null,
    scheduled_end: taskData.scheduled_end || null,
    completed_at: taskData.completed_at || null,
    is_recurring: taskData.is_recurring || false,
    recurrence_rule: taskData.recurrence_rule || null,
    source: taskData.source || 'user',
    xp_reward: taskData.xp_reward || 20,
    sort_order: taskData.sort_order || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.tasks.push(newTask);
  saveDb(db);
  return newTask;
}

export function updateUserTask(userId: string, taskId: string, updates: Partial<Task>): Task | null {
  const db = ensureDbFile();
  const index = db.tasks.findIndex((t) => t.id === taskId && t.user_id === userId);
  if (index === -1) return null;

  // Protect against overriding user_id
  const updated: Task = {
    ...db.tasks[index],
    ...updates,
    completed_at:
      updates.status === 'completed'
        ? (updates.completed_at || db.tasks[index].completed_at || new Date().toISOString())
        : updates.status === 'pending'
        ? null
        : updates.completed_at !== undefined
        ? updates.completed_at
        : db.tasks[index].completed_at,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  db.tasks[index] = updated;
  saveDb(db);
  return updated;
}

export function deleteUserTask(userId: string, taskId: string): boolean {
  const db = ensureDbFile();
  const initialLen = db.tasks.length;
  db.tasks = db.tasks.filter((t) => !(t.id === taskId && t.user_id === userId));
  if (db.tasks.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

// ==================== HABITS ISOLATION ====================

export function getUserHabits(userId: string): Habit[] {
  const db = ensureDbFile();
  return db.habits.filter((h) => h.user_id === userId);
}

export function createUserHabit(userId: string, habitData: Partial<Habit>): Habit {
  const db = ensureDbFile();
  const newHabit: Habit = {
    id: habitData.id || crypto.randomUUID(),
    user_id: userId,
    goal_id: habitData.goal_id || null,
    life_area_id: habitData.life_area_id || null,
    title: habitData.title || 'Untitled Habit',
    description: habitData.description || null,
    frequency: habitData.frequency || 'daily',
    specific_days: habitData.specific_days || [1, 2, 3, 4, 5],
    time_of_day: habitData.time_of_day || 'anytime',
    target_duration_minutes: habitData.target_duration_minutes || 15,
    color: habitData.color || '#3b82f6',
    icon: habitData.icon || 'Sparkles',
    streak_current: 0,
    streak_longest: 0,
    total_completions: 0,
    xp_reward: habitData.xp_reward || 15,
    is_active: true,
    sort_order: habitData.sort_order || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.habits.push(newHabit);
  saveDb(db);
  return newHabit;
}

export function updateUserHabit(userId: string, habitId: string, updates: Partial<Habit>): Habit | null {
  const db = ensureDbFile();
  const index = db.habits.findIndex((h) => h.id === habitId && h.user_id === userId);
  if (index === -1) return null;

  const updated: Habit = {
    ...db.habits[index],
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  db.habits[index] = updated;
  saveDb(db);
  return updated;
}

export function deleteUserHabit(userId: string, habitId: string): boolean {
  const db = ensureDbFile();
  const initialLen = db.habits.length;
  db.habits = db.habits.filter((h) => !(h.id === habitId && h.user_id === userId));
  if (db.habits.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

// ==================== GOALS ISOLATION ====================

export function getUserGoals(userId: string): Goal[] {
  const db = ensureDbFile();
  return db.goals.filter((g) => g.user_id === userId);
}

export function createUserGoal(userId: string, goalData: Partial<Goal>): Goal {
  const db = ensureDbFile();
  const newGoal: Goal = {
    id: goalData.id || crypto.randomUUID(),
    user_id: userId,
    life_area_id: goalData.life_area_id || 'area-career',
    title: goalData.title || 'Untitled Goal',
    description: goalData.description || null,
    status: goalData.status || 'active',
    priority: goalData.priority || 1,
    start_date: goalData.start_date || new Date().toISOString().split('T')[0],
    target_date: goalData.target_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    completed_at: null,
    progress: goalData.progress || 0,
    xp_reward: goalData.xp_reward || 500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.goals.push(newGoal);
  saveDb(db);
  return newGoal;
}

export function updateUserGoal(userId: string, goalId: string, updates: Partial<Goal>): Goal | null {
  const db = ensureDbFile();
  const index = db.goals.findIndex((g) => g.id === goalId && g.user_id === userId);
  if (index === -1) return null;

  const updated: Goal = {
    ...db.goals[index],
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  db.goals[index] = updated;
  saveDb(db);
  return updated;
}

export function deleteUserGoal(userId: string, goalId: string): boolean {
  const db = ensureDbFile();
  const initialLen = db.goals.length;
  db.goals = db.goals.filter((g) => !(g.id === goalId && g.user_id === userId));
  if (db.goals.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

// ==================== FOCUS SESSIONS ISOLATION ====================

export function getUserFocusSessions(userId: string): FocusSession[] {
  const db = ensureDbFile();
  return db.focus_sessions.filter((f) => f.user_id === userId);
}

export function createUserFocusSession(userId: string, sessionData: Partial<FocusSession>): FocusSession {
  const db = ensureDbFile();
  const newSession: FocusSession = {
    id: sessionData.id || crypto.randomUUID(),
    user_id: userId,
    task_id: sessionData.task_id || null,
    goal_id: sessionData.goal_id || null,
    life_area_id: sessionData.life_area_id || null,
    started_at: sessionData.started_at || new Date().toISOString(),
    ended_at: sessionData.ended_at || null,
    planned_duration: sessionData.planned_duration || 25,
    actual_duration: sessionData.actual_duration || null,
    status: sessionData.status || 'completed',
    session_type: sessionData.session_type || 'pomodoro',
    interruptions: sessionData.interruptions || 0,
    interruption_notes: sessionData.interruption_notes || [],
    flow_rating: sessionData.flow_rating || null,
    notes: sessionData.notes || null,
    reflection_notes: sessionData.reflection_notes || null,
    xp_earned: sessionData.xp_earned || 25,
    created_at: new Date().toISOString(),
  };

  db.focus_sessions.push(newSession);
  saveDb(db);
  return newSession;
}

// ==================== DAILY LOGS ISOLATION ====================

export function getUserDailyLogs(userId: string): DailyLog[] {
  const db = ensureDbFile();
  return db.daily_logs.filter((l) => l.user_id === userId);
}

export function upsertUserDailyLog(userId: string, date: string, logData: Partial<DailyLog>): DailyLog {
  const db = ensureDbFile();
  const index = db.daily_logs.findIndex((l) => l.user_id === userId && l.log_date === date);

  if (index >= 0) {
    const updated: DailyLog = {
      ...db.daily_logs[index],
      ...logData,
      user_id: userId,
      log_date: date,
    };
    db.daily_logs[index] = updated;
    saveDb(db);
    return updated;
  } else {
    const newLog: DailyLog = {
      id: `log-${date}-${userId}`,
      user_id: userId,
      log_date: date,
      morning_completed_at: logData.morning_completed_at || null,
      evening_completed_at: logData.evening_completed_at || null,
      day_rating: logData.day_rating || null,
      energy_rating: logData.energy_rating || null,
      mood: logData.mood || null,
      top_wins: logData.top_wins || [],
      lessons_learned: logData.lessons_learned || null,
      gratitude_note: logData.gratitude_note || null,
      focus_hours: logData.focus_hours || 0,
      tasks_completed: logData.tasks_completed || 0,
      tasks_planned: logData.tasks_planned || 0,
      habits_completed: logData.habits_completed || 0,
      habits_planned: logData.habits_planned || 0,
      xp_earned: logData.xp_earned || 0,
      productivity_score: logData.productivity_score || 80,
    };
    db.daily_logs.push(newLog);
    saveDb(db);
    return newLog;
  }
}

// ==================== TIME BLOCKS / TIMETABLE ISOLATION ====================

export function getUserTimeBlocks(userId: string): TimeBlock[] {
  const db = ensureDbFile();
  return db.time_blocks
    .filter((tb) => tb.user_id === userId)
    .map(({ user_id, ...block }) => block);
}

export function saveUserTimeBlocks(userId: string, blocks: TimeBlock[]): void {
  const db = ensureDbFile();
  // Filter out existing blocks for this user
  db.time_blocks = db.time_blocks.filter((tb) => tb.user_id !== userId);
  // Add new blocks
  for (const b of blocks) {
    db.time_blocks.push({
      ...b,
      user_id: userId,
    });
  }
  saveDb(db);
}
