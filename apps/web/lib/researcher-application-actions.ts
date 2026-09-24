'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiPostAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function submitResearcherApplicationAction(formData: FormData) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    await apiPostAuthed('/api/v1/researcher-applications', {}, token);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Application could not be submitted';
    redirect(`/researcher-application?error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/researcher-application');
  redirect('/researcher-application?submitted=1');
}
