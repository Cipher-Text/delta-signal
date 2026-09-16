'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type Observation } from '@delta-signal/contracts';
import { apiPostAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function submitObservationAction(formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '');
  const districtId = formData.get('districtId') ? String(formData.get('districtId')) : undefined;

  try {
    await apiPostAuthed<Observation>(
      routes.observations.create,
      { category, description, districtId },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to submit observation';
    redirect(`/observations?error=${encodeURIComponent(message)}`);
  }

  redirect('/observations?submitted=1');
}
