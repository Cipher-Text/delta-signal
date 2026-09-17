import Link from 'next/link';
import type { DashboardMeta } from '@delta-signal/contracts';
import { relativeTime, titleCase } from '../../../../lib/format';

export function DashboardHeader({ title, subtitle, eyebrow = 'Workspace', meta }: { title: string; subtitle: string; eyebrow?: string; meta?: DashboardMeta }) {
  const knownSources = meta?.sources.filter((source) => source.status !== 'UNKNOWN') ?? [];
  const latestSync = knownSources
    .map((source) => source.lastSuccessfulSync)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const hasStaleSource = meta?.sources.some((source) => source.status === 'STALE');
  const statusClass = hasStaleSource ? 'is-stale' : knownSources.length > 0 ? 'is-fresh' : 'is-unknown';

  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-eyebrow"><span className="dashboard-eyebrow-dot" aria-hidden="true" />{eyebrow}</p>
        <h1>{title}</h1>
        <p className="dashboard-subtitle">{subtitle}</p>
      </div>
      <div className={`dashboard-live-status ${statusClass}`} aria-label="Dashboard data status">
        <span className="dashboard-live-dot" aria-hidden="true" />
        <span>
          <strong>Bangladesh</strong>
          <small>{latestSync ? `Updated ${relativeTime(latestSync)}` : 'Source status unavailable'}</small>
          {knownSources.length > 0 && <small>{knownSources.map((source) => source.name).join(' · ')}</small>}
        </span>
      </div>
    </header>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  href?: string;
}

export function StatCard({ label, value, variant = 'default', href }: StatCardProps) {
  const inner = (
    <div className={`stat-card${variant !== 'default' ? ` stat-card-${variant}` : ''}`}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="stat-card-link">
        {inner}
      </Link>
    );
  }

  return inner;
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

interface BarItem {
  [key: string]: string | number;
}

interface BarChartProps {
  items: BarItem[];
  labelKey: string;
  valueKey: string;
  total: number;
  variantMap?: Record<string, string>;
  href?: string;
}

export function BarChart({ items, labelKey, valueKey, total, variantMap, href }: BarChartProps) {
  if (items.length === 0) {
    return <p className="empty-state" style={{ padding: '12px 0' }}>No data.</p>;
  }

  return (
    <div className="bar-chart">
      {items.map((item) => {
        const label = String(item[labelKey]);
        const count = Number(item[valueKey]);
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const variant = variantMap?.[label] ?? 'primary';

        return (
          <div className="bar-item" key={label}>
            <span className="bar-label">{titleCase(label)}</span>
            <div className="bar-track">
              <div
                className={`bar-fill bar-fill-${variant}`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="bar-value">{count.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── TrendChart ───────────────────────────────────────────────────────────────

interface TrendItem {
  [key: string]: string | number;
}

interface TrendChartProps {
  items: TrendItem[];
  peak: number;
  labelKey?: string;
}

export function TrendChart({ items, peak, labelKey = 'day' }: TrendChartProps) {
  if (items.length === 0) {
    return <p className="empty-state" style={{ padding: '12px 0' }}>No trend data.</p>;
  }

  return (
    <div className="trend-chart">
      {items.map((item) => {
        const label = String(item[labelKey]);
        const count = Number(item['count']);
        const heightPct = peak > 0 ? Math.round((count / peak) * 100) : 0;

        return (
          <div className="trend-col" key={label} title={`${label}: ${count}`}>
            <span className="trend-count">{count}</span>
            <div className="trend-bar-track">
              <div className="trend-bar-fill" style={{ height: `${heightPct}%` }} />
            </div>
            <span className="trend-label">{label.slice(-5)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
