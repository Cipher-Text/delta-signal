/**
 * Static seed data for the public board.
 * Structured so each section maps cleanly to an API shape later.
 * Replace the arrays with fetch() calls when the backend is ready.
 *
 * Migration guide (once the API is live):
 *   Metric           → PlatformMetrics  from @delta-signal/shared
 *   DatasetRow        → DatasetSummary   from @delta-signal/shared
 *   ReportPreview     → CitizenReport    from @delta-signal/shared
 *   AlertPreview      → EnvironmentalAlert from @delta-signal/shared
 *   Fetch via routes  from @delta-signal/contracts
 *
 * COMMUNITY_FEED/CommunityItem removed — Community has no planned API module
 * (see docs/architecture/feature-map.md), so community-section.tsx and the
 * /community page both show an honest empty state instead of fabricated feed data.
 */

import type { AlertSeverity } from '@delta-signal/shared';

export interface Metric {
  label: string;
  value: string;
  note: string;
  noteVariant?: 'warning' | 'danger' | 'success';
  highlight?: boolean;
}

export interface Condition {
  label: string;
  value: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
}

export interface DatasetRow {
  name: string;
  category: string;
  publicAccess: 'open' | 'preview';
  advancedAccess: 'sign-in' | 'request' | 'restricted';
}

export interface ReportPreview {
  title: string;
  meta: string;
}

export interface AlertPreview {
  title: string;
  meta: string;
  severity: AlertSeverity;
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export const METRICS: Metric[] = [
  {
    label: 'Active alerts',
    value: '18',
    note: '4 emergency severity',
    noteVariant: 'warning',
    highlight: true,
  },
  {
    label: 'Verified reports',
    value: '2,418',
    note: 'Reviewed records only',
  },
  {
    label: 'Public datasets',
    value: '42',
    note: 'Downloads require sign in',
  },
  {
    label: 'Research-grade observations',
    value: '7.4k',
    note: 'Across 38 districts',
  },
];

// ── Current conditions ────────────────────────────────────────────────────────

export const CONDITIONS: Condition[] = [
  { label: 'Dhaka AQI', value: '168 — Unhealthy', variant: 'danger' },
  { label: 'Sylhet rainfall (24h)', value: '42 mm', variant: 'info' },
  { label: 'Khulna humidity', value: '77%' },
  { label: "Cox's Bazar wind", value: '22 km/h' },
  { label: 'OpenMeteo sync', value: 'Healthy', variant: 'success' },
];

// ── Dataset catalog preview ───────────────────────────────────────────────────

export const DATASETS: DatasetRow[] = [
  {
    name: 'OpenMeteo weather',
    category: 'Climate',
    publicAccess: 'preview',
    advancedAccess: 'sign-in',
  },
  {
    name: 'District air quality',
    category: 'Air',
    publicAccess: 'preview',
    advancedAccess: 'request',
  },
  {
    name: 'Water body registry',
    category: 'Water',
    publicAccess: 'preview',
    advancedAccess: 'restricted',
  },
  {
    name: 'Biodiversity occurrences',
    category: 'Biodiversity',
    publicAccess: 'preview',
    advancedAccess: 'sign-in',
  },
];

// ── Verified reports preview ──────────────────────────────────────────────────

export const REPORTS: ReportPreview[] = [
  {
    title: 'Water pollution — Buriganga, Dhaka',
    meta: 'Evidence reviewed by moderator · verified 2h ago',
  },
  {
    title: 'Illegal dumping resolved — Chattogram',
    meta: 'Municipal action completed · resolved 1d ago',
  },
  {
    title: 'Deforestation incident — Sylhet hillside',
    meta: 'Under review · submitted 4h ago',
  },
];

// ── Active alerts preview ─────────────────────────────────────────────────────

export const ALERTS: AlertPreview[] = [
  {
    title: 'Flood warning — Sylhet low-lying zones',
    meta: 'Emergency severity · active since 06:00',
    severity: 'EMERGENCY',
  },
  {
    title: 'Heat stress watch — Dhaka division',
    meta: 'Watch severity · next 48 hours',
    severity: 'WARNING',
  },
  {
    title: 'Air quality advisory — Narayanganj',
    meta: 'PM2.5 elevated near industrial zone',
    severity: 'INFO',
  },
];

// ── Restoration projects preview ──────────────────────────────────────────────

export const RESTORATION_PROJECTS: ReportPreview[] = [
  {
    title: 'Mangrove restoration — Sundarbans buffer',
    meta: '640 ha tracked by verified organizations',
  },
  {
    title: 'Riverbank tree planting — Buriganga',
    meta: '16k trees planted · Green Delta Collective',
  },
  {
    title: 'Plastic-free river campaign',
    meta: 'Open for public participation',
  },
];

