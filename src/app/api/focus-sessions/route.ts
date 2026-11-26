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

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get('days') || '90');
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('focus_sessions')
      .select('*, tasks(title), life_areas(name, color)')
      .eq('user_id', session.userId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ focusSessions: data || [] });
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
    const sessionId = nullableUUID(body.id) || generateUUID();
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
      id: sessionId,
      user_id: session.userId,
      task_id: nullableUUID(body.task_id),
      goal_id: nullableUUID(body.goal_id),
      life_area_id: resolvedLifeAreaId,
      started_at: body.started_at || now,
      ended_at: body.ended_at ?? null,
      planned_duration: body.planned_duration ?? 25,
      actual_duration: body.actual_duration ?? 0,
      status: body.status || 'active',
      session_type: body.session_type || 'deep_work',
      interruptions: body.interruptions ?? 0,
      interruption_notes: Array.isArray(body.interruption_notes) ? body.interruption_notes : [],
      flow_rating: body.flow_rating ?? null,
      notes: body.notes ?? null,
      reflection_notes: body.reflection_notes ?? null,
      xp_earned: body.xp_earned ?? 0,
      created_at: body.created_at || now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from('focus_sessions')
      .upsert(dbPayload, { onConflict: 'id' })
      .select('*, tasks(title), life_areas(name, color)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save focus session' }, { status: 500 });
    }

    return NextResponse.json({ focusSession: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create focus session' }, { status: 500 });
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
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { task, tasks, goal, life_area, life_areas, ...cleanUpdates } = updates;

    const { data, error } = await admin
      .from('focus_sessions')
      .update({ ...cleanUpdates, updated_at: now })
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*, tasks(title), life_areas(name, color)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Focus session not found' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
    }

    if (cleanUpdates.status === 'completed' && Number(cleanUpdates.actual_duration) > 0) {
      const { data: profile } = await admin
        .from('profiles')
        .select('total_focus_minutes')
        .eq('id', session.userId)
        .maybeSingle();
      if (profile) {
        await admin
          .from('profiles')
          .update({
            total_focus_minutes: (profile.total_focus_minutes || 0) + Number(cleanUpdates.actual_duration),
          })
          .eq('id', session.userId);
      }
    }

    return NextResponse.json({ focusSession: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update focus session' }, { status: 500 });
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
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('focus_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete focus session' }, { status: 500 });
  }
}
