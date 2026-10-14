/**
 * Session cookie helpers — usable only from Server Actions/Route Handlers,
 * since Next.js forbids setting cookies during Server Component rendering.
 * Middleware keeps these cookies fresh on every request; see middleware.ts.
 */
import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_ONLY_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from './session-constants';

const isProd = process.env.NODE_ENV === 'production';

/**
 * `remember: false` makes the refresh cookie a browser-session cookie (no maxAge) and
 * records that choice so middleware does not re-persist it when it rotates the token.
 */
export async function setSessionCookies(accessToken: string, refreshToken: string, remember = true) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS } : {}),
  });
  if (remember) {
    store.delete(SESSION_ONLY_COOKIE);
  } else {
    store.set(SESSION_ONLY_COOKIE, '1', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  store.delete(SESSION_ONLY_COOKIE);
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}
