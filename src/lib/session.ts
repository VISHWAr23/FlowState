// Dynamic cookie store loader for Next.js runtime
async function getCookieStore() {
  const nextHeaders = await import('next/headers');
  return await nextHeaders.cookies();
}

export const SESSION_COOKIE_NAME = 'flowstate_session';
const DEFAULT_SECRET = 'flowstate-default-dev-secret-key-at-least-32-chars-2026';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  exp: number;
  iat: number;
}

function getSecretKey(): string {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Signs a session payload using Web Crypto HMAC-SHA256 (JWT standard).
 * Works across both Node.js runtime and Edge runtime.
 */
export async function signSessionToken(payload: { userId: string; username: string; name: string }): Promise<string> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    userId: payload.userId,
    username: payload.username,
    name: payload.name,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const h64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const p64 = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));
  const data = `${h64}.${p64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecretKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const s64 = base64UrlEncode(new Uint8Array(signature));

  return `${data}.${s64}`;
}

/**
 * Verifies a session token string.
 * Returns SessionPayload if valid and not expired, null otherwise.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, s64] = parts;
  const data = `${h64}.${p64}`;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(getSecretKey()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(s64) as unknown as BufferSource,
      enc.encode(data)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(p64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to create and attach the HttpOnly session cookie.
 */
export async function createSession(user: { id: string; username: string; name: string }): Promise<string> {
  const token = await signSessionToken({
    userId: user.id,
    username: user.username,
    name: user.name,
  });

  const cookieStore = await getCookieStore();
  const isProd = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  return token;
}

/**
 * Server-side helper to delete the session cookie.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await getCookieStore();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Server-side helper to get the current authenticated user from cookies.
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await getCookieStore();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}