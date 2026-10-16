import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { pluralize } from '../../../lib/format';
import { routes, type Organization, type OrganizationType, type PaginatedEnvelope } from '@delta-signal/contracts';
import { ORG_TYPE_META, ORG_TYPE_ORDER } from '../../../lib/org-meta';
import AutoSubmitCheckbox from '../../../components/auto-submit-checkbox';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import OrgLogo from '../../../components/org-logo';
import { TypePill, VerifiedPill } from '../../../components/org-pills';

export const metadata: Metadata = {
  title: 'Organizations — Delta Signal',
  description: "NGOs, government agencies and research institutions working on Bangladesh's environment: who they are, where they work and the restoration projects they run.",
};

type Query = { type?: string; verified?: string; q?: string };

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

/** Public organization directory: who is working on Bangladesh's environment, filterable by type, verification and name. */
export default async function OrganizationsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const q: Query = {
    type: sp.type && sp.type in ORG_TYPE_META ? sp.type : undefined,
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
    ...ORG_TYPE_ORDER.map((t) => ({ key: t, label: ORG_TYPE_META[t].short, count: base.filter((o) => o.type === t).length })).filter(
      (s) => s.count > 0 || s.key === q.type,
    ),
  ];
  const chips: { label: string; href: string; aria: string }[] = [];
  if (q.verified) chips.push({ label: 'Verified only', href: href(q, { verified: undefined }), aria: 'Remove verified filter' });
  if (q.q) chips.push({ label: `Search: ${q.q}`, href: href(q, { q: undefined }), aria: 'Clear search' });
  const filtered = chips.length > 0 || !!q.type;

  const totalProjects = all.reduce((n, o) => n + (o._count?.restorationProjects ?? 0), 0);
  const verifiedCount = all.filter((o) => o.isVerified).length;

  return (
    <div className="orgp-page">
        <header className="orgp-head">
          <p className="eyebrow">Directory</p>
          <h1>Organizations working on Bangladesh&rsquo;s environment</h1>
          <p className="orgp-lead">
            NGOs, government agencies and research institutions: who they are, where they work and the restoration projects they run on Delta Signal.
          </p>
          <p className="orgp-facts">
            <span>{pluralize(all.length, 'organization')}</span>
            <span>{verifiedCount.toLocaleString()} verified</span>
            <span>{pluralize(totalProjects, 'restoration project')}</span>
          </p>
        </header>

        <section className="org-page orgp-filters" aria-label="Filter organizations">
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
            <span className="org-count">{pluralize(orgs.length, 'organization')} · A–Z</span>
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
        </section>

        <section className="org-page" aria-label="Organizations">
          {orgs.length === 0 ? (
            <EmptyState
              title="No organizations match."
              description="Try another type or search."
              action={filtered ? <Link className="org-apply" href="/organizations">Clear filters</Link> : undefined}
            />
          ) : (
            <ul className="org-grid">
              {orgs.map((o) => {
                const projects = o._count?.restorationProjects ?? 0;
                return (
                  <li key={o.id}>
                    <Link href={`/organizations/${o.slug}`} className="org-card">
                      <span className="org-card-top">
                        <OrgLogo name={o.name} url={o.logoUrl} />
                        <span className="org-card-tags">
                          <TypePill type={o.type} />
                          {o.isVerified && <VerifiedPill />}
                        </span>
                      </span>
                      <h3>{o.name}</h3>
                      {o.description && <p>{o.description}</p>}
                      <span className="org-card-foot">
                        <span className="org-country">
                          <NavIcon name="globe" />
                          {o.country}
                          {projects > 0 && <> · {pluralize(projects, 'project')}</>}
                        </span>
                        <span className="org-view">
                          View profile <NavIcon name="chevron-right" />
                        </span>
                        <span className="org-chev" aria-hidden="true"><NavIcon name="chevron-right" /></span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="orgp-cta" aria-label="Add your organization">
          <div>
            <h2>Is your organization missing?</h2>
            <p>Organizations are added by the Delta Signal team. Tell us about yours and we will set up its profile, so its team can publish restoration projects and keep the page up to date.</p>
          </div>
          <Link href="/contact" className="button">Contact us</Link>
        </section>
    </div>
  );
}
