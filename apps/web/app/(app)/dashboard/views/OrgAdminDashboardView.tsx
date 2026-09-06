import Link from 'next/link';
import type { OrgAdminDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import { DashboardHeader, StatCard, BarChart, SectionHeader } from '../components/DashboardPrimitives';

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: 'success',
  PLANNED: 'info',
  COMPLETED: 'success',
  PAUSED: 'muted',
};

export default function OrgAdminDashboardView({
  data,
  user,
}: {
  data: OrgAdminDashboard;
  user: CurrentUser;
}) {
  const totalProjects = data.projects.total;
  const totalCategory = data.projects.byCategory.reduce((s, c) => s + c.count, 0);

  return (
    <>
      <DashboardHeader title="Restoration Portfolio" subtitle="Project status, community engagement, and impact overview" eyebrow="Organization workspace" />

      {/* KPI strip */}
      <div className="stat-grid">
        <StatCard
          label="Total projects"
          value={data.projects.total.toLocaleString()}
          href="/restoration"
        />
        <StatCard
          label="Active / planned"
          value={data.projects.active.toLocaleString()}
          variant="success"
          href="/restoration"
        />
        <StatCard
          label="New (last 30 days)"
          value={data.projects.newLast30d.toLocaleString()}
          variant={data.projects.newLast30d > 0 ? 'info' : 'default'}
        />
        <StatCard
          label="Total participants"
          value={data.engagement.totalParticipants.toLocaleString()}
        />
        <StatCard
          label="Avg participants/project"
          value={data.engagement.avgParticipantsPerProject.toLocaleString()}
        />
      </div>

      <div className="dashboard-two-col">
        {/* Projects by status */}
        <article className="panel">
          <SectionHeader
            title="Projects by status"
            subtitle={`${totalProjects.toLocaleString()} total projects`}
          />
          <BarChart
            items={data.projects.byStatus}
            labelKey="status"
            valueKey="count"
            total={totalProjects}
            variantMap={STATUS_VARIANT}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Link className="button" href="/restoration">
              View projects
            </Link>
          </div>
        </article>

        {/* Projects by category */}
        <article className="panel">
          <SectionHeader
            title="Projects by category"
            subtitle="Restoration focus areas"
          />
          <BarChart
            items={data.projects.byCategory}
            labelKey="category"
            valueKey="count"
            total={totalCategory}
          />
        </article>
      </div>

      {/* Top projects by participants */}
      <article className="panel">
        <SectionHeader
          title="Most engaged projects"
          subtitle="Ranked by participant count"
        />
        <div className="table" role="table">
          <div className="table-row table-head" role="row">
            <span>Project</span>
            <span>Participants</span>
          </div>
          {data.engagement.topProjects.length > 0 ? (
            data.engagement.topProjects.map((p) => (
              <Link
                key={p.id}
                className="table-row table-row-link"
                role="row"
                href={`/restoration/${p.id}`}
              >
                <strong>{p.title}</strong>
                <span className="tag info">{p.participants.toLocaleString()}</span>
              </Link>
            ))
          ) : (
            <div className="empty-state">No projects yet.</div>
          )}
        </div>
      </article>
    </>
  );
}
