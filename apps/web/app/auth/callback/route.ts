/**
 * GET /auth/callback?code=<exchange_code>
 *
 * Step 3 of the Google OAuth flow.
 *
 * NestJS redirects the browser here after the user consents on Google's
 * consent screen. The `code` query param is a 30-second one-time exchange
 * code (NOT the raw Google auth code — that was already redeemed by the API).
 *
 * This handler:
 *  1. POSTs the code to POST /api/v1/auth/exchange
 *  2. Sets httpOnly session cookies from the returned tokens
 *  3. Redirects to /dashboard (or /login on any failure)
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '../../../lib/session-constants';
import type { AuthResponse } from '@delta-signal/contracts';

const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3001';
const isProd = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge };
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Google sign-in was cancelled or failed')}`, origin),
    );
  }

  let tokens: AuthResponse;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? `Exchange failed: ${res.status}`);
    }

    tokens = (await res.json()) as AuthResponse;
  } catch {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Sign in with Google failed. Please try again.')}`, origin),
    );
  }

  const response = NextResponse.redirect(new URL('/dashboard', origin));
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
  return response;
}
