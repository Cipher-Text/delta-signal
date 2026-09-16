'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiDelete, apiPatch, apiPost, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

async function tokenOrRedirect() {
  const store = await cookies();
  const token = store.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');
  return token;
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Organization update failed';
}

export async function createOrganizationAction(formData: FormData) {
  const token = await tokenOrRedirect();
  try {
    await apiPost('/api/v1/admin/organizations', {
      name: String(formData.get('name') ?? ''),
      type: String(formData.get('type') ?? 'OTHER'),
      description: String(formData.get('description') ?? '') || undefined,
      website: String(formData.get('website') ?? '') || undefined,
      country: String(formData.get('country') ?? '') || undefined,
    }, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=created');
}

export async function updateOrganizationAction(formData: FormData) {
  const token = await tokenOrRedirect();
  const id = String(formData.get('id') ?? '');
  const payload: Record<string, unknown> = {};

  const name = String(formData.get('name') ?? '');
  if (name) payload.name = name;

  const type = String(formData.get('type') ?? '');
  if (type) payload.type = type;

  const description = String(formData.get('description') ?? '');
  payload.description = description || null;

  const website = String(formData.get('website') ?? '');
  payload.website = website || null;

  const country = String(formData.get('country') ?? '');
  if (country) payload.country = country;

  const isVerified = formData.get('isVerified');
  payload.isVerified = isVerified === 'true';

  try {
    await apiPatch(`/api/v1/admin/organizations/${id}`, payload, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=updated');
}

export async function deleteOrganizationAction(formData: FormData) {
  const token = await tokenOrRedirect();
  const id = String(formData.get('id') ?? '');
  try {
    await apiDelete(`/api/v1/admin/organizations/${id}`, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=deleted');
}

export async function upsertMembershipAction(formData: FormData) {
  const token = await tokenOrRedirect();
  const organizationId = String(formData.get('organizationId') ?? '');
  try {
    await apiPost(`/api/v1/admin/organizations/${organizationId}/members`, {
      userId: String(formData.get('userId') ?? ''),
      role: String(formData.get('role') ?? 'MEMBER'),
    }, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=member');
}

export async function updateMembershipAction(formData: FormData) {
  const token = await tokenOrRedirect();
  const organizationId = String(formData.get('organizationId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  try {
    await apiPatch(`/api/v1/admin/organizations/${organizationId}/members/${userId}`, {
      role: String(formData.get('role') ?? 'MEMBER'),
    }, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=member');
}

export async function removeMembershipAction(formData: FormData) {
  const token = await tokenOrRedirect();
  const organizationId = String(formData.get('organizationId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  try {
    await apiDelete(`/api/v1/admin/organizations/${organizationId}/members/${userId}`, token);
  } catch (err) {
    redirect(`/organizations?error=${encodeURIComponent(errorMessage(err))}`);
  }
  revalidatePath('/organizations');
  redirect('/organizations?success=removed');
}
