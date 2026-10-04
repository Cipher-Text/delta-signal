'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { logoutAction } from '../lib/auth-actions';
import type { CurrentUser } from '../lib/current-user';
import { setThemeAction } from '../lib/theme-actions';
import type { Theme } from '../lib/theme';
import NavIcon from './nav-icons';
import StatusBadge, { type StatusLevel } from './status-badge';

export interface TopBarAlert {
  id: string;
  title: string;
  severity: string;
  area: string;
}

export interface TopBarAlerts {
  total: number;
  items: TopBarAlert[];
}

const ROLE_SHORT: Record<string, string> = {
  CITIZEN: 'Citizen',
  RESEARCHER: 'Researcher',
  ORGANIZATION_ADMIN: 'Org Admin',
  GOVERNMENT: 'Government',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

const SEVERITY_LEVEL: Record<string, StatusLevel> = {
  EMERGENCY: 'critical',
  WARNING: 'warning',
  WATCH: 'watch',
  INFO: 'unknown',
};

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type OpenMenu = 'alerts' | 'user' | null;

interface TopBarProps {
  user: CurrentUser;
  theme: Theme | undefined;
  alerts: TopBarAlerts;
  onOpenNav: () => void;
}

/**
 * Top utility bar (docs/design/DESIGN.md §33 and the Web UI Reference): global search,
 * active-alerts bell, theme, help and the user menu.
 * The bell shows *active alerts* — there is no per-user unread/notification inbox yet.
 */
export default function TopBar({ user, theme, alerts, onOpenNav }: TopBarProps) {
  const [open, setOpen] = useState<OpenMenu>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(theme ?? 'dark');
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // No explicit theme cookie yet — reflect the system preference until the user picks one.
  useEffect(() => {
    if (theme) return;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) setCurrentTheme('light');
  }, [theme]);

  // One dismissal handler for both popovers: outside pointer press or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggleTheme() {
    const next: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(next);
    // Flip the token set immediately — don't wait on the round trip that persists it.
    document.documentElement.setAttribute('data-theme', next);
    startTransition(() => {
      const formData = new FormData();
      formData.set('theme', next);
      setThemeAction(formData);
    });
  }

  const toggle = (menu: Exclude<OpenMenu, null>) => setOpen((v) => (v === menu ? null : menu));
  const close = () => setOpen(null);
  const isDark = currentTheme === 'dark';
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const badge = alerts.total > 9 ? '9+' : String(alerts.total);

  return (
    <header className="topbar" ref={rootRef}>
      <button className="topbar-icon-btn topbar-menu-btn" type="button" aria-label="Open navigation" onClick={onOpenNav}>
        <NavIcon name="menu" />
      </button>
      <Link className="topbar-brand" href="/dashboard">
        <img src="/logo.svg" className="brand-mark" alt="" width={28} height={28} />
        <span>Delta Signal</span>
      </Link>

      <form className="topbar-search" action="/search" method="get" role="search">
        <NavIcon name="search" />
        <input type="search" name="q" aria-label="Search places, datasets, species" placeholder="Search places, datasets, species" autoComplete="off" />
      </form>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <Link className="topbar-icon-btn topbar-search-btn" href="/search" aria-label="Search">
          <NavIcon name="search" />
        </Link>

        <div className="topbar-pop">
          <button
            className="topbar-icon-btn"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open === 'alerts'}
            aria-label={alerts.total > 0 ? `Alerts, ${alerts.total} active` : 'Alerts, none active'}
            onClick={() => toggle('alerts')}
          >
            <NavIcon name="bell" />
            {alerts.total > 0 && <span className="topbar-badge" aria-hidden="true">{badge}</span>}
          </button>

          {open === 'alerts' && (
            <div className="topbar-panel alerts-panel" role="dialog" aria-label="Active alerts">
              <div className="topbar-panel-head">
                <strong>Active alerts</strong>
                <span>{alerts.total === 1 ? '1 active' : `${alerts.total} active`}</span>
              </div>
              {alerts.items.length === 0 ? (
                <p className="topbar-panel-empty">No active alerts right now.</p>
              ) : (
                <ul>
                  {alerts.items.map((a) => (
                    <li key={a.id}>
                      <Link href={`/alerts/${a.id}`} onClick={close}>
                        <StatusBadge level={SEVERITY_LEVEL[a.severity] ?? 'unknown'}>{titleCase(a.severity)}</StatusBadge>
                        <strong>{a.title}</strong>
                        <small>{a.area}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="topbar-panel-foot" href="/alerts" onClick={close}>View all alerts →</Link>
            </div>
          )}
        </div>

        <button className="topbar-icon-btn topbar-theme-btn" type="button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
          <NavIcon name={isDark ? 'sun' : 'moon'} />
        </button>

        <Link className="topbar-icon-btn topbar-help-btn" href="/methodology" aria-label="Help and methodology" title="Help and methodology">
          <NavIcon name="help" />
        </Link>

        <div className="topbar-pop">
          <button
            className="user-menu-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === 'user'}
            onClick={() => toggle('user')}
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

          {open === 'user' && (
            <div className="topbar-panel user-menu-panel" role="menu">
              <Link role="menuitem" href="/profile" onClick={close}>Profile &amp; alert emails</Link>
              <Link role="menuitem" href="/profile?tab=security" onClick={close}>Settings</Link>
              <div className="user-menu-sep" />
              <form action={logoutAction}>
                <button role="menuitem" className="user-menu-signout" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
