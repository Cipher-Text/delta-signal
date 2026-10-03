interface SourceLink {
  label: string;
  href: string;
}

interface SourceMetaProps {
  /** Canonical display name from §28.1 (e.g. "Open-Meteo", "GBIF"). Never a placeholder. */
  source: string;
  /** Pre-formatted time, e.g. "26 Sep 2026 · 10:30 BST (UTC+6)". */
  updated?: string;
  coverage?: string;
  /** e.g. "Forecast", "Observed". */
  type?: string;
  /** Methodology, license, original dataset, API link, … */
  links?: SourceLink[];
}

/** Compact provenance block (§28): discoverable without competing with the data. */
export default function SourceMeta({ source, updated, coverage, type, links }: SourceMetaProps) {
  const items: Array<[string, string]> = [['Source', source]];
  if (updated) items.push(['Updated', updated]);
  if (coverage) items.push(['Coverage', coverage]);
  if (type) items.push(['Type', type]);
  return (
    <div className="ds-source">
      <dl className="ds-source-list">
        {items.map(([term, detail]) => (
          <div key={term} className="ds-source-item">
            <dt>{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
      {links && links.length > 0 && (
        <p className="ds-source-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
