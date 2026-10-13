'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSession, deleteSession } from '@/lib/session';
import { createUser, verifyUserCredentials, findUserByUsername } from '@/lib/server-db';

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

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function signup(prevState: any, formData: FormData) {
  const validated = signupSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, username, password } = validated.data;

  try {
    const existing = findUserByUsername(username);
    if (existing) {
      return {
        errors: {
          username: ['Username is already taken'],
        },
      };
    }

    const newUser = createUser({ name, username, password });

    await createSession({
      id: newUser.id,
      username: newUser.username,
      name: newUser.full_name,
    });
  } catch (error: any) {
    console.error('Signup action error:', error);
    return {
      errors: {
        form: [error.message || 'An unexpected error occurred during signup'],
      },
    };
  }

  redirect('/');
}

export async function login(prevState: any, formData: FormData) {
  const validated = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validated.data;

  try {
    const user = verifyUserCredentials(username, password);
    if (!user) {
      return {
        errors: {
          form: ['Invalid username or password'],
        },
      };
    }

    await createSession({
      id: user.id,
      username: user.username,
      name: user.full_name,
    });
  } catch (error) {
    console.error('Login action error:', error);
    return {
      errors: {
        form: ['An unexpected error occurred during login'],
      },
    };
  }

  redirect('/');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}