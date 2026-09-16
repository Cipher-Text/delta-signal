'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatch, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function updateRoleAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const role = String(formData.get('role') ?? '');
  const returnPage = String(formData.get('returnPage') ?? '1');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/users/${id}/role`, { role }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Role update failed';
    redirect(`/users?page=${returnPage}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/users');
  redirect(`/users?page=${returnPage}&success=role`);
}

export async function deactivateUserAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const returnPage = String(formData.get('returnPage') ?? '1');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/users/${id}/deactivate`, {}, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Deactivation failed';
    redirect(`/users?page=${returnPage}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/users');
  redirect(`/users?page=${returnPage}&success=deactivated`);
}

export async function reactivateUserAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const returnPage = String(formData.get('returnPage') ?? '1');
  const search = String(formData.get('search') ?? '');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/users/${id}/reactivate`, {}, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Reactivation failed';
    redirect(`/users?page=${returnPage}&search=${encodeURIComponent(search)}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/users');
  redirect(`/users?page=${returnPage}&search=${encodeURIComponent(search)}&success=reactivated`);
}
