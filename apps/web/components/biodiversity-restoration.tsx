import Link from 'next/link';
import {
  routes,
  type Species,
  type Occurrence,
  type RestorationProject,
  type PaginatedEnvelope,
} from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

interface ProjectPreview {
  title: string;
  meta: string;
}

async function loadBiodiversitySummary(): Promise<{ speciesTotal: number; occurrenceTotal: number } | null> {
  try {
    const [species, occurrences] = await Promise.all([
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=1`),
      apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?pageSize=1`),
    ]);
    return { speciesTotal: species.total, occurrenceTotal: occurrences.total };
  } catch {
    return null;
  }
}

async function loadRestorationProjects(): Promise<{ items: ProjectPreview[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<RestorationProject>>(`${routes.restoration.projects}?pageSize=2`);
    return {
      isLive: true,
      items: res.data.map((p) => ({
        title: p.title,
        meta: p.impactSummary ?? `${p.organization?.name ?? 'Independent'} · ${p.district?.name ?? 'Nationwide'}`,
      })),
    };
  } catch {
    return { isLive: false, items: [] };
  }
}

export default async function BiodiversityRestoration() {
  const [biodiversity, restoration] = await Promise.all([
    loadBiodiversitySummary(),
    loadRestorationProjects(),
  ]);
  const noProjects = restoration.isLive && restoration.items.length === 0;

  return (
    <section
      id="biodiversity"
      className="public-grid public-section"
      aria-label="Biodiversity and restoration"
    >
      {/* ── Biodiversity ── */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Biodiversity highlights</h2>
            <p>Research-grade observations and habitat signals.</p>
          </div>
          <Link className="button ghost" href="/biodiversity">
            Explore
          </Link>
        </div>

        <div
          className="species-image mangrove"
          role="img"
          aria-label="Sundarbans mangrove habitat illustration"
          style={{ height: '120px', marginBottom: '14px' }}
        />

        <p className="muted-copy">
          {biodiversity
            ? `${biodiversity.speciesTotal.toLocaleString()} species recorded across ${biodiversity.occurrenceTotal.toLocaleString()} occurrence records, synced daily from GBIF.`
            : 'Mangrove records, Sundarbans wetland sightings, and freshwater species signals across Bangladesh.'}
        </p>

        <div className="button-row" style={{ marginTop: '14px' }}>
          <Link className="button ghost" href="/biodiversity">
            Species records
          </Link>
          <Link className="button ghost" href="/observations">
            All observations
          </Link>
        </div>
      </article>

      {/* ── Restoration and community ── */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Restoration and community</h2>
            <p>Projects and campaigns show action, not only problems.</p>
          </div>
          <Link className="button ghost" href="/restoration">
            View projects
          </Link>
        </div>

        <div className="record-list">
          {!restoration.isLive && <div className="empty-state" role="status">Restoration projects are temporarily unavailable.</div>}
          {noProjects && <div className="empty-state">No restoration projects registered yet.</div>}
          {restoration.items.map((p) => (
            <div key={p.title} className="record-item">
              <strong>{p.title}</strong>
              <span>{p.meta}</span>
            </div>
          ))}
        </div>

        <Link className="button ghost gated-action" href="/login">
          Sign in to participate
        </Link>
      </article>
    </section>
  );
}
