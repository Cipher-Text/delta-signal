import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../../lib/api';
import { routes, type Species, type Occurrence, type PaginatedEnvelope } from '@delta-signal/contracts';
import { relativeTime } from '../../../../../lib/format';

export default async function SpeciesDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [species, occurrencesRes] = await Promise.all([
    apiGet<Species>(routes.biodiversity.speciesDetail(params.id), 3600).catch(() => null),
    apiGet<PaginatedEnvelope<Occurrence>>(
      `${routes.biodiversity.occurrences}?speciesId=${params.id}&pageSize=20`,
      3600,
    ).catch((): PaginatedEnvelope<Occurrence> => ({ data: [], total: 0, page: 1, pageSize: 20 })),
  ]);

  if (!species) notFound();

  const taxonomy: { label: string; value: string | null }[] = [
    { label: 'Kingdom', value: species.kingdom },
    { label: 'Phylum',  value: species.phylum  },
    { label: 'Class',   value: species.class   },
    { label: 'Order',   value: species.order   },
    { label: 'Family',  value: species.family  },
    { label: 'Genus',   value: species.genus   },
  ];
  const filledTaxonomy = taxonomy.filter((t) => t.value != null);

  return (
    <>
      <Link className="back-link" href="/biodiversity">
        ← All species
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className="tag">Species</span>
          {species.iucnStatus && (
            <span className="tag warning">{species.iucnStatus}</span>
          )}
        </div>
        <h1><em>{species.canonicalName}</em></h1>
        {species.vernacularName && (
          <div className="report-detail-meta">
            <span>{species.vernacularName}</span>
          </div>
        )}
      </div>

      {filledTaxonomy.length > 0 && (
        <article className="panel">
          <h2>Taxonomy</h2>
          <div className="obs-detail-grid">
            {filledTaxonomy.map(({ label, value }) => (
              <div key={label} className="obs-detail-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <div className="obs-detail-row">
              <span>Scientific name</span>
              <strong><em>{species.canonicalName}</em></strong>
            </div>
            <div className="obs-detail-row">
              <span>GBIF key</span>
              <strong>{species.gbifKey}</strong>
            </div>
            <div className="obs-detail-row">
              <span>Occurrence records</span>
              <strong>{species._count.occurrences}</strong>
            </div>
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Occurrence records in Bangladesh</h2>
            <p>
              {occurrencesRes.total} record{occurrencesRes.total !== 1 ? 's' : ''} synced from GBIF
            </p>
          </div>
        </div>

        <div className="table" role="table" aria-label="Occurrence records">
          <div className="table-row table-head" role="row">
            <span>Location</span>
            <span>Recorded by</span>
            <span>Observed</span>
            <span>Basis</span>
          </div>
          {occurrencesRes.data.map((o) => (
            <div className="table-row" role="row" key={o.id}>
              <span>{o.district?.name ?? (o.lat != null ? `${o.lat.toFixed(3)}, ${o.lng.toFixed(3)}` : '—')}</span>
              <span>{o.recordedBy ?? '—'}</span>
              <span>{o.observedAt ? relativeTime(o.observedAt) : '—'}</span>
              <span>{o.basisOfRecord ?? '—'}</span>
            </div>
          ))}
          {occurrencesRes.data.length === 0 && (
            <div className="empty-state">No occurrence records for this species yet.</div>
          )}
        </div>
      </article>
    </>
  );
}
