import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { submitObservationAction } from '../../../lib/observation-actions';
import {
  routes,
  type Observation,
  type ObservationCategory,
  type ObservationListResponse,
  type PaginatedEnvelope,
} from '@delta-signal/contracts';
import { dhakaDate, dhakaDateTimeShort, pluralize } from '../../../lib/format';
import type { DistrictWithDivision } from '../../../components/district-select';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';
import ObservationDrawer from '../../../components/observations/observation-drawer';

type Query = { category?: string; trustLevel?: string; districtId?: string; page?: string; submitted?: string; error?: string };

const CATEGORIES: { value: ObservationCategory; label: string; tint: string; hint: string }[] = [
  { value: 'BIODIVERSITY', label: 'Biodiversity', tint: 'bio', hint: 'Plants, animals, fungi' },
  { value: 'WATER_QUALITY', label: 'Water quality', tint: 'water', hint: 'Color, smell, readings' },
  { value: 'AIR_QUALITY', label: 'Air quality', tint: 'neutral', hint: 'Smoke, dust, haze' },
  { value: 'LAND_USE', label: 'Land use', tint: 'earth', hint: 'Clearing, building, farming' },
  { value: 'RESTORATION', label: 'Restoration', tint: 'bio', hint: 'Planting, recovery' },
];

const TRUST = {
  RESEARCH_GRADE: { label: 'Research grade', dotted: false, check: true },
  COMMUNITY: { label: 'Community', dotted: false, check: false },
  UNVERIFIED: { label: 'Unverified', dotted: true, check: false },
} as const;
type TrustKey = keyof typeof TRUST;

/** Roles holding `observations.create` by default (admins bypass permission checks). */
const CAN_ADD = new Set(['CITIZEN', 'RESEARCHER', 'ORGANIZATION_ADMIN', 'GOVERNMENT', 'ADMIN']);

const TRUST_EXPLAINED = [
  ['Research grade', 'Reviewed by a researcher or admin and suitable for analysis.'],
  ['Community', 'Confirmed by community review, not yet by a researcher.'],
  ['Unverified', 'Newly submitted. Waiting for review.'],
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
  if (next.trustLevel) params.set('trustLevel', next.trustLevel);
  if (next.category) params.set('category', next.category);
  if (next.districtId) params.set('districtId', next.districtId);
  const s = params.toString();
  return s ? `/observations?${s}` : '/observations';
}

/** Public observations (Web UI Reference): trust segments, filters, observation cards, your observations + trust levels, drawer. */
export default async function ObservationsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const trust = (sp.trustLevel && sp.trustLevel in TRUST ? sp.trustLevel : undefined) as TrustKey | undefined;
  const category = CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined;
  const districtId = sp.districtId || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q: Query = { trustLevel: trust, category, districtId };

  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (trust) params.set('trustLevel', trust);
  if (category) params.set('category', category);
  if (districtId) params.set('districtId', districtId);
  const empty: ObservationListResponse = {
    data: [], total: 0, page: 1, pageSize: 20, counts: { researchGrade: 0, community: 0, unverified: 0, all: 0 },
  };

  const [res, districts, mine] = await Promise.all([
    apiGet<ObservationListResponse>(`${routes.observations.list}?${params}`, 0).catch(() => empty),
    apiGet<DistrictWithDivision[]>(routes.locations.districts, 3600).catch((): DistrictWithDivision[] => []),
    user
      ? apiGetAuthed<PaginatedEnvelope<Observation>>(`${routes.observations.mine}?pageSize=3`, accessToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const segments: { key: TrustKey | ''; label: string; count: number }[] = [
    { key: '', label: 'All public', count: res.counts.all },
    { key: 'RESEARCH_GRADE', label: 'Research grade', count: res.counts.researchGrade },
    { key: 'COMMUNITY', label: 'Community', count: res.counts.community },
    { key: 'UNVERIFIED', label: 'Unverified', count: res.counts.unverified },
  ];
  const districtName = districts.find((d) => d.id === districtId)?.name;
  const typeLabel = CATEGORIES.find((c) => c.value === category)?.label;
  const chips: { label: string; href: string; aria: string }[] = [];
  if (category) chips.push({ label: `Type: ${typeLabel}`, href: href(q, { category: undefined }), aria: 'Remove type filter' });
  if (districtId) chips.push({ label: `District: ${districtName ?? '…'}`, href: href(q, { districtId: undefined }), aria: 'Remove district filter' });

  const canAdd = !user || CAN_ADD.has(user.role);
  const drawerProps = {
    action: submitObservationAction,
    categories: CATEGORIES.map((c) => ({ value: c.value, label: c.label, hint: c.hint })),
    districts: groupByDivision(districts),
    signedIn: !!user,
  };
  const nothingAtAll = res.counts.all === 0 && !category && !districtId;

  return (
    <div className="page-stack rp-page">
      <PageHeader
        title="Observations"
        description={
          <>
            <span className="rs-sub-long">Field notes on wildlife, water, air and land from citizens and researchers, labeled by how far they&apos;ve been checked.</span>
            <span className="rs-sub-short">Field notes, labeled by how far they&apos;ve been checked</span>
          </>
        }
        action={canAdd && <ObservationDrawer {...drawerProps} />}
      />

      {sp.submitted && (
        <div className="pf-notice pf-notice--ok" role="status">
          <NavIcon name="check" />
          Observation added. It&apos;s listed as Unverified until a researcher or admin reviews it. You can follow it under Your observations.
        </div>
      )}
      {sp.error && <div className="pf-notice pf-notice--err" role="alert">{sp.error}</div>}

      <div className="rp-layout">
        <div className="rp-main">
          <div className="rs-controls">
            <nav className="dt-seg rs-seg" aria-label="Trust level">
              {segments.map((s) => (
                <Link key={s.key} href={href(q, { trustLevel: s.key || undefined })} aria-current={(trust ?? '') === s.key ? 'true' : undefined}>
                  {s.label}
                  <span>{s.count}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action="/observations" className="rs-filters">
              {trust && <input type="hidden" name="trustLevel" value={trust} />}
              <label>
                <span className="rs-lab">Type</span>
                <AutoSubmitSelect name="category" aria-label="Type" defaultValue={category ?? ''}>
                  <option value="">All types</option>
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
            <span className="rs-count">{pluralize(res.total, 'observation')} · most recently observed</span>
            {chips.length > 0 && (
              <div className="dt-chips">
                <span>Filtered by</span>
                {chips.map((c) => (
                  <Link key={c.label} href={c.href} className="dt-chip" aria-label={c.aria}>
                    {c.label}
                    <NavIcon name="close" />
                  </Link>
                ))}
                <Link href={href({ trustLevel: trust }, {})} className="dt-clear">Clear all</Link>
              </div>
            )}
          </div>

          {res.data.length === 0 ? (
            <EmptyState
              title={nothingAtAll ? 'No observations yet' : 'No observations match these filters'}
              description="Observations are field notes about wildlife, water, air and land. Spotted a species or measured water quality? Add it here."
              action={canAdd ? <ObservationDrawer {...drawerProps} variant="outline" /> : undefined}
            />
          ) : (
            <ul className="rp-list">
              {res.data.map((o) => {
                const cat = CATEGORIES.find((c) => c.value === o.category);
                const tr = TRUST[o.trustLevel as TrustKey];
                return (
                  <li key={o.id}>
                    <Link href={`/observations/${o.id}`} className="rp-card">
                      <span className="rp-card-top">
                        <span className={`org-pill org-pill--${cat?.tint ?? 'neutral'}`}>{cat?.label ?? o.category}</span>
                        {tr && (
                          <span className="ob-trust" data-dotted={tr.dotted}>
                            {tr.check && <NavIcon name="check" />}
                            {tr.label}
                          </span>
                        )}
                        <span className="rp-updated">{dhakaDateTimeShort(o.observedAt)}</span>
                      </span>
                      {o.species && <strong className="rp-title">{o.species}</strong>}
                      <span className="rp-summary">{o.description}</span>
                      <span className="rp-foot">
                        <NavIcon name="locations" />
                        {o.district?.name ?? 'District not set'}
                        {o.observer && (
                          <>
                            <span aria-hidden="true">·</span>
                            <NavIcon name="members" />
                            {o.observer.displayName}
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <ListPagination pathname="/observations" page={res.page} pageSize={res.pageSize} total={res.total} query={q} />
        </div>

        <aside className="rp-aside" aria-label="Your observations and trust levels">
          <section>
            <h2>Your observations</h2>
            {!user ? (
              <p className="rp-aside-note"><Link href="/login?next=/observations">Sign in</Link> to follow the observations you add.</p>
            ) : mine && mine.data.length > 0 ? (
              <ul className="rp-mine">
                {mine.data.map((m) => (
                  <li key={m.id}>
                    <Link href={`/observations/${m.id}`}>
                      {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
                      {m.district ? ` · ${m.district.name}` : ''}
                    </Link>
                    <span>
                      <b>{TRUST[m.trustLevel as TrustKey]?.label ?? 'Flagged'}</b> · Added {dhakaDate(m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rp-aside-note">You haven&apos;t added an observation yet.</p>
            )}
          </section>
          <section>
            <h2>Trust levels</h2>
            <ul className="rp-flow">
              {TRUST_EXPLAINED.map(([name, hint]) => (
                <li key={name}>
                  <span>
                    <b>{name}</b>
                    <small>{hint}</small>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rp-aside-note">Flagged observations are hidden from public view.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
