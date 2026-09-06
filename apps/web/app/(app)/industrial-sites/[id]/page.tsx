import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { apiGet } from '../../../../lib/api';
import {
  routes,
  type FacilityDetail,
  type ComplianceStatus,
} from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../../lib/format';

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="obs-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default async function IndustrialSiteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const facility = await apiGet<FacilityDetail>(
    routes.industrialSites.detail(params.id),
    300,
  ).catch(() => null);

  if (!facility) notFound();

  return (
    <>
      <Link className="back-link" href="/industrial-sites">
        ← All industrial sites
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className={`tag ${COMPLIANCE_TAG[facility.complianceStatus]}`}>
            {COMPLIANCE_LABEL[facility.complianceStatus]}
          </span>
          <span className="tag muted">{titleCase(facility.facilityType)}</span>
          {!facility.isActive && <span className="tag muted">Inactive</span>}
        </div>

        <h1>{facility.name}</h1>
        {facility.bnName && (
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {facility.bnName}
          </p>
        )}

        <div className="report-detail-meta">
          {facility.company && (
            <Link href={`/industrial-sites/companies/${facility.company.id}`} className="table-title-link">
              {facility.company.name}
            </Link>
          )}
          <span>{facility.district.name}</span>
          {facility.upazila && <span>{facility.upazila.name} Upazila</span>}
        </div>
      </div>

      {/* Description */}
      {facility.description && (
        <article className="panel">
          <h2>About</h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            {facility.description}
          </p>
        </article>
      )}

      {/* Details */}
      <article className="panel">
        <h2>Details</h2>
        <div className="obs-detail-grid">
          <DetailRow label="Facility type" value={titleCase(facility.facilityType)} />
          <DetailRow label="Company" value={facility.company?.name ?? null} />
          <DetailRow label="Compliance status" value={COMPLIANCE_LABEL[facility.complianceStatus]} />
          <DetailRow label="Established" value={facility.establishedYear?.toString() ?? null} />
          <DetailRow label="Production capacity" value={facility.productionCapacity} />
          {facility.landArea !== null && facility.landArea !== undefined && (
            <DetailRow label="Land area" value={`${facility.landArea} ha`} />
          )}
          <DetailRow label="ETP installed" value={facility.etpInstalled ? 'Yes' : 'No'} />
          <DetailRow label="Status" value={facility.isActive ? 'Active' : 'Inactive'} />
          <DetailRow label="District" value={facility.district.name} />
          {facility.upazila && (
            <DetailRow label="Upazila" value={facility.upazila.name} />
          )}
          {facility.union && (
            <DetailRow label="Union" value={facility.union.name} />
          )}
          {facility.lat !== null && facility.lng !== null && (
            <DetailRow
              label="Coordinates"
              value={`${facility.lat.toFixed(5)}°N, ${facility.lng.toFixed(5)}°E`}
            />
          )}
        </div>
      </article>

      {/* Recent reports linked to this facility */}
      {facility.reports.length > 0 && (
        <article className="panel">
          <h2>Recent Citizen Reports</h2>
          <div className="table" role="table" aria-label="Linked citizen reports">
            <div className="table-row table-head" role="row">
              <span>Report</span>
              <span>Category</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>
            {facility.reports.map((report) => (
              <div className="table-row" role="row" key={report.id}>
                <div>
                  <Link href={`/reports/${report.id}`} className="table-title-link">
                    {report.title}
                  </Link>
                </div>
                <span className="tag muted">{titleCase(report.category)}</span>
                <span className="tag muted">{titleCase(report.status)}</span>
                <span className="text-muted">{relativeTime(report.createdAt)}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Map placeholder when coordinates available */}
      {facility.lat !== null && facility.lng !== null && (
        <article className="panel">
          <h2>Location</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {facility.lat.toFixed(5)}°N, {facility.lng.toFixed(5)}°E
            {' · '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${facility.lat}&mlon=${facility.lng}&zoom=14`}
              target="_blank"
              rel="noopener noreferrer"
              className="table-title-link"
            >
              Open in OpenStreetMap ↗
            </a>
          </p>
        </article>
      )}
    </>
  );
}
