import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getUserFocusSessions, createUserFocusSession } from '@/lib/server-db';

export async function GET() {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const focusSessions = getUserFocusSessions(session.userId);
  return NextResponse.json({ focusSessions });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const focusSession = createUserFocusSession(session.userId, body);
    return NextResponse.json({ focusSession }, { status: 201 });
  } catch (error) {
    console.error('Error creating focus session:', error);
    return NextResponse.json({ error: 'Failed to create focus session' }, { status: 500 });
  }
}
