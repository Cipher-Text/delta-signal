'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Admin shell: a fixed sidebar on wide screens; on narrow screens the sidebar becomes a
 * drawer opened from a top bar, and closes on navigation, Escape or a tap outside.
 */
export default function AdminShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="admin-layout" data-nav-open={open}>
      <header className="mobile-bar">
        <button
          type="button"
          className="mobile-bar-btn"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
          </svg>
        </button>
        <span className="mobile-bar-title">Admin Console</span>
      </header>
      <div id="admin-sidebar" className="sidebar-wrap">{sidebar}</div>
      <button type="button" className="sidebar-scrim" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} />
      <div className="main-content">{children}</div>
    </div>
  );
}
