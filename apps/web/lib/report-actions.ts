'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type CitizenReport, type ReportComment } from '@delta-signal/contracts';
import { apiPostAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function submitReportAction(formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const title = String(formData.get('title') ?? '');
  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '');
  const districtId = formData.get('districtId') ? String(formData.get('districtId')) : undefined;

  try {
    await apiPostAuthed<CitizenReport>(
      routes.reports.create,
      { title, category, description, districtId },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to submit report';
    redirect(`/reports?error=${encodeURIComponent(message)}`);
  }

  redirect('/reports?submitted=1');
}

export async function addCommentAction(reportId: string, formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const body = String(formData.get('body') ?? '').trim();

  try {
    await apiPostAuthed<ReportComment>(
      routes.reports.addComment(reportId),
      { body },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to post comment';
    redirect(`/reports/${reportId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/reports/${reportId}?commented=1`);
}
