import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { redirect } from 'next/navigation';

interface AdminUser {
  role: string;
}

/* ── Role → page access matrix ──────────────────────────────────────── */

const NAV_MATRIX = [
  {
    page: 'Reports',
    path: '/reports',
    roles: ['MODERATOR', 'ADMIN'],
    description: 'Moderation queue for user-submitted reports',
  },
  {
    page: 'Alerts',
    path: '/alerts',
    roles: ['MODERATOR', 'ADMIN'],
    description: 'Issue, edit, and cancel environmental alerts',
  },
  {
    page: 'Observations',
    path: '/observations',
    roles: ['MODERATOR', 'ADMIN'],
    description: 'Moderate community observations and trust levels',
  },
  {
    page: 'Ingestion',
    path: '/ingestion',
    roles: ['MODERATOR', 'ADMIN'],
    description: 'Data ingestion job status (stub — pending implementation)',
  },
  {
    page: 'System Health',
    path: '/system',
    roles: ['MODERATOR', 'ADMIN'],
    description: 'API status, cron jobs, and ingestion job history',
  },
  {
    page: 'Permissions',
    path: '/permissions',
    roles: ['ADMIN'],
    description: 'Permission matrix across all roles',
  },
  {
    page: 'Datasets',
    path: '/datasets',
    roles: ['ADMIN'],
    description: 'Publish/unpublish datasets and manage access policy',
  },
  {
    page: 'Users',
    path: '/users',
    roles: ['ADMIN'],
    description: 'User search, role changes, activate/deactivate',
  },
  {
    page: 'Organizations',
    path: '/organizations',
    roles: ['ADMIN', 'ORGANIZATION_ADMIN*'],
    description: 'Organization management (also accessible to org admins via permission)',
  },
  {
    page: 'Restoration',
    path: '/restoration',
    roles: ['ADMIN'],
    description: 'Restoration project lifecycle and status transitions',
  },
  {
    page: 'Audit Log',
    path: '/audit',
    roles: ['ADMIN'],
    description: 'Immutable event log for all admin mutations',
  },
  {
    page: 'Layout & Settings',
    path: '/settings',
    roles: ['ADMIN'],
    description: 'This page — navigation structure and design tokens',
  },
];

/* ── Design tokens (mirrors :root in globals.css) ─────────────────────
   Update here whenever globals.css :root changes.
   ──────────────────────────────────────────────────────────────────── */

const TOKEN_GROUPS: { label: string; tokens: { name: string; value: string; swatch?: true }[] }[] = [
  {
    label: 'Brand / Accent',
    tokens: [
      { name: '--accent',            value: '#3d9fa8', swatch: true },
      { name: '--accent-hover',      value: '#2e7b83', swatch: true },
      { name: '--accent-subtle',     value: '#d0edf0', swatch: true },
      { name: '--accent-subtle-txt', value: '#2b7a82', swatch: true },
    ],
  },
  {
    label: 'Sidebar',
    tokens: [
      { name: '--sidebar-bg',           value: '#172026', swatch: true },
      { name: '--sidebar-hover',        value: '#1e2f38', swatch: true },
      { name: '--sidebar-border',       value: '#2a3840', swatch: true },
      { name: '--sidebar-text',         value: '#c8d6da', swatch: true },
      { name: '--sidebar-text-bright',  value: '#e8f0f2', swatch: true },
      { name: '--sidebar-text-muted',   value: '#8aa4ac', swatch: true },
      { name: '--sidebar-text-dim',     value: '#6a8890', swatch: true },
    ],
  },
  {
    label: 'Surfaces & Backgrounds',
    tokens: [
      { name: '--page-bg',       value: '#f0f4f5', swatch: true },
      { name: '--surface',       value: '#ffffff', swatch: true },
      { name: '--surface-subtle', value: '#f8fafb', swatch: true },
      { name: '--surface-dim',   value: '#fafafa', swatch: true },
    ],
  },
  {
    label: 'Borders',
    tokens: [
      { name: '--border',        value: '#d4dcdf', swatch: true },
      { name: '--border-subtle', value: '#edf1f2', swatch: true },
    ],
  },
  {
    label: 'Text',
    tokens: [
      { name: '--ink',            value: '#172026', swatch: true },
      { name: '--text-secondary', value: '#5b6d74', swatch: true },
      { name: '--text-muted',     value: '#8a9fa8', swatch: true },
      { name: '--text-body',      value: '#3a4f58', swatch: true },
      { name: '--text-label',     value: '#2a3840', swatch: true },
    ],
  },
  {
    label: 'Semantic — Success',
    tokens: [
      { name: '--success-bg',     value: '#d1fae5', swatch: true },
      { name: '--success-text',   value: '#065f46', swatch: true },
      { name: '--success-border', value: '#a7f3d0', swatch: true },
    ],
  },
  {
    label: 'Semantic — Danger',
    tokens: [
      { name: '--danger-bg',     value: '#fee2e2', swatch: true },
      { name: '--danger-text',   value: '#991b1b', swatch: true },
      { name: '--danger-border', value: '#fecaca', swatch: true },
    ],
  },
];

export default async function SettingsPage() {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  let user: AdminUser;
  try {
    user = await apiGet<AdminUser>('/api/v1/auth/profile', accessToken);
  } catch {
    redirect('/login');
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="empty-state">
        This page is restricted to ADMIN accounts.
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Layout &amp; Settings</h1>
        <p>
          Navigation structure, role access matrix, and UI design tokens. Navigation and theme
          are code-driven — edit{' '}
          <code className="settings-code">apps/admin/components/admin-nav.tsx</code> and{' '}
          <code className="settings-code">apps/admin/app/globals.css</code> respectively.
        </p>
      </div>

      {/* ── Navigation & Role Access ── */}
      <section className="system-section">
        <h2 className="system-section-title">Navigation &amp; Role Access</h2>
        <p className="system-section-note">
          Which pages each role can reach. MODERATOR sees Moderation pages; ADMIN sees all pages.
          The asterisk (*) denotes pages also accessible via the{' '}
          <code className="settings-code">organizations.manage</code> permission regardless of role.
        </p>

        <div className="settings-nav-table">
          <div className="settings-nav-head">
            <span>Page</span>
            <span>Path</span>
            <span>Roles</span>
            <span>Purpose</span>
          </div>
          {NAV_MATRIX.map((row) => (
            <div key={row.path} className="settings-nav-row">
              <strong>{row.page}</strong>
              <code className="settings-code settings-path">{row.path}</code>
              <span className="settings-roles">
                {row.roles.map((r) => (
                  <span key={r} className={`tag ${r.startsWith('ADMIN') ? 'tag-danger' : r === 'MODERATOR' ? 'tag-info' : 'tag-muted'}`}>
                    {r}
                  </span>
                ))}
              </span>
              <span className="settings-desc">{row.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Design Tokens ── */}
      <section className="system-section">
        <h2 className="system-section-title">Design Tokens</h2>
        <p className="system-section-note">
          All 28 CSS custom properties defined in{' '}
          <code className="settings-code">:root</code> of{' '}
          <code className="settings-code">apps/admin/app/globals.css</code>. Every colour in
          the admin console references one of these variables — changing a token value updates
          every component that uses it.
        </p>

        {TOKEN_GROUPS.map((group) => (
          <div key={group.label} className="settings-token-group">
            <h3 className="settings-token-group-label">{group.label}</h3>
            <div className="settings-token-list">
              {group.tokens.map((token) => (
                <div key={token.name} className="settings-token-row">
                  {token.swatch && (
                    <span
                      className="settings-swatch"
                      style={{ background: token.value }}
                      title={token.value}
                    />
                  )}
                  <code className="settings-token-name">{token.name}</code>
                  <code className="settings-token-value">{token.value}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Sidebar section order ── */}
      <section className="system-section">
        <h2 className="system-section-title">Sidebar Section Order</h2>
        <p className="system-section-note">
          Sections and their display order as defined in{' '}
          <code className="settings-code">components/admin-nav.tsx</code>.
        </p>
        <div className="settings-sidebar-preview">
          <div className="settings-sidebar-section">
            <span className="settings-sidebar-section-label">Moderation</span>
            {['Reports', 'Alerts', 'Observations', 'Ingestion', 'System Health'].map((label) => (
              <div key={label} className="settings-sidebar-link">{label}</div>
            ))}
          </div>
          <div className="settings-sidebar-section">
            <span className="settings-sidebar-section-label">Administration</span>
            {['Permissions', 'Datasets', 'Users', 'Organizations', 'Restoration', 'Audit Log', 'Layout & Settings'].map((label) => (
              <div key={label} className="settings-sidebar-link">{label}</div>
            ))}
          </div>
        </div>
        <p className="settings-footnote">
          To reorder links: edit the <code className="settings-code">MODERATOR_LINKS</code> and{' '}
          <code className="settings-code">ADMIN_ONLY_LINKS</code> arrays in{' '}
          <code className="settings-code">components/admin-nav.tsx</code>, then rebuild.
        </p>
      </section>
    </>
  );
}
