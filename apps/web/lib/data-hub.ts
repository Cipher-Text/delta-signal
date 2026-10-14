import type { DatasetAccessPolicy, DatasetCategory } from '@delta-signal/contracts';
import { titleCase } from './format';

/** Category pills use the domain tints (§8.1). */
export const CATEGORY_META: Record<string, { label: string; tint: 'weather' | 'neutral' | 'water' | 'biodiversity' | 'earth' }> = {
  WEATHER: { label: 'Weather', tint: 'weather' },
  AIR_QUALITY: { label: 'Air quality', tint: 'neutral' },
  WATER: { label: 'Water', tint: 'water' },
  BIODIVERSITY: { label: 'Biodiversity', tint: 'biodiversity' },
  MONITORING: { label: 'Monitoring', tint: 'earth' },
  REPORTS: { label: 'Reports', tint: 'neutral' },
  GEOSPATIAL: { label: 'Geospatial', tint: 'earth' },
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as DatasetCategory[];
export const categoryLabel = (c: string) => CATEGORY_META[c]?.label ?? titleCase(c);

export const ACCESS_LABEL: Record<DatasetAccessPolicy, string> = {
  PUBLIC: 'Public',
  LOGIN_REQUIRED: 'Sign-in required',
  RESEARCHER: 'Researchers',
  APPROVED: 'Approved users',
  GOVERNMENT: 'Government',
};
export const ACCESS_ORDER = Object.keys(ACCESS_LABEL) as DatasetAccessPolicy[];

export const ROLE_LABEL: Record<string, string> = {
  CITIZEN: 'Citizen',
  RESEARCHER: 'Researcher',
  ORGANIZATION_ADMIN: 'Organization admin',
  GOVERNMENT: 'Government',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

/** Mirrors DatasetsService.download(): who may open a dataset. `APPROVED` also needs a granted access request. */
export function canOpen(policy: DatasetAccessPolicy, role: string): 'yes' | 'no' | 'request' {
  switch (policy) {
    case 'PUBLIC':
    case 'LOGIN_REQUIRED':
      return 'yes';
    case 'RESEARCHER':
      return ['RESEARCHER', 'ADMIN'].includes(role) ? 'yes' : 'no';
    case 'GOVERNMENT':
      return ['GOVERNMENT', 'ADMIN'].includes(role) ? 'yes' : 'no';
    case 'APPROVED':
      return 'request';
  }
}

/** Canonical display names for dataset sources (DESIGN.md §28.1). */
export function sourceName(source: string): string {
  const s = source.toLowerCase();
  if (s === 'openmeteo-flood') return 'GloFAS · Copernicus';
  if (s.startsWith('openmeteo')) return 'Open-Meteo';
  // The air-quality pipeline reads Open-Meteo; the catalog record still carries the older "bmd" code.
  if (s === 'bmd') return 'Open-Meteo';
  if (s === 'gbif') return 'GBIF';
  if (s === 'world-bank' || s === 'worldbank') return 'World Bank';
  if (s === 'platform') return 'Delta Signal';
  if (s === 'bwdb') return 'BWDB';
  return titleCase(s.replace(/-/g, '_'));
}

export const PROVIDER_TYPE_LABEL: Record<string, string> = {
  GOVERNMENT_AGENCY: 'Government agency',
  RESEARCH_INSTITUTION: 'Research institution',
  NGO: 'NGO',
  INTERNATIONAL_ORG: 'International org',
  CITIZEN_SCIENCE: 'Citizen science',
  SATELLITE: 'Satellite',
  IOT_SENSOR: 'IoT sensor',
};
