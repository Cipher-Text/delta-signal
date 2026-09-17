import Link from 'next/link';
import type { ModeratorDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import { DashboardHeader, StatCard, BarChart, TrendChart, SectionHeader } from '../components/DashboardPrimitives';

const STATUS_VARIANT: Record<string, string> = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'info',
  VERIFIED: 'success',
  REJECTED: 'danger',
  RESOLVED: 'muted',
};

export default function ModeratorDashboardView({
  data,
  user,
}: {
  data: ModeratorDashboard;
  user: CurrentUser;
}) {
  const totalReports = data.byStatus.reduce((s, r) => s + r.count, 0);
  const trendPeak = Math.max(...data.submissionTrend.map((d) => d.count), 1);

  return (
    <>
      <DashboardHeader title="Moderation Queue" subtitle="Report review status and submission trends" eyebrow="Operations" meta={data.meta} />

      {/* Queue KPIs */}
      <div className="stat-grid">
        <StatCard
          label="Awaiting review"
          value={data.queue.pending.toLocaleString()}
          variant={data.queue.pending > 20 ? 'danger' : data.queue.pending > 5 ? 'warning' : 'default'}
          href="/reports?status=SUBMITTED"
        />
        <StatCard
          label="Under review"
          value={data.queue.underReview.toLocaleString()}
          variant="info"
          href="/reports?status=UNDER_REVIEW"
        />
        <StatCard
          label="Total pending"
          value={data.queue.totalPending.toLocaleString()}
          variant={data.queue.totalPending > 30 ? 'warning' : 'default'}
        />
        <StatCard
          label="Reviewed today"
          value={data.queue.reviewedToday.toLocaleString()}
          variant="success"
        />
      </div>

      <div className="dashboard-two-col">
        {/* Submissions trend — last 7 days */}
        <article className="panel">
          <SectionHeader title="Submissions — last 7 days" />
          {data.submissionTrend.length > 0 ? (
            <TrendChart items={data.submissionTrend} peak={trendPeak} />
          ) : (
            <p className="empty-state" style={{ padding: '20px 0' }}>
              No submissions in the last 7 days.
            </p>
          )}
        </article>

        {/* Reports by category */}
        <article className="panel">
          <SectionHeader
            title="Reports by category"
            subtitle={`${totalReports.toLocaleString()} total`}
          />
          <BarChart
            items={data.byCategory}
            labelKey="category"
            valueKey="count"
            total={totalReports}
          />
        </article>
      </div>

      {/* Full status breakdown */}
      <article className="panel">
        <SectionHeader title="All reports by status" />
        <BarChart
          items={data.byStatus}
          labelKey="status"
          valueKey="count"
          total={totalReports}
          variantMap={STATUS_VARIANT}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Link className="button" href="/reports?status=SUBMITTED">
            Review queue
          </Link>
          <Link className="button ghost" href="/reports">
            All reports
          </Link>
        </div>
      </article>
    </>
  );
}
