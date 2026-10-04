import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import {
  routes,
  type CompanyPagedResponse,
  type ComplianceStatus,
  type DistrictSummary,
  type FacilityPagedResponse,
} from '@delta-signal/contracts';
import {
  COMPANY_TYPES,
  COMPLIANCE,
  COMPLIANCE_STATUSES,
  FACILITY_TYPES,
  companyTypeLabel,
  facilityTypeLabel,
  siteShortName,
} from '../../../lib/industry';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

const PAGE_SIZE = 25;
const CACHE_SECONDS = 300;

type Query = { tab?: string; facilityType?: string; complianceStatus?: string; companyType?: string; districtId?: string; page?: string };

const FOOTNOTE = {
  sites: 'Compliance shows the environmental compliance status on record. Unknown means no status has been recorded yet.',
  companies: 'Sites counts the industrial sites linked to each company in Delta Signal.',
};

function CompliancePill({ status }: { status: ComplianceStatus }) {
  const c = COMPLIANCE[status];
  return (
    <span className={`ind-comp ind-comp--${c.tone}`}>
      <i aria-hidden="true" />
      {c.label}
    </span>
  );
}

/** Industrial sites and operating companies in one tabbed card (Web UI Reference). */
export default async function IndustryPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const tab = sp.tab === 'companies' ? 'companies' : 'sites';
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { facilityType, complianceStatus, companyType, districtId } = sp;

  const sitesFiltered = tab === 'sites' && Boolean(facilityType || complianceStatus || districtId);
  const companiesFiltered = tab === 'companies' && Boolean(companyType || districtId);

  const siteParams = new URLSearchParams({ limit: tab === 'sites' ? String(PAGE_SIZE) : '1', page: tab === 'sites' ? String(page) : '1' });
  if (tab === 'sites') {
    if (facilityType) siteParams.set('facilityType', facilityType);
    if (complianceStatus) siteParams.set('complianceStatus', complianceStatus);
    if (districtId) siteParams.set('districtId', districtId);
  }
  const companyParams = new URLSearchParams({ limit: tab === 'companies' ? String(PAGE_SIZE) : '1', page: tab === 'companies' ? String(page) : '1' });
  if (tab === 'companies') {
    if (companyType) companyParams.set('companyType', companyType);
    if (districtId) companyParams.set('districtId', districtId);
  }

  const [sitesRes, companiesRes, sitesAll, companiesAll, districts] = await Promise.all([
    apiGet<FacilityPagedResponse>(`${routes.industrialSites.list}?${siteParams}`, CACHE_SECONDS),
    apiGet<CompanyPagedResponse>(`${routes.companies.list}?${companyParams}`, CACHE_SECONDS),
    sitesFiltered ? apiGet<FacilityPagedResponse>(`${routes.industrialSites.list}?limit=1&page=1`, CACHE_SECONDS) : Promise.resolve(null),
    companiesFiltered ? apiGet<CompanyPagedResponse>(`${routes.companies.list}?limit=1&page=1`, CACHE_SECONDS) : Promise.resolve(null),
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600),
  ]);

  // Tab counts are always the unfiltered totals.
  const siteTotal = (sitesAll ?? sitesRes).total;
  const companyTotal = (companiesAll ?? companiesRes).total;
  const districtName = districts.find((d) => d.id === districtId)?.name;

  const href = (o: Partial<Record<keyof Query, string | undefined>>) => {
    const next: Query = { tab: tab === 'companies' ? 'companies' : undefined, facilityType, complianceStatus, companyType, districtId, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/industrial-sites${qs ? `?${qs}` : ''}`;
  };
  const clearHref = tab === 'companies' ? '/industrial-sites?tab=companies' : '/industrial-sites';

  const chips = (
    tab === 'sites'
      ? [
          facilityType && { key: 'type', label: `Type: ${facilityTypeLabel(facilityType as never)}`, remove: href({ facilityType: undefined, page: undefined }) },
          complianceStatus && { key: 'comp', label: `Compliance: ${COMPLIANCE[complianceStatus as ComplianceStatus]?.label ?? complianceStatus}`, remove: href({ complianceStatus: undefined, page: undefined }) },
          districtId && { key: 'district', label: `District: ${districtName ?? districtId}`, remove: href({ districtId: undefined, page: undefined }) },
        ]
      : [
          companyType && { key: 'type', label: `Type: ${companyTypeLabel(companyType as never)}`, remove: href({ companyType: undefined, page: undefined }) },
          districtId && { key: 'hq', label: `Headquarters: ${districtId === 'none' ? 'Not recorded' : (districtName ?? districtId)}`, remove: href({ districtId: undefined, page: undefined }) },
        ]
  ).filter(Boolean) as { key: string; label: string; remove: string }[];

  return (
    <>
      <PageHeader
        title="Industry"
        description={
          <>
            <span className="dt-desc-long">Industrial sites with environmental impact in Bangladesh, and the companies that operate them.</span>
            <span className="dt-desc-short">Industrial sites and the companies that operate them</span>
          </>
        }
        action={<Link className="dt-about" href="/map">Open sites on map →</Link>}
      />

      <section className="dt-card">
        <nav className="dt-tabs" aria-label="Record type">
          <Link href="/industrial-sites" aria-current={tab === 'sites' ? 'page' : undefined}>
            Industrial sites <span>{siteTotal.toLocaleString()}</span>
          </Link>
          <Link href="/industrial-sites?tab=companies" aria-current={tab === 'companies' ? 'page' : undefined}>
            Companies <span>{companyTotal.toLocaleString()}</span>
          </Link>
        </nav>

        {tab === 'sites' ? (
          <>
            <form className="dt-filters" method="get" aria-label="Site filters">
              <div className="dt-filter-row">
                <label>
                  Type
                  <AutoSubmitSelect name="facilityType" className="select-field" defaultValue={facilityType ?? ''}>
                    <option value="">All types</option>
                    {FACILITY_TYPES.map((t) => <option key={t} value={t}>{facilityTypeLabel(t)}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  Compliance
                  <AutoSubmitSelect name="complianceStatus" className="select-field" defaultValue={complianceStatus ?? ''}>
                    <option value="">All statuses</option>
                    {COMPLIANCE_STATUSES.map((s) => <option key={s} value={s}>{COMPLIANCE[s].label}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  District
                  <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                    <option value="">All districts</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <noscript><button type="submit" className="button">Apply</button></noscript>
                <span className="dt-count">{sitesRes.total.toLocaleString()} {sitesRes.total === 1 ? 'site' : 'sites'}</span>
              </div>
              {chips.length > 0 && <Chips chips={chips} clearHref={clearHref} />}
            </form>

            <div className="dt-table" role="table" aria-label="Industrial sites">
              <div className="dt-row dt-row--head dt-row--site" role="row">
                <div role="columnheader">Site</div>
                <div role="columnheader" className="dt-col-type">Type</div>
                <div role="columnheader" className="dt-col-sdistrict">District</div>
                <div role="columnheader" className="dt-col-comp">Compliance</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {sitesRes.data.map((f) => {
                const company = f.company?.name;
                return (
                  <Link key={f.id} className="dt-row dt-row--site" role="row" href={`/industrial-sites/${f.id}`}>
                    <div role="cell" className="dt-col-name">
                      <span className="dt-strong">{siteShortName(f.name, company)}</span>
                      {company && <span className="dt-sub">{company}</span>}
                    </div>
                    <div role="cell" className="dt-col-type"><span className="dt-pill dt-pill--neutral">{facilityTypeLabel(f.facilityType)}</span></div>
                    <div role="cell" className="dt-col-sdistrict">
                      <span>{f.district.name}</span>
                      <span className="dt-sub">{f.upazila?.name ?? 'Upazila not recorded'}</span>
                    </div>
                    <div role="cell" className="dt-col-comp"><CompliancePill status={f.complianceStatus} /></div>
                    <div role="cell" className="dt-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="dt-meta">{[company, f.district.name].filter(Boolean).join(' · ')}</div>
                    <div className="dt-mobile-tags">
                      <span className="dt-pill dt-pill--neutral">{facilityTypeLabel(f.facilityType)}</span>
                      <CompliancePill status={f.complianceStatus} />
                    </div>
                  </Link>
                );
              })}
            </div>
            {sitesRes.data.length === 0 && (
              <EmptyState title="No sites match these filters" action={<Link className="button" href={clearHref}>Clear filters</Link>} />
            )}
            <ListPagination
              pathname="/industrial-sites"
              page={page}
              pageSize={PAGE_SIZE}
              total={sitesRes.total}
              query={{ facilityType, complianceStatus, districtId }}
              summary
            />
          </>
        ) : (
          <>
            <form className="dt-filters" method="get" aria-label="Company filters">
              <input type="hidden" name="tab" value="companies" />
              <div className="dt-filter-row">
                <label>
                  Type
                  <AutoSubmitSelect name="companyType" className="select-field" defaultValue={companyType ?? ''}>
                    <option value="">All types</option>
                    {COMPANY_TYPES.map((t) => <option key={t} value={t}>{companyTypeLabel(t)}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  Headquarters
                  <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                    <option value="">All districts</option>
                    <option value="none">Not recorded</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <noscript><button type="submit" className="button">Apply</button></noscript>
                <span className="dt-count">{companiesRes.total.toLocaleString()} {companiesRes.total === 1 ? 'company' : 'companies'}</span>
              </div>
              {chips.length > 0 && <Chips chips={chips} clearHref={clearHref} />}
            </form>

            <div className="dt-table" role="table" aria-label="Companies">
              <div className="dt-row dt-row--head dt-row--co" role="row">
                <div role="columnheader">Company</div>
                <div role="columnheader" className="dt-col-type">Type</div>
                <div role="columnheader" className="dt-col-hq">Headquarters</div>
                <div role="columnheader" className="dt-col-sites">Sites</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {companiesRes.data.map((c) => {
                const sites = c._count.facilities;
                const hq = c.headquarterDistrict?.name;
                return (
                  <Link key={c.id} className="dt-row dt-row--co" role="row" href={`/industrial-sites/companies/${c.id}`}>
                    <div role="cell" className="dt-col-name">
                      <span className="dt-strong">{c.name}</span>
                      {c.parentCompany && <span className="dt-sub">Part of {c.parentCompany.name}</span>}
                    </div>
                    <div role="cell" className="dt-col-type"><span className="dt-pill dt-pill--neutral">{companyTypeLabel(c.companyType)}</span></div>
                    <div role="cell" className={`dt-col-hq${hq ? '' : ' dt-muted'}`}>{hq ?? 'Not recorded'}</div>
                    <div role="cell" className={`dt-col-sites${sites ? '' : ' dt-muted'}`}>{sites}<small> sites</small></div>
                    <div role="cell" className="dt-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="dt-meta">{companyTypeLabel(c.companyType)} · {hq ?? 'Not recorded'}</div>
                  </Link>
                );
              })}
            </div>
            {companiesRes.data.length === 0 && (
              <EmptyState title="No companies match these filters" action={<Link className="button" href={clearHref}>Clear filters</Link>} />
            )}
            <ListPagination
              pathname="/industrial-sites"
              page={page}
              pageSize={PAGE_SIZE}
              total={companiesRes.total}
              query={{ tab: 'companies', companyType, districtId }}
              summary
            />
          </>
        )}

        <p className="dt-foot">{FOOTNOTE[tab]}</p>
      </section>
      <p className="dt-foot-mobile">{FOOTNOTE[tab]}</p>
    </>
  );
}

function Chips({ chips, clearHref }: { chips: { key: string; label: string; remove: string }[]; clearHref: string }) {
  return (
    <div className="dt-chips">
      <span>Filtered by</span>
      {chips.map((c) => (
        <Link key={c.key} className="dt-chip" href={c.remove} aria-label={`Remove filter ${c.label}`}>
          {c.label}
          <NavIcon name="close" />
        </Link>
      ))}
      <Link className="dt-clear" href={clearHref}>Clear all</Link>
    </div>
  );
}
