import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '../../../../lib/api';
import {
  routes,
  type CurrentWeatherReading,
  type Dataset,
  type StationFloodForecast,
  type HourlyAirQualityReading,
  type Occurrence,
  type PaginatedEnvelope,
  type Species,
} from '@delta-signal/contracts';
import { titleCase } from '../../../../lib/format';

const ACCESS_LABEL: Record<string, { label: string; variant: string }> = {
  PUBLIC: { label: 'Public', variant: 'success' },
  LOGIN_REQUIRED: { label: 'Sign in required', variant: 'warning' },
  RESEARCHER: { label: 'Researcher access', variant: 'warning' },
  APPROVED: { label: 'Approval required', variant: 'danger' },
  GOVERNMENT: { label: 'Government access', variant: 'danger' },
};

function formatDate(value: string | null) {
  if (!value) return 'Not synced yet';
  return new Date(value).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceRoutes(dataset: Dataset): string[] {
  switch (dataset.source) {
    case 'openmeteo':
      return [
        routes.weather.current,
        routes.weather.hourly(':districtId'),
        routes.weather.daily(':districtId'),
        routes.weather.airQuality,
      ];
    case 'openmeteo-flood':
      return [routes.flood.forecast, routes.flood.forecastByDistrict(':districtId')];
    case 'gbif':
      return [routes.biodiversity.species, routes.biodiversity.occurrences];
    default:
      return [];
  }
}

function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="table dataset-detail-table">{children}</div>;
}

export default async function DatasetDetailPage({ params }: { params: { id: string } }) {
  const dataset = await apiGet<Dataset>(routes.datasets.detail(params.id), 60).catch(() => null);
  if (!dataset) notFound();

  const access = ACCESS_LABEL[dataset.accessPolicy];
  let weather: CurrentWeatherReading[] = [];
  let airQuality: HourlyAirQualityReading[] = [];
  let flood: StationFloodForecast[] = [];
  let species: Species[] = [];
  let occurrences: Occurrence[] = [];

  if (dataset.source === 'openmeteo') {
    [weather, airQuality] = await Promise.all([
      apiGet<CurrentWeatherReading[]>(routes.weather.current, 300).catch(() => []),
      apiGet<HourlyAirQualityReading[]>(routes.weather.airQuality, 300).catch(() => []),
    ]);
  }
  if (dataset.source === 'openmeteo-flood') {
    flood = await apiGet<StationFloodForecast[]>(routes.flood.forecast, 300).catch(() => []);
  }
  if (dataset.source === 'gbif') {
    [species, occurrences] = await Promise.all([
      apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?pageSize=10`, 300)
        .then((response) => response.data)
        .catch(() => []),
      apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?pageSize=10`, 300)
        .then((response) => response.data)
        .catch(() => []),
    ]);
  }

  return (
    <>
      <Link className="back-link" href="/data">
        ← Data Hub
      </Link>

      <div className="dataset-detail-header">
        <div className="dataset-detail-badges">
          <span className="tag info">{titleCase(dataset.category)}</span>
          <span className={`tag ${access?.variant ?? 'muted'}`}>
            {access?.label ?? dataset.accessPolicy}
          </span>
        </div>
        <h1>{dataset.name}</h1>
        <p>{dataset.description ?? 'No description has been added for this dataset yet.'}</p>
      </div>

      <article className="panel dataset-detail-panel">
        <div className="dataset-detail-meta">
          <div><span>Source</span><strong>{dataset.source}</strong></div>
          <div><span>Provider</span><strong>{dataset.provider?.name ?? 'Not linked'}</strong></div>
          <div><span>Last synced</span><strong>{formatDate(dataset.lastSyncedAt)}</strong></div>
          <div><span>Records</span><strong>{dataset.recordCount ?? 'Live API'}</strong></div>
        </div>
      </article>

      <article className="panel dataset-detail-panel">
        <div className="panel-header">
          <div>
            <h2>Available endpoints</h2>
            <p>Use these public API routes to retrieve the dataset.</p>
          </div>
        </div>
        <div className="endpoint-list">
          {sourceRoutes(dataset).map((path) => <code key={path}>{path}</code>)}
          {sourceRoutes(dataset).length === 0 && (
            <p className="empty-state">No live API endpoint is connected to this dataset yet.</p>
          )}
        </div>
      </article>

      {dataset.source === 'openmeteo' && (
        <>
          <article className="panel dataset-detail-panel">
            <div className="panel-header"><div><h2>Current weather</h2><p>Latest stored reading by district.</p></div></div>
            <DataTable>
              <div className="table-row table-head"><span>District</span><span>Temperature</span><span>Humidity</span><span>Precipitation</span></div>
              {weather.slice(0, 10).map((row) => (
                <div className="table-row" key={row.id}>
                  <strong>{row.district?.name ?? row.districtId}</strong>
                  <span>{row.temperature2m != null ? `${row.temperature2m} °C` : '—'}</span>
                  <span>{row.relativeHumidity2m != null ? `${row.relativeHumidity2m}%` : '—'}</span>
                  <span>{row.precipitation != null ? `${row.precipitation} mm` : '—'}</span>
                </div>
              ))}
              {!weather.length && <div className="empty-state">No weather readings available yet.</div>}
            </DataTable>
          </article>

          <article className="panel dataset-detail-panel">
            <div className="panel-header"><div><h2>Air quality</h2><p>Top 10 most polluted districts · latest reading · highest PM2.5 first.</p></div></div>
            <DataTable>
              <div className="table-row table-head"><span>District</span><span>PM2.5</span><span>PM10</span><span>Ozone</span></div>
              {[...airQuality]
                .sort((a, b) => (b.pm25 ?? -1) - (a.pm25 ?? -1))
                .slice(0, 10)
                .map((row) => (
                <div className="table-row" key={row.id}>
                  <strong>{row.district?.name ?? row.districtId}</strong>
                  <span>{row.pm25 != null ? `${row.pm25} µg/m³` : '—'}</span>
                  <span>{row.pm10 != null ? `${row.pm10} µg/m³` : '—'}</span>
                  <span>{row.ozone != null ? `${row.ozone} µg/m³` : '—'}</span>
                </div>
              ))}
              {!airQuality.length && <div className="empty-state">No air-quality readings available yet.</div>}
            </DataTable>
          </article>
        </>
      )}

      {dataset.source === 'openmeteo-flood' && (
        <article className="panel dataset-detail-panel">
          <div className="panel-header"><div><h2>Flood forecast</h2><p>Nearest river discharge forecast, in m³/s.</p></div></div>
          <DataTable>
            <div className="table-row table-head"><span>Station</span><span>Date</span><span>Discharge</span><span>Range</span></div>
            {flood.slice(0, 20).map((row) => (
              <div className="table-row" key={row.id}>
                <strong>{row.station?.name ?? row.stationId}</strong>
                <span>{formatDate(row.forecastDate)}</span>
                <span>{row.riverDischarge != null ? `${row.riverDischarge.toFixed(1)} m³/s` : '—'}</span>
                <span>{row.riverDischargeMin != null && row.riverDischargeMax != null ? `${row.riverDischargeMin.toFixed(1)}–${row.riverDischargeMax.toFixed(1)}` : '—'}</span>
              </div>
            ))}
            {!flood.length && <div className="empty-state">No flood forecasts available yet. Restart the API to run the scheduled sync.</div>}
          </DataTable>
        </article>
      )}

      {dataset.source === 'gbif' && (
        <>
          <article className="panel dataset-detail-panel">
            <div className="panel-header"><div><h2>Recorded species</h2><p>Species currently stored from the Bangladesh GBIF sync.</p></div></div>
            <DataTable>
              <div className="table-row table-head"><span>Species</span><span>Common name</span><span>Kingdom</span><span>Records</span></div>
              {species.map((row) => (
                <div className="table-row" key={row.id}>
                  <strong>{row.canonicalName}</strong>
                  <span>{row.vernacularName ?? '—'}</span>
                  <span>{row.kingdom ?? '—'}</span>
                  <span>{row._count.occurrences}</span>
                </div>
              ))}
              {!species.length && <div className="empty-state">No species records available yet.</div>}
            </DataTable>
          </article>

          <article className="panel dataset-detail-panel">
            <div className="panel-header"><div><h2>Recent occurrences</h2><p>Latest georeferenced biodiversity records from GBIF.</p></div></div>
            <DataTable>
              <div className="table-row table-head"><span>Species</span><span>District</span><span>Observed</span><span>Basis</span></div>
              {occurrences.map((row) => (
                <div className="table-row" key={row.id}>
                  <strong>{row.species.canonicalName}</strong>
                  <span>{row.district?.name ?? '—'}</span>
                  <span>{row.observedAt ? formatDate(row.observedAt) : '—'}</span>
                  <span>{row.basisOfRecord ?? '—'}</span>
                </div>
              ))}
              {!occurrences.length && <div className="empty-state">No occurrence records available yet.</div>}
            </DataTable>
          </article>
        </>
      )}
    </>
  );
}
