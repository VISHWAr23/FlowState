-- FlowState / APEX Multi-User Production Database Schema & RLS Policies
-- Comprehensive migration for all tables, indexes, triggers, and Row Level Security
-- Version: 01_auth_multi_user.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES TABLE (User Accounts & Progression)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    username_lower TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    email_lower TEXT,
    password_hash TEXT,
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
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email)) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. LIFE AREAS TABLE (Categorization)
CREATE TABLE IF NOT EXISTS public.life_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

DROP TRIGGER IF EXISTS set_life_areas_updated_at ON public.life_areas;
CREATE TRIGGER set_life_areas_updated_at
    BEFORE UPDATE ON public.life_areas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals(user_id, status);

DROP TRIGGER IF EXISTS set_goals_updated_at ON public.goals;
CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. KEY RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_value NUMERIC NOT NULL DEFAULT 100,
    current_value NUMERIC NOT NULL DEFAULT 0,
    unit TEXT DEFAULT '%',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_key_results_goal_id ON public.key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_key_results_user_id ON public.key_results(user_id);

DROP TRIGGER IF EXISTS set_key_results_updated_at ON public.key_results;
CREATE TRIGGER set_key_results_updated_at
    BEFORE UPDATE ON public.key_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks(user_id, updated_at);

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    life_area_id UUID REFERENCES public.life_areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'specific_days')),
    specific_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
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
CREATE INDEX IF NOT EXISTS idx_habits_active ON public.habits(user_id, is_active);

DROP TRIGGER IF EXISTS set_habits_updated_at ON public.habits;
CREATE TRIGGER set_habits_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. HABIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    mood INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);

DROP TRIGGER IF EXISTS set_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER set_habit_logs_updated_at
    BEFORE UPDATE ON public.habit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. FOCUS SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(user_id, started_at);

DROP TRIGGER IF EXISTS set_focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER set_focus_sessions_updated_at
    BEFORE UPDATE ON public.focus_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 9. DAILY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    scores JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS reflection_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date);

DROP TRIGGER IF EXISTS set_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER set_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. TIME BLOCKS TABLE (Timetable Scheduling)
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_hour NUMERIC NOT NULL,
    duration_hours NUMERIC NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    days INTEGER[] DEFAULT '{1,2,3,4,5}',
    block_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON public.time_blocks(user_id);

DROP TRIGGER IF EXISTS set_time_blocks_updated_at ON public.time_blocks;
CREATE TRIGGER set_time_blocks_updated_at
    BEFORE UPDATE ON public.time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 11. CHAT MESSAGES TABLE (AI Assistant History)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_date ON public.chat_messages(user_id, created_at ASC);

DROP TRIGGER IF EXISTS set_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER set_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict data isolation ensuring each user can only read and manage their own data

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$
BEGIN
    DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
    DROP POLICY IF EXISTS "life_areas_policy" ON public.life_areas;
    DROP POLICY IF EXISTS "goals_policy" ON public.goals;
    DROP POLICY IF EXISTS "key_results_policy" ON public.key_results;
    DROP POLICY IF EXISTS "tasks_policy" ON public.tasks;
    DROP POLICY IF EXISTS "habits_policy" ON public.habits;
    DROP POLICY IF EXISTS "habit_logs_policy" ON public.habit_logs;
    DROP POLICY IF EXISTS "focus_sessions_policy" ON public.focus_sessions;
    DROP POLICY IF EXISTS "daily_logs_policy" ON public.daily_logs;
    DROP POLICY IF EXISTS "time_blocks_policy" ON public.time_blocks;
    DROP POLICY IF EXISTS "chat_messages_policy" ON public.chat_messages;
END $$;

-- Policy definitions (supports both Supabase Auth auth.uid() and Service Role)
CREATE POLICY "profiles_policy"
    ON public.profiles FOR ALL
    USING (id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "life_areas_policy"
    ON public.life_areas FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "goals_policy"
    ON public.goals FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "key_results_policy"
    ON public.key_results FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "tasks_policy"
    ON public.tasks FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "habits_policy"
    ON public.habits FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "habit_logs_policy"
    ON public.habit_logs FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "focus_sessions_policy"
    ON public.focus_sessions FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "daily_logs_policy"
    ON public.daily_logs FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "time_blocks_policy"
    ON public.time_blocks FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "chat_messages_policy"
    ON public.chat_messages FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role')
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

-- 13. ENABLE REALTIME
-- Configure publication for cross-device live synchronization
DO $$
DECLARE
    rt_tbl text;
BEGIN
    FOREACH rt_tbl IN ARRAY ARRAY[
        'profiles', 'tasks', 'habits', 'habit_logs', 'goals',
        'key_results', 'focus_sessions', 'daily_logs', 'time_blocks', 'chat_messages'
    ] LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', rt_tbl);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rt_tbl);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;

-- 14. PERMISSIONS & ROLES
-- Grant API roles full access to the public schema and tables (RLS still enforces user boundaries)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
