'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiPatch, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

export async function updateReportStatusAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = formData.get('note') ? String(formData.get('note')) : undefined;
  const returnTab = String(formData.get('returnTab') ?? 'SUBMITTED');

  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiPatch(`/api/v1/reports/${id}/status`, { status, note }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Status update failed';
    redirect(`/reports?tab=${returnTab}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/reports');
  redirect(`/reports?tab=${returnTab}&success=1`);
}
