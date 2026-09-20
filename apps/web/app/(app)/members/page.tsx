import { cookies } from 'next/headers';
import { routes, type MemberSummary, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGetAuthed } from '../../../lib/api';
import { titleCase, relativeTime } from '../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';

const ROLES = ['CITIZEN', 'RESEARCHER', 'ORGANIZATION_ADMIN', 'GOVERNMENT', 'MODERATOR', 'ADMIN'] as const;

const ROLE_BADGE_CLASS: Record<string, string> = {
  CITIZEN: 'role-citizen',
  RESEARCHER: 'role-researcher',
  ORGANIZATION_ADMIN: 'role-org-admin',
  GOVERNMENT: 'role-government',
  MODERATOR: 'role-moderator',
  ADMIN: 'role-admin',
};

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default async function MembersPage(
  props: {
    searchParams: Promise<{ role?: string; district?: string; search?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { role, district, search } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const listParams = new URLSearchParams();
  if (role) listParams.set('role', role);
  if (district) listParams.set('district', district);
  if (search) listParams.set('search', search);
  listParams.set('page', String(page));
  listParams.set('pageSize', '24');

  const [result, districts] = await Promise.all([
    apiGetAuthed<PaginatedEnvelope<MemberSummary>>(`${routes.members.list}?${listParams}`, accessToken),
    apiGetAuthed<string[]>(routes.members.districts, accessToken).catch(() => []),
  ]);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Directory</p>
        <h1>Members</h1>
        <p>Citizens, researchers, and organizations contributing to Delta Signal&apos;s environmental data for Bangladesh.</p>
      </header>

      <ListResultToolbar total={result.total} label="members" />

      <form className="toolbar" method="get" aria-label="Member filters">
        <label htmlFor="memberSearch">Search</label>
        <input
          id="memberSearch"
          name="search"
          type="search"
          className="search-field"
          defaultValue={search ?? ''}
          placeholder="Search by name"
        />
        <label htmlFor="memberRole">Role</label>
        <select id="memberRole" name="role" className="select-field" defaultValue={role ?? ''}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{titleCase(r)}</option>
          ))}
        </select>
        <label htmlFor="memberDistrict">District</label>
        <select id="memberDistrict" name="district" className="select-field" defaultValue={district ?? ''}>
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      {result.data.length === 0 ? (
        <section className="empty-state">
          <h2>No members found</h2>
          <p>No members match this filter.</p>
        </section>
      ) : (
        <div className="content-grid members-grid">
          {result.data.map((m) => {
            const badgeCount = m.profile?.earnedBadges.length ?? 0;
            const points = m.profile?.contributionPoints ?? 0;
            return (
              <article className="content-card member-card" key={m.id}>
                <div className="member-card-top">
                  <div className="member-avatar" aria-hidden="true">
                    {m.profile?.avatarUrl ? <img src={m.profile.avatarUrl} alt="" /> : initials(m.displayName)}
                  </div>
                  <div>
                    <h2>{m.displayName}</h2>
                    <span className={`profile-role-badge ${ROLE_BADGE_CLASS[m.role] ?? 'role-citizen'}`}>
                      {titleCase(m.role)}
                    </span>
                  </div>
                </div>

                {(m.profile?.occupation || m.profile?.institution) && (
                  <p className="member-card-subline">
                    {[m.profile?.occupation, m.profile?.institution].filter(Boolean).join(' · ')}
                  </p>
                )}

                {m.profile?.bio && <p>{m.profile.bio}</p>}

                <div className="card-meta">
                  {m.profile?.locationDistrict && (
                    <span>{m.profile.locationDistrict}, {m.profile.locationCountry}</span>
                  )}
                  {points > 0 && <span className="card-badge">{points} pts</span>}
                  {badgeCount > 0 && (
                    <span className="card-badge card-badge-member">
                      {badgeCount} badge{badgeCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <p className="member-card-joined">Joined {relativeTime(m.createdAt)}</p>
              </article>
            );
          })}
        </div>
      )}

      <ListPagination
        pathname="/members"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={{ role, district, search }}
      />
    </div>
  );
}
