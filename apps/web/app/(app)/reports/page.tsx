import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { submitReportAction } from '../../../lib/report-actions';
import { routes, type CitizenReport, type PaginatedEnvelope } from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../lib/format';
import DistrictSelect, { type DistrictWithDivision } from '../../../components/district-select';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

const CATEGORIES = [
  'WATER_POLLUTION',
  'ILLEGAL_DUMPING',
  'DEFORESTATION',
  'WILDLIFE_INCIDENT',
  'FLOODING',
  'AIR_POLLUTION',
  'OTHER',
] as const;

const STATUS_VARIANT: Record<string, string> = {
  VERIFIED: 'success',
  RESOLVED: 'success',
  REJECTED: 'danger',
};

type DistrictOption = DistrictWithDivision;

export default async function ReportsPage(
  props: {
    searchParams: Promise<{ category?: string; status?: string; districtId?: string; page?: string; submitted?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const category = searchParams.category;
  const { status, districtId } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const reportParams = new URLSearchParams();
  if (category) reportParams.set('category', category);
  if (status) reportParams.set('status', status);
  if (districtId) reportParams.set('districtId', districtId);
  reportParams.set('page', String(page));
  reportParams.set('pageSize', '20');
  const reportsPath = reportParams.toString() ? `${routes.reports.list}?${reportParams}` : routes.reports.list;

  const [reportsRes, verifiedRes, resolvedRes, user] = await Promise.all([
    apiGet<PaginatedEnvelope<CitizenReport>>(reportsPath),
    apiGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?status=VERIFIED&pageSize=1`),
    apiGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?status=RESOLVED&pageSize=1`),
    getCurrentUser(),
  ]);

  const districts = await apiGet<DistrictOption[]>(routes.locations.districts).catch(() => []);

  return (
    <>
      <PageHeader title="Citizen Reports" description="Only reviewed and accepted records appear here." />

      <div className="metric-grid">
        <div className="metric">
          <span>Verified reports</span>
          <strong>{verifiedRes.total}</strong>
        </div>
        <div className="metric">
          <span>Resolved</span>
          <strong>{resolvedRes.total}</strong>
        </div>
      </div>

      <div className="toolbar" aria-label="Category filter">
        <Link className={`chip${!category ? ' active' : ''}`} href={`/reports${status || districtId ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(districtId ? { districtId } : {}) }).toString()}` : ''}`}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            className={`chip${category === c ? ' active' : ''}`}
            href={`/reports?${new URLSearchParams({ category: c, ...(status ? { status } : {}), ...(districtId ? { districtId } : {}) }).toString()}`}
          >
            {titleCase(c)}
          </Link>
        ))}
      </div>

      <ListResultToolbar total={reportsRes.total} label="verified reports" />

      <form className="toolbar" method="get" aria-label="Report filters">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="reportStatus">Status</label>
        <select id="reportStatus" name="status" className="select-field" defaultValue={status ?? ''}>
          <option value="">Verified or resolved</option><option value="VERIFIED">Verified</option><option value="RESOLVED">Resolved</option>
        </select>
        <label htmlFor="reportDistrict">District</label>
        <select id="reportDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
          <option value="">All districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      <div className="table" role="table" aria-label="Citizen reports">
        <div className="table-row table-head" role="row">
          <span>Report</span>
          <span>Location</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        {reportsRes.data.map((r) => (
          <Link className="table-row table-row-link" role="row" key={r.id} href={`/reports/${r.id}`}>
            <strong>{r.title}</strong>
            <span>{r.district?.name ?? '—'}</span>
            <span className={`tag ${STATUS_VARIANT[r.status] ?? 'muted'}`}>
              {titleCase(r.status)}
            </span>
            <span>{relativeTime(r.updatedAt)}</span>
          </Link>
        ))}
        {reportsRes.data.length === 0 && (
          <div className="empty-state">No reports match this category yet.</div>
        )}
      </div>
      <ListPagination pathname="/reports" page={reportsRes.page} pageSize={reportsRes.pageSize} total={reportsRes.total} query={{ category, status, districtId }} />

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Report an environmental issue</h2>
            <p>Submitted reports start as &quot;Submitted&quot; and go through moderator review before appearing above.</p>
          </div>
        </div>

        {searchParams.submitted && (
          <p className="form-success">
            Report submitted — it&apos;s now pending moderator review. It will appear in
            the list above once verified.
          </p>
        )}
        {searchParams.error && <p className="form-error">{searchParams.error}</p>}

        <form action={submitReportAction} className="submit-form">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              minLength={5}
              maxLength={200}
              placeholder="e.g. Industrial discharge near Buriganga bridge"
            />
          </div>
          <div className="field">
            <label htmlFor="category">Issue type</label>
            <select id="category" name="category" className="select-field" required>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="districtId">District (optional)</label>
            <DistrictSelect districts={districts} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={5000}
              rows={4}
              placeholder="Describe what you observed, when, and any evidence (at least 20 characters)"
            />
          </div>
          <button className="button" type="submit">
            Submit report
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Status flow</h2>
            <p>How a report moves from submission to resolution</p>
          </div>
        </div>
        <ul className="steps">
          <li className="done">Submitted</li>
          <li className="done">Under review</li>
          <li className="active">Verified</li>
          <li>Resolved</li>
        </ul>
        <p className="access-note" style={{ marginTop: '14px' }}>
          Rejected reports remain visible to moderators and admins for audit, but
          don&apos;t appear in this public list.
        </p>
      </article>
    </>
  );
}
