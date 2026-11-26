import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { generateUUID } from '@/lib/utils';
import {
  ensureProfileInSupabase,
  nullableUUID,
  resolveUserLifeAreaId,
} from '@/lib/supabase-sync';

export async function GET() {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('habits')
      .select('*, life_areas(name, color, slug)')
      .eq('user_id', session.userId)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ habits: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const habitId = nullableUUID(body.id) || generateUUID();
    const now = new Date().toISOString();

    const [profileReady, resolvedLifeAreaId] = await Promise.all([
      ensureProfileInSupabase(session.userId, {
        username: session.username,
        name: session.name,
      }),
      resolveUserLifeAreaId(session.userId, body.life_area_id),
    ]);
    if (!profileReady) {
      return NextResponse.json({ error: 'User profile could not be verified in database' }, { status: 500 });
    }

    const admin = createAdminClient();
    const dbPayload = {
      id: habitId,
      user_id: session.userId,
      goal_id: nullableUUID(body.goal_id),
      life_area_id: resolvedLifeAreaId,
      title: String(body.title || 'Untitled Habit').trim(),
      description: body.description ?? null,
      frequency: body.frequency || 'daily',
      specific_days: Array.isArray(body.specific_days) ? body.specific_days : [1, 2, 3, 4, 5, 6, 7],
      time_of_day: body.time_of_day || 'anytime',
      target_duration_minutes: body.target_duration_minutes ?? null,
      color: body.color || '#3b82f6',
      icon: body.icon || 'Flame',
      streak_current: body.streak_current ?? 0,
      streak_longest: body.streak_longest ?? 0,
      total_completions: body.total_completions ?? 0,
      xp_reward: body.xp_reward ?? 15,
      is_active: body.is_active !== false,
      sort_order: body.sort_order ?? 0,
      created_at: body.created_at || now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from('habits')
      .upsert(dbPayload, { onConflict: 'id' })
      .select('*, life_areas(name, color, slug)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save habit to database' }, { status: 500 });
    }

    return NextResponse.json({ habit: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create habit' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { life_area, life_areas, goal, logs, ...cleanUpdates } = updates;
    if ('life_area_id' in cleanUpdates) {
      cleanUpdates.life_area_id = await resolveUserLifeAreaId(
        session.userId,
        cleanUpdates.life_area_id
      );
    }
    if ('goal_id' in cleanUpdates) {
      cleanUpdates.goal_id = nullableUUID(cleanUpdates.goal_id);
    }

    const { data, error } = await admin
      .from('habits')
      .update({ ...cleanUpdates, updated_at: now })
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*, life_areas(name, color, slug)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Habit not found or failed to update' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json({ habit: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete habit' }, { status: 500 });
  }
}
