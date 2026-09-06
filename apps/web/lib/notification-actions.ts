'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type AlertSubscription } from '@delta-signal/contracts';
import { apiPostAuthed, apiDeleteAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function subscribeAction(formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const rawDistrictId = formData.get('districtId');
  const districtId    = rawDistrictId ? String(rawDistrictId) : undefined;
  const minSeverity   = String(formData.get('minSeverity') ?? 'INFO');

  try {
    await apiPostAuthed<AlertSubscription>(
      routes.notifications.subscriptions,
      { districtId: districtId || undefined, minSeverity },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to subscribe';
    redirect(`/profile?tab=alerts&sub_error=${encodeURIComponent(message)}`);
  }

  redirect('/profile?tab=alerts&subscribed=1');
}

export async function unsubscribeAction(subscriptionId: string) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiDeleteAuthed(routes.notifications.unsubscribe(subscriptionId), accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to unsubscribe';
    redirect(`/profile?tab=alerts&sub_error=${encodeURIComponent(message)}`);
  }

  redirect('/profile?tab=alerts&unsubscribed=1');
}
