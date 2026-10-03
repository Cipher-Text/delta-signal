import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from './lib/session-constants';

const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3001';
const isProd = process.env.NODE_ENV === 'production';

/**
 * Deny-by-default: every route requires a session unless it is listed here.
 * Matching is exact or by path segment, so '/login' never matches '/login-foo'.
 */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth',
  '/map',
  '/methodology',
  '/contact',
  '/terms',
  '/privacy',
  '/data-deletion',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));
}

function loginRedirect(req: NextRequest): NextResponse {
  const url = new URL('/login', req.url);
  const { pathname, search } = req.nextUrl;
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

/**
 * Decodes a JWT payload without verifying the signature — only used to check expiry.
 * Middleware runs on the Edge runtime, which has no `Buffer`, so this uses the
 * Web-standard `atob` instead (base64url needs translating to base64 first).
 */
function isAccessTokenExpired(token: string): boolean {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const EARLY_REFRESH_MS = 10_000;
    return Date.now() >= payload.exp * 1000 - EARLY_REFRESH_MS;
  } catch {
    return true;
  }
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = !isPublicPath(pathname);

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    if (isProtected) return loginRedirect(req);
    return NextResponse.next();
  }

  // Access token missing/expired but we have a refresh token — rotate it before rendering.
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('refresh failed');
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };

    const response = NextResponse.next();
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
    return response;
  } catch {
    if (isProtected) {
      const response = loginRedirect(req);
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      return response;
    }
    return NextResponse.next();
  }
}

export const config = {
  // Paths containing a dot (robots.txt, sitemap.xml, logo.svg, icon.svg…) are static/metadata files.
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
