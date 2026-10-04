'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CurrentUser } from '../lib/current-user';
import NavIcon from './nav-icons';

const DASHBOARD_ROLES = new Set([
  'CITIZEN',
  'ADMIN',
  'MODERATOR',
  'GOVERNMENT',
  'RESEARCHER',
  'ORGANIZATION_ADMIN',
]);

type NavLink = { href: string; label: string; icon: string };

// Groups and membership follow docs/DESIGN.md §32. The ADMINISTRATION group lives
// in apps/admin, so it is intentionally not repeated here.
const NAV_SECTIONS: readonly { label: string; links: readonly NavLink[] }[] = [
  {
    label: 'Environment',
    links: [
      { href: '/observations', label: 'Observations', icon: 'observations' },
      { href: '/alerts', label: 'Alerts', icon: 'alerts' },
      { href: '/biodiversity', label: 'Biodiversity', icon: 'biodiversity' },
      { href: '/water-bodies', label: 'Water Bodies', icon: 'water-bodies' },
      { href: '/marine', label: 'Marine', icon: 'marine' },
      { href: '/radiation', label: 'Radiation', icon: 'radiation' },
      { href: '/emissions', label: 'Emissions', icon: 'emissions' },
      { href: '/industrial-sites', label: 'Industry', icon: 'industrial-sites' },
    ],
  },
  {
    label: 'Data',
    links: [
      { href: '/data', label: 'Data Hub', icon: 'data' },
      { href: '/locations', label: 'Locations', icon: 'locations' },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/reports', label: 'Citizen Reports', icon: 'reports' },
      { href: '/restoration', label: 'Restoration', icon: 'restoration' },
      { href: '/community', label: 'Community', icon: 'community' },
      { href: '/organizations', label: 'Organizations', icon: 'organizations' },
      { href: '/members', label: 'Members', icon: 'members' },
    ],
  },
];

interface AppSidebarProps {
  user: CurrentUser;
  collapsed: boolean;
  /** Mobile drawer state. */
  open: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}

export default function AppSidebar({ user, collapsed, open, onClose, onToggleCollapsed }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  function renderLink(link: NavLink) {
    const active = isActive(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={active ? 'active' : undefined}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? link.label : undefined}
        onClick={onClose}
      >
        <NavIcon name={link.icon} />
        <span className="nav-text">{link.label}</span>
      </Link>
    );
  }

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`} aria-label="Sidebar">
      <div className="sidebar-header">
        <Link className="sidebar-brand" href="/dashboard" onClick={onClose} title="Delta Signal — Dashboard">
          <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={34} height={34} />
          <div className="sidebar-brand-text">
            <strong>Delta Signal</strong>
            <span>Environmental intelligence</span>
          </div>
        </Link>
        <button className="sidebar-close-btn" type="button" aria-label="Close navigation" onClick={onClose}>
          <NavIcon name="close" />
        </button>
      </div>

      <nav aria-label="App navigation">
        {DASHBOARD_ROLES.has(user.role) && (
          <div role="group" aria-label="Overview">
            <span className="nav-label" aria-hidden="true">Overview</span>
            {renderLink({ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' })}
          </div>
        )}
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} role="group" aria-label={section.label}>
            <span className="nav-label" aria-hidden="true">{section.label}</span>
            {section.links.map(renderLink)}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-btn"
          type="button"
          onClick={onToggleCollapsed}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <NavIcon name="collapse" />
          <span className="nav-text">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
    </aside>
  );
}
