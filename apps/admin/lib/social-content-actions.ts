'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiGet, apiPatch, apiPost, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

const token = async () => {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');
  return accessToken;
};

const fail = (error: unknown) => error instanceof ApiError ? error.message : 'Social content action failed';

export async function createSocialDraftAction(formData: FormData) {
  const accessToken = await token();
  try {
    await apiPost('/api/v1/social-content/drafts', {
      type: String(formData.get('type') ?? ''),
      districtId: String(formData.get('districtId') ?? ''),
      sourceId: String(formData.get('sourceId') ?? '').trim() || undefined,
      stationId: String(formData.get('stationId') ?? '').trim() || undefined,
      format: String(formData.get('format') ?? 'PORTRAIT_4_5'),
      locale: String(formData.get('locale') ?? 'en'),
      headline: String(formData.get('headline') ?? '').trim() || undefined,
      summary: String(formData.get('summary') ?? '').trim() || undefined,
      caption: String(formData.get('caption') ?? '').trim() || undefined,
      disclaimer: String(formData.get('disclaimer') ?? '').trim() || undefined,
    }, accessToken);
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  revalidatePath('/social-content');
  redirect('/social-content?success=created');
}

export async function updateSocialDraftAction(formData: FormData) {
  const accessToken = await token();
  const id = String(formData.get('id') ?? '');
  try {
    await apiPatch(`/api/v1/social-content/drafts/${id}`, {
      format: String(formData.get('format') ?? 'PORTRAIT_4_5'),
      locale: String(formData.get('locale') ?? 'en'),
      headline: String(formData.get('headline') ?? ''),
      summary: String(formData.get('summary') ?? ''),
      caption: String(formData.get('caption') ?? ''),
      disclaimer: String(formData.get('disclaimer') ?? ''),
    }, accessToken);
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  revalidatePath('/social-content');
  redirect('/social-content?success=updated');
}

async function postDraftAction(formData: FormData, action: string, success: string) {
  const accessToken = await token();
  const id = String(formData.get('id') ?? '');
  try { await apiPost(`/api/v1/social-content/drafts/${id}/${action}`, action === 'mark-published' ? { note: String(formData.get('note') ?? '') } : {}, accessToken); }
  catch (error) { redirect(`/social-content?error=${encodeURIComponent(fail(error))}`); }
  revalidatePath('/social-content');
  redirect(`/social-content?success=${success}`);
}

export async function renderSocialDraftAction(formData: FormData) { return postDraftAction(formData, 'render', 'rendered'); }
export async function approveSocialDraftAction(formData: FormData) { return postDraftAction(formData, 'approve', 'approved'); }
export async function archiveSocialDraftAction(formData: FormData) { return postDraftAction(formData, 'archive', 'archived'); }
export async function markSocialDraftPublishedAction(formData: FormData) { return postDraftAction(formData, 'mark-published', 'published'); }

export async function downloadSocialDraftAction(formData: FormData) {
  const accessToken = await token();
  const id = String(formData.get('id') ?? '');
  let url: string;
  try {
    const result = await apiGet<{ url: string }>(`/api/v1/social-content/drafts/${id}/download`, accessToken);
    url = result.url;
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  redirect(url!);
}
