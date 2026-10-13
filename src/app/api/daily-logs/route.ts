import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getUserDailyLogs, upsertUserDailyLog } from '@/lib/server-db';

export async function GET() {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = getUserDailyLogs(session.userId);
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { date, ...logData } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const log = upsertUserDailyLog(session.userId, targetDate, logData);
    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: 'Failed to save daily log' }, { status: 500 });
  }
}
