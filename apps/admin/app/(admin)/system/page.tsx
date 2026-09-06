import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  version: string;
}

interface IngestionJob {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  startedAt: string | null;
  endedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  provider: { id: string; name: string; type: string };
}

interface PaginatedJobs {
  data: IngestionJob[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGE: Record<IngestionJob['status'], string> = {
  SUCCEEDED: 'tag-success',
  RUNNING: 'tag-info',
  QUEUED: 'tag-muted',
  FAILED: 'tag-danger',
  CANCELLED: 'tag-warning',
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

const CRON_JOBS = [
  { name: 'Weather (current)', schedule: 'Every 15 min', module: 'WeatherModule' },
  { name: 'Weather (hourly + AQ)', schedule: 'Every 2 hours', module: 'WeatherModule' },
  { name: 'Weather (daily)', schedule: 'Every 12 hours', module: 'WeatherModule' },
  { name: 'Biodiversity GBIF sync', schedule: 'Daily 02:00', module: 'BiodiversityModule' },
  { name: 'Union climate rollup', schedule: 'Daily 00:00', module: 'LocationClimateModule' },
  { name: 'Refresh token cleanup', schedule: 'Daily', module: 'AuthModule' },
];

export default async function SystemHealthPage() {
  const accessToken = cookies().get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';

  const [health, recentJobs, failedJobs] = await Promise.all([
    apiGet<HealthResponse>('/api/v1/health').catch(() => null),
    apiGet<PaginatedJobs>(
      `/api/v1/ingestion/jobs?page=1&pageSize=10`,
      accessToken,
    ).catch(() => null),
    apiGet<PaginatedJobs>(
      `/api/v1/ingestion/jobs?status=FAILED&page=1&pageSize=10`,
      accessToken,
    ).catch(() => null),
  ]);

  const isHealthy = health?.status === 'ok';
  const failedCount = failedJobs?.total ?? 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>System Health</h1>
          <p>API status, background job history, and scheduled task registry</p>
        </div>
      </div>

      {/* API health */}
      <section className="system-section">
        <h2 className="system-section-title">API Status</h2>
        <div className="system-card-grid">
          <div className={`system-card ${isHealthy ? 'system-card-ok' : 'system-card-error'}`}>
            <div className="system-card-indicator" />
            <div>
              <strong>{isHealthy ? 'Operational' : 'Unreachable'}</strong>
              <p>{health?.service ?? 'delta-signal-api'} · v{health?.version ?? '—'}</p>
              {health?.timestamp && (
                <p className="system-card-ts">
                  Last checked: {formatDateTime(health.timestamp)}
                </p>
              )}
            </div>
          </div>

          <div className={`system-card ${failedCount === 0 ? 'system-card-ok' : 'system-card-error'}`}>
            <div className="system-card-indicator" />
            <div>
              <strong>{failedCount} failed ingestion job{failedCount !== 1 ? 's' : ''}</strong>
              <p>{failedCount === 0 ? 'All ingestion jobs healthy' : 'Requires investigation'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cron job registry */}
      <section className="system-section">
        <h2 className="system-section-title">Scheduled Tasks</h2>
        <p className="system-section-note">
          These cron jobs run automatically. There is no manual trigger UI yet — restart the API container to force an immediate run.
        </p>
        <div className="data-table">
          <div className="data-table-head">
            <span>Job name</span>
            <span>Schedule</span>
            <span>Module</span>
          </div>
          {CRON_JOBS.map((job) => (
            <div className="data-table-row" key={job.name}>
              <strong>{job.name}</strong>
              <span className="tag tag-muted">{job.schedule}</span>
              <span>{job.module}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Failed jobs */}
      {failedCount > 0 && (
        <section className="system-section">
          <h2 className="system-section-title system-title-danger">
            Failed Ingestion Jobs ({failedCount})
          </h2>
          <div className="data-table">
            <div className="data-table-head">
              <span>Provider</span>
              <span>Started</span>
              <span>Duration</span>
              <span>Error</span>
            </div>
            {failedJobs?.data.map((job) => (
              <div className="data-table-row" key={job.id}>
                <strong>{job.provider.name}</strong>
                <span>{formatDateTime(job.startedAt)}</span>
                <span>{duration(job.startedAt, job.endedAt)}</span>
                <code className="audit-meta-json error-msg">{job.errorMsg ?? '—'}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent ingestion history */}
      <section className="system-section">
        <h2 className="system-section-title">Recent Ingestion Jobs</h2>
        <div className="data-table">
          <div className="data-table-head">
            <span>Provider</span>
            <span>Status</span>
            <span>Started</span>
            <span>Duration</span>
          </div>
          {recentJobs?.data.length === 0 ? (
            <div className="empty-state">No ingestion jobs recorded yet.</div>
          ) : (
            recentJobs?.data.map((job) => (
              <div className="data-table-row" key={job.id}>
                <strong>{job.provider.name}</strong>
                <span>
                  <span className={`tag ${STATUS_BADGE[job.status]}`}>{job.status}</span>
                </span>
                <span>{formatDateTime(job.startedAt)}</span>
                <span>{duration(job.startedAt, job.endedAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
