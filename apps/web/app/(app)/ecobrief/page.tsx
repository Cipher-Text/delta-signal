import { headers } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import {
  routes,
  type DistrictSummary,
  type DivisionSummary,
  type EcoBrief,
  type EcoBriefTopic,
  type EcoBriefTrustFilter,
} from '@delta-signal/contracts';
import PageHeader from '../../../components/page-header';
import EcoBriefBuilder, { type EcoBriefAreaOption } from '../../../components/ecobrief-builder';
import EcoBriefReport, { buildCitation } from '../../../components/ecobrief/report';

type SearchParams = {
  area?: string;
  from?: string;
  to?: string;
  topics?: string | string[];
  trust?: string;
};

const ALL_TOPICS: EcoBriefTopic[] = ['climate', 'biodiversity', 'emissions', 'observations'];
/** Roles that can review observations, so the brief links them to the unverified ones. */
const REVIEW_ROLES = new Set(['RESEARCHER', 'MODERATOR', 'ADMIN']);

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EcoBriefPage(props: { searchParams: Promise<SearchParams> }) {
  const search = await props.searchParams;
  const [divisions, districts, user] = await Promise.all([
    apiGet<DivisionSummary[]>(routes.locations.divisions, 3600).catch(() => []),
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600).catch(() => []),
    getCurrentUser(),
  ]);
  const areas: EcoBriefAreaOption[] = [
    { value: 'COUNTRY', label: 'Bangladesh · national' },
    ...divisions.map((division) => ({ value: `DIVISION:${division.id}`, label: `${division.name} · division` })),
    ...districts.map((district) => ({
      value: `DISTRICT:${district.id}`,
      label: `${district.name}${district.division?.name ? ` · ${district.division.name}` : ''}`,
    })),
  ];

  const to = search.to || dateOnly(new Date());
  const fromDate = new Date(`${to}T00:00:00.000Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = search.from || dateOnly(fromDate);
  const selectedArea = search.area || 'COUNTRY';
  const selectedTopics = (Array.isArray(search.topics) ? search.topics : search.topics?.split(',') ?? []) as EcoBriefTopic[];
  const trust: EcoBriefTrustFilter = search.trust === 'research' ? 'research' : 'all';
  const hasQuery = Boolean(search.from && search.to && search.area);

  let report: EcoBrief | null = null;
  let error: string | null = null;
  if (hasQuery) {
    const [areaType, areaId] = selectedArea.includes(':') ? selectedArea.split(':', 2) : [selectedArea, ''];
    const params = new URLSearchParams({ areaType, from: search.from!, to: search.to! });
    if (areaId) params.set('areaId', areaId);
    if (selectedTopics.length) params.set('topics', selectedTopics.join(','));
    if (selectedTopics.length === 0 || selectedTopics.includes('observations')) params.set('trust', trust);
    try {
      report = await apiGet<EcoBrief>(`${routes.ecoBriefs.generate}?${params}`, 0);
    } catch {
      error = 'The brief could not be generated. Check the selected dates and try again.';
    }
  }

  // Shareable address of this exact brief, for the citation.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const query = new URLSearchParams({ area: selectedArea, from, to, topics: (selectedTopics.length ? selectedTopics : ALL_TOPICS).join(',') });
  if (trust === 'research') query.set('trust', 'research');
  const url = `${proto}://${host}/ecobrief?${query}`;

  const reviewHref =
    user && REVIEW_ROLES.has(user.role)
      ? `/observations?trustLevel=UNVERIFIED${selectedArea.startsWith('DISTRICT:') ? `&districtId=${selectedArea.split(':')[1]}` : ''}`
      : undefined;

  return (
    <div className="eb-page">
      <div className="eb-screen-only">
        <PageHeader
          eyebrow="Environmental data"
          title="EcoBrief"
          description="Build a citable, source-linked report of environmental data for a place and period."
        />
      </div>
      <EcoBriefBuilder
        areas={areas}
        initialArea={selectedArea}
        initialFrom={from}
        initialTo={to}
        initialTopics={selectedTopics.length ? selectedTopics : ALL_TOPICS}
        initialTrust={trust}
        error={error}
      />
      {report ? (
        <EcoBriefReport report={report} citation={buildCitation(report, url)} reviewHref={reviewHref} />
      ) : (
        !error && (
          <section className="eb-empty-start eb-screen-only">
            <div className="eb-empty-icon" aria-hidden="true">EB</div>
            <h2>Your report will appear here</h2>
            <p>Pick an area, period and data themes above. EcoBrief assembles a short report with an abstract, methods, results, limitations and a suggested citation from the datasets available for that selection.</p>
          </section>
        )
      )}
    </div>
  );
}
