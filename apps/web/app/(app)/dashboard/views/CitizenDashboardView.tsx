import Link from 'next/link';
import type { CitizenDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import { DashboardHeader, StatCard, BarChart, SectionHeader } from '../components/DashboardPrimitives';

const STATUS_VARIANT: Record<string, string> = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'info',
  VERIFIED: 'success',
  REJECTED: 'danger',
  RESOLVED: 'muted',
};

export default function CitizenDashboardView({
  data,
  user,
}: {
  data: CitizenDashboard;
  user: CurrentUser;
}) {
  return (
    <>
      <DashboardHeader
        title={`${user.displayName}'s Activity`}
        subtitle="Your environmental contributions and community impact"
        eyebrow="Citizen workspace"
        meta={data.meta}
      />

      <div className="stat-grid">
        <StatCard label="Reports submitted" value={data.reports.total.toLocaleString()} href="/reports" />
        <StatCard label="Observations logged" value={data.observations.total.toLocaleString()} href="/observations" />
        <StatCard label="Restoration projects joined" value={data.restoration.joinedProjects.toLocaleString()} href="/restoration" />
        <StatCard label="Community posts" value={data.community.posts.toLocaleString()} href="/community" />
      </div>

      <div className="dashboard-two-col">
        <article className="panel">
          <SectionHeader title="Your reports" subtitle={`${data.reports.total.toLocaleString()} submitted`} />
          <BarChart
            items={data.reports.byStatus}
            labelKey="status"
            valueKey="count"
            total={data.reports.total}
            variantMap={STATUS_VARIANT}
          />
          <div style={{ marginTop: 12 }}>
            <Link className="button ghost" href="/reports">View your reports</Link>
          </div>
        </article>

        <article className="panel">
          <SectionHeader title="Your observations" subtitle={`${data.observations.total.toLocaleString()} logged`} />
          <BarChart
            items={data.observations.byCategory}
            labelKey="category"
            valueKey="count"
            total={data.observations.total}
          />
          <div style={{ marginTop: 12 }}>
            <Link className="button ghost" href="/observations">Browse observations</Link>
          </div>
        </article>
      </div>

      <article className="panel">
        <SectionHeader title="Keep contributing" subtitle="Explore ways to strengthen Bangladesh's environmental picture" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="button" href="/reports">Submit a report</Link>
          <Link className="button ghost" href="/observations">Log an observation</Link>
          <Link className="button ghost" href="/restoration">Join a restoration project</Link>
          <Link className="button ghost" href="/community">Join the community</Link>
        </div>
      </article>
    </>
  );
}
