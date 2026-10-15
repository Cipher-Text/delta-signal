'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './theme-toggle';
import type { Theme } from '../lib/theme';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function MobileMenu({ links, theme, signedIn = false }: { links: readonly { href: string; label: string }[]; theme: Theme | undefined; signedIn?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="mobile-menu-panel">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="mobile-menu-theme"><ThemeToggle theme={theme} /></div>
          <Link href={signedIn ? '/dashboard' : '/login'} className="mobile-menu-signin" onClick={() => setOpen(false)}>
            {signedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      )}
    </div>
  );
}
