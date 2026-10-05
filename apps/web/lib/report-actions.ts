'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type CitizenReport, type ReportComment } from '@delta-signal/contracts';
import { apiPostAuthed, apiUploadAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png'];

export async function submitReportAction(formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect('/login');
  }

  const title = String(formData.get('title') ?? '');
  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '');
  const districtId = formData.get('districtId') ? String(formData.get('districtId')) : undefined;
  const num = (key: string) => {
    const v = formData.get(key);
    return v === null || v === '' ? undefined : Number(v);
  };
  const lat = num('lat');
  const lng = num('lng');

  let reportId: string;
  try {
    const report = await apiPostAuthed<CitizenReport>(
      routes.reports.create,
      {
        title,
        category,
        description,
        districtId,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      },
      accessToken,
    );
    reportId = report.id;
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to submit report';
    redirect(`/reports?error=${encodeURIComponent(message)}`);
  }

  // Photos are best-effort: the report already exists, so a storage problem must not lose it.
  const photos = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS);
  let failed = 0;
  for (const photo of photos) {
    try {
      if (!PHOTO_TYPES.includes(photo.type) || photo.size > MAX_PHOTO_BYTES) throw new Error('rejected');
      const body = new FormData();
      body.append('file', photo);
      const uploaded = await apiUploadAuthed<{ url: string; mimeType: string; fileSize: number }>(
        '/api/v1/media/upload?folder=reports',
        body,
        accessToken,
      );
      await apiPostAuthed(
        routes.reports.addMedia(reportId),
        { url: uploaded.url, mimeType: uploaded.mimeType, fileSize: uploaded.fileSize },
        accessToken,
      );
    } catch {
      failed += 1;
    }
  }

  redirect(`/reports?submitted=1${failed ? `&photosFailed=${failed}` : ''}`);
}

export async function addCommentAction(reportId: string, formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
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
