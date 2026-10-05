import { cookies } from 'next/headers';
import Link from 'next/link';
import { routes, type MemberListResponse, type UserRole } from '@delta-signal/contracts';
import { apiGetAuthed } from '../../../lib/api';
import { dhakaDate, pluralize } from '../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

type Query = { role?: string; district?: string; search?: string; page?: string };

const ROLE_LABEL: Partial<Record<UserRole, string>> = {
  CITIZEN: 'Citizen',
  RESEARCHER: 'Researcher',
  ORGANIZATION_ADMIN: 'Organization admin',
  GOVERNMENT: 'Government',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};
const ROLES = ['CITIZEN', 'RESEARCHER', 'ORGANIZATION_ADMIN', 'GOVERNMENT', 'MODERATOR', 'ADMIN'] as UserRole[];

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function href(q: Query, patch: Partial<Query>) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  if (next.role) params.set('role', next.role);
  if (next.district) params.set('district', next.district);
  if (next.search) params.set('search', next.search);
  const s = params.toString();
  return s ? `/members?${s}` : '/members';
}

/** Member directory (Web UI Reference): role segments with live counts, search + district, table / mobile list. */
export default async function MembersPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const role = sp.role && sp.role in ROLE_LABEL ? sp.role : undefined;
  const district = sp.district || undefined;
  const search = sp.search?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q: Query = { role, district, search };

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  const params = new URLSearchParams({ page: String(page), pageSize: '24' });
  if (role) params.set('role', role);
  if (district) params.set('district', district);
  if (search) params.set('search', search);

  const [result, districts] = await Promise.all([
    apiGetAuthed<MemberListResponse>(`${routes.members.list}?${params}`, accessToken),
    apiGetAuthed<string[]>(routes.members.districts, accessToken).catch((): string[] => []),
  ]);

  const counts = result.roleCounts;
  const everyone = ROLES.reduce((sum, r) => sum + (counts[r] ?? 0), 0);
  const segments = [
    { key: '', label: 'All', count: everyone },
    ...ROLES.map((r) => ({ key: r, label: ROLE_LABEL[r] ?? r, count: counts[r] ?? 0 })).filter((s) => s.count > 0 || s.key === role),
  ];

  const chips: { label: string; href: string; aria: string }[] = [];
  if (district) chips.push({ label: `District: ${district}`, href: href(q, { district: undefined }), aria: 'Remove district filter' });
  if (search) chips.push({ label: `Search: ${search}`, href: href(q, { search: undefined }), aria: 'Clear search' });
  const filtered = chips.length > 0 || !!role;

  return (
    <div className="page-stack mem-page">
      <PageHeader
        title="Members"
        description="Citizens, researchers and organizations contributing environmental data for Bangladesh."
      />

      <div className="mem-controls">
        <nav className="dt-seg mem-seg" aria-label="Role">
          {segments.map((s) => (
            <Link key={s.key} href={href(q, { role: s.key || undefined })} aria-current={(role ?? '') === s.key ? 'true' : undefined}>
              {s.label}
              <span>{s.count}</span>
            </Link>
          ))}
        </nav>
        <form method="get" action="/members" className="mem-filters">
          {role && <input type="hidden" name="role" value={role} />}
          <label className="dt-search">
            <NavIcon name="search" />
            <input key={search ?? ''} type="search" name="search" aria-label="Search members by name" placeholder="Search by name" defaultValue={search ?? ''} />
          </label>
          <label className="mem-district">
            <span className="sr-only">District</span>
            <AutoSubmitSelect name="district" aria-label="District" defaultValue={district ?? ''}>
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </AutoSubmitSelect>
          </label>
        </form>
      </div>

      <div className="mem-count-row">
        <span className="mem-count">{pluralize(result.total, 'member')} · newest first</span>
        {chips.length > 0 && (
          <div className="dt-chips">
            <span>Filtered by</span>
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="dt-chip" aria-label={c.aria}>
                {c.label}
                <NavIcon name="close" />
              </Link>
            ))}
            <Link href={href({}, { role })} className="dt-clear">Clear all</Link>
          </div>
        )}
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          title="No members match."
          description="Try another role, district or name."
          action={filtered ? <Link className="org-apply" href="/members">Clear filters</Link> : undefined}
        />
      ) : (
        <>
          <div className="mem-table" role="table" aria-label="Members">
            <div className="mem-row mem-row--head" role="row">
              <div role="columnheader">Member</div>
              <div role="columnheader">Role</div>
              <div role="columnheader">Location</div>
              <div role="columnheader" className="mem-num">Points</div>
              <div role="columnheader">Joined</div>
              <div role="columnheader" />
            </div>
            {result.data.map((m) => {
              const sub = [m.profile?.occupation, m.profile?.institution].filter(Boolean).join(' · ') || 'No profile details yet';
              const loc = m.profile?.locationDistrict ? `${m.profile.locationDistrict}, ${m.profile.locationCountry}` : null;
              const pts = m.profile?.contributionPoints ?? 0;
              return (
                <Link key={m.id} href={`/members/${m.id}`} className="mem-row" role="row">
                  <div role="cell" className="mem-who">
                    <span className="mem-avatar" aria-hidden="true">
                      {m.profile?.avatarUrl ? <img src={m.profile.avatarUrl} alt="" /> : initials(m.displayName)}
                    </span>
                    <span className="mem-name">
                      <strong>{m.displayName}</strong>
                      <small>{sub}</small>
                    </span>
                  </div>
                  <div role="cell"><span className="mem-role">{ROLE_LABEL[m.role] ?? m.role}</span></div>
                  <div role="cell" className={loc ? undefined : 'mem-muted'}>{loc ?? 'Not shared'}</div>
                  <div role="cell" className={`mem-num${pts ? '' : ' mem-muted'}`}>{pts.toLocaleString()}</div>
                  <div role="cell">{dhakaDate(m.createdAt)}</div>
                  <div role="cell" className="mem-chev"><NavIcon name="chevron-right" /></div>
                </Link>
              );
            })}
          </div>

          <ul className="mem-list">
            {result.data.map((m) => {
              const loc = m.profile?.locationDistrict ? `${m.profile.locationDistrict}, ${m.profile.locationCountry}` : 'Not shared';
              const pts = m.profile?.contributionPoints ?? 0;
              return (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`}>
                    <span className="mem-avatar" aria-hidden="true">
                      {m.profile?.avatarUrl ? <img src={m.profile.avatarUrl} alt="" /> : initials(m.displayName)}
                    </span>
                    <span className="mem-name">
                      <strong>{m.displayName}</strong>
                      <span className="mem-list-meta">
                        <span className="mem-role">{ROLE_LABEL[m.role] ?? m.role}</span>
                        <span>{loc}</span>
                      </span>
                      <small>Joined {dhakaDate(m.createdAt)} · {pluralize(pts, 'point')}</small>
                    </span>
                    <span className="mem-chev"><NavIcon name="chevron-right" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ListPagination pathname="/members" page={result.page} pageSize={result.pageSize} total={result.total} query={{ role, district, search }} />

      <p className="mem-note">
        Members who chose a private profile are not listed. Points come from reports, observations and profile completeness.
      </p>
    </div>
  );
}
