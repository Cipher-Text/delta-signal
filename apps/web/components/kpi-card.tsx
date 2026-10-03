import type { ReactNode } from 'react';
import StatusBadge, { type StatusLevel } from './status-badge';

interface KpiCardProps {
  /** The question the KPI answers, e.g. "Temperature" (§20). */
  label: string;
  value: string | number;
  unit?: string;
  /** e.g. "+1.8° vs seasonal reference" */
  comparison?: string;
  status?: { level: StatusLevel; label: string };
  /** Pre-formatted time, e.g. "10:30 BST (UTC+6)". */
  updated?: string;
  compact?: boolean;
  /** Fades a zero value unless zero is an important operational state (§20). */
  zeroIsMeaningful?: boolean;
  footer?: ReactNode;
}

export default function KpiCard({
  label,
  value,
  unit,
  comparison,
  status,
  updated,
  compact = false,
  zeroIsMeaningful = false,
  footer,
}: KpiCardProps) {
  const isZero = Number(value) === 0 && String(value).trim() !== '';
  const muted = isZero && !zeroIsMeaningful;
  return (
    <div className={`ds-kpi${compact ? ' ds-kpi--compact' : ''}${muted ? ' ds-kpi--zero' : ''}`}>
      <div className="ds-kpi-label">{label}</div>
      <div className="ds-kpi-value">
        {value}
        {unit && <span className="ds-kpi-unit"> {unit}</span>}
      </div>
      {comparison && <div className="ds-kpi-comparison">{comparison}</div>}
      {status && <StatusBadge level={status.level}>{status.label}</StatusBadge>}
      {updated && <div className="ds-kpi-updated">Updated {updated}</div>}
      {footer}
    </div>
  );
}
