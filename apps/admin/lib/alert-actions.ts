'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPost, apiPatch, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function createAlertAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const severity = String(formData.get('severity') ?? '');
  const description = String(formData.get('description') ?? '');
  const instructionsRaw = formData.get('instructions');
  const instructions = instructionsRaw ? String(instructionsRaw).trim() || undefined : undefined;
  const districtIdRaw = formData.get('districtId');
  const districtId = districtIdRaw ? String(districtIdRaw) || undefined : undefined;
  const expiresAtRaw = formData.get('expiresAt');
  // datetime-local gives "YYYY-MM-DDTHH:MM" — append seconds + Z for valid ISO8601
  const expiresAt = expiresAtRaw ? `${String(expiresAtRaw)}:00.000Z` : undefined;

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPost(
      '/api/v1/alerts',
      { title, severity, description, instructions, districtId, expiresAt },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to create alert';
    redirect(`/alerts?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/alerts');
  redirect('/alerts?success=created');
}

export async function cancelAlertAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/alerts/${id}`, { status: 'CANCELLED' }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Cancel failed';
    redirect(`/alerts?tab=ACTIVE&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/alerts');
  redirect('/alerts?tab=ACTIVE&success=cancelled');
}

export async function editAlertAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const tab = String(formData.get('tab') ?? 'ACTIVE');
  const instructionsRaw = formData.get('instructions');
  const instructions = instructionsRaw ? String(instructionsRaw).trim() || undefined : undefined;
  const expiresAtRaw = formData.get('expiresAt');
  const expiresAt = expiresAtRaw ? `${String(expiresAtRaw)}:00.000Z` : undefined;

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/alerts/${id}`, { instructions, expiresAt }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Edit failed';
    redirect(`/alerts?tab=${tab}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/alerts');
  redirect(`/alerts?tab=${tab}&success=edited`);
}
