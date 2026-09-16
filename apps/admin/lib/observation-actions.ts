'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatch, apiDelete, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function updateTrustAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const trustLevel = String(formData.get('trustLevel') ?? '');
  const tab = String(formData.get('tab') ?? 'UNVERIFIED');
  const category = String(formData.get('category') ?? '');
  const page = String(formData.get('page') ?? '1');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/observations/${id}/trust`, { trustLevel }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Trust update failed';
    redirect(`/observations?tab=${tab}&category=${category}&page=${page}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/observations');
  redirect(`/observations?tab=${tab}&category=${category}&page=${page}&success=trust`);
}

export async function deleteObservationAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const tab = String(formData.get('tab') ?? 'UNVERIFIED');
  const category = String(formData.get('category') ?? '');
  const page = String(formData.get('page') ?? '1');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiDelete(`/api/v1/observations/${id}`, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Delete failed';
    redirect(`/observations?tab=${tab}&category=${category}&page=${page}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/observations');
  redirect(`/observations?tab=${tab}&category=${category}&page=${page}&success=deleted`);
}
