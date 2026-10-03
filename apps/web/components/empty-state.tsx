import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** `healthy` is a reassuring zero state (check icon); `empty` means no data yet. */
  variant?: 'empty' | 'healthy';
  title: string;
  description?: ReactNode;
  /** Pre-formatted time, e.g. "10:30 BST (UTC+6)". Shown as "Last checked …". */
  lastChecked?: string;
  /** Optional call to action, e.g. a Link. */
  action?: ReactNode;
}

/**
 * The single shared component for empty and healthy states (§38–39).
 * Compact on purpose: one or two lines, never a tall card or a big success banner.
 */
export default function EmptyState({
  variant = 'empty',
  title,
  description,
  lastChecked,
  action,
}: EmptyStateProps) {
  return (
    <div className={`ds-state ds-state--${variant}`} role={variant === 'healthy' ? 'status' : undefined}>
      {variant === 'healthy' && (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="ds-state-icon">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div className="ds-state-body">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {lastChecked && <p className="ds-state-meta">Last checked {lastChecked}</p>}
      </div>
      {action && <div className="ds-state-action">{action}</div>}
    </div>
  );
}
