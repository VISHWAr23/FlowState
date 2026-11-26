import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { generateUUID } from '@/lib/utils';
import { ensureProfileInSupabase } from '@/lib/supabase-sync';

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('habit_logs')
      .select('*')
      .eq('user_id', session.userId)
      .eq('completed_date', date);

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
    const habitId = body.habitId || body.habit_id;
    const completedDate = body.date || body.completed_date || new Date().toISOString().split('T')[0];

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const [, { data: existingLog, error: lookupError }, { data: habitRow }] = await Promise.all([
      ensureProfileInSupabase(session.userId, {
        username: session.username,
        name: session.name,
      }),
      admin
        .from('habit_logs')
        .select('*')
        .eq('user_id', session.userId)
        .eq('habit_id', habitId)
        .eq('completed_date', completedDate)
        .maybeSingle(),
      admin
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .eq('user_id', session.userId)
        .maybeSingle(),
    ]);

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    if (!habitRow) {
      return NextResponse.json({ error: 'Habit not found in database' }, { status: 404 });
    }

    if (existingLog) {
      const newStreak = Math.max(0, (habitRow.streak_current || 1) - 1);
      const newTotal = Math.max(0, (habitRow.total_completions || 1) - 1);
      const [{ error: delErr }, { data: updatedHabit }] = await Promise.all([
        admin.from('habit_logs').delete().eq('id', existingLog.id),
        admin
          .from('habits')
          .update({
            streak_current: newStreak,
            total_completions: newTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', habitId)
          .select('*')
          .maybeSingle(),
      ]);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      return NextResponse.json({
        completed: false,
        log: null,
        habit: updatedHabit || habitRow,
      });
    }

    const newStreak = (habitRow.streak_current || 0) + 1;
    const newLongest = Math.max(newStreak, habitRow.streak_longest || 0);
    const newTotal = (habitRow.total_completions || 0) + 1;

    const [{ data: insertedLog, error: insertErr }, { data: updatedHabit }] = await Promise.all([
      admin
        .from('habit_logs')
        .insert({
          id: generateUUID(),
          habit_id: habitId,
          user_id: session.userId,
          completed_date: completedDate,
          completed_at: new Date().toISOString(),
        })
        .select('*')
        .single(),
      admin
        .from('habits')
        .update({
          streak_current: newStreak,
          streak_longest: newLongest,
          total_completions: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', habitId)
        .select('*')
        .maybeSingle(),
    ]);

    if (insertErr || !insertedLog) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to save habit log' }, { status: 500 });
    }

    return NextResponse.json({
      completed: true,
      log: insertedLog,
      habit: updatedHabit || habitRow,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to toggle habit log' }, { status: 500 });
  }
}
