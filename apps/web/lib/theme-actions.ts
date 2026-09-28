'use server';

import { revalidatePath } from 'next/cache';
import { setTheme, type Theme } from './theme';

/** Cycles auto (system) → light → dark → auto, driven by a hidden form field set by ThemeToggle. */
export async function setThemeAction(formData: FormData) {
  const next = String(formData.get('theme') ?? '');
  await setTheme(next === 'light' || next === 'dark' ? (next as Theme) : undefined);
  revalidatePath('/', 'layout');
}
