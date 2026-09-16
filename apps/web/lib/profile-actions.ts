'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatchAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';
import { clearSessionCookies } from './session';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(formData: FormData) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');

  // Preserve active tab so the user lands back on the right section
  const tab = String(formData.get('_tab') ?? 'personal');

  const socialLinks: Record<string, string> = {};
  for (const platform of ['googleScholar', 'researchGate', 'orcid', 'linkedin', 'website', 'github', 'facebook']) {
    socialLinks[platform] = String(formData.get(platform) ?? '');
  }

  try {
    await apiPatchAuthed('/api/v1/auth/profile', {
      displayName:       String(formData.get('displayName') ?? ''),
      phone:             String(formData.get('phone')        ?? '') || undefined,
      occupation:        String(formData.get('occupation')   ?? '') || undefined,
      bio:               String(formData.get('bio')          ?? '') || undefined,
      education:         String(formData.get('education')    ?? '') || undefined,
      institution:       String(formData.get('institution')  ?? '') || undefined,
      locationDistrict:  String(formData.get('locationDistrict') ?? '') || undefined,
      expertise:         String(formData.get('expertise')    ?? '').split(',').map((v) => v.trim()).filter(Boolean),
      researchInterests: String(formData.get('researchInterests') ?? '').split(',').map((v) => v.trim()).filter(Boolean),
      profileVisibility:  String(formData.get('profileVisibility')  ?? 'PUBLIC'),
      contactVisibility:  String(formData.get('contactVisibility')  ?? 'PRIVATE'),
      linksVisibility:    String(formData.get('linksVisibility')    ?? 'PUBLIC'),
      socialLinks,
    }, token);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Profile update failed';
    redirect(`/profile?tab=${tab}&profileError=${encodeURIComponent(message)}`);
  }

  revalidatePath('/profile');
  redirect(`/profile?tab=${tab}&profileSaved=1`);
}

/**
 * Changes the authenticated user's password after verifying their current one.
 * The API revokes all active sessions on success, so we clear cookies here and
 * redirect to /login rather than back to the profile page.
 */
export async function changePasswordAction(formData: FormData) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (newPassword !== confirmPassword) {
    redirect(
      `/profile?tab=security&pwError=${encodeURIComponent('New passwords do not match')}`,
    );
  }

  try {
    await apiPatchAuthed('/api/v1/auth/password', { currentPassword, newPassword }, token);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Password change failed';
    redirect(`/profile?tab=security&pwError=${encodeURIComponent(message)}`);
  }

  // All sessions are revoked server-side — log the user out locally too.
  await clearSessionCookies();
  redirect(`/login?message=${encodeURIComponent('Password changed. Please sign in with your new password.')}`);
}
