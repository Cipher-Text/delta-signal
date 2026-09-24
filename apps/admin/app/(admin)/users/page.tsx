import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  updateRoleAction,
  deactivateUserAction,
  reactivateUserAction,
} from '../../../lib/user-actions';

const PAGE_SIZE = 20;

type UserRole =
  | 'CITIZEN'
  | 'RESEARCHER'
  | 'ORGANIZATION_ADMIN'
  | 'GOVERNMENT'
  | 'MODERATOR'
  | 'ADMIN';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface PaginatedResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

const ASSIGNABLE_ROLES: UserRole[] = [
  'CITIZEN',
  'ORGANIZATION_ADMIN',
  'GOVERNMENT',
  'MODERATOR',
];

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'role-admin',
  MODERATOR: 'role-moderator',
  GOVERNMENT: 'role-government',
  ORGANIZATION_ADMIN: 'role-org-admin',
  RESEARCHER: 'role-researcher',
  CITIZEN: 'role-citizen',
};

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function decodeJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export default async function UsersPage(
  props: {
    searchParams: Promise<{ page?: string; search?: string; success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const search = searchParams.search ?? '';
  const currentUserId = decodeJwtSub(accessToken);

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(search ? { search } : {}),
  });

  const result = await apiGet<PaginatedResponse>(`/api/v1/users?${qs}`, accessToken);
  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  function pageUrl(p: number) {
    return `/users?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>{result.total} users total</p>
        </div>
      </div>

      {searchParams.success === 'role' && (
        <div className="flash flash-success">Role updated successfully.</div>
      )}
      {searchParams.success === 'deactivated' && (
        <div className="flash flash-success">User deactivated.</div>
      )}
      {searchParams.success === 'reactivated' && (
        <div className="flash flash-success">User reactivated.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      {/* Search */}
      <form method="get" className="filter-bar">
        <input
          name="search"
          type="search"
          placeholder="Search by name or email…"
          defaultValue={search}
          className="filter-input"
        />
        <button type="submit" className="btn btn-secondary">Search</button>
        {search && (
          <Link href="/users" className="btn btn-ghost">Clear</Link>
        )}
      </form>

      <div className="table-wrapper">
        {result.data.length === 0 ? (
          <div className="empty-state">No users found{search ? ` matching "${search}"` : ''}.</div>
        ) : (
          result.data.map((user) => {
            const isSelf = user.id === currentUserId;
            const canChangeRole = user.role !== 'ADMIN';
            const canDeactivate = user.isActive && !isSelf;
            const canReactivate = !user.isActive;

            return (
              <div key={user.id} className={`user-row${!user.isActive ? ' user-inactive' : ''}`}>
                <div className="user-row-main">
                  <div className="user-identity">
                    <div className="user-name-row">
                      <span className={`role-badge ${ROLE_BADGE[user.role]}`}>
                        {titleCase(user.role)}
                      </span>
                      <span className="user-name">{user.displayName}</span>
                      {isSelf && <span className="self-label">you</span>}
                      {!user.isActive && <span className="inactive-label">inactive</span>}
                    </div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-meta">
                      Joined {formatDate(user.createdAt)}
                      {' · '}
                      {user.lastLoginAt
                        ? `Last login ${relativeTime(user.lastLoginAt)}`
                        : 'Never logged in'}
                    </div>
                  </div>

                  <div className="user-actions">
                    {canChangeRole && (
                      <form action={updateRoleAction} className="role-form">
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="returnPage" value={String(page)} />
                        <select name="role" className="role-select" defaultValue={user.role}>
                          {user.role === 'RESEARCHER' && <option value="RESEARCHER" disabled>Researcher (application approved)</option>}
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>{titleCase(r)}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-secondary btn-sm">
                          Update role
                        </button>
                      </form>
                    )}

                    {canDeactivate && (
                      <details className="deactivate-details">
                        <summary className="btn btn-danger-outline btn-sm">Deactivate</summary>
                        <div className="deactivate-confirm">
                          <p>
                            Deactivate <strong>{user.displayName}</strong>? They will be
                            immediately locked out.
                          </p>
                          <form action={deactivateUserAction}>
                            <input type="hidden" name="id" value={user.id} />
                            <input type="hidden" name="returnPage" value={String(page)} />
                            <button type="submit" className="btn btn-danger btn-sm">
                              Confirm deactivate
                            </button>
                          </form>
                        </div>
                      </details>
                    )}

                    {canReactivate && (
                      <details className="deactivate-details">
                        <summary className="btn btn-secondary btn-sm">Reactivate</summary>
                        <div className="deactivate-confirm">
                          <p>
                            Reactivate <strong>{user.displayName}</strong>? They will be able
                            to log in again.
                          </p>
                          <form action={reactivateUserAction}>
                            <input type="hidden" name="id" value={user.id} />
                            <input type="hidden" name="returnPage" value={String(page)} />
                            <input type="hidden" name="search" value={search} />
                            <button type="submit" className="btn btn-secondary btn-sm">
                              Confirm reactivate
                            </button>
                          </form>
                        </div>
                      </details>
                    )}

                    {isSelf && <p className="self-note">Cannot modify your own account.</p>}
                    {user.role === 'ADMIN' && !isSelf && (
                      <p className="role-fixed-note">Admin role cannot be changed via console.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="btn btn-ghost">← Previous</Link>
          )}
          <span className="page-info">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="btn btn-ghost">Next →</Link>
          )}
        </div>
      )}
    </>
  );
}
