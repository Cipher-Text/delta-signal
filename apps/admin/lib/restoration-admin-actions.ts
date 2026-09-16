'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatch, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function updateProjectStatusAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const tab = String(formData.get('tab') ?? 'ALL');
  const page = String(formData.get('page') ?? '1');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/restoration/projects/${id}`, { status }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Status update failed';
    redirect(`/restoration?tab=${tab}&page=${page}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/restoration');
  redirect(`/restoration?tab=${tab}&page=${page}&success=status`);
}
