import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { getSessionUser } from '@/lib/session';
import { ensureProfileInSupabase, markProfileVerified, profileRowToPublic } from '@/lib/supabase-sync';
import { calculateLevel } from '@/types/types';

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
    const amount = Number(body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid XP amount required' }, { status: 400 });
    }

    const admin = createAdminClient();
    let { data: current, error: getErr } = await admin
      .from('profiles')
      .select('xp, level')
      .eq('id', session.userId)
      .maybeSingle();

    if (getErr) {
      return NextResponse.json({ error: getErr.message }, { status: 500 });
    }

    if (!current) {
      await ensureProfileInSupabase(session.userId, {
        username: session.username,
        name: session.name,
      });
      const retry = await admin
        .from('profiles')
        .select('xp, level')
        .eq('id', session.userId)
        .single();
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      current = retry.data;
    }

    markProfileVerified(session.userId);

    const currentXp = Number(current?.xp || 0);
    const newXp = currentXp + Math.round(amount);
    const newLevel = calculateLevel(newXp);

    const { data: updatedRow, error: updErr } = await admin
      .from('profiles')
      .update({
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)
      .select('*')
      .single();

    if (updErr || !updatedRow) {
      return NextResponse.json({ error: updErr?.message || 'Failed to persist XP' }, { status: 500 });
    }

    return NextResponse.json({ user: profileRowToPublic(updatedRow) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to award XP' }, { status: 500 });
  }
}
