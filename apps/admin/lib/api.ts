const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.length > 0) return message.join('; ');
  return fallback;
}

export async function apiGet<T>(path: string, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, cache: 'no-store' });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      extractErrorMessage(errorBody, `POST ${path} failed: ${res.status}`),
    );
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      extractErrorMessage(errorBody, `PATCH ${path} failed: ${res.status}`),
    );
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `DELETE ${path} failed: ${res.status}`));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `PUT ${path} failed: ${res.status}`));
  }
  return res.json() as Promise<T>;
}

/** POST a multipart form (file uploads). The Content-Type boundary is set by fetch. */
export async function apiPostForm<T>(path: string, form: FormData, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(errorBody, `POST ${path} failed: ${res.status}`));
  }
  return res.json() as Promise<T>;
}
