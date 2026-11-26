import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { findUserByUsernameOrEmail, verifyUserCredentials } from '@/lib/server-db';
import { createSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  ensureProfileInSupabase,
  profileRowToPublic,
  seedDefaultLifeAreasForUser,
  syncSupabaseAuthSession,
} from '@/lib/supabase-sync';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';

  const rateLimit = checkRateLimit(`login:${ip}`, { limit: 30, windowMs: 60 * 1000 });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  if (isPlaceholderUrl) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
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
    const normalized = username.trim().toLowerCase();

    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('profiles')
      .select('*')
      .or(`username_lower.eq.${normalized},email_lower.eq.${normalized}`)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let authenticatedUser = null;

    if (rows && rows.length > 0) {
      const row = rows[0];
      const passwordValid = row.password_hash
        ? bcrypt.compareSync(password, row.password_hash)
        : false;

      if (!passwordValid) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      authenticatedUser = profileRowToPublic(row);
      await seedDefaultLifeAreasForUser(authenticatedUser.id);
    } else {
      // One-time legacy migration from bundled data/flowstate_db.json into Supabase profiles
      const legacyUser = verifyUserCredentials(username, password);
      if (!legacyUser) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      const storedRecord = findUserByUsernameOrEmail(username);
      const migrated = await ensureProfileInSupabase(legacyUser.id, {
        username: legacyUser.username,
        name: legacyUser.full_name,
        email: legacyUser.email || undefined,
        passwordHash: storedRecord?.password_hash,
      });

      if (!migrated) {
        return NextResponse.json(
          { error: 'Failed to migrate user account to database' },
          { status: 500 }
        );
      }

      const { data: freshRow } = await admin
        .from('profiles')
        .select('*')
        .eq('id', legacyUser.id)
        .single();

      authenticatedUser = freshRow ? profileRowToPublic(freshRow) : legacyUser;
    }

    const supabaseSession = await syncSupabaseAuthSession({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      username: authenticatedUser.username,
      password,
    });

    await createSession({
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      name: authenticatedUser.full_name,
    });

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
      supabaseSession,
    });
  } catch (error: any) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
