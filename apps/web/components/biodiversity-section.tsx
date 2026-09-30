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
  canonicalName: string;
  vernacularName: string | null;
  family: string | null;
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
      topSpecies: topPage.data.map((s) => ({
        id: s.id,
        canonicalName: s.canonicalName,
        vernacularName: s.vernacularName,
        family: s.family,
        occurrenceCount: s._count.occurrences,
      })),
    };
  } catch {
    return null;
  }
}

export default async function BiodiversitySection() {
  const stats = await loadBiodiversity();

  return (
    <section className="biodiversity-section public-section" aria-label="Biodiversity records">
      <div className="section-intro">
        <p className="eyebrow">Synced daily from GBIF</p>
        <h2>Biodiversity records</h2>
        <p>Occurrence records for Bangladesh.</p>
      </div>

      {!stats ? (
        <div className="empty-state" role="status">Biodiversity data is temporarily unavailable.</div>
      ) : (
        <>
          <div className="rightnow-grid biodiversity-stats">
            <article className="metric">
              <span>Occurrence records</span>
              <strong>{stats.occurrenceTotal.toLocaleString()}</strong>
            </article>
            <article className="metric">
              <span>Taxa recorded</span>
              <strong>{stats.speciesTotal.toLocaleString()}</strong>
            </article>
          </div>

          {stats.topSpecies.length > 0 && (
            <div className="biodiversity-taxa">
              <p className="biodiversity-taxa-label">Most recorded taxa</p>
              <ul>
                {stats.topSpecies.map((s) => (
                  <li key={s.id}>
                    <span className="biodiversity-taxon-name">{s.vernacularName ?? s.canonicalName}</span>
                    <span className="biodiversity-taxon-latin">{s.canonicalName}</span>
                    {s.family && <span className="biodiversity-taxon-family">{s.family}</span>}
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

      <Link href="/biodiversity" className="button ghost">
        Explore species →
      </Link>
    </section>
  );
}
