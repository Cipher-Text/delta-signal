/**
 * CivicScienceSection — Server Component
 *
 * Aggregates all four civic/science data sources in parallel and passes
 * serialised results to the CivicScienceTabs client component. Keeping the
 * fetch here (rather than inside the client component) preserves the RSC
 * pattern: no data hits the browser bundle.
 */

import {
  routes,
  type CitizenReport,
  type Alert,
  type Species,
  type Occurrence,
  type RestorationProject,
  type PaginatedEnvelope,
  type PlatformMetrics,
} from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import { titleCase, relativeTime } from '../lib/format';
import CivicScienceTabs, {
  type ReportItem,
  type AlertItem,
  type BiodiversityStats,
  type TopSpecies,
  type ProjectItem,
  type CategoryCount,
  type RestorationImpact,
} from './civic-science-tabs';

const SEVERITY_CLASS: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING:   'warning',
  WATCH:     'warning',
  INFO:      'info',
};

async function loadReports(): Promise<{ items: ReportItem[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<CitizenReport>>(
      `${routes.reports.list}?status=VERIFIED&pageSize=4`,
    );
    return {
      isLive: true,
      items: res.data.map((r) => ({
        id: r.id,
        title: r.title,
        district: r.district?.name ?? 'Nationwide',
        category: titleCase(r.category),
        status: titleCase(r.status),
        updatedAt: relativeTime(r.updatedAt),
      })),
    };
  } catch {
    return {
      isLive: false,
      items: [],
    };
  }
}

async function loadAlerts(): Promise<{ items: AlertItem[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<Alert>>(
      `${routes.alerts.list}?status=ACTIVE&pageSize=4`,
    );
    return {
      isLive: true,
      items: res.data.map((a) => ({
        id: a.id,
        title: a.title,
        alertType: a.alertType ? titleCase(a.alertType) : null,
        severity: titleCase(a.severity),
        severityClass: SEVERITY_CLASS[a.severity] ?? '',
        district: a.district?.name ?? 'Nationwide',
        issuedAt: relativeTime(a.issuedAt),
      })),
    };
  } catch {
    return {
      isLive: false,
      items: [],
    };
  }
}

async function loadBiodiversity(): Promise<BiodiversityStats | null> {
  try {
    const [speciesPage, occurrencePage, topPage] = await Promise.all([
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=1`),
      apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?pageSize=1`),
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=5&sortBy=occurrences`),
    ]);
    const topSpecies: TopSpecies[] = topPage.data.map((s) => ({
      id: s.id,
      canonicalName: s.canonicalName,
      vernacularName: s.vernacularName,
      occurrenceCount: s._count.occurrences,
    }));
    return {
      speciesTotal: speciesPage.total,
      occurrenceTotal: occurrencePage.total,
      topSpecies,
    };
  } catch {
    return null;
  }
}

async function loadRestoration(): Promise<{ items: ProjectItem[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<RestorationProject>>(
      `${routes.restoration.projects}?pageSize=4`,
    );
    return {
      isLive: true,
      items: res.data.map((p) => ({
        id: p.id,
        title: p.title,
        org: p.organization?.name ?? 'Independent',
        district: p.district?.name ?? 'Nationwide',
        summary: p.impactSummary ?? null,
      })),
    };
  } catch {
    return {
      isLive: false,
      items: [],
    };
  }
}

async function loadMetricExtras(): Promise<{
  reportsByCategory: CategoryCount[];
  restorationImpact: RestorationImpact | null;
}> {
  try {
    const m = await apiGet<PlatformMetrics>(routes.metrics.platform);
    return {
      reportsByCategory: m.reportsByCategory.map((r) => ({
        label: titleCase(r.category),
        count: r.count,
      })),
      restorationImpact:
        m.restorationVolunteers > 0 || m.restorationAreaHa > 0
          ? {
              volunteers: m.restorationVolunteers,
              areaHa: Number(m.restorationAreaHa.toFixed(1)),
            }
          : null,
    };
  } catch {
    return { reportsByCategory: [], restorationImpact: null };
  }
}

export default async function CivicScienceSection() {
  const [reports, alerts, biodiversity, restoration, metricExtras] = await Promise.all([
    loadReports(),
    loadAlerts(),
    loadBiodiversity(),
    loadRestoration(),
    loadMetricExtras(),
  ]);

  return (
    <CivicScienceTabs
      reports={reports}
      alerts={alerts}
      biodiversity={biodiversity}
      restoration={restoration}
      reportsByCategory={metricExtras.reportsByCategory}
      restorationImpact={metricExtras.restorationImpact}
    />
  );
}
