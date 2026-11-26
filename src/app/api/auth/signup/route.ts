import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { createSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateUUID } from '@/lib/utils';
import {
  profileRowToPublic,
  seedDefaultLifeAreasForUser,
  syncSupabaseAuthSession,
} from '@/lib/supabase-sync';

const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required').max(100, 'Name is too long'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address')
      .optional()
      .or(z.literal('')),
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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
  const rateLimit = checkRateLimit(`signup:${ip}`, { limit: 20, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
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

    const { name, username, email, password } = result.data;
    const normalizedUsername = username.toLowerCase();
    const trimmedEmail = email ? email.trim() : undefined;
    const normalizedEmail = trimmedEmail ? trimmedEmail.toLowerCase() : undefined;

    const admin = createAdminClient();

    const { data: existingUsername, error: uErr } = await admin
      .from('profiles')
      .select('id')
      .eq('username_lower', normalizedUsername)
      .maybeSingle();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    if (existingUsername) {
      return NextResponse.json(
        {
          error: 'Username is already taken',
          fieldErrors: { username: ['Username is already taken'] },
        },
        { status: 409 }
      );
    }

    if (normalizedEmail) {
      const { data: existingEmail, error: eErr } = await admin
        .from('profiles')
        .select('id')
        .eq('email_lower', normalizedEmail)
        .maybeSingle();

      if (eErr) {
        return NextResponse.json({ error: eErr.message }, { status: 500 });
      }

      if (existingEmail) {
        return NextResponse.json(
          {
            error: 'Email is already registered',
            fieldErrors: { email: ['Email is already registered'] },
          },
          { status: 409 }
        );
      }
    }

    const userId = generateUUID();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const { data: insertedRow, error: insertError } = await admin
      .from('profiles')
      .insert({
        id: userId,
        username,
        username_lower: normalizedUsername,
        full_name: name,
        email: trimmedEmail || null,
        email_lower: normalizedEmail || null,
        password_hash: passwordHash,
        level: 1,
        xp: 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (insertError || !insertedRow) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create account in database' },
        { status: 500 }
      );
    }

    const newUser = profileRowToPublic(insertedRow);
    await seedDefaultLifeAreasForUser(userId);
    const supabaseSession = await syncSupabaseAuthSession({
      id: userId,
      email: trimmedEmail,
      username,
      password,
    });

    await createSession({
      id: newUser.id,
      username: newUser.username,
      name: newUser.full_name,
    });

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        supabaseSession,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
