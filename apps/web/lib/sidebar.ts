import { cookies } from 'next/headers';

export const SIDEBAR_COOKIE = 'ds_sidebar';
const SIDEBAR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Whether the user collapsed the desktop sidebar to icons only (§31). */
export async function getSidebarCollapsed(): Promise<boolean> {
  return (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';
}

export async function setSidebarCollapsed(collapsed: boolean) {
  const store = await cookies();
  store.set(SIDEBAR_COOKIE, collapsed ? 'collapsed' : 'expanded', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SIDEBAR_MAX_AGE_SECONDS,
  });
}
