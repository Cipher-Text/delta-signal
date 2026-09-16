import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type Dataset, type Provider, type PaginatedEnvelope } from '@delta-signal/contracts';
import { titleCase } from '../../../lib/format';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';

const CATEGORIES = [
  'WEATHER',
  'AIR_QUALITY',
  'WATER',
  'BIODIVERSITY',
  'REPORTS',
  'MONITORING',
  'GEOSPATIAL',
] as const;

const ACCESS_LABEL: Record<string, { label: string; variant: string }> = {
  PUBLIC: { label: 'Public', variant: 'success' },
  LOGIN_REQUIRED: { label: 'Sign in required', variant: 'warning' },
  RESEARCHER: { label: 'Researcher access', variant: 'warning' },
  APPROVED: { label: 'Approval required', variant: 'danger' },
  GOVERNMENT: { label: 'Government access', variant: 'danger' },
};

export default async function DataPage(
  props: {
    searchParams: Promise<{ category?: string; accessPolicy?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const category = searchParams.category;
  const accessPolicy = searchParams.accessPolicy;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (accessPolicy) params.set('accessPolicy', accessPolicy);
  params.set('page', String(page));
  params.set('pageSize', '20');
  const datasetsPath = params.toString() ? `${routes.datasets.list}?${params}` : routes.datasets.list;

  const [datasetsRes, providersRes] = await Promise.all([
    apiGet<PaginatedEnvelope<Dataset>>(datasetsPath),
    apiGet<PaginatedEnvelope<Provider>>(`${routes.providers.list}?pageSize=10`),
  ]);

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Data Hub</h1>
          <p>Environmental dataset catalog for Bangladesh.</p>
        </div>
      </div>

      <div className="toolbar" aria-label="Category filter">
        <Link className={`chip${!category ? ' active' : ''}`} href={`/data${accessPolicy ? `?accessPolicy=${encodeURIComponent(accessPolicy)}` : ''}`}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            className={`chip${category === c ? ' active' : ''}`}
            href={`/data?${new URLSearchParams({ category: c, ...(accessPolicy ? { accessPolicy } : {}) }).toString()}`}
          >
            {titleCase(c)}
          </Link>
        ))}
      </div>

      <ListResultToolbar total={datasetsRes.total} label="datasets" />

      <form className="toolbar" method="get" aria-label="Dataset access filter">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="accessPolicy">Access</label>
        <select id="accessPolicy" name="accessPolicy" className="select-field" defaultValue={accessPolicy ?? ''}>
          <option value="">All access levels</option>
          {Object.keys(ACCESS_LABEL).map((value) => <option key={value} value={value}>{ACCESS_LABEL[value].label}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      <div className="table" role="table" aria-label="Dataset catalog">
        <div className="table-row table-head" role="row">
          <span>Dataset</span>
          <span>Category</span>
          <span>Provider</span>
          <span>Access</span>
        </div>
        {datasetsRes.data.map((d) => {
          const access = ACCESS_LABEL[d.accessPolicy];
          return (
            <Link className="table-row table-row-link" role="row" key={d.id} href={`/data/${d.id}`}>
              <strong>{d.name}</strong>
              <span className="tag info">{titleCase(d.category)}</span>
              <span>{d.provider?.name ?? '—'}</span>
              <span className={`tag ${access?.variant ?? 'muted'}`}>
                {access?.label ?? d.accessPolicy}
              </span>
            </Link>
          );
        })}
        {datasetsRes.data.length === 0 && (
          <div className="empty-state">No datasets match this category yet.</div>
        )}
      </div>
      <ListPagination pathname="/data" page={datasetsRes.page} pageSize={datasetsRes.pageSize} total={datasetsRes.total} query={{ category, accessPolicy }} />

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Providers</h2>
            <p>Organizations and agencies contributing data</p>
          </div>
        </div>
        <div className="record-list">
          {providersRes.data.map((p) => (
            <div className="record-item" key={p.id}>
              <strong>{p.name}</strong>
              <span>
                {titleCase(p.type)} · {p.country}
              </span>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
