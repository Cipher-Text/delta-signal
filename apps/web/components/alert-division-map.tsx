import Link from 'next/link';
import { DIVISION_TILES, SEVERITIES, SEVERITY_LEVEL } from '../lib/alerts';
import { titleCase } from '../lib/format';

export interface MapAlert {
  severity: string;
  /** Canonical division names this alert covers; empty = nationwide. */
  divisions: string[];
}

const RANK: Record<string, number> = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));

/** Approximate division tile map, each tile shaded by its most severe alert (§22 simplified map). */
export default function AlertDivisionMap({ alerts }: { alerts: MapAlert[] }) {
  const nationwide = alerts.filter((a) => a.divisions.length === 0).length;

  return (
    <section className="alerts-card" aria-labelledby="alerts-map-heading">
      <div className="alerts-card-head">
        <h2 id="alerts-map-heading">Where alerts are active</h2>
        <Link href="/map">Full map →</Link>
      </div>

      <div className="alerts-tiles">
        {DIVISION_TILES.map(([name, area]) => {
          const hits = alerts.filter((a) => a.divisions.includes(name));
          const worst = hits.slice().sort((a, b) => RANK[a.severity] - RANK[b.severity])[0];
          const level = worst ? SEVERITY_LEVEL[worst.severity] : 'none';
          return (
            <div key={name} className={`alerts-tile alerts-tile--${level}`} style={{ gridArea: area }}>
              <span className="alerts-tile-name">{name}</span>
              <span className="alerts-tile-label">
                {worst ? `${titleCase(worst.severity)}${hits.length > 1 ? ` · ${hits.length} alerts` : ''}` : 'No alerts'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="alerts-note">
        {nationwide > 0 && `${nationwide === 1 ? '1 nationwide alert is' : `${nationwide} nationwide alerts are`} not shown on the map. `}
        Divisions shaded by the most severe alert on this page. Positions approximate, not to scale.
      </p>
    </section>
  );
}
