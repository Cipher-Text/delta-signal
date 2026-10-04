import type { ReactNode } from 'react';

export type StatusLevel = 'normal' | 'watch' | 'warning' | 'critical' | 'info' | 'unknown';

interface StatusBadgeProps {
  level: StatusLevel;
  /** Always render a text label — severity must never depend on color alone (§9). */
  children: ReactNode;
}

/**
 * Status pill (§9.1). The leading shape is a second cue besides color:
 * a round dot for Normal/Watch/Unknown, a square for Warning and above.
 */
export default function StatusBadge({ level, children }: StatusBadgeProps) {
  return (
    <span className={`ds-status-badge ds-status-badge--${level}`}>
      <span className="ds-status-badge-shape" aria-hidden="true" />
      {children}
    </span>
  );
}
