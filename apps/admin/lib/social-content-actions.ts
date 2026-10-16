'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from './api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './session-constants';

const token = async () => {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');
  return accessToken;
};

const fail = (error: unknown) => error instanceof ApiError ? error.message : 'Social content action failed';

/** "Label | Value" per line, at most four. */
function parseHighlights(text: string) {
  return text
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .slice(0, 4)
    .map(([label, ...rest]) => ({ label: label.slice(0, 24), value: rest.join(' | ').slice(0, 16) }));
}

export async function createSocialDraftAction(formData: FormData) {
  const accessToken = await token();
  // Posts made from a suggestion return to the Suggested Posts page (an allowlist, never a free redirect).
  const home = String(formData.get('returnTo') ?? '').startsWith('/suggested-posts') ? '/suggested-posts?tab=suggestions&' : '/social-content?';
  try {
    await apiPost('/api/v1/social-content/drafts', {
      type: String(formData.get('type') ?? ''),
      districtId: String(formData.get('districtId') ?? '').trim() || undefined,
      cadence: String(formData.get('cadence') ?? 'DAILY'),
      variant: String(formData.get('variant') ?? '') === 'LOWEST' ? 'LOWEST' : undefined,
      sourceId: String(formData.get('sourceId') ?? '').trim() || undefined,
      stationId: String(formData.get('stationId') ?? '').trim() || undefined,
      format: String(formData.get('format') ?? 'PORTRAIT_4_5'),
      locale: String(formData.get('locale') ?? 'en'),
      headline: String(formData.get('headline') ?? '').trim() || undefined,
      summary: String(formData.get('summary') ?? '').trim() || undefined,
      caption: String(formData.get('caption') ?? '').trim() || undefined,
      disclaimer: String(formData.get('disclaimer') ?? '').trim() || undefined,
      ...(formData.get('type') === 'CUSTOM_EDITORIAL' ? {
        theme: String(formData.get('theme') ?? '').trim() || undefined,
        kicker: String(formData.get('kicker') ?? '').trim() || undefined,
        highlights: parseHighlights(String(formData.get('highlights') ?? '')),
      } : {}),
    }, accessToken);
  } catch (error) {
    redirect(`${home}error=${encodeURIComponent(fail(error))}`);
  }
  revalidatePath('/social-content');
  redirect(`${home}success=created`);
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

export async function publishSocialDraftAction(formData: FormData) {
  const accessToken = await token();
  const id = String(formData.get('id') ?? '');
  const platformAccountId = String(formData.get('platformAccountId') ?? '');
  try {
    await apiPost(`/api/v1/social-content/drafts/${id}/publish`, { platformAccountId }, accessToken);
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  revalidatePath('/social-content');
  redirect('/social-content?success=publish-queued');
}

export async function connectFacebookAction() {
  const accessToken = await token();
  let authorizeUrl: string;
  try {
    const result = await apiGet<{ authorizeUrl: string }>('/api/v1/social-content/platforms/facebook/connect', accessToken);
    authorizeUrl = result.authorizeUrl;
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  redirect(authorizeUrl!);
}

export async function disconnectPlatformAction(formData: FormData) {
  const accessToken = await token();
  const id = String(formData.get('id') ?? '');
  try {
    await apiDelete(`/api/v1/social-content/platforms/${id}`, accessToken);
  } catch (error) {
    redirect(`/social-content?error=${encodeURIComponent(fail(error))}`);
  }
  revalidatePath('/social-content');
  redirect('/social-content?success=disconnected');
}
