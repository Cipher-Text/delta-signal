'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type RestorationProject } from '@delta-signal/contracts';
import { apiPostAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function createRestorationProjectAction(formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const title = String(formData.get('title') ?? '');
  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '');
  const organizationId = formData.get('organizationId') ? String(formData.get('organizationId')) : undefined;
  const districtId = formData.get('districtId') ? String(formData.get('districtId')) : undefined;
  const impactSummary = formData.get('impactSummary') ? String(formData.get('impactSummary')) : undefined;

  try {
    await apiPostAuthed<RestorationProject>(
      routes.restoration.create,
      { title, category, description, organizationId, districtId, impactSummary },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to create project';
    redirect(`/restoration?error=${encodeURIComponent(message)}`);
  }

  redirect('/restoration?created=1');
}

export async function joinRestorationProjectAction(formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const projectId = String(formData.get('projectId') ?? '');

  try {
    await apiPostAuthed<RestorationProject>(routes.restoration.join(projectId), {}, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to join project';
    redirect(`/restoration?error=${encodeURIComponent(message)}`);
  }

  redirect('/restoration?joined=1');
}

/** Join action called from the project detail page — redirects back to the detail view. */
export async function joinFromDetailAction(projectId: string) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  try {
    await apiPostAuthed<RestorationProject>(routes.restoration.join(projectId), {}, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to join project';
    redirect(`/restoration/${projectId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/restoration/${projectId}?joined=1`);
}
