import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import {
  routes,
  type FacilityPagedResponse,
  type CompanyPagedResponse,
  type FacilityType,
  type ComplianceStatus,
  type CompanyType,
  type DistrictSummary,
} from '@delta-signal/contracts';
import { titleCase } from '../../../lib/format';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

// ─── Label maps ──────────────────────────────────────────────────────────────

const FACILITY_TYPES: FacilityType[] = [
  'GARMENT', 'TANNERY', 'BRICK_FIELD', 'POWER_PLANT', 'SHIPBREAKING',
  'TEXTILE', 'CEMENT', 'STEEL', 'CHEMICAL', 'PHARMACEUTICAL',
  'FERTILIZER', 'PAPER_MILL', 'FOOD_PROCESSING', 'OIL_REFINERY', 'OTHER',
];

const COMPANY_TYPES: CompanyType[] = [
  'PRIVATE', 'STATE_OWNED', 'JOINT_VENTURE', 'MULTINATIONAL', 'CONGLOMERATE', 'CLUSTER',
];

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'UNKNOWN',
];

const COMPLIANCE_TAG: Record<ComplianceStatus, string> = {
  COMPLIANT: 'success',
  NON_COMPLIANT: 'error',
  UNDER_REVIEW: 'warning',
  UNKNOWN: 'muted',
};

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-compliant',
  UNDER_REVIEW: 'Under review',
  UNKNOWN: 'Unknown',
};

const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
  PRIVATE: 'Private',
  STATE_OWNED: 'State-owned',
  JOINT_VENTURE: 'Joint Venture',
  MULTINATIONAL: 'Multinational',
  CONGLOMERATE: 'Conglomerate',
  CLUSTER: 'Cluster',
};

const COMPANY_TYPE_TAG: Record<CompanyType, string> = {
  PRIVATE: 'muted',
  STATE_OWNED: 'info',
  JOINT_VENTURE: 'warning',
  MULTINATIONAL: 'success',
  CONGLOMERATE: 'muted',
  CLUSTER: 'muted',
};

function facilityTypeLabel(type: FacilityType): string {
  const labels: Record<FacilityType, string> = {
    GARMENT: 'Garment', TANNERY: 'Tannery', BRICK_FIELD: 'Brick Field',
    POWER_PLANT: 'Power Plant', SHIPBREAKING: 'Shipbreaking', TEXTILE: 'Textile',
    CEMENT: 'Cement', STEEL: 'Steel', CHEMICAL: 'Chemical',
    PHARMACEUTICAL: 'Pharmaceutical', FERTILIZER: 'Fertilizer', PAPER_MILL: 'Paper Mill',
    FOOD_PROCESSING: 'Food Processing', OIL_REFINERY: 'Oil Refinery', OTHER: 'Other',
  };
  return labels[type] ?? titleCase(type);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SearchParams = {
  tab?: string;
  // sites filters
  facilityType?: string;
  complianceStatus?: string;
  // companies filters
  companyType?: string;
  // shared
  districtId?: string;
  page?: string;
};

export default async function IndustryPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === 'companies' ? 'companies' : 'sites';
  const currentPage = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  // ── always needed ──────────────────────────────────────────────────────────
  const districts = await apiGet<DistrictSummary[]>(routes.locations.districts, 3600);

  // ── tab-specific fetches ───────────────────────────────────────────────────
  let sitesRes: FacilityPagedResponse | null = null;
  let companiesRes: CompanyPagedResponse | null = null;

  if (tab === 'sites') {
    const { facilityType, complianceStatus, districtId } = searchParams;
    const params = new URLSearchParams({ limit: '25', page: String(currentPage) });
    if (facilityType) params.set('facilityType', facilityType);
    if (complianceStatus) params.set('complianceStatus', complianceStatus);
    if (districtId) params.set('districtId', districtId);
    sitesRes = await apiGet<FacilityPagedResponse>(`${routes.industrialSites.list}?${params}`, 300);
  } else {
    const { companyType, districtId } = searchParams;
    const params = new URLSearchParams({ limit: '25', page: String(currentPage) });
    if (companyType) params.set('companyType', companyType);
    if (districtId) params.set('districtId', districtId);
    companiesRes = await apiGet<CompanyPagedResponse>(`${routes.companies.list}?${params}`, 300);
  }

  // ── pagination helpers ─────────────────────────────────────────────────────
  const total = tab === 'sites' ? (sitesRes?.total ?? 0) : (companiesRes?.total ?? 0);
  const pageSize = tab === 'sites' ? (sitesRes?.pageSize ?? 25) : (companiesRes?.pageSize ?? 25);

  return (
    <>
      <PageHeader
        title="Industry"
        description="Companies and industrial sites with environmental impact across Bangladesh."
      />

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <nav className="tab-nav" aria-label="Industry sections">
        <Link
          href="/industrial-sites"
          className={tab === 'sites' ? 'active' : ''}
          aria-current={tab === 'sites' ? 'page' : undefined}
        >
          Industrial Sites
        </Link>
        <Link
          href="/industrial-sites?tab=companies"
          className={tab === 'companies' ? 'active' : ''}
          aria-current={tab === 'companies' ? 'page' : undefined}
        >
          Companies
        </Link>
      </nav>

      <ListResultToolbar total={total} label={tab === 'sites' ? 'sites' : 'companies'} />

      {/* ══════════════════════════════════════════════════════════════════════
          INDUSTRIAL SITES TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'sites' && sitesRes && (() => {
        const { facilityType, complianceStatus, districtId } = searchParams;
        const hasFilter = !!(facilityType || complianceStatus || districtId);

        function filterHref(overrides: {
          facilityType?: string;
          complianceStatus?: string;
          districtId?: string;
        }) {
          const q = new URLSearchParams();
          const type = overrides.facilityType ?? facilityType ?? '';
          const status = overrides.complianceStatus ?? complianceStatus ?? '';
          const district = overrides.districtId ?? districtId ?? '';
          if (type) q.set('facilityType', type);
          if (status) q.set('complianceStatus', status);
          if (district) q.set('districtId', district);
          const qs = q.toString();
          return `/industrial-sites${qs ? `?${qs}` : ''}`;
        }

        return (
          <>
            <form className="toolbar" method="get" aria-label="Site filters">
              <input type="hidden" name="tab" value="sites" />

              <label htmlFor="facilityType">Type</label>
              <select id="facilityType" name="facilityType" className="select-field" defaultValue={facilityType ?? ''}>
                <option value="">All types</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{facilityTypeLabel(t)}</option>
                ))}
              </select>

              <label htmlFor="complianceStatus">Compliance</label>
              <select id="complianceStatus" name="complianceStatus" className="select-field" defaultValue={complianceStatus ?? ''}>
                <option value="">All statuses</option>
                {COMPLIANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{COMPLIANCE_LABEL[s]}</option>
                ))}
              </select>

              <label htmlFor="districtId">District</label>
              <select id="districtId" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <button type="submit" className="button">Apply</button>
              {hasFilter && (
                <Link className="button ghost" href={filterHref({ facilityType: '', complianceStatus: '', districtId: '' })}>
                  Reset
                </Link>
              )}
            </form>

            <div className="table" role="table" aria-label="Industrial facilities">
              <div className="table-row table-head" role="row">
                <span>Name</span>
                <span>Type</span>
                <span>Compliance</span>
                <span>District</span>
                <span>Company</span>
              </div>
              {sitesRes.data.map((facility) => (
                <div className="table-row" role="row" key={facility.id}>
                  <div>
                    <Link href={`/industrial-sites/${facility.id}`} className="table-title-link">
                      {facility.name}
                    </Link>
                    {facility.bnName && (
                      <span className="text-muted" style={{ marginLeft: '0.4rem', fontSize: '0.85em' }}>
                        {facility.bnName}
                      </span>
                    )}
                    {!facility.isActive && (
                      <span className="tag muted" style={{ marginLeft: '0.4rem' }}>Inactive</span>
                    )}
                  </div>
                  <span className="tag muted">{facilityTypeLabel(facility.facilityType)}</span>
                  <span className={`tag ${COMPLIANCE_TAG[facility.complianceStatus]}`}>
                    {COMPLIANCE_LABEL[facility.complianceStatus]}
                  </span>
                  <span>{facility.district.name}</span>
                  <span>
                    {facility.company ? (
                      <Link href={`/industrial-sites?tab=companies`} className="table-title-link">
                        {facility.company.name}
                      </Link>
                    ) : '—'}
                  </span>
                </div>
              ))}
              {sitesRes.data.length === 0 && (
                <div className="empty-state">No facilities found for this filter.</div>
              )}
            </div>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          COMPANIES TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'companies' && companiesRes && (() => {
        const { companyType, districtId } = searchParams;
        const hasFilter = !!(companyType || districtId);

        function filterHref(overrides: { companyType?: string; districtId?: string }) {
          const q = new URLSearchParams({ tab: 'companies' });
          const type = overrides.companyType ?? companyType ?? '';
          const district = overrides.districtId ?? districtId ?? '';
          if (type) q.set('companyType', type);
          if (district) q.set('districtId', district);
          return `/industrial-sites?${q}`;
        }

        return (
          <>
            <form className="toolbar" method="get" aria-label="Company filters">
              <input type="hidden" name="tab" value="companies" />

              <label htmlFor="companyType">Type</label>
              <select id="companyType" name="companyType" className="select-field" defaultValue={companyType ?? ''}>
                <option value="">All types</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>{COMPANY_TYPE_LABEL[t]}</option>
                ))}
              </select>

              <label htmlFor="districtId">HQ District</label>
              <select id="districtId" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <button type="submit" className="button">Apply</button>
              {hasFilter && (
                <Link className="button ghost" href={filterHref({ companyType: '', districtId: '' })}>
                  Reset
                </Link>
              )}
            </form>

            <div className="table" role="table" aria-label="Companies">
              <div className="table-row table-head" role="row">
                <span>Company</span>
                <span>Type</span>
                <span>HQ District</span>
                <span>Sites</span>
                <span>Parent</span>
              </div>
              {companiesRes.data.map((company) => (
                <div className="table-row" role="row" key={company.id}>
                  <div>
                    <Link href={`/industrial-sites/companies/${company.id}`} className="table-title-link">
                      {company.name}
                    </Link>
                    {company.bnName && (
                      <span className="text-muted" style={{ marginLeft: '0.4rem', fontSize: '0.85em' }}>
                        {company.bnName}
                      </span>
                    )}
                    {!company.isActive && (
                      <span className="tag muted" style={{ marginLeft: '0.4rem' }}>Inactive</span>
                    )}
                  </div>
                  <span className={`tag ${COMPANY_TYPE_TAG[company.companyType]}`}>
                    {COMPANY_TYPE_LABEL[company.companyType]}
                  </span>
                  <span>{company.headquarterDistrict?.name ?? '—'}</span>
                  <span>{company._count.facilities}</span>
                  <span>{company.parentCompany?.name ?? '—'}</span>
                </div>
              ))}
              {companiesRes.data.length === 0 && (
                <div className="empty-state">No companies found for this filter.</div>
              )}
            </div>
          </>
        );
      })()}

      <ListPagination
        pathname="/industrial-sites"
        page={currentPage}
        pageSize={pageSize}
        total={total}
        query={
          tab === 'sites'
            ? { tab, facilityType: searchParams.facilityType, complianceStatus: searchParams.complianceStatus, districtId: searchParams.districtId }
            : { tab, companyType: searchParams.companyType, districtId: searchParams.districtId }
        }
      />
    </>
  );
}
