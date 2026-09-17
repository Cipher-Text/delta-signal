import Link from 'next/link';
import type { ResearcherDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import { DashboardHeader, StatCard, BarChart, TrendChart, SectionHeader } from '../components/DashboardPrimitives';

const TRUST_VARIANT: Record<string, string> = {
  RESEARCH_GRADE: 'success',
  COMMUNITY: 'info',
  UNVERIFIED: 'muted',
  FLAGGED: 'danger',
};

export default function ResearcherDashboardView({
  data,
  user,
}: {
  data: ResearcherDashboard;
  user: CurrentUser;
}) {
  const trendPeak = Math.max(...data.biodiversity.monthlyTrend.map((d) => d.count), 1);

  return (
    <>
      <DashboardHeader title="Biodiversity Intelligence" subtitle="Species occurrences, observation quality, and field data trends" eyebrow="Research workspace" meta={data.meta} />

      {/* KPI strip */}
      <div className="stat-grid">
        <StatCard
          label="Species recorded"
          value={data.biodiversity.totalSpecies.toLocaleString()}
          href="/biodiversity"
        />
        <StatCard
          label="GBIF occurrences"
          value={data.biodiversity.totalOccurrences.toLocaleString()}
          href="/biodiversity"
        />
        <StatCard
          label="Total observations"
          value={data.observations.total.toLocaleString()}
          href="/observations"
        />
        <StatCard
          label="Research-grade"
          value={`${data.observations.researchGradePct}%`}
          variant={
            data.observations.researchGradePct >= 50
              ? 'success'
              : data.observations.researchGradePct >= 20
                ? 'warning'
                : 'danger'
          }
          href="/observations?trustLevel=RESEARCH_GRADE"
        />
      </div>

      <div className="dashboard-two-col">
        {/* Monthly occurrence trend */}
        <article className="panel">
          <SectionHeader
            title="Occurrence trend — last 6 months"
            subtitle="GBIF records synced per month"
          />
          {data.biodiversity.monthlyTrend.length > 0 ? (
            <TrendChart items={data.biodiversity.monthlyTrend} peak={trendPeak} labelKey="month" />
          ) : (
            <p className="empty-state" style={{ padding: '20px 0' }}>
              No occurrence data in the last 6 months.
            </p>
          )}
        </article>

        {/* Observations by trust level */}
        <article className="panel">
          <SectionHeader
            title="Observation quality"
            subtitle={`${data.observations.total.toLocaleString()} total observations`}
          />
          <BarChart
            items={data.observations.byTrust}
            labelKey="trustLevel"
            valueKey="count"
            total={data.observations.total}
            variantMap={TRUST_VARIANT}
          />
          <div style={{ marginTop: 12 }}>
            <Link className="button ghost" href="/observations">
              Browse observations
            </Link>
          </div>
        </article>
      </div>

      <div className="dashboard-two-col">
        {/* Top species */}
        <article className="panel">
          <SectionHeader
            title="Top species by occurrence"
            subtitle="Most-recorded species in GBIF data"
          />
          <div className="record-list">
            {data.biodiversity.topSpecies.map((s, i) => (
              <div className="record-item" key={s.name}>
                <strong>
                  <em>{s.name}</em>
                </strong>
                <span>{s.occurrences.toLocaleString()} occurrences</span>
              </div>
            ))}
            {data.biodiversity.topSpecies.length === 0 && (
              <p className="empty-state">No occurrence data yet.</p>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Link className="button ghost" href="/biodiversity">
              Species catalogue
            </Link>
          </div>
        </article>

        {/* Observations by category */}
        <article className="panel">
          <SectionHeader
            title="Observations by category"
            subtitle="Field observation breakdown"
          />
          <BarChart
            items={data.observations.byCategory}
            labelKey="category"
            valueKey="count"
            total={data.observations.total}
          />
        </article>
      </div>
    </>
  );
}
