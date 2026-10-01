'use client';

import { useEffect, useState, useTransition } from 'react';
import { setThemeAction } from '../lib/theme-actions';
import type { Theme } from '../lib/theme';

const META: Record<Theme, { label: string; icon: React.ReactNode }> = {
  light: {
    label: 'Theme: Light',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8 4.4 4.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  dark: {
    label: 'Theme: Dark',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M17 11.5A7 7 0 1 1 8.5 3a5.5 5.5 0 0 0 8.5 8.5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export default function ThemeToggle({ theme, compact }: { theme: Theme | undefined; compact?: boolean }) {
  const [current, setCurrent] = useState<Theme>(theme ?? 'dark');
  const [, startTransition] = useTransition();

  useEffect(() => {
    // No explicit cookie yet — reflect the system preference until the user picks one.
    if (theme) return;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setCurrent('light');
    }
  }, [theme]);

  function handleClick() {
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    setCurrent(next);

    // Flip the token set immediately — don't wait on the round trip that persists it.
    document.documentElement.setAttribute('data-theme', next);

    startTransition(() => {
      const formData = new FormData();
      formData.set('theme', next);
      setThemeAction(formData);
    });
  }

  const meta = META[current];
  const nextLabel = META[current === 'dark' ? 'light' : 'dark'].label;

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' theme-toggle--compact' : ''}`}
      onClick={handleClick}
      title={`${meta.label} — click for ${nextLabel}`}
    >
      {meta.icon}
      <span className="theme-toggle-label">{meta.label}</span>
    </button>
  );
}
