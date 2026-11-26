import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { getSessionUser, createSession } from '@/lib/session';
import { ensureProfileInSupabase, markProfileVerified, profileRowToPublic } from '@/lib/supabase-sync';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ user: null });
    }
    if (isPlaceholderUrl) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const admin = createAdminClient();
    let { data: row, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', session.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!row) {
      const created = await ensureProfileInSupabase(session.userId, {
        username: session.username,
        name: session.name,
      });
      if (created) {
        const retry = await admin
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .maybeSingle();
        row = retry.data;
      }
    }

    if (!row) {
      return NextResponse.json({ user: null });
    }

    markProfileVerified(session.userId);
    return NextResponse.json({ user: profileRowToPublic(row) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isPlaceholderUrl) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    await ensureProfileInSupabase(session.userId, {
      username: session.username,
      name: session.name,
    });

    const body = await req.json();
    const name = body.full_name ?? body.name;
    const username = body.username;
    const email = body.email;
    const timezone = body.timezone;
    const weeklyReviewDay = body.weekly_review_day;
    const dailyXpCap = body.daily_xp_cap;
    const morningReminder = body.morning_reminder;
    const eveningReminder = body.evening_reminder;
    const preferences = body.preferences;

    const admin = createAdminClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof username === 'string' && username.trim()) {
      const trimmedU = username.trim();
      const normU = trimmedU.toLowerCase();
      const { data: conflict } = await admin
        .from('profiles')
        .select('id')
        .eq('username_lower', normU)
        .neq('id', session.userId)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
      updatePayload.username = trimmedU;
      updatePayload.username_lower = normU;
    }

    if (typeof email === 'string' && email.trim()) {
      const trimmedE = email.trim();
      const normE = trimmedE.toLowerCase();
      const { data: conflict } = await admin
        .from('profiles')
        .select('id')
        .eq('email_lower', normE)
        .neq('id', session.userId)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 });
      }
      updatePayload.email = trimmedE;
      updatePayload.email_lower = normE;
    }

    if (typeof name === 'string' && name.trim()) updatePayload.full_name = name.trim();
    if (typeof timezone === 'string') updatePayload.timezone = timezone;
    if (typeof weeklyReviewDay === 'number') updatePayload.weekly_review_day = weeklyReviewDay;
    if (typeof dailyXpCap === 'number') updatePayload.daily_xp_cap = dailyXpCap;
    if (morningReminder !== undefined) updatePayload.morning_reminder = morningReminder;
    if (eveningReminder !== undefined) updatePayload.evening_reminder = eveningReminder;

    if (preferences && typeof preferences === 'object') {
      const { data: current } = await admin
        .from('profiles')
        .select('preferences')
        .eq('id', session.userId)
        .maybeSingle();
      updatePayload.preferences = {
        ...((current?.preferences as Record<string, unknown>) || {}),
        ...preferences,
      };
    }

    const { data: updatedRow, error } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', session.userId)
      .select('*')
      .single();

    if (error || !updatedRow) {
      return NextResponse.json({ error: error?.message || 'Failed to update profile' }, { status: 500 });
    }

    const finalUser = profileRowToPublic(updatedRow);

    if (typeof username === 'string' || typeof name === 'string') {
      await createSession({
        id: finalUser.id,
        username: finalUser.username,
        name: finalUser.full_name,
      });
    }

    return NextResponse.json({
      success: true,
      user: finalUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 400 }
    );
  }
}
