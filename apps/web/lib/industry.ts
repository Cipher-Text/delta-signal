import type { ComplianceStatus, CompanyType, FacilityType } from '@delta-signal/contracts';
import { titleCase } from './format';

export const FACILITY_TYPES: readonly FacilityType[] = [
  'GARMENT', 'TANNERY', 'BRICK_FIELD', 'POWER_PLANT', 'SHIPBREAKING',
  'TEXTILE', 'CEMENT', 'STEEL', 'CHEMICAL', 'PHARMACEUTICAL',
  'FERTILIZER', 'PAPER_MILL', 'FOOD_PROCESSING', 'OIL_REFINERY', 'OTHER',
];

export const COMPANY_TYPES: readonly CompanyType[] = [
  'PRIVATE', 'STATE_OWNED', 'JOINT_VENTURE', 'MULTINATIONAL', 'CONGLOMERATE', 'CLUSTER',
];

export const COMPLIANCE_STATUSES: readonly ComplianceStatus[] = ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'UNKNOWN'];

export const facilityTypeLabel = (t: FacilityType) => (t === 'OTHER' ? 'Other' : titleCase(t));

const COMPANY_LABEL: Record<CompanyType, string> = {
  PRIVATE: 'Private',
  STATE_OWNED: 'State-owned',
  JOINT_VENTURE: 'Joint venture',
  MULTINATIONAL: 'Multinational',
  CONGLOMERATE: 'Conglomerate',
  CLUSTER: 'Cluster',
};
export const companyTypeLabel = (t: CompanyType) => COMPANY_LABEL[t] ?? titleCase(t);

/** Compliance pills pair colour with a shape cue: dot = good/neutral, square = non-compliant, dotted border = unknown (§9.1). */
export const COMPLIANCE: Record<ComplianceStatus, { label: string; tone: 'ok' | 'bad' | 'review' | 'unknown' }> = {
  COMPLIANT: { label: 'Compliant', tone: 'ok' },
  NON_COMPLIANT: { label: 'Non-compliant', tone: 'bad' },
  UNDER_REVIEW: { label: 'Under review', tone: 'review' },
  UNKNOWN: { label: 'Unknown', tone: 'unknown' },
};

/** Sites are named "<Company> <Unit>"; the table shows the unit with the company beneath. */
export function siteShortName(name: string, company?: string | null): string {
  return company && name.startsWith(company) ? name.slice(company.length).trim() || name : name;
}
