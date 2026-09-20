'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '../lib/auth-actions';
import type { CurrentUser } from '../lib/current-user';

const DASHBOARD_ROLES = new Set([
  'CITIZEN',
  'ADMIN',
  'MODERATOR',
  'GOVERNMENT',
  'RESEARCHER',
  'ORGANIZATION_ADMIN',
]);

const NAV_SECTIONS = [
  {
    label: 'Explore',
    links: [
      { href: '/locations', label: 'Locations' },
      { href: '/data', label: 'Data Hub' },
      { href: '/observations', label: 'Observations' },
      { href: '/reports', label: 'Citizen Reports' },
      { href: '/alerts', label: 'Alerts' },
      { href: '/biodiversity', label: 'Biodiversity' },
      { href: '/water-bodies', label: 'Water Bodies' },
      { href: '/marine', label: 'Marine' },
      { href: '/radiation', label: 'Radiation' },
      { href: '/emissions', label: 'Emissions' },
      { href: '/industrial-sites', label: 'Industry' },
      { href: '/restoration', label: 'Restoration' },
      { href: '/organizations', label: 'Organizations' },
      { href: '/community', label: 'Community' },
      { href: '/members', label: 'Members' },
    ],
  },
] as const;

const ROLE_SHORT: Record<string, string> = {
  CITIZEN: 'Citizen',
  RESEARCHER: 'Researcher',
  ORGANIZATION_ADMIN: 'Org Admin',
  GOVERNMENT: 'Government',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export default function AppSidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-header">
        <Link className="mobile-brand" href="/reports" onClick={close}>
          <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={36} height={36} />
          <span>Delta Signal</span>
        </Link>
        <button
          className="mobile-menu-btn"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <span className="hamburger-icon" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        {/* Brand header */}
        <div className="sidebar-header">
          <Link className="sidebar-brand" href="/reports" onClick={close}>
            <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={38} height={38} />
            <div className="sidebar-brand-text">
              <strong>Delta Signal</strong>
              <span>Environmental intelligence</span>
            </div>
          </Link>
          <button
            className="sidebar-close-btn"
            aria-label="Close navigation"
            onClick={close}
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav aria-label="App navigation">
          <div>
            {user && DASHBOARD_ROLES.has(user.role) && (
              <Link
                href="/dashboard"
                className={isActive('/dashboard') ? 'active' : undefined}
                onClick={close}
              >
                Dashboard
              </Link>
            )}
            {NAV_SECTIONS.flatMap((section) => section.links).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive(link.href) ? 'active' : undefined}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          {user ? <Link className="sidebar-user sidebar-profile-link" href="/profile" onClick={close}>
            <div className="sidebar-avatar" aria-hidden="true">
              {user.profile?.avatarUrl ? <img src={user.profile.avatarUrl} alt="" /> : initials(user.displayName)}
            </div>
            <div className="sidebar-user-info">
              <strong>{user.displayName}</strong>
              <span>{ROLE_SHORT[user.role] ?? user.role}</span>
            </div>
          </Link> : <Link className="sidebar-user sidebar-profile-link" href="/login" onClick={close}>Sign in to contribute</Link>}
          {user && <form action={logoutAction}>
            <button className="sidebar-logout-btn" type="submit">Sign out</button>
          </form>}
        </div>
      </aside>
    </>
  );
}
