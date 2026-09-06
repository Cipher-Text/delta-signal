'use server';

import { redirect } from 'next/navigation';
import { routes, type AuthResponse } from '@delta-signal/contracts';
import { apiPost, ApiError } from './api';
import { setSessionCookies, clearSessionCookies, getRefreshToken } from './session';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  let tokens: AuthResponse;
  try {
    tokens = await apiPost<AuthResponse>(routes.auth.login, { email, password });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Login failed';
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  setSessionCookies(tokens.accessToken, tokens.refreshToken);
  redirect('/reports');
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  const password = String(formData.get('password') ?? '');

  let tokens: AuthResponse;
  try {
    tokens = await apiPost<AuthResponse>(routes.auth.register, { email, displayName, password });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Registration failed';
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  setSessionCookies(tokens.accessToken, tokens.refreshToken);
  redirect('/reports');
}

export async function logoutAction() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiPost(routes.auth.logout, { refreshToken });
    } catch {
      // Best-effort — clear cookies regardless so the user is logged out client-side.
    }
  }
  clearSessionCookies();
  redirect('/');
}

/**
 * Sends a password-reset email. Always redirects to the confirmation page —
 * even if the address is not registered — to prevent email enumeration.
 */
export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  try {
    await apiPost(routes.auth.forgotPassword, { email });
  } catch {
    // Swallow errors: the backend also returns a uniform 200 for unknown addresses.
  }
  redirect('/forgot-password?sent=1');
}

/**
 * Resets the password using the opaque token from the email link.
 * On success, all existing sessions are revoked server-side and the user
 * is redirected to /login to authenticate with their new credentials.
 */
export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (newPassword !== confirmPassword) {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent('Passwords do not match')}`,
    );
  }

  try {
    await apiPost(routes.auth.resetPassword, { token, newPassword });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Reset failed. The link may have expired.';
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/login?message=${encodeURIComponent('Password reset successful. Please sign in.')}`);
}
