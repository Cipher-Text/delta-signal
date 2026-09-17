import Link from 'next/link';
import type { GovernmentDashboard } from '@delta-signal/contracts';
import type { CurrentUser } from '../../../../lib/current-user';
import { DashboardHeader, StatCard, BarChart, SectionHeader } from '../components/DashboardPrimitives';
import { titleCase } from '../../../../lib/format';

type StatVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const SEVERITY_STAT_VARIANT: Record<string, StatVariant> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'info',
  INFO: 'default',
};

const SEVERITY_BAR_VARIANT: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'info',
  INFO: 'muted',
};

export default function GovernmentDashboardView({
  data,
  user,
}: {
  data: GovernmentDashboard;
  user: CurrentUser;
}) {
  const totalVerified = data.reports.verifiedLast30d;
  const totalAlertsBySeverity = data.alerts.bySeverity.reduce((s, a) => s + a.count, 0);

  return (
    <>
      <DashboardHeader title="Environmental Intelligence" subtitle="Bangladesh-wide alerts, reports, and climate indicators" meta={data.meta} />

      {/* KPI strip */}
      <div className="stat-grid">
        <StatCard
          label="Active alerts (nationwide)"
          value={data.alerts.total.toLocaleString()}
          variant={data.alerts.total > 0 ? 'warning' : 'default'}
          href="/alerts"
        />
        {data.alerts.bySeverity.map((a) => (
          <StatCard
            key={a.severity}
            label={`${titleCase(a.severity)} alerts`}
            value={a.count.toLocaleString()}
            variant={SEVERITY_STAT_VARIANT[a.severity] ?? 'default'}
          />
        ))}
        <StatCard
          label="Verified reports (30d)"
          value={totalVerified.toLocaleString()}
          href="/reports?status=VERIFIED"
        />
        <StatCard label="High flood signals" value={data.flood.highRiskStations.toLocaleString()} variant={data.flood.highRiskStations > 0 ? 'danger' : 'default'} href="/flood" />
        <StatCard label="Elevated flood signals" value={data.flood.elevatedRiskStations.toLocaleString()} variant={data.flood.elevatedRiskStations > 0 ? 'warning' : 'default'} href="/flood" />
        <StatCard label="Rising gauges" value={data.flood.risingStations.toLocaleString()} variant={data.flood.risingStations > 0 ? 'info' : 'default'} href="/flood" />
      </div>

      <article className="panel">
        <SectionHeader title="Flood and water-level signals" subtitle={`${data.flood.totalStations} gauges · ${data.flood.stationsWithForecast} with current forecast · GloFAS discharge and BWDB readings`} />
        {data.flood.highestRisk.length > 0 ? (
          <div className="table" role="table">
            <div className="table-row table-head" role="row"><span>Station / river</span><span>Discharge vs mean</span><span>Gauge status</span></div>
            {data.flood.highestRisk.map((row) => (
              <div className="table-row" role="row" key={row.stationId}>
                <div><strong>{row.stationName}</strong><small className="muted-copy">{row.riverName ?? 'River not recorded'}{row.district ? ` · ${row.district}` : ''}</small></div>
                <span className={`tag ${row.risk === 'HIGH' ? 'danger' : 'warning'}`}>{row.ratio != null ? `${row.ratio.toFixed(1)}× mean` : row.risk}</span>
                <span className={`tag ${row.thresholdStatus === 'DANGER' ? 'danger' : row.thresholdStatus === 'WARNING' ? 'warning' : 'muted'}`}>{titleCase(row.thresholdStatus)}{row.trend ? ` · ${titleCase(row.trend)}` : ''}</span>
              </div>
            ))}
          </div>
        ) : <p className="empty-state" style={{ padding: '20px 0' }}>No elevated discharge signals in the latest station forecasts.</p>}
      </article>

      <div className="dashboard-two-col">
        {/* Alert severity breakdown */}
        <article className="panel">
          <SectionHeader
            title="Active alerts by severity"
            subtitle={`${data.alerts.total} total active`}
          />
          {totalAlertsBySeverity > 0 ? (
            <BarChart
              items={data.alerts.bySeverity}
              labelKey="severity"
              valueKey="count"
              total={totalAlertsBySeverity}
              variantMap={SEVERITY_BAR_VARIANT}
            />
          ) : (
            <p className="empty-state" style={{ padding: '20px 0' }}>
              No active alerts.
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            <Link className="button ghost" href="/alerts">
              View all alerts
            </Link>
          </div>
        </article>

        {/* Active alerts by division */}
        <article className="panel">
          <SectionHeader
            title="Active alerts by division"
            subtitle="Geographic distribution"
          />
          {data.alerts.byDivision.length > 0 ? (
            <BarChart
              items={data.alerts.byDivision}
              labelKey="division"
              valueKey="count"
              total={data.alerts.total}
            />
          ) : (
            <p className="empty-state" style={{ padding: '20px 0' }}>
              No geographically assigned alerts.
            </p>
          )}
        </article>
      </div>

      {/* Verified reports by category */}
      <article className="panel">
        <SectionHeader
          title="Verified reports — last 30 days"
          subtitle="By incident category"
        />
        {data.reports.byCategory.length > 0 ? (
          <BarChart
            items={data.reports.byCategory}
            labelKey="category"
            valueKey="count"
            total={totalVerified}
          />
        ) : (
          <p className="empty-state" style={{ padding: '20px 0' }}>
            No verified reports in the last 30 days.
          </p>
        )}
      </article>

      {/* Top districts */}
      {data.reports.topDistricts.length > 0 && (
        <article className="panel">
          <SectionHeader
            title="Most affected districts"
            subtitle="By verified report count — last 30 days"
          />
          <div className="table" role="table">
            <div className="table-row table-head" role="row">
              <span>District</span>
              <span>Division</span>
              <span>Verified reports</span>
            </div>
            {data.reports.topDistricts.map((row, i) => (
              <div className="table-row" role="row" key={i}>
                <strong>{row.district}</strong>
                <span>{row.division}</span>
                <span className="tag info">{row.count}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Climate summary */}
      {data.climate.divisions.some((d) => d.avgTemp !== null) && (
        <article className="panel">
          <SectionHeader
            title="Division climate — 30-day averages"
            subtitle="Temperature, humidity, precipitation, PM2.5"
          />
          <div className="table" role="table">
            <div className="table-row table-head" role="row">
              <span>Division</span>
              <span>Avg temp (°C)</span>
              <span>Humidity (%)</span>
              <span>Precip (mm)</span>
              <span>PM2.5 (µg/m³)</span>
            </div>
            {data.climate.divisions.map((d) => (
              <div className="table-row" role="row" key={d.name}>
                <strong>{d.name}</strong>
                <span>{d.avgTemp != null ? d.avgTemp.toFixed(1) : '—'}</span>
                <span>{d.avgHumidity != null ? d.avgHumidity.toFixed(0) : '—'}</span>
                <span>{d.totalPrecip != null ? d.totalPrecip.toFixed(1) : '—'}</span>
                <span
                  className={
                    d.avgPm25 != null && d.avgPm25 > 35
                      ? 'tag danger'
                      : d.avgPm25 != null && d.avgPm25 > 12
                        ? 'tag warning'
                        : 'tag success'
                  }
                >
                  {d.avgPm25 != null ? d.avgPm25.toFixed(1) : '—'}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}
    </>
  );
}
