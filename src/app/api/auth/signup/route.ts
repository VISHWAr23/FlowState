import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, findUserByUsername } from '@/lib/server-db';
import { createSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';

const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required').max(100, 'Name is too long'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must include at least one letter and one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: Request) {
  // Rate limiting by client IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
  const rateLimit = checkRateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Invalid input';
      return NextResponse.json(
        { error: firstError, fieldErrors },
        { status: 400 }
      );
    }

    const { name, username, password } = result.data;

    // Check if username is already taken (case-insensitively)
    const existing = findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        {
          error: 'Username is already taken',
          fieldErrors: { username: ['Username is already taken'] },
        },
        { status: 409 }
      );
    }

    // Create user securely with bcrypt hash
    const newUser = createUser({
      name,
      username,
      password,
    });

    // Automatically create session and sign the user in
    await createSession({
      id: newUser.id,
      username: newUser.username,
      name: newUser.full_name,
    });

    return NextResponse.json(
      {
        success: true,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.message === 'Username already taken') {
      return NextResponse.json(
        {
          error: 'Username is already taken',
          fieldErrors: { username: ['Username is already taken'] },
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
