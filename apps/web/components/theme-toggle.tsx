'use client';

import { useState, useTransition } from 'react';
import { setThemeAction } from '../lib/theme-actions';
import type { Theme } from '../lib/theme';

type Step = Theme | 'auto';

const ORDER: Step[] = ['auto', 'light', 'dark'];

const META: Record<Step, { label: string; icon: React.ReactNode }> = {
  auto: {
    label: 'Theme: Auto',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" />
      </svg>
    ),
  },
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
  const [current, setCurrent] = useState<Step>(theme ?? 'auto');
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setCurrent(next);

    // Flip the token set immediately — don't wait on the round trip that persists it.
    if (next === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }

    startTransition(() => {
      const formData = new FormData();
      formData.set('theme', next);
      setThemeAction(formData);
    });
  }

  const meta = META[current];
  const nextLabel = META[ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]].label;

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
