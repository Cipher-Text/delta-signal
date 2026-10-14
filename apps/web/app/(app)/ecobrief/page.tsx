import { apiGet } from '../../../lib/api';
import { routes, type DistrictSummary, type DivisionSummary, type EcoBrief, type EcoBriefTopic } from '@delta-signal/contracts';
import PageHeader from '../../../components/page-header';
import EcoBriefBuilder, { type EcoBriefAreaOption } from '../../../components/ecobrief-builder';

type SearchParams = {
  area?: string;
  from?: string;
  to?: string;
  topics?: string | string[];
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EcoBriefPage(props: { searchParams: Promise<SearchParams> }) {
  const search = await props.searchParams;
  const [divisions, districts] = await Promise.all([
    apiGet<DivisionSummary[]>(routes.locations.divisions, 3600).catch(() => []),
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600).catch(() => []),
  ]);
  const areas: EcoBriefAreaOption[] = [
    { value: 'COUNTRY', label: 'Bangladesh · national' },
    ...divisions.map((division) => ({
      value: `DIVISION:${division.id}`,
      label: `${division.name} · division`,
    })),
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
  const hasQuery = Boolean(search.from && search.to && search.area);

  let report: EcoBrief | null = null;
  let error: string | null = null;
  if (hasQuery) {
    const [areaType, areaId] = selectedArea.includes(':') ? selectedArea.split(':', 2) : [selectedArea, ''];
    const params = new URLSearchParams({ areaType, from: search.from!, to: search.to! });
    if (areaId) params.set('areaId', areaId);
    if (selectedTopics.length) params.set('topics', selectedTopics.join(','));
    try {
      report = await apiGet<EcoBrief>(`${routes.ecoBriefs.generate}?${params}`, 0);
    } catch {
      error = 'The brief could not be generated. Check the selected dates and try again.';
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Environmental data"
        title="EcoBrief"
        description="Build a clear, source-linked snapshot of environmental data for a place and period."
      />
      <EcoBriefBuilder
        areas={areas}
        initialArea={selectedArea}
        initialFrom={from}
        initialTo={to}
        initialTopics={selectedTopics.length ? selectedTopics : ['climate', 'biodiversity', 'emissions', 'observations']}
        report={report}
        error={error}
      />
    </>
  );
}
