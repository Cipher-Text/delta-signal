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
  const species = String(formData.get('species') ?? '').trim() || undefined;
  const num = (key: string) => {
    const v = formData.get(key);
    return v === null || v === '' ? undefined : Number(v);
  };
  const lat = num('lat');
  const lng = num('lng');
  // Date and time are entered in Bangladesh time (UTC+6).
  const date = String(formData.get('date') ?? '');
  const time = String(formData.get('time') ?? '');
  const observedAt = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? new Date(`${date}T${time}:00+06:00`).toISOString() : undefined;

  try {
    await apiPostAuthed<Observation>(
      routes.observations.create,
      {
        category,
        description,
        districtId,
        species: category === 'BIODIVERSITY' ? species : undefined,
        observedAt,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to submit observation';
    redirect(`/observations?error=${encodeURIComponent(message)}`);
  }

  redirect('/observations?submitted=1');
}
