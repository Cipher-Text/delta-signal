'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '../lib/auth-actions';
import type { CurrentUser } from '../lib/current-user';
import type { Theme } from '../lib/theme';
import NavIcon from './nav-icons';
import ThemeToggle from './theme-toggle';

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

interface TopBarProps {
  user: CurrentUser;
  theme: Theme | undefined;
  onOpenNav: () => void;
}

/**
 * Top utility bar (§33). Global search and notifications are intentionally absent:
 * there is no cross-domain search or notification inbox to back them yet.
 */
export default function TopBar({ user, theme, onOpenNav }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <button className="topbar-icon-btn topbar-menu-btn" type="button" aria-label="Open navigation" onClick={onOpenNav}>
        <NavIcon name="menu" />
      </button>
      <Link className="topbar-brand" href="/dashboard">
        <img src="/logo.svg" className="brand-mark" alt="" width={28} height={28} />
        <span>Delta Signal</span>
      </Link>

      <div className="topbar-spacer" />

      <Link className="topbar-icon-btn" href="/methodology" aria-label="Help and methodology" title="Help and methodology">
        <NavIcon name="help" />
      </Link>

      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sidebar-avatar" aria-hidden="true">
            {user.profile?.avatarUrl ? <img src={user.profile.avatarUrl} alt="" /> : initials(user.displayName)}
          </span>
          <span className="user-menu-id">
            <strong>{user.displayName}</strong>
            <small>{ROLE_SHORT[user.role] ?? user.role}</small>
          </span>
          <NavIcon name="chevron" />
        </button>

        {menuOpen && (
          <div className="user-menu-panel" role="menu">
            <div className="user-menu-head">
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
            </div>
            <Link role="menuitem" href="/profile" onClick={() => setMenuOpen(false)}>Profile &amp; account</Link>
            <Link role="menuitem" href="/profile?tab=alerts" onClick={() => setMenuOpen(false)}>Alert subscriptions</Link>
            <Link role="menuitem" href="/profile?tab=security" onClick={() => setMenuOpen(false)}>Security</Link>
            <div className="user-menu-sep" />
            <ThemeToggle theme={theme} />
            <div className="user-menu-sep" />
            <form action={logoutAction}>
              <button role="menuitem" className="user-menu-signout" type="submit">Sign out</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
