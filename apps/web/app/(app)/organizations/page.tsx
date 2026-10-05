import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { pluralize } from '../../../lib/format';
import { routes, type Organization, type OrganizationType, type PaginatedEnvelope } from '@delta-signal/contracts';
import AutoSubmitCheckbox from '../../../components/auto-submit-checkbox';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

type Query = { type?: string; verified?: string; q?: string };

const TYPE_META: Record<OrganizationType, { label: string; short: string; tint: string }> = {
  NGO: { label: 'NGO', short: 'NGO', tint: 'bio' },
  GOVERNMENT_AGENCY: { label: 'Government agency', short: 'Government', tint: 'water' },
  RESEARCH_INSTITUTION: { label: 'Research institution', short: 'Research', tint: 'sky' },
  INTERNATIONAL_ORG: { label: 'International org', short: 'International', tint: 'earth' },
  COMMUNITY_GROUP: { label: 'Community group', short: 'Community', tint: 'neutral' },
  PRIVATE_COMPANY: { label: 'Corporate', short: 'Corporate', tint: 'neutral' },
  OTHER: { label: 'Other', short: 'Other', tint: 'neutral' },
};
const TYPE_ORDER = Object.keys(TYPE_META) as OrganizationType[];

/** The directory is small, so it is loaded whole (100 per API page) and filtered in memory. */
async function loadAll(): Promise<Organization[]> {
  const all: Organization[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await apiGet<PaginatedEnvelope<Organization>>(`${routes.organizations.list}?page=${page}&pageSize=100`);
    all.push(...res.data);
    if (all.length >= res.total || res.data.length === 0) break;
  }
  return all;
}

function href(q: Query, patch: Partial<Query>) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  if (next.type) params.set('type', next.type);
  if (next.verified) params.set('verified', '1');
  if (next.q) params.set('q', next.q);
  const s = params.toString();
  return s ? `/organizations?${s}` : '/organizations';
}

function TypePill({ type }: { type: OrganizationType }) {
  const m = TYPE_META[type] ?? TYPE_META.OTHER;
  return <span className={`org-pill org-pill--${m.tint}`}>{m.label}</span>;
}

function VerifiedPill() {
  return (
    <span className="org-verified">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

/** Organization directory (Web UI Reference): type segments, verified toggle, search, 3-up cards / mobile list. */
export default async function OrganizationsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const q: Query = {
    type: sp.type && sp.type in TYPE_META ? sp.type : undefined,
    verified: sp.verified ? '1' : undefined,
    q: sp.q?.trim() || undefined,
  };

  const all = await loadAll();
  const needle = q.q?.toLowerCase();
  const base = all.filter(
    (o) =>
      (!q.verified || o.isVerified) &&
      (!needle || o.name.toLowerCase().includes(needle) || (o.description ?? '').toLowerCase().includes(needle)),
  );
  const orgs = base.filter((o) => !q.type || o.type === q.type);

  const segments = [
    { key: '', label: 'All', count: base.length },
    ...TYPE_ORDER.map((t) => ({ key: t, label: TYPE_META[t].short, count: base.filter((o) => o.type === t).length })).filter(
      (s) => s.count > 0 || s.key === q.type,
    ),
  ];
  const chips: { label: string; href: string; aria: string }[] = [];
  if (q.verified) chips.push({ label: 'Verified only', href: href(q, { verified: undefined }), aria: 'Remove verified filter' });
  if (q.q) chips.push({ label: `Search: ${q.q}`, href: href(q, { q: undefined }), aria: 'Clear search' });
  const filtered = chips.length > 0 || !!q.type;

  return (
    <div className="page-stack org-page">
      <PageHeader
        title="Organizations"
        description="NGOs, agencies and research institutions working on Bangladesh's environment."
      />

      <div className="org-controls">
        <nav className="dt-seg org-seg" aria-label="Organization type">
          {segments.map((s) => (
            <Link key={s.key} href={href(q, { type: s.key || undefined })} aria-current={(q.type ?? '') === s.key ? 'true' : undefined}>
              {s.label}
              <span>{s.count}</span>
            </Link>
          ))}
        </nav>
        <form method="get" action="/organizations" className="org-filters">
          {q.type && <input type="hidden" name="type" value={q.type} />}
          <label className="org-check">
            <AutoSubmitCheckbox name="verified" value="1" defaultChecked={!!q.verified} />
            Verified only
          </label>
          <label className="dt-search">
            <NavIcon name="search" />
            <input key={q.q ?? ''} type="search" name="q" aria-label="Search organizations" placeholder="Search name or focus" defaultValue={q.q ?? ''} />
          </label>
          <button type="submit" className="org-apply">Apply</button>
        </form>
      </div>

      <div className="org-count-row">
        <span className="org-count">
          {pluralize(orgs.length, 'organization')} · A–Z
        </span>
        {chips.length > 0 && (
          <div className="dt-chips">
            <span>Filtered by</span>
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="dt-chip" aria-label={c.aria}>
                {c.label}
                <NavIcon name="close" />
              </Link>
            ))}
            <Link href={href({}, { type: q.type })} className="dt-clear">Clear all</Link>
          </div>
        )}
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          title="No organizations match."
          description="Try another type or search."
          action={filtered ? <Link className="org-apply" href="/organizations">Clear filters</Link> : undefined}
        />
      ) : (
        <ul className="org-grid">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link href={`/organizations/${o.id}`} className="org-card">
                <span className="org-card-tags">
                  <TypePill type={o.type} />
                  {o.isVerified && <VerifiedPill />}
                </span>
                <h3>{o.name}</h3>
                {o.description && <p>{o.description}</p>}
                <span className="org-card-foot">
                  <span className="org-country">
                    <NavIcon name="globe" />
                    {o.country}
                  </span>
                  <span className="org-view">
                    View profile <NavIcon name="chevron-right" />
                  </span>
                  <span className="org-chev" aria-hidden="true"><NavIcon name="chevron-right" /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
