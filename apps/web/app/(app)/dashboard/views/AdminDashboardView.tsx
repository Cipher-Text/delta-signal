import type { AdminDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import EmptyState from '../../../../components/empty-state';
import { dhakaTime, pluralize } from '../../../../lib/format';
import { DashboardHeader, StatCard, SecondaryStats, BarChart, SectionHeader } from '../components/DashboardPrimitives';

const SEVERITY_VARIANT: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'info',
  INFO: 'muted',
};

const STATUS_VARIANT: Record<string, string> = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'info',
  VERIFIED: 'success',
  REJECTED: 'danger',
  RESOLVED: 'muted',
};

const REPORT_STATUS_ORDER = ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED', 'REJECTED'];

// Backlog size at which the pending-review card turns red.
const PENDING_REVIEW_DANGER = 50;

export default function AdminDashboardView({
  data,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const totalReports = data.reports.byStatus.reduce((s, r) => s + r.count, 0);
  const totalActiveAlerts = data.alerts.activeBySeverity.reduce((s, a) => s + a.count, 0);
  const emergencyAlerts = data.alerts.activeBySeverity.find((a) => a.severity === 'EMERGENCY')?.count ?? 0;
  // List every status so the pipeline keeps its shape once there is data; with no
  // reports at all the panel collapses to a compact empty state (§38).
  const reportsByStatus = REPORT_STATUS_ORDER.map((status) => ({
    status,
    count: data.reports.byStatus.find((r) => r.status === status)?.count ?? 0,
  }));
  const checkedAt = dhakaTime(data.meta.generatedAt);
  const staleSources = data.meta.sources.filter((source) => source.status === 'STALE');
  const unknownSources = data.meta.sources.filter((source) => source.status === 'UNKNOWN');
  const healthySources = data.meta.sources.filter((source) => source.status === 'FRESH').length;

  return (
    <>
      <DashboardHeader title="Platform Overview" subtitle="Real-time snapshot of the Delta Signal platform" meta={data.meta} />

      {/* KPI strip — capped at 5 primary cards per DESIGN.md; the rest are secondary */}
      <div className="stat-grid">
        <StatCard
          label="Pending review"
          value={data.reports.pendingReview.toLocaleString()}
          variant={data.reports.pendingReview > PENDING_REVIEW_DANGER ? 'danger' : 'default'}
          note={`of ${pluralize(totalReports, 'total report')}`}
          href="/reports"
        />
        <StatCard
          label="Active alerts"
          value={totalActiveAlerts.toLocaleString()}
          variant={totalActiveAlerts > 0 ? 'warning' : 'default'}
          note={emergencyAlerts > 0 ? `${emergencyAlerts} emergency` : totalActiveAlerts > 0 ? 'none at emergency level' : 'none active'}
          href="/alerts"
        />
        <StatCard
          label="Data sources healthy"
          value={`${healthySources} / ${data.meta.sources.length}`}
          variant={staleSources.length > 0 ? 'warning' : 'default'}
          note={
            staleSources.length > 0
              ? `${staleSources.map((source) => source.name).join(', ')} stale`
              : unknownSources.length > 0
                ? `${unknownSources.length} not yet reporting`
                : 'all up to date'
          }
        />
        <StatCard
          label="Observations this month"
          value={data.platform.observationsThisMonth.toLocaleString()}
          muted={data.platform.observationsThisMonth === 0}
          href="/observations"
        />
      </div>

      <SecondaryStats
        items={[
          { label: 'users', value: data.users.total.toLocaleString() },
          { label: 'datasets published', value: data.platform.publishedDatasets.toLocaleString(), href: '/data' },
          { label: 'organizations', value: data.platform.organizations.toLocaleString(), href: '/organizations' },
          { label: 'species recorded', value: data.platform.speciesRecorded.toLocaleString(), href: '/biodiversity' },
          { label: 'audit events today', value: data.platform.auditEventsToday.toLocaleString() },
        ]}
      />

      <div className="dashboard-two-col">
        {/* Reports funnel */}
        <article className="panel">
          <SectionHeader
            title="Report pipeline"
            subtitle={pluralize(totalReports, 'total report')}
          />
          {totalReports > 0 ? (
            <BarChart
              items={reportsByStatus}
              labelKey="status"
              valueKey="count"
              total={totalReports}
              variantMap={STATUS_VARIANT}
              href="/reports"
            />
          ) : (
            <EmptyState
              title="No reports submitted yet"
              description="Citizen reports will appear here as they are submitted."
              lastChecked={checkedAt}
            />
          )}
        </article>

        {/* Alerts by severity */}
        <article className="panel">
          <SectionHeader
            title="Active alerts by severity"
            subtitle={totalActiveAlerts > 0 ? `${totalActiveAlerts.toLocaleString()} active` : 'None active'}
          />
          {totalActiveAlerts > 0 ? (
            <BarChart
              items={data.alerts.activeBySeverity}
              labelKey="severity"
              valueKey="count"
              total={totalActiveAlerts}
              variantMap={SEVERITY_VARIANT}
              href="/alerts"
            />
          ) : (
            <EmptyState
              variant="healthy"
              title="No active alerts"
              description="Bangladesh environmental feeds currently show no active platform alerts."
              lastChecked={checkedAt}
            />
          )}
        </article>
      </div>

      {/* Users by role */}
      <article className="panel">
        <SectionHeader title="User distribution" subtitle="Breakdown by role" />
        <BarChart
          items={data.users.byRole}
          labelKey="role"
          valueKey="count"
          total={data.users.total}
        />
      </article>
    </>
  );
}
