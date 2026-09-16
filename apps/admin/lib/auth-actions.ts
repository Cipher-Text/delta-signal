'use server';

import { redirect } from 'next/navigation';
import { apiPost, apiGet, ApiError } from './api';
import { setSessionCookies, clearSessionCookies, getAccessToken, getRefreshToken } from './session';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface ProfileResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

const ALLOWED_ROLES = ['MODERATOR', 'ADMIN'];

/** Decode JWT payload without signature verification — used only for role check. */
function decodeJwtRole(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  let tokens: AuthResponse;
  try {
    tokens = await apiPost<AuthResponse>('/api/v1/auth/login', { email, password });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Login failed';
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const role = decodeJwtRole(tokens.accessToken);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    // Best-effort logout so the token isn't left dangling
    await apiPost('/api/v1/auth/logout', { refreshToken: tokens.refreshToken }, tokens.accessToken).catch(
      () => null,
    );
    redirect(`/login?error=${encodeURIComponent('Access denied: Moderator or Admin role required')}`);
  }

  await setSessionCookies(tokens.accessToken, tokens.refreshToken);
  redirect('/reports');
}

export async function logoutAction() {
  const refreshToken = await getRefreshToken();
  const accessToken = await getAccessToken();
  if (refreshToken) {
    await apiPost('/api/v1/auth/logout', { refreshToken }, accessToken).catch(() => null);
  }
  await clearSessionCookies();
  redirect('/login');
}

export async function getCurrentAdminUser(): Promise<ProfileResponse | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    return await apiGet<ProfileResponse>('/api/v1/auth/profile', accessToken);
  } catch {
    return null;
  }
}
