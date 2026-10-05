import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { submitReportAction } from '../../../lib/report-actions';
import {
  routes,
  type CitizenReport,
  type CitizenReportListResponse,
  type PaginatedEnvelope,
  type ReportCategory,
} from '@delta-signal/contracts';
import { dhakaDate, pluralize } from '../../../lib/format';
import type { DistrictWithDivision } from '../../../components/district-select';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';
import ReportDrawer from '../../../components/reports/report-drawer';

type Query = { category?: string; status?: string; districtId?: string; page?: string; submitted?: string; photosFailed?: string; error?: string };
type Seg = 'VERIFIED' | 'RESOLVED' | 'all';

const CATEGORIES: { value: ReportCategory; label: string; tint: string }[] = [
  { value: 'WATER_POLLUTION', label: 'Water pollution', tint: 'water' },
  { value: 'ILLEGAL_DUMPING', label: 'Illegal dumping', tint: 'earth' },
  { value: 'DEFORESTATION', label: 'Deforestation', tint: 'bio' },
  { value: 'WILDLIFE_INCIDENT', label: 'Wildlife incident', tint: 'bio' },
  { value: 'FLOODING', label: 'Flooding', tint: 'water' },
  { value: 'AIR_POLLUTION', label: 'Air pollution', tint: 'neutral' },
  { value: 'OTHER', label: 'Other', tint: 'neutral' },
];

const MINE_STATUS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

const REVIEW_STEPS = [
  ['Submitted', 'You send the report'],
  ['Under review', 'A moderator checks it'],
  ['Verified', 'Confirmed and shown publicly'],
  ['Resolved', 'The issue has been addressed'],
];

function groupByDivision(districts: DistrictWithDivision[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  for (const d of districts) {
    const div = d.division?.name ?? 'Other';
    if (!map.has(div)) map.set(div, []);
    map.get(div)!.push({ id: d.id, name: d.name });
  }
  return [...map.entries()].map(([division, list]) => ({ division, districts: list }));
}

function href(q: Query, patch: Partial<Query>) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  if (next.status) params.set('status', next.status);
  if (next.category) params.set('category', next.category);
  if (next.districtId) params.set('districtId', next.districtId);
  const s = params.toString();
  return s ? `/reports?${s}` : '/reports';
}

const snippet = (text: string) => (text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text);

/** Public citizen reports (Web UI Reference): status segments, filters, report cards, your reports + how review works, report drawer. */
export default async function ReportsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  // Default segment is Verified (as in the mock); `status=all` means verified + resolved.
  const seg: Seg = sp.status === 'RESOLVED' ? 'RESOLVED' : sp.status === 'all' ? 'all' : 'VERIFIED';
  const category = CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined;
  const districtId = sp.districtId || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q: Query = { status: sp.status === 'RESOLVED' || sp.status === 'all' ? sp.status : undefined, category, districtId };

  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (seg !== 'all') params.set('status', seg);
  if (category) params.set('category', category);
  if (districtId) params.set('districtId', districtId);
  const empty: CitizenReportListResponse = { data: [], total: 0, page: 1, pageSize: 20, counts: { verified: 0, resolved: 0, all: 0 } };

  const [res, districts, mine] = await Promise.all([
    apiGet<CitizenReportListResponse>(`${routes.reports.list}?${params}`, 0).catch(() => empty),
    apiGet<DistrictWithDivision[]>(routes.locations.districts, 3600).catch((): DistrictWithDivision[] => []),
    user
      ? apiGetAuthed<PaginatedEnvelope<CitizenReport>>(`${routes.reports.mine}?pageSize=3`, accessToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const segments: { key: Seg; param?: string; label: string; count: number }[] = [
    { key: 'VERIFIED', label: 'Verified', count: res.counts.verified },
    { key: 'RESOLVED', param: 'RESOLVED', label: 'Resolved', count: res.counts.resolved },
    { key: 'all', param: 'all', label: 'All public', count: res.counts.all },
  ];
  const districtName = districts.find((d) => d.id === districtId)?.name;
  const typeLabel = CATEGORIES.find((c) => c.value === category)?.label;
  const chips: { label: string; href: string; aria: string }[] = [];
  if (category) chips.push({ label: `Type: ${typeLabel}`, href: href(q, { category: undefined }), aria: 'Remove issue type filter' });
  if (districtId) chips.push({ label: `District: ${districtName ?? '…'}`, href: href(q, { districtId: undefined }), aria: 'Remove district filter' });

  const drawerProps = {
    action: submitReportAction,
    categories: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    districts: groupByDivision(districts),
    signedIn: !!user,
  };
  const nothingAtAll = res.counts.all === 0 && !category && !districtId;

  return (
    <div className="page-stack rp-page">
      <PageHeader
        title="Citizen reports"
        description={
          <>
            <span className="rs-sub-long">Environmental issues reported by people across Bangladesh. Only reports checked by a moderator appear here.</span>
            <span className="rs-sub-short">Checked by moderators before they appear</span>
          </>
        }
        action={<ReportDrawer {...drawerProps} />}
      />

      {sp.submitted && (
        <div className="pf-notice pf-notice--ok" role="status">
          <NavIcon name="check" />
          Report submitted. A moderator will review it. You can follow it under Your reports.
        </div>
      )}
      {sp.photosFailed && (
        <div className="pf-notice pf-notice--err" role="alert">
          {pluralize(Number(sp.photosFailed) || 1, 'photo')} could not be attached. Your report was still submitted.
        </div>
      )}
      {sp.error && <div className="pf-notice pf-notice--err" role="alert">{sp.error}</div>}

      <div className="rp-layout">
        <div className="rp-main">
          <div className="rs-controls">
            <nav className="dt-seg rs-seg" aria-label="Status">
              {segments.map((s) => (
                <Link key={s.key} href={href(q, { status: s.param })} aria-current={seg === s.key ? 'true' : undefined}>
                  {s.label}
                  <span>{s.count}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action="/reports" className="rs-filters">
              {q.status && <input type="hidden" name="status" value={q.status} />}
              <label>
                <span className="rs-lab">Issue type</span>
                <AutoSubmitSelect name="category" aria-label="Issue type" defaultValue={category ?? ''}>
                  <option value="">All issue types</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </AutoSubmitSelect>
              </label>
              <label>
                <span className="rs-lab">District</span>
                <AutoSubmitSelect name="districtId" aria-label="District" defaultValue={districtId ?? ''}>
                  <option value="">All districts</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </AutoSubmitSelect>
              </label>
            </form>
          </div>

          <div className="rs-count-row">
            <span className="rs-count">{pluralize(res.total, 'report')} · most recently updated</span>
            {chips.length > 0 && (
              <div className="dt-chips">
                <span>Filtered by</span>
                {chips.map((c) => (
                  <Link key={c.label} href={c.href} className="dt-chip" aria-label={c.aria}>
                    {c.label}
                    <NavIcon name="close" />
                  </Link>
                ))}
                <Link href={href({ status: q.status }, {})} className="dt-clear">Clear all</Link>
              </div>
            )}
          </div>

          {res.data.length === 0 ? (
            <EmptyState
              title={nothingAtAll ? 'No verified reports yet' : 'No reports match these filters'}
              description="Reports appear here once a moderator has checked them. Seen pollution, dumping or flooding? Your report starts the process."
              action={<ReportDrawer {...drawerProps} variant="outline" />}
            />
          ) : (
            <ul className="rp-list">
              {res.data.map((r) => {
                const cat = CATEGORIES.find((c) => c.value === r.category);
                const resolved = r.status === 'RESOLVED';
                return (
                  <li key={r.id}>
                    <Link href={`/reports/${r.id}`} className="rp-card">
                      <span className="rp-card-top">
                        <span className={`org-pill org-pill--${cat?.tint ?? 'neutral'}`}>{cat?.label ?? r.category}</span>
                        <span className={`rp-status${resolved ? ' rp-status--resolved' : ''}`}>
                          <span className="rp-status-icon"><NavIcon name="check" /></span>
                          {resolved ? 'Resolved' : 'Verified'}
                        </span>
                        <span className="rp-updated">Updated {dhakaDate(r.updatedAt)}</span>
                      </span>
                      <strong className="rp-title">{r.title}</strong>
                      <span className="rp-summary">{snippet(r.summary || r.description)}</span>
                      <span className="rp-foot">
                        <NavIcon name="locations" />
                        {r.district?.name ?? 'District not set'}
                        {r.reporter && (
                          <>
                            <span aria-hidden="true">·</span>
                            Reported by {r.reporter.displayName}
                          </>
                        )}
                        {r.mediaCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            {pluralize(r.mediaCount, 'photo')}
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <ListPagination pathname="/reports" page={res.page} pageSize={res.pageSize} total={res.total} query={q} />
        </div>

        <aside className="rp-aside" aria-label="Your reports and review process">
          <section>
            <h2>Your reports</h2>
            {!user ? (
              <p className="rp-aside-note">
                <Link href="/login?next=/reports">Sign in</Link> to follow the reports you submit.
              </p>
            ) : mine && mine.data.length > 0 ? (
              <ul className="rp-mine">
                {mine.data.map((m) => (
                  <li key={m.id}>
                    <Link href={`/reports/${m.id}`}>{m.title}</Link>
                    <span>
                      <b>{MINE_STATUS[m.status] ?? m.status}</b> · {dhakaDate(m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rp-aside-note">You haven&apos;t submitted a report yet.</p>
            )}
          </section>
          <section>
            <h2>How review works</h2>
            <ol className="rp-flow">
              {REVIEW_STEPS.map(([name, hint], i) => (
                <li key={name}>
                  <span className="rp-flow-n">{i + 1}</span>
                  <span>
                    <b>{name}</b>
                    <small>{hint}</small>
                  </span>
                </li>
              ))}
            </ol>
            <p className="rp-aside-note">Rejected reports are kept for moderators and admins but aren&apos;t shown publicly.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
