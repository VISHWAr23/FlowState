import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { findUserById, toPublicProfile, updateUser } from '@/lib/server-db';

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

export async function PATCH(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = body.full_name ?? body.name;
    const username = body.username;
    const email = body.email;
    const timezone = body.timezone;

    const updated = updateUser(session.userId, {
      name: typeof name === 'string' ? name : undefined,
      username: typeof username === 'string' ? username : undefined,
      email: typeof email === 'string' ? email : undefined,
      timezone: typeof timezone === 'string' ? timezone : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error: any) {
    console.error('Error updating current user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 400 }
    );
  }
}

