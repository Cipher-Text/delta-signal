import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type Dataset, type DatasetAccessPolicy, type PaginatedEnvelope, type Provider } from '@delta-signal/contracts';
import { dhakaDateTimeShort } from '../../../lib/format';
import { getCurrentUser } from '../../../lib/current-user';
import {
  ACCESS_LABEL,
  ACCESS_ORDER,
  CATEGORY_META,
  CATEGORY_ORDER,
  PROVIDER_TYPE_LABEL,
  ROLE_LABEL,
  canOpen,
  categoryLabel,
  sourceName,
} from '../../../lib/data-hub';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

type Query = { category?: string; accessPolicy?: string; q?: string };

function AccessPill({ policy }: { policy: DatasetAccessPolicy }) {
  return policy === 'PUBLIC' ? (
    <span className="dh-access dh-access--public">
      <NavIcon name="globe" />
      Public
    </span>
  ) : (
    <span className="dh-access">
      <NavIcon name="lock" />
      {ACCESS_LABEL[policy] ?? policy}
    </span>
  );
}

/** Dataset catalog with provider list (Web UI Reference). The catalog is small, so it is filtered in memory. */
export default async function DataPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const q = sp.q?.trim() || '';
  const accessPolicy = ACCESS_ORDER.includes(sp.accessPolicy as DatasetAccessPolicy) ? (sp.accessPolicy as DatasetAccessPolicy) : undefined;
  const category = CATEGORY_ORDER.includes(sp.category as never) ? sp.category : undefined;

  const [catalog, providersRes, user] = await Promise.all([
    apiGet<PaginatedEnvelope<Dataset>>(`${routes.datasets.list}?page=1&pageSize=100`, 300),
    apiGet<PaginatedEnvelope<Provider>>(`${routes.providers.list}?pageSize=10`, 900),
    getCurrentUser(),
  ]);

  const needle = q.toLowerCase();
  const scoped = catalog.data.filter(
    (d) =>
      (!accessPolicy || d.accessPolicy === accessPolicy) &&
      (!needle || d.name.toLowerCase().includes(needle) || (d.description ?? '').toLowerCase().includes(needle)),
  );
  const list = category ? scoped.filter((d) => d.category === category) : scoped;
  const present = CATEGORY_ORDER.filter((c) => scoped.some((d) => d.category === c) || c === category);

  const href = (o: Partial<Record<keyof Query, string | undefined>>) => {
    const next: Query = { category, accessPolicy, q: q || undefined, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/data${qs ? `?${qs}` : ''}`;
  };

  const chips = [
    category && { key: 'cat', label: `Category: ${categoryLabel(category)}`, remove: href({ category: undefined }) },
    accessPolicy && { key: 'access', label: `Access: ${ACCESS_LABEL[accessPolicy]}`, remove: href({ accessPolicy: undefined }) },
    q && { key: 'q', label: `Search: ${q}`, remove: href({ q: undefined }) },
  ].filter(Boolean) as { key: string; label: string; remove: string }[];

  // "Signed in as Admin · you can open every dataset" — based on the same rules the download API enforces.
  const role = user?.role ?? '';
  const states = catalog.data.map((d) => canOpen(d.accessPolicy, role));
  const openCount = states.filter((s) => s === 'yes').length;
  const needsRequest = states.filter((s) => s === 'request').length;
  const accessSummary = !user
    ? ''
    : openCount === catalog.data.length
      ? 'you can open every dataset'
      : `you can open ${openCount} of ${catalog.data.length} datasets${needsRequest ? ` · ${needsRequest} need approval` : ''}`;

  const countLabel = `${list.length} ${list.length === 1 ? 'dataset' : 'datasets'}`;

  return (
    <>
      <PageHeader
        title="Data Hub"
        description={
          <>
            <span className="dt-desc-long">Environmental datasets for Bangladesh, with their source, freshness and who can access them.</span>
            <span className="dt-desc-short">Environmental datasets for Bangladesh</span>
          </>
        }
        action={user && <span className="dh-who">Signed in as {ROLE_LABEL[user.role] ?? user.role} · {accessSummary}</span>}
      />

      <section className="dt-card">
        <div className="dh-controls">
          <div className="dh-controls-row">
            <nav className="dh-cats" aria-label="Category">
              <Link href={href({ category: undefined })} aria-current={!category ? 'true' : undefined}>
                All <span>{scoped.length}</span>
              </Link>
              {present.map((c) => (
                <Link key={c} href={href({ category: c })} aria-current={category === c ? 'true' : undefined}>
                  {categoryLabel(c)} <span>{scoped.filter((d) => d.category === c).length}</span>
                </Link>
              ))}
            </nav>
            <form className="dh-filters" method="get" role="search">
              {category && <input type="hidden" name="category" value={category} />}
              <label className="dh-search">
                <NavIcon name="search" />
                <input key={q} type="search" name="q" defaultValue={q} placeholder="Search datasets" aria-label="Search datasets" />
              </label>
              <button type="submit" className="sr-only">Search</button>
              <AutoSubmitSelect name="accessPolicy" className="select-field" defaultValue={accessPolicy ?? ''} aria-label="Access level">
                <option value="">All access levels</option>
                {ACCESS_ORDER.map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}
              </AutoSubmitSelect>
            </form>
          </div>
          <div className="dh-count-row">
            <span className="dt-count">{countLabel}</span>
            {chips.length > 0 && (
              <div className="dt-chips">
                <span>Filtered by</span>
                {chips.map((c) => (
                  <Link key={c.key} className="dt-chip" href={c.remove} aria-label={`Remove filter ${c.label}`}>
                    {c.label}
                    <NavIcon name="close" />
                  </Link>
                ))}
                <Link className="dt-clear" href="/data">Clear all</Link>
              </div>
            )}
          </div>
        </div>

        <div className="dt-table" role="table" aria-label="Datasets">
          <div className="dt-row dt-row--head dt-row--ds" role="row">
            <div role="columnheader">Dataset</div>
            <div role="columnheader" className="dt-col-cat">Category</div>
            <div role="columnheader" className="dt-col-source">Source</div>
            <div role="columnheader" className="dt-col-records">Records</div>
            <div role="columnheader" className="dt-col-synced">Last synced</div>
            <div role="columnheader" className="dt-col-access">Access</div>
            <div role="columnheader" aria-hidden="true" />
          </div>
          {list.map((d) => {
            const tint = CATEGORY_META[d.category]?.tint ?? 'neutral';
            const records = d.recordCount != null ? d.recordCount.toLocaleString() : 'Not reported';
            const synced = d.lastSyncedAt ? dhakaDateTimeShort(d.lastSyncedAt) : 'Never synced';
            return (
              <Link key={d.id} className="dt-row dt-row--ds" role="row" href={`/data/${d.id}`}>
                <div role="cell" className="dt-col-name">
                  <span className="dt-strong">{d.name}</span>
                  {d.description && <span className="dt-sub">{d.description}</span>}
                </div>
                <div role="cell" className="dt-col-cat"><span className={`dt-pill dh-tint--${tint}`}>{categoryLabel(d.category)}</span></div>
                <div role="cell" className="dt-col-source">{sourceName(d.source)}</div>
                <div role="cell" className={`dt-col-records dt-num${d.recordCount != null ? '' : ' dt-muted'}`}>{records}</div>
                <div role="cell" className={`dt-col-synced${d.lastSyncedAt ? '' : ' dh-warn'}`}>{synced}</div>
                <div role="cell" className="dt-col-access"><AccessPill policy={d.accessPolicy} /></div>
                <div role="cell" className="dt-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                <div className="dt-meta">{categoryLabel(d.category)} · {sourceName(d.source)} · {records}</div>
                <div className="dt-mobile-tags">
                  <AccessPill policy={d.accessPolicy} />
                  <span className={d.lastSyncedAt ? 'dt-muted' : 'dh-warn'}>Synced {synced}</span>
                </div>
              </Link>
            );
          })}
        </div>
        {list.length === 0 && (
          <EmptyState
            title="No datasets match"
            description="Try another category or access level."
            action={<Link className="button" href="/data">Clear filters</Link>}
          />
        )}
        <p className="dt-foot">Access shows who can open a dataset. Public datasets can be previewed and downloaded without an account.</p>
      </section>

      <section className="dt-card dh-providers" aria-labelledby="dh-prov-h">
        <div className="dh-prov-head">
          <h2 id="dh-prov-h">Data providers</h2>
          <span>{providersRes.total} {providersRes.total === 1 ? 'provider' : 'providers'}</span>
        </div>
        <ul className="dh-prov-grid">
          {providersRes.data.map((p) => (
            <li key={p.id}>
              <span className="dh-prov-icon" aria-hidden="true"><NavIcon name="organizations" /></span>
              <div>
                <strong>{p.name}</strong>
                <span>{PROVIDER_TYPE_LABEL[p.type] ?? p.type} · {p.country}</span>
              </div>
              <em className={p.isActive ? '' : 'dh-inactive'}>{p.isActive ? 'Active' : 'Inactive'}</em>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
