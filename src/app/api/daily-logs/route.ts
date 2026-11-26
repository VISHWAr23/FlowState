import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { generateUUID } from '@/lib/utils';
import { ensureProfileInSupabase, nullableUUID } from '@/lib/supabase-sync';

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
      .from('daily_logs')
      .select('*')
      .eq('user_id', session.userId)
      .order('log_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] });
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
    const { date, log_date, id, ...logData } = body;
    const targetDate = log_date || date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const admin = createAdminClient();
    const [profileReady, { data: existing }] = await Promise.all([
      ensureProfileInSupabase(session.userId, {
        username: session.username,
        name: session.name,
      }),
      admin
        .from('daily_logs')
        .select('*')
        .eq('user_id', session.userId)
        .eq('log_date', targetDate)
        .maybeSingle(),
    ]);
    if (!profileReady) {
      return NextResponse.json({ error: 'User profile could not be verified in database' }, { status: 500 });
    }

    const mergedScores = logData.scores
      ? {
          ...((existing?.scores as Record<string, boolean>) || {}),
          ...logData.scores,
        }
      : existing?.scores || {};

    const dbPayload = {
      id: existing?.id || nullableUUID(id) || generateUUID(),
      user_id: session.userId,
      log_date: targetDate,
      morning_completed_at: logData.morning_completed_at !== undefined ? logData.morning_completed_at : existing?.morning_completed_at ?? null,
      evening_completed_at: logData.evening_completed_at !== undefined ? logData.evening_completed_at : existing?.evening_completed_at ?? null,
      day_rating: logData.day_rating !== undefined ? logData.day_rating : existing?.day_rating ?? null,
      energy_rating: logData.energy_rating !== undefined ? logData.energy_rating : existing?.energy_rating ?? null,
      mood: logData.mood !== undefined ? logData.mood : existing?.mood ?? null,
      top_wins: logData.top_wins !== undefined ? logData.top_wins : existing?.top_wins ?? [],
      lessons_learned: logData.lessons_learned !== undefined ? logData.lessons_learned : existing?.lessons_learned ?? null,
      gratitude_note: logData.gratitude_note !== undefined ? logData.gratitude_note : existing?.gratitude_note ?? null,
      focus_hours: logData.focus_hours !== undefined ? logData.focus_hours : existing?.focus_hours ?? 0,
      tasks_completed: logData.tasks_completed !== undefined ? logData.tasks_completed : existing?.tasks_completed ?? 0,
      tasks_planned: logData.tasks_planned !== undefined ? logData.tasks_planned : existing?.tasks_planned ?? 0,
      habits_completed: logData.habits_completed !== undefined ? logData.habits_completed : existing?.habits_completed ?? 0,
      habits_planned: logData.habits_planned !== undefined ? logData.habits_planned : existing?.habits_planned ?? 0,
      xp_earned: logData.xp_earned !== undefined ? logData.xp_earned : existing?.xp_earned ?? 0,
      productivity_score: logData.productivity_score !== undefined ? logData.productivity_score : existing?.productivity_score ?? 80,
      scores: mergedScores,
      updated_at: now,
    };

    const { data, error } = await admin
      .from('daily_logs')
      .upsert(dbPayload, { onConflict: 'user_id,log_date' })
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save daily log' }, { status: 500 });
    }

    return NextResponse.json({ log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save daily log' }, { status: 500 });
  }
}
