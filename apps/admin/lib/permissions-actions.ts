'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';
import { apiPost, apiDelete } from './api';

export async function grantPermissionAction(formData: FormData) {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const role = String(formData.get('role') ?? '');
  const permissionId = String(formData.get('permissionId') ?? '');

  try {
    await apiPost('/api/v1/admin/permissions/roles', { role, permissionId }, accessToken);
  } catch {
    redirect('/permissions?error=grant+failed');
  }

  redirect('/permissions?success=granted');
}

export async function revokePermissionAction(formData: FormData) {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const role = String(formData.get('role') ?? '');
  const permissionId = String(formData.get('permissionId') ?? '');

  try {
    await apiDelete('/api/v1/admin/permissions/roles', accessToken, { role, permissionId });
  } catch {
    redirect('/permissions?error=revoke+failed');
  }

  redirect('/permissions?success=revoked');
}
