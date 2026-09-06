import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { apiGet } from '../../../../../lib/api';
import {
  routes,
  type CompanyDetail,
  type CompanyType,
  type ComplianceStatus,
  type FacilityType,
} from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../../../lib/format';

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="obs-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const company = await apiGet<CompanyDetail>(
    routes.companies.detail(params.id),
    300,
  ).catch(() => null);

  if (!company) notFound();

  return (
    <>
      <Link className="back-link" href="/industrial-sites?tab=companies">
        ← All companies
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className={`tag ${COMPANY_TYPE_TAG[company.companyType]}`}>
            {COMPANY_TYPE_LABEL[company.companyType]}
          </span>
          {!company.isActive && <span className="tag muted">Inactive</span>}
        </div>

        <h1>{company.name}</h1>
        {company.bnName && (
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {company.bnName}
          </p>
        )}

        <div className="report-detail-meta">
          {company.headquarterDistrict && <span>{company.headquarterDistrict.name}</span>}
          {company.parentCompany && (
            <span>
              Part of{' '}
              <Link href={`/industrial-sites/companies/${company.parentCompany.id}`} className="table-title-link">
                {company.parentCompany.name}
              </Link>
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <article className="panel">
          <h2>About</h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            {company.description}
          </p>
        </article>
      )}

      {/* Details */}
      <article className="panel">
        <h2>Details</h2>
        <div className="obs-detail-grid">
          <DetailRow label="Type" value={COMPANY_TYPE_LABEL[company.companyType]} />
          {company.establishedYear && (
            <DetailRow label="Established" value={String(company.establishedYear)} />
          )}
          {company.employeeCount && (
            <DetailRow label="Employees" value={company.employeeCount.toLocaleString()} />
          )}
          <DetailRow label="Registration No." value={company.registrationNumber} />
          <DetailRow label="HQ District" value={company.headquarterDistrict?.name ?? null} />
          {company.website && (
            <DetailRow
              label="Website"
              value={
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="table-title-link">
                  {company.website}
                </a>
              }
            />
          )}
          <DetailRow label="Contact email" value={company.contactEmail} />
          <DetailRow label="Contact phone" value={company.contactPhone} />
          <DetailRow label="Total sites" value={String(company._count.facilities)} />
          {company._count.subsidiaries > 0 && (
            <DetailRow label="Subsidiaries" value={String(company._count.subsidiaries)} />
          )}
        </div>
      </article>

      {/* Subsidiaries */}
      {company.subsidiaries.length > 0 && (
        <article className="panel">
          <h2>Subsidiaries</h2>
          <div className="table" role="table" aria-label="Subsidiary companies">
            <div className="table-row table-head" role="row">
              <span>Company</span>
              <span>Type</span>
              <span>Status</span>
            </div>
            {company.subsidiaries.map((sub) => (
              <div className="table-row" role="row" key={sub.id}>
                <Link href={`/industrial-sites/companies/${sub.id}`} className="table-title-link">
                  {sub.name}
                </Link>
                <span className={`tag ${COMPANY_TYPE_TAG[sub.companyType]}`}>
                  {COMPANY_TYPE_LABEL[sub.companyType]}
                </span>
                <span className={`tag ${sub.isActive ? 'success' : 'muted'}`}>
                  {sub.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Industrial Sites */}
      {company.facilities.length > 0 && (
        <article className="panel">
          <h2>Industrial Sites ({company.facilities.length})</h2>
          <div className="table" role="table" aria-label="Company facilities">
            <div className="table-row table-head" role="row">
              <span>Site</span>
              <span>Type</span>
              <span>Compliance</span>
              <span>District</span>
            </div>
            {company.facilities.map((facility) => (
              <div className="table-row" role="row" key={facility.id}>
                <div>
                  <Link href={`/industrial-sites/${facility.id}`} className="table-title-link">
                    {facility.name}
                  </Link>
                  {!facility.isActive && (
                    <span className="tag muted" style={{ marginLeft: '0.4rem' }}>Inactive</span>
                  )}
                </div>
                <span className="tag muted">{facilityTypeLabel(facility.facilityType)}</span>
                <span className={`tag ${COMPLIANCE_TAG[facility.complianceStatus]}`}>
                  {COMPLIANCE_LABEL[facility.complianceStatus]}
                </span>
                <span>{facility.district.name}</span>
              </div>
            ))}
          </div>
        </article>
      )}
    </>
  );
}
