import type { OrganizationType } from '@delta-signal/contracts';
import { ORG_TYPE_META } from '../lib/org-meta';

export function TypePill({ type }: { type: OrganizationType }) {
  const m = ORG_TYPE_META[type] ?? ORG_TYPE_META.OTHER;
  return <span className={`org-pill org-pill--${m.tint}`}>{m.label}</span>;
}

export function VerifiedPill() {
  return (
    <span className="org-verified">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}
