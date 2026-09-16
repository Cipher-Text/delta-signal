'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatch, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function togglePublishAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const isPublished = formData.get('isPublished') === 'true';

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/datasets/${id}`, { isPublished }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Update failed';
    redirect(`/datasets?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/datasets');
  redirect(`/datasets?success=${isPublished ? 'published' : 'unpublished'}`);
}

export async function updateAccessPolicyAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const accessPolicy = String(formData.get('accessPolicy') ?? '');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/datasets/${id}`, { accessPolicy }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Update failed';
    redirect(`/datasets?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/datasets');
  redirect('/datasets?success=policy');
}
