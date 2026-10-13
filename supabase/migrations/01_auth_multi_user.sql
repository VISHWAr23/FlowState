-- FlowState Multi-User Authentication & Data Isolation Migration
-- Version: 01_auth_multi_user.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User Accounts & Progression)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    username_lower TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferred_language TEXT DEFAULT 'en',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_focus_minutes INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 1,
    longest_streak INTEGER DEFAULT 1,
    daily_xp_cap INTEGER DEFAULT 500,
    weekly_review_day INTEGER DEFAULT 0,
    morning_reminder TIME,
    evening_reminder TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));

-- 2. LIFE AREAS TABLE (Categorization)
CREATE TABLE IF NOT EXISTS public.life_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'Briefcase',
    sort_order INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    target_hours_per_week NUMERIC DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_areas_user_id ON public.life_areas(user_id);

-- 3. GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    life_area_id UUID REFERENCES public.life_areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'cancelled')),
    priority INTEGER DEFAULT 1,
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    progress INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- 4. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    life_area_id UUID REFERENCES public.life_areas(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high')),
    estimated_minutes INTEGER DEFAULT 25,
    actual_minutes INTEGER,
    due_date DATE DEFAULT CURRENT_DATE,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    source TEXT DEFAULT 'user',
    xp_reward INTEGER DEFAULT 20,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);

-- 5. HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    life_area_id UUID REFERENCES public.life_areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'specific_days')),
    specific_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    time_of_day TEXT DEFAULT 'anytime' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),
    target_duration_minutes INTEGER,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'Sparkles',
    streak_current INTEGER DEFAULT 0,
    streak_longest INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

-- 6. HABIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    mood INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);

-- 7. FOCUS SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    life_area_id UUID REFERENCES public.life_areas(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    planned_duration INTEGER DEFAULT 25,
    actual_duration INTEGER,
    status TEXT DEFAULT 'completed' CHECK (status IN ('active', 'completed', 'interrupted', 'abandoned', 'cancelled')),
    session_type TEXT DEFAULT 'pomodoro',
    interruptions INTEGER DEFAULT 0,
    interruption_notes TEXT[],
    flow_rating INTEGER,
    notes TEXT,
    reflection_notes TEXT,
    xp_earned INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(user_id, started_at);

-- 8. DAILY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    morning_completed_at TIMESTAMPTZ,
    evening_completed_at TIMESTAMPTZ,
    day_rating INTEGER,
    energy_rating INTEGER,
    mood TEXT,
    top_wins TEXT[],
    lessons_learned TEXT,
    gratitude_note TEXT,
    focus_hours NUMERIC DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_planned INTEGER DEFAULT 0,
    habits_completed INTEGER DEFAULT 0,
    habits_planned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    productivity_score INTEGER DEFAULT 80,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict data isolation ensuring direct API access cannot cross tenants
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read and manage their own profile"
    ON public.profiles FOR ALL
    USING (id = auth.uid());

CREATE POLICY "Users can only read and manage their own life areas"
    ON public.life_areas FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own goals"
    ON public.goals FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own tasks"
    ON public.tasks FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own habits"
    ON public.habits FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own habit logs"
    ON public.habit_logs FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own focus sessions"
    ON public.focus_sessions FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only read and manage their own daily logs"
    ON public.daily_logs FOR ALL
    USING (user_id = auth.uid());
