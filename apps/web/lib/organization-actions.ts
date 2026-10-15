'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiDeleteAuthed, apiPatchAuthed, apiPutAuthed, apiUploadAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';
import { ORG_LINK_ORDER } from './org-links';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function session(formData: FormData) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const id = String(formData.get('id') ?? '');
  const slug = String(formData.get('slug') ?? '') || id;
  if (!accessToken) redirect(`/login?next=/organizations/${slug}/edit`);
  return { accessToken, id, slug };
}

function done(slug: string, ok: boolean, message: string): never {
  revalidatePath('/organizations');
  revalidatePath(`/organizations/${slug}`);
  redirect(`/organizations/${slug}/edit?${ok ? 'saved' : 'error'}=${encodeURIComponent(message)}`);
}

const fail = (error: unknown) => (error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');

function imageFrom(formData: FormData): File | null {
  const file = formData.get('file');
  return file instanceof File && file.size > 0 ? file : null;
}

function checkImage(slug: string, file: File | null): File {
  if (!file) return done(slug, false, 'Choose an image first.');
  if (!IMAGE_TYPES.includes(file.type)) return done(slug, false, 'Images must be JPG, PNG or WebP.');
  if (file.size > MAX_IMAGE_BYTES) return done(slug, false, 'Images must be 5 MB or smaller.');
  return file;
}

export async function updateOrganizationAboutAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  try {
    await apiPatchAuthed(`/api/v1/organizations/${id}`, {
      description: text('description'),
      country: text('country') || undefined,
      // Empty means "clear the website"; the API accepts null.
      website: text('website') || null,
    }, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Details saved');
}

export async function setOrganizationLogoAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  const file = checkImage(slug, imageFrom(formData));
  const body = new FormData();
  body.set('file', file);
  try {
    await apiUploadAuthed(`/api/v1/organizations/${id}/logo`, body, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Logo updated');
}

export async function removeOrganizationLogoAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  try {
    await apiDeleteAuthed(`/api/v1/organizations/${id}/logo`, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Logo removed');
}

export async function addOrganizationPhotoAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  const file = checkImage(slug, imageFrom(formData));
  const body = new FormData();
  body.set('file', file);
  const caption = String(formData.get('caption') ?? '').trim();
  if (caption) body.set('caption', caption);
  try {
    await apiUploadAuthed(`/api/v1/organizations/${id}/photos`, body, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Photo added');
}

export async function removeOrganizationPhotoAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  const photoId = String(formData.get('photoId') ?? '');
  try {
    await apiDeleteAuthed(`/api/v1/organizations/${id}/photos/${photoId}`, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Photo removed');
}

export async function saveOrganizationLinksAction(formData: FormData) {
  const { accessToken, id, slug } = await session(formData);
  const links = ORG_LINK_ORDER.map((platform) => ({ platform, url: String(formData.get(platform) ?? '').trim() }));
  try {
    await apiPutAuthed(`/api/v1/organizations/${id}/links`, { links }, accessToken);
  } catch (error) {
    return done(slug, false, fail(error));
  }
  return done(slug, true, 'Links saved');
}
