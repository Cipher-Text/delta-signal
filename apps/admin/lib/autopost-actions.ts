'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPost, apiPut, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

const token = async () => {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');
  return accessToken;
};

const back = (kind: 'saved' | 'error', message: string): never => {
  revalidatePath('/suggested-posts');
  redirect(`/suggested-posts?tab=routine&${kind}=${encodeURIComponent(message)}`);
};

const fail = (error: unknown) => (error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');

/** Saves the posting page, the caption footer and all three posts of all seven days at once. */
export async function saveAutopostAction(formData: FormData) {
  const accessToken = await token();
  const slots = [0, 1, 2, 3, 4, 5, 6].flatMap((day) => [0, 1, 2].map((position) => {
    const key = `day${day}_p${position}`;
    return {
      dayOfWeek: day,
      position,
      enabled: formData.get(`${key}_enabled`) === 'on',
      timeOfDay: `${String(formData.get(`${key}_hour`) ?? '08').padStart(2, '0')}:${String(formData.get(`${key}_minute`) ?? '00').padStart(2, '0')}`,
      content: String(formData.get(`${key}_content`) ?? 'AUTO'),
      format: String(formData.get(`${key}_format`) ?? 'PORTRAIT_4_5'),
    };
  }));
  try {
    await apiPut('/api/v1/social-content/autopost/config', {
      platformAccountId: String(formData.get('platformAccountId') ?? '') || null,
      captionFooter: String(formData.get('captionFooter') ?? ''),
      slots,
    }, accessToken);
  } catch (error) {
    return back('error', fail(error));
  }
  return back('saved', 'Schedule saved');
}

export async function toggleAutopostAction(formData: FormData) {
  const accessToken = await token();
  const enabled = formData.get('enabled') === 'true';
  try {
    await apiPost('/api/v1/social-content/autopost/toggle', { enabled, acknowledged: formData.get('acknowledged') === 'on' }, accessToken);
  } catch (error) {
    return back('error', fail(error));
  }
  return back('saved', enabled ? 'Auto-posting is on' : 'Auto-posting is off');
}
