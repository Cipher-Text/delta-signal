/**
 * Server-side fetch helper for the NestJS API.
 * Only used from Server Components — never sent to the browser bundle,
 * so no NEXT_PUBLIC_ prefix is needed on the env var.
 */

const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string, revalidateSeconds = 900): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Authenticated GET, never cached — used for user-specific data like the profile. */
export async function apiGetAuthed<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API request failed: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * class-validator/NestJS's ValidationPipe returns `message` as a string[]
 * when a DTO fails validation (e.g. "title must be longer than or equal to
 * 5 characters"), not a single string — extract whichever shape is present.
 */
function extractErrorMessage(errorBody: unknown, fallback: string): string {
  const message = (errorBody as { message?: unknown } | null)?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.length > 0) return message.join('; ');
  return fallback;
}

/** POST for mutations — never cached. Surfaces the backend's error message when available. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `API request failed: ${res.status} ${path}`));
  }
  return res.json() as Promise<T>;
}

/** Authenticated DELETE — never cached. */

/** Authenticated POST for mutations that require a logged-in user. */
export async function apiPostAuthed<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `API request failed: ${res.status} ${path}`));
  }
  return res.json() as Promise<T>;
}

export async function apiPatchAuthed<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `API request failed: ${res.status} ${path}`));
  }
  return res.json() as Promise<T>;
}

/** Authenticated multipart upload. The browser/server runtime sets the boundary. */
export async function apiUploadAuthed<T>(path: string, body: FormData, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `API request failed: ${res.status} ${path}`));
  }
  return res.json() as Promise<T>;
}

export async function apiDeleteAuthed(path: string, accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `API request failed: ${res.status} ${path}`));
  }
}
