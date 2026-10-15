import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

const protectedRoutes = [
  '/',
  '/focus',
  '/goals',
  '/habits',
  '/analytics',
  '/timetable',
  '/profile',
  '/settings',
  '/achievements',
  '/roadmaps',
  '/daily',
];

const publicAuthRoutes = ['/login', '/signup'];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Let Next.js internals, static assets, and auth APIs pass through
  if (
    path.startsWith('/_next') ||
    path.startsWith('/brand') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/icon-') ||
    path === '/icon.png' ||
    path === '/apple-icon.png' ||
    path === '/favicon.ico' ||
    path === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  const isPublicAuthRoute = publicAuthRoutes.includes(path);
  const isProtectedRoute =
    protectedRoutes.includes(path) ||
    (!isPublicAuthRoute && !path.startsWith('/api/'));

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1. Unauthenticated user attempting to access protected route -> Redirect to /login
  if (isProtectedRoute && !session?.userId) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    if (path !== '/') {
      loginUrl.searchParams.set('from', path);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user attempting to access /login or /signup -> Redirect to /
  if (isPublicAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|json)$).*)',
  ],
};
