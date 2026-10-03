import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes } from '@delta-signal/contracts';
import { apiGetAuthed } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  authProvider: 'EMAIL' | 'GOOGLE';
  createdAt: string;
  lastLoginAt: string | null;
  permissions: string[];
  organizations: Array<{
    id: string;
    name: string;
    type: string;
    isVerified: boolean;
    membershipRole: 'ADMIN' | 'MEMBER';
  }>;
  profile: {
    avatarUrl: string | null;
    phone: string | null;
    preferredLanguage: string;
    occupation: string | null;
    bio: string | null;
    expertise: string[];
    researchInterests: string[];
    education: string | null;
    institution: string | null;
    locationDistrict: string | null;
    locationCountry: string;
    profileVisibility: string;
    contactVisibility: string;
    linksVisibility: string;
  } | null;
  socialLinks: Array<{ platform: string; url: string }>;
}

/**
 * Reads the (already-fresh, thanks to middleware) access-token cookie and
 * fetches the current user. Returns null for guests or on any failure —
 * Server Components can't set cookies, so there's no refresh-on-401 here;
 * middleware.ts is what keeps the access token from going stale.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    return await apiGetAuthed<CurrentUser>(routes.auth.profile, accessToken);
  } catch {
    return null;
  }
}

/**
 * For pages that need a signed-in user. Middleware already redirects guests
 * (with a `next` return path); this is the in-page backstop for an access token
 * that is present but rejected by the API, and it narrows the type to non-null.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * For pages limited to specific roles. Signed-in users with another role are
 * sent to /dashboard, so never call this from the dashboard page itself.
 * Role names are the UPPERCASE Prisma enum values (e.g. 'ADMIN').
 */
export async function requireRole(...roles: string[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/dashboard');
  return user;
}
