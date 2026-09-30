import Link from 'next/link';
import { routes, type DivisionWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import DivisionConditionsPanel from './division-conditions-panel';

export default async function NationalClimateBand() {
  let divisions: DivisionWithClimate[] = [];
  let isLive = true;
  try {
    divisions = await apiGet<DivisionWithClimate[]>(routes.locations.divisions);
  } catch {
    isLive = false;
  }

  const hasClimateData = divisions.some((d) => d.avgTemp30d !== null || d.totalPrecip30d !== null);
  const latestClimateUpdate = divisions
    .map((division) => division.climateUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const climateNote = !isLive
    ? 'The division climate service is temporarily unavailable.'
    : latestClimateUpdate
      ? `30-day rolling summary, not live conditions · Updated ${new Date(latestClimateUpdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · Source: Open-Meteo`
      : '30-day rolling summary, not live conditions · Source: Open-Meteo';
  const climateNoteShort = !isLive
    ? 'Temporarily unavailable.'
    : '30-day rolling summary · Open-Meteo';

  return (
    <section className="climate-band public-section" aria-label="National climate overview by division">
      <div className="climate-band-header">
        <div>
          <h2 className="climate-band-title-full">Conditions across the divisions</h2>
          <h2 className="climate-band-title-short">Divisions</h2>
        </div>
        <Link href="/map" className="climate-band-cta climate-band-cta-full">
          Open the full map →
        </Link>
      </div>
      <p className="climate-band-note climate-band-note-full">{climateNote}</p>
      <p className="climate-band-note climate-band-note-short">{climateNoteShort}</p>

      {!isLive || !hasClimateData ? (
        <div className="empty-state" role="status">
          {isLive ? 'No 30-day division climate summaries are available yet.' : 'Division climate data is temporarily unavailable.'}
        </div>
      ) : (
        <DivisionConditionsPanel divisions={divisions} />
      )}
    </section>
  );
}
