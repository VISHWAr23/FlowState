import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { generateUUID } from '@/lib/utils';
import { ensureProfileInSupabase, nullableUUID } from '@/lib/supabase-sync';
import type { TimeBlock } from '@/types/types';

function dbRowToTimeBlock(row: Record<string, any>): TimeBlock {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title),
    startHour: Number(row.start_hour),
    durationHours: Number(row.duration_hours),
    color: String(row.color || 'bg-primary/10 text-primary border-primary/20'),
    days: Array.isArray(row.days) ? row.days : [],
    date: row.block_date ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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
      .from('time_blocks')
      .select('*')
      .eq('user_id', session.userId)
      .order('start_hour');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      timeBlocks: (data || []).map(dbRowToTimeBlock),
    });
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
    const blockId = nullableUUID(body.id) || generateUUID();
    const now = new Date().toISOString();

    const profileReady = await ensureProfileInSupabase(session.userId, {
      username: session.username,
      name: session.name,
    });
    if (!profileReady) {
      return NextResponse.json({ error: 'User profile could not be verified in database' }, { status: 500 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('time_blocks')
      .upsert(
        {
          id: blockId,
          user_id: session.userId,
          title: String(body.title || 'Time Block').trim(),
          start_hour: Number(body.startHour ?? 8.5),
          duration_hours: Number(body.durationHours ?? 1),
          color: String(body.color || 'bg-primary/10 text-primary border-primary/20'),
          days: Array.isArray(body.days) ? body.days : [],
          block_date: body.date || null,
          created_at: body.created_at || now,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save time block' }, { status: 500 });
    }

    return NextResponse.json({ timeBlock: dbRowToTimeBlock(data) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create time block' }, { status: 500 });
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
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();
    const dbUpdates: Record<string, any> = { updated_at: now };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.startHour !== undefined) dbUpdates.start_hour = Number(updates.startHour);
    if (updates.durationHours !== undefined) dbUpdates.duration_hours = Number(updates.durationHours);
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.days !== undefined) dbUpdates.days = updates.days;
    if ('date' in updates) dbUpdates.block_date = updates.date || null;

    const { data, error } = await admin
      .from('time_blocks')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Time block not found' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json({ timeBlock: dbRowToTimeBlock(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update time block' }, { status: 500 });
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
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('time_blocks')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete time block' }, { status: 500 });
  }
}
