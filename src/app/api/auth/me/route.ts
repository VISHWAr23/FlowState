import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { findUserById, toPublicProfile } from '@/lib/server-db';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ user: null });
    }

    const storedUser = findUserById(session.userId);
    if (!storedUser) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: toPublicProfile(storedUser),
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
