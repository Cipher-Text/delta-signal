import { cookies } from 'next/headers';

export const THEME_COOKIE = 'ds_theme';
const THEME_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type Theme = 'light' | 'dark';

/** Reads the user's explicit theme choice. Undefined means "follow system preference". */
export async function getTheme(): Promise<Theme | undefined> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : undefined;
}

export async function setTheme(theme: Theme | undefined) {
  const store = await cookies();
  if (!theme) {
    store.delete(THEME_COOKIE);
    return;
  }
  store.set(THEME_COOKIE, theme, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THEME_MAX_AGE_SECONDS,
  });
}
