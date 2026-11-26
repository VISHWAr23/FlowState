import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase-server';
import { isPlaceholderUrl } from './supabase';
import { findUserById, type StoredUser, type UserPublicProfile } from './server-db';
import { generateUUID, isUUID } from './utils';
import type { Database } from './database.types';

const CACHE_TTL_MS = 5 * 60 * 1000;
const verifiedProfilesCache = new Map<string, number>();
const userLifeAreasCache = new Map<string, { areas: any[]; expiresAt: number }>();

export function markProfileVerified(userId: string) {
  if (isUUID(userId)) {
    verifiedProfilesCache.set(userId, Date.now() + CACHE_TTL_MS);
  }
}

export function invalidateUserSyncCache(userId: string) {
  verifiedProfilesCache.delete(userId);
  userLifeAreasCache.delete(userId);
}

const DEFAULT_AREA_SEEDS = [
  {
    placeholderId: 'a1000000-0000-4000-8000-000000000001',
    name: 'Career & Work',
    slug: 'career',
    description: 'Professional growth and execution',
    color: '#3b82f6',
    icon: 'Briefcase',
    sort_order: 1,
    target_hours_per_week: 20,
  },
  {
    placeholderId: 'a1000000-0000-4000-8000-000000000002',
    name: 'Learning & Skills',
    slug: 'learning',
    description: 'Technical knowledge and English practice',
    color: '#8b5cf6',
    icon: 'BookOpen',
    sort_order: 2,
    target_hours_per_week: 10,
  },
  {
    placeholderId: 'a1000000-0000-4000-8000-000000000003',
    name: 'Health & Fitness',
    slug: 'fitness',
    description: 'Physical energy, gym, and mental clarity',
    color: '#22c55e',
    icon: 'Dumbbell',
    sort_order: 3,
    target_hours_per_week: 7,
  },
  {
    placeholderId: 'a1000000-0000-4000-8000-000000000004',
    name: 'Finance',
    slug: 'finance',
    description: 'Financial independence and capital',
    color: '#eab308',
    icon: 'Wallet',
    sort_order: 4,
    target_hours_per_week: 2,
  },
  {
    placeholderId: 'a1000000-0000-4000-8000-000000000005',
    name: 'Personal Projects',
    slug: 'personal-projects',
    description: 'FlowState and software building',
    color: '#f97316',
    icon: 'Lightbulb',
    sort_order: 5,
    target_hours_per_week: 8,
  },
] as const;

export function nullableUUID(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  return isUUID(trimmed) ? trimmed : null;
}

export function profileRowToPublic(row: Record<string, any>): UserPublicProfile & {
  preferences?: Record<string, unknown>;
} {
  return {
    id: String(row.id),
    username: String(row.username || 'user'),
    full_name: String(row.full_name || row.username || 'FlowState User'),
    email: row.email ?? null,
    avatar_url: row.avatar_url ?? null,
    timezone: String(row.timezone || 'UTC'),
    preferred_language: String(row.preferred_language || 'en'),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
    level: Number(row.level || 1),
    xp: Number(row.xp || 0),
    total_focus_minutes: Number(row.total_focus_minutes || 0),
    current_streak: Number(row.current_streak || 1),
    longest_streak: Number(row.longest_streak || 1),
    daily_xp_cap: Number(row.daily_xp_cap || 500),
    weekly_review_day: Number(row.weekly_review_day || 0),
    morning_reminder: row.morning_reminder ?? null,
    evening_reminder: row.evening_reminder ?? null,
    preferences: (row.preferences as Record<string, unknown>) || {},
  };
}

/**
 * Ensures the authenticated user's profile row exists in Supabase public.profiles
 * (migrating legacy server-db users seamlessly) so FK references never fail.
 */
export async function ensureProfileInSupabase(
  userId: string,
  fallbackInfo?: { username?: string; name?: string; email?: string; passwordHash?: string }
): Promise<boolean> {
  if (isPlaceholderUrl || !isUUID(userId)) return false;

  const cachedUntil = verifiedProfilesCache.get(userId);
  if (cachedUntil && cachedUntil > Date.now()) {
    return true;
  }

  try {
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.warn('Supabase profile lookup notice:', fetchError.message);
      return false;
    }

    if (existing) {
      markProfileVerified(userId);
      return true;
    }

    // Look up legacy user in local server-db or construct from session info
    const storedUser: StoredUser | null = findUserById(userId);
    const username = storedUser?.username || fallbackInfo?.username || `user_${userId.slice(0, 8)}`;
    const fullName = storedUser?.name || fallbackInfo?.name || username;
    const email = storedUser?.email || fallbackInfo?.email || null;
    const passwordHash = storedUser?.password_hash || fallbackInfo?.passwordHash || null;

    const { error: insertError } = await admin.from('profiles').upsert(
      {
        id: userId,
        username,
        username_lower: username.toLowerCase(),
        full_name: fullName,
        email,
        email_lower: email ? email.toLowerCase() : null,
        password_hash: passwordHash,
        level: storedUser?.level || 1,
        xp: storedUser?.xp || 0,
        created_at: storedUser?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (insertError) {
      console.warn('Supabase profile auto-create failed:', insertError.message);
      return false;
    }

    markProfileVerified(userId);
    await seedDefaultLifeAreasForUser(userId);
    return true;
  } catch (err) {
    console.warn('ensureProfileInSupabase error:', err);
    return false;
  }
}

/**
 * Ensures the user has their own seeded default life_areas rows in Supabase.
 */
export async function seedDefaultLifeAreasForUser(userId: string) {
  if (isPlaceholderUrl || !isUUID(userId)) return [];

  const cached = userLifeAreasCache.get(userId);
  if (cached && cached.expiresAt > Date.now() && cached.areas.length > 0) {
    return cached.areas;
  }

  try {
    const admin = createAdminClient();
    const { data: existing, error } = await admin
      .from('life_areas')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order');

    if (error) {
      console.warn('seedDefaultLifeAreas lookup notice:', error.message);
      return [];
    }

    if (existing && existing.length > 0) {
      userLifeAreasCache.set(userId, { areas: existing, expiresAt: Date.now() + CACHE_TTL_MS });
      return existing;
    }

    const rows = DEFAULT_AREA_SEEDS.map((area) => ({
      id: generateUUID(),
      user_id: userId,
      name: area.name,
      slug: area.slug,
      description: area.description,
      color: area.color,
      icon: area.icon,
      sort_order: area.sort_order,
      is_default: true,
      is_active: true,
      target_hours_per_week: area.target_hours_per_week,
    }));

    const { data: inserted, error: insertError } = await admin
      .from('life_areas')
      .insert(rows)
      .select('*');

    if (insertError) {
      console.warn('seedDefaultLifeAreas insert notice:', insertError.message);
      return [];
    }

    const result = inserted || [];
    if (result.length > 0) {
      userLifeAreasCache.set(userId, { areas: result, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return result;
  } catch (err) {
    console.warn('seedDefaultLifeAreasForUser error:', err);
    return [];
  }
}

/**
 * Resolves a client-provided life_area_id (including legacy placeholder IDs)
 * to a real row ID owned by the user in public.life_areas, or null if invalid.
 */
export async function resolveUserLifeAreaId(
  userId: string,
  candidateId?: string | null
): Promise<string | null> {
  if (!candidateId || isPlaceholderUrl || !isUUID(userId)) return null;

  try {
    const areas = await seedDefaultLifeAreasForUser(userId);
    if (!areas || areas.length === 0) return null;

    // 1. Direct match by user's actual life_area row id
    const direct = areas.find((a) => a.id === candidateId);
    if (direct) return direct.id;

    // 2. Match placeholder UUID -> slug
    const placeholderMatch = DEFAULT_AREA_SEEDS.find(
      (s) => s.placeholderId === candidateId || candidateId === `area-${s.slug}`
    );
    if (placeholderMatch) {
      const target = areas.find((a) => a.slug === placeholderMatch.slug);
      return target ? target.id : areas[0].id;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes a user account with Supabase Auth (auth.users) and creates a valid
 * browser session so Realtime subscriptions and client RLS operate seamlessly.
 */
export async function syncSupabaseAuthSession(params: {
  id: string;
  email?: string | null;
  username: string;
  password?: string;
}): Promise<{ access_token: string; refresh_token: string } | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || isPlaceholderUrl) return null;

  // Deterministic synthetic email if user registered without email
  const authEmail =
    params.email && params.email.includes('@')
      ? params.email.trim().toLowerCase()
      : `${params.username.toLowerCase()}@flowstate.local`;

  if (!params.password) return null;

  try {
    const admin = createAdminClient();

    // Ensure user exists in auth.users with matching UUID
    const { data: authUserData, error: getErr } = await admin.auth.admin.getUserById(params.id);

    if (getErr || !authUserData?.user) {
      const { error: createErr } = await admin.auth.admin.createUser({
        id: params.id,
        email: authEmail,
        password: params.password,
        email_confirm: true,
        user_metadata: { username: params.username },
      });

      if (createErr && !createErr.message.toLowerCase().includes('already')) {
        console.warn('Supabase auth.users create notice:', createErr.message);
      }
    } else {
      // Keep password/email synchronized if needed
      await admin.auth.admin
        .updateUserById(params.id, {
          email: authEmail,
          password: params.password,
          email_confirm: true,
        })
        .catch(() => {});
    }

    // Sign in with ephemeral anon client to obtain access_token + refresh_token
    const tempClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInErr } = await tempClient.auth.signInWithPassword({
      email: authEmail,
      password: params.password,
    });

    if (signInErr || !signInData?.session) {
      return null;
    }

    return {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    };
  } catch (err) {
    console.warn('syncSupabaseAuthSession notice:', err);
    return null;
  }
}
