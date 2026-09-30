import Link from 'next/link';
import {
  routes,
  type Species,
  type Occurrence,
  type PaginatedEnvelope,
} from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

interface TopSpecies {
  id: string;
  name: string;
  latin: string;
  isFamilyRank: boolean;
  occurrenceCount: number;
}

interface BiodiversityStats {
  speciesTotal: number;
  occurrenceTotal: number;
  topSpecies: TopSpecies[];
}

async function loadBiodiversity(): Promise<BiodiversityStats | null> {
  try {
    const [speciesPage, occurrencePage, topPage] = await Promise.all([
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=1`),
      apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?pageSize=1`),
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=5&sortBy=occurrences`),
    ]);
    return {
      speciesTotal: speciesPage.total,
      occurrenceTotal: occurrencePage.total,
      topSpecies: topPage.data.map((s) => {
        // A canonical name with no space is a family-rank record (e.g. "Soricidae"),
        // not a genus+species binomial — the vernacular name is a group name like "Shrews".
        const isFamilyRank = !s.canonicalName.includes(' ');
        return {
          id: s.id,
          name: s.vernacularName ?? s.canonicalName,
          latin: s.canonicalName,
          isFamilyRank,
          occurrenceCount: s._count.occurrences,
        };
      }),
    };
  } catch {
    return null;
  }
}

export default async function BiodiversitySection() {
  const stats = await loadBiodiversity();

  return (
    <div className="env-card biodiversity-card">
      <div className="env-card-header">
        <div>
          <h2>Biodiversity records</h2>
          <p>Occurrence records for Bangladesh · Synced daily from GBIF</p>
        </div>
      </div>

      {!stats ? (
        <div className="empty-state" role="status">Biodiversity data is temporarily unavailable.</div>
      ) : (
        <>
          <div className="stat-tile-row biodiversity-stats">
            <article className="stat-tile">
              <strong>{stats.occurrenceTotal.toLocaleString()}</strong>
              <span>occurrence records</span>
            </article>
            <article className="stat-tile">
              <strong>{stats.speciesTotal.toLocaleString()}</strong>
              <span>taxa recorded</span>
            </article>
          </div>

          {stats.topSpecies.length > 0 && (
            <div className="biodiversity-taxa">
              <p className="biodiversity-taxa-label">Most recorded taxa</p>
              <ul>
                {stats.topSpecies.map((s, i) => (
                  <li key={s.id}>
                    <span className="biodiversity-taxon-rank">{i + 1}</span>
                    <span className="biodiversity-taxon-text">
                      <span className="biodiversity-taxon-name">
                        {s.name}
                        {s.isFamilyRank && <span className="tag muted">Family</span>}
                      </span>
                      <span className="biodiversity-taxon-latin">{s.latin}</span>
                    </span>
                    <span className="biodiversity-taxon-count">{s.occurrenceCount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <p className="biodiversity-taxa-note">
                Counts reflect how often a taxon has been recorded, not how common it is.
              </p>
            </div>
          )}
        </>
      )}

      <div className="env-card-footer">
        <Link href="/biodiversity">Explore species →</Link>
      </div>
    </div>
  );
}
