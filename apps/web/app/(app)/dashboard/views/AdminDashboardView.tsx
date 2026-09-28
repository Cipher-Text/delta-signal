import type { AdminDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
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

export default function AdminDashboardView({
  data,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const totalReports = data.reports.byStatus.reduce((s, r) => s + r.count, 0);
  const totalActiveAlerts = data.alerts.activeBySeverity.reduce((s, a) => s + a.count, 0);

  return (
    <>
      <DashboardHeader title="Platform Overview" subtitle="Real-time snapshot of the Delta Signal platform" meta={data.meta} />

      {/* KPI strip — capped at 5 primary cards per DESIGN.md; the rest are secondary */}
      <div className="stat-grid">
        <StatCard
          label="Pending review"
          value={data.reports.pendingReview.toLocaleString()}
          variant={data.reports.pendingReview > 50 ? 'danger' : 'default'}
          href="/reports"
        />
        <StatCard
          label="Active alerts"
          value={totalActiveAlerts.toLocaleString()}
          variant={totalActiveAlerts > 0 ? 'warning' : 'default'}
          href="/alerts"
        />
        <StatCard
          label="Total users"
          value={data.users.total.toLocaleString()}
        />
        <StatCard
          label="Observations this month"
          value={data.platform.observationsThisMonth.toLocaleString()}
          href="/observations"
        />
        <StatCard
          label="Datasets published"
          value={data.platform.publishedDatasets.toLocaleString()}
          href="/data"
        />
      </div>

      <SecondaryStats
        items={[
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
            subtitle={`${totalReports.toLocaleString()} total reports`}
          />
          <BarChart
            items={data.reports.byStatus}
            labelKey="status"
            valueKey="count"
            total={totalReports}
            variantMap={STATUS_VARIANT}
            href="/reports"
          />
        </article>

        {/* Alerts by severity */}
        <article className="panel">
          <SectionHeader
            title="Active alerts by severity"
            subtitle={totalActiveAlerts > 0 ? `${totalActiveAlerts} active` : 'No active alerts'}
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
            <p className="empty-state" style={{ padding: '20px 0' }}>
              No active alerts.
            </p>
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
