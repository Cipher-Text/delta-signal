'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { setSidebarAction } from '../lib/sidebar-actions';
import type { CurrentUser } from '../lib/current-user';
import type { Theme } from '../lib/theme';
import AppSidebar from './app-sidebar';
import TopBar from './top-bar';

/** Authenticated shell (§31): sidebar left, top utility bar over the main workspace. */
export default function AppShell({
  user,
  theme,
  initialCollapsed,
  children,
}: {
  user: CurrentUser;
  theme: Theme | undefined;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [navOpen, setNavOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Close the mobile drawer on route change and Escape; lock page scroll while it is open.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => {
      const formData = new FormData();
      formData.set('collapsed', String(next));
      setSidebarAction(formData);
    });
  }

  return (
    <div className="app-shell" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      {navOpen && <div className="sidebar-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <AppSidebar
        user={user}
        collapsed={collapsed}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="app-main-col">
        <TopBar user={user} theme={theme} onOpenNav={() => setNavOpen(true)} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
