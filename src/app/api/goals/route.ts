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
      .from('goals')
      .select('*, life_areas(name, color, slug, icon), key_results(*)')
      .eq('user_id', session.userId)
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goals: data || [] });
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
    const goalId = nullableUUID(body.id) || generateUUID();
    const now = new Date().toISOString();
    const incomingKRs = Array.isArray(body.key_results) ? body.key_results : [];

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
    const dbGoal = {
      id: goalId,
      user_id: session.userId,
      life_area_id: resolvedLifeAreaId,
      title: String(body.title || 'Untitled Goal').trim(),
      description: body.description ?? null,
      status: body.status || 'active',
      priority: body.priority ?? 3,
      start_date: body.start_date || now.split('T')[0],
      target_date: body.target_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      completed_at: body.completed_at ?? null,
      progress: body.progress ?? 0,
      xp_reward: body.xp_reward ?? 500,
      created_at: body.created_at || now,
      updated_at: now,
    };

    const { data: insertedGoal, error } = await admin
      .from('goals')
      .upsert(dbGoal, { onConflict: 'id' })
      .select('*, life_areas(name, color, slug, icon)')
      .single();

    if (error || !insertedGoal) {
      return NextResponse.json({ error: error?.message || 'Failed to save goal to database' }, { status: 500 });
    }

    let savedKRs: any[] = [];
    if (incomingKRs.length > 0) {
      const krRows = incomingKRs.map((kr: any, idx: number) => ({
        id: nullableUUID(kr.id) || generateUUID(),
        goal_id: goalId,
        user_id: session.userId,
        title: String(kr.title || 'Key Result').trim(),
        target_value: Number(kr.target_value ?? 100),
        current_value: Number(kr.current_value ?? 0),
        unit: String(kr.unit || '%'),
        sort_order: kr.sort_order ?? idx,
        created_at: now,
        updated_at: now,
      }));
      const { data: krs } = await admin.from('key_results').upsert(krRows, { onConflict: 'id' }).select('*');
      savedKRs = krs || [];
    }

    return NextResponse.json({ goal: { ...insertedGoal, key_results: savedKRs } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create goal' }, { status: 500 });
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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { key_results, life_area, life_areas, ...cleanUpdates } = updates;
    if ('life_area_id' in cleanUpdates) {
      cleanUpdates.life_area_id = await resolveUserLifeAreaId(
        session.userId,
        cleanUpdates.life_area_id
      );
    }

    const { data, error } = await admin
      .from('goals')
      .update({ ...cleanUpdates, updated_at: now })
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Goal not found' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
    }

    if (Array.isArray(key_results)) {
      await admin.from('key_results').delete().eq('goal_id', id).eq('user_id', session.userId);
      if (key_results.length > 0) {
        const krRows = key_results.map((kr: any, idx: number) => ({
          id: nullableUUID(kr.id) || generateUUID(),
          goal_id: id,
          user_id: session.userId,
          title: String(kr.title || 'Key Result').trim(),
          target_value: Number(kr.target_value ?? 100),
          current_value: Number(kr.current_value ?? 0),
          unit: String(kr.unit || '%'),
          sort_order: kr.sort_order ?? idx,
        }));
        await admin.from('key_results').insert(krRows);
      }
    }

    const { data: fullGoal } = await admin
      .from('goals')
      .select('*, life_areas(name, color, slug, icon), key_results(*)')
      .eq('id', id)
      .single();

    return NextResponse.json({ goal: fullGoal || data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update goal' }, { status: 500 });
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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete goal' }, { status: 500 });
  }
}
