/**
 * Cookie names shared between `lib/session.ts` (Server Actions, uses `next/headers`)
 * and `middleware.ts` (Edge runtime, uses NextRequest/NextResponse cookie APIs).
 * Kept import-free so both can use it safely.
 */
export const ACCESS_TOKEN_COOKIE = 'ng_access_token';
export const REFRESH_TOKEN_COOKIE = 'ng_refresh_token';
/** Present (value '1') when the user chose NOT to stay signed in: the refresh cookie then lasts only for the browser session. */
export const SESSION_ONLY_COOKIE = 'ng_session_only';

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // matches the access JWT's 15m expiry
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // matches the refresh token's 7d expiry

/** Sentinel `?error=` value the login page maps to the generic wrong-credentials message (DESIGN.md §3.3). */
export const INVALID_CREDENTIALS = 'invalid_credentials';
