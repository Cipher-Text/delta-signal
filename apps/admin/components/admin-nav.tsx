'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  role: string;
  canManageOrganizations: boolean;
}

const MODERATOR_LINKS = [
  { href: '/reports', label: 'Reports' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/observations', label: 'Observations' },
  { href: '/social-content', label: 'Social Content' },
  { href: '/ingestion', label: 'Ingestion' },
  { href: '/system', label: 'System Health' },
];

const ADMIN_ONLY_LINKS = [
  { href: '/permissions', label: 'Permissions' },
  { href: '/datasets', label: 'Datasets' },
  { href: '/users', label: 'Users' },
  { href: '/researcher-applications', label: 'Researcher Applications' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/restoration', label: 'Restoration' },
  { href: '/audit', label: 'Audit Log' },
  { href: '/settings', label: 'Layout' },
];

export default function AdminNav({ role, canManageOrganizations }: AdminNavProps) {
  const pathname = usePathname();
  const isAdmin = role === 'ADMIN';

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + '/') ? ' active' : '';
  }

  return (
    <nav className="sidebar-nav">
      <span className="nav-section-label">Moderation</span>
      {MODERATOR_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={`nav-link${active(link.href)}`}>
          {link.label}
        </Link>
      ))}

      {(isAdmin || canManageOrganizations) && (
        <>
          <span className="nav-section-label">Administration</span>
          {ADMIN_ONLY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link${active(link.href)}`}>
              {link.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
