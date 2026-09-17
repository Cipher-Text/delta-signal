import { cookies } from 'next/headers';
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
