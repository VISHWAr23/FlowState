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
  const all = searchParams.get('all') === 'true';
  const date = all ? undefined : searchParams.get('date') || undefined;

  try {
    const admin = createAdminClient();
    let query = admin
      .from('tasks')
      .select('*, life_areas(name, color, slug)')
      .eq('user_id', session.userId);

    if (date) {
      query = query.eq('due_date', date);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('sort_order');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] });
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
    const taskId = nullableUUID(body.id) || generateUUID();
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
      id: taskId,
      user_id: session.userId,
      goal_id: nullableUUID(body.goal_id),
      life_area_id: resolvedLifeAreaId,
      parent_task_id: nullableUUID(body.parent_task_id),
      title: String(body.title || 'Untitled Task').trim(),
      description: body.description ?? null,
      notes: body.notes ?? null,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      energy_level: body.energy_level ?? null,
      estimated_minutes: body.estimated_minutes ?? 25,
      actual_minutes: body.actual_minutes ?? null,
      due_date: body.due_date || now.split('T')[0],
      scheduled_start: body.scheduled_start ?? null,
      scheduled_end: body.scheduled_end ?? null,
      completed_at: body.completed_at ?? null,
      is_recurring: Boolean(body.is_recurring),
      recurrence_rule: body.recurrence_rule ?? null,
      source: body.source || 'user',
      xp_reward: body.xp_reward ?? 20,
      sort_order: body.sort_order ?? 0,
      created_at: body.created_at || now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from('tasks')
      .upsert(dbPayload, { onConflict: 'id' })
      .select('*, life_areas(name, color, slug)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save task to database' }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create task' }, { status: 500 });
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
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();

    const { life_area, life_areas, goal, ...cleanUpdates } = updates;
    const [{ data: existingRow, error: lookupError }, resolvedArea] = await Promise.all([
      admin
        .from('tasks')
        .select('id, updated_at')
        .eq('id', id)
        .eq('user_id', session.userId)
        .maybeSingle(),
      'life_area_id' in cleanUpdates
        ? resolveUserLifeAreaId(session.userId, cleanUpdates.life_area_id)
        : Promise.resolve(undefined),
    ]);

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!existingRow) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (
      updates.updated_at &&
      existingRow.updated_at &&
      new Date(updates.updated_at).getTime() < new Date(existingRow.updated_at).getTime() - 1000
    ) {
      const { data: fullExisting } = await admin
        .from('tasks')
        .select('*, life_areas(name, color, slug)')
        .eq('id', id)
        .maybeSingle();
      return NextResponse.json({ task: fullExisting || existingRow });
    }

    if ('life_area_id' in cleanUpdates) {
      cleanUpdates.life_area_id = resolvedArea ?? null;
    }
    if ('goal_id' in cleanUpdates) {
      cleanUpdates.goal_id = nullableUUID(cleanUpdates.goal_id);
    }
    if ('parent_task_id' in cleanUpdates) {
      cleanUpdates.parent_task_id = nullableUUID(cleanUpdates.parent_task_id);
    }

    const { data, error } = await admin
      .from('tasks')
      .update({ ...cleanUpdates, updated_at: now })
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*, life_areas(name, color, slug)')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 });
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
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete task' }, { status: 500 });
  }
}
