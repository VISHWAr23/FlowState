import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUserCredentials } from '@/lib/server-db';
import { createSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';

  // Rate limiting by client IP to defend against brute-force attacks
  const rateLimit = checkRateLimit(`login:${ip}`, { limit: 30, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 400 }
      );
    }

    const { username, password } = result.data;

    // Verify credentials securely with bcrypt compare
    const user = verifyUserCredentials(username, password);

    if (!user) {
      // Generic error to prevent username enumeration
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session cookie
    await createSession({
      id: user.id,
      username: user.username,
      name: user.full_name,
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
