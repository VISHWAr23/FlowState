import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { isPlaceholderUrl } from '@/lib/supabase';
import { ensureProfileInSupabase, seedDefaultLifeAreasForUser } from '@/lib/supabase-sync';

export async function GET() {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    await ensureProfileInSupabase(session.userId, {
      username: session.username,
      name: session.name,
    });
    const lifeAreas = await seedDefaultLifeAreasForUser(session.userId);
    return NextResponse.json({ lifeAreas });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}
