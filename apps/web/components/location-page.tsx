import type { ReactNode } from 'react';

interface LocationHeaderProps {
  level: string;
  parentLabel: string;
  name: string;
  bnName?: string | null;
  summary: string;
  statusLabel: string;
  statusClass: string;
  freshness?: string;
}

export function LocationHeader({
  level,
  parentLabel,
  name,
  bnName,
  summary,
  statusLabel,
  statusClass,
  freshness,
}: LocationHeaderProps) {
  return (
    <div className="panel-header location-page-header">
      <div>
        <p className="eyebrow">{level} · {parentLabel}</p>
        <h1>
          {name}
          {bnName && (
            <span className="muted location-bn-name">{bnName}</span>
          )}
        </h1>
        <p>{summary}</p>
      </div>
      <div className="location-header-status">
        <span className={`aqi-badge ${statusClass}`}>{statusLabel}</span>
        {freshness && <small className="muted">{freshness}</small>}
      </div>
    </div>
  );
}

export function LocationSectionNav({
  items,
  label,
}: {
  items: Array<{ id: string; label: string }>;
  label: string;
}) {
  return (
    <nav className="location-section-nav" aria-label={label}>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`}>{item.label}</a>
      ))}
    </nav>
  );
}

export function LocationSourceNote({ children }: { children: ReactNode }) {
  return <p className="muted location-source-note">{children}</p>;
}
