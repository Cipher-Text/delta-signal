import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { apiGet } from '../../../../lib/api';
import { routes, type WaterBody } from '@delta-signal/contracts';
import { titleCase } from '../../../../lib/format';

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="obs-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default async function WaterBodyDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const waterBody = await apiGet<WaterBody>(routes.waterBodies.detail(params.id), 300).catch(
    () => null,
  );

  if (!waterBody) notFound();

  const districts = [...new Set(waterBody.upazilas.map((u) => u.upazila.district.name))];

  return (
    <>
      <Link className="back-link" href="/water-bodies">
        ← All water bodies
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className={`tag ${waterBody.hydrologicalClass === 'LOTIC' ? 'info' : 'success'}`}>
            {waterBody.hydrologicalClass === 'LOTIC' ? 'Lotic (Flowing)' : 'Lentic (Still)'}
          </span>
          <span className="tag muted">{titleCase(waterBody.waterBodyType)}</span>
          {waterBody.transboundaryFlag && (
            <span className="tag warning">Transboundary</span>
          )}
        </div>
        <h1>{waterBody.nameEn}</h1>
        {waterBody.nameBn && (
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {waterBody.nameBn}
          </p>
        )}
        <div className="report-detail-meta">
          <span>Code: {waterBody.code}</span>
          {waterBody.waterBodySubtype && <span>{waterBody.waterBodySubtype}</span>}
          {districts.length > 0 && <span>{districts.join(', ')}</span>}
        </div>
      </div>

      {/* Lotic (river) details */}
      {waterBody.loticDetails && (
        <article className="panel">
          <h2>River Details</h2>
          <div className="obs-detail-grid">
            <DetailRow
              label="Length in Bangladesh"
              value={
                waterBody.loticDetails.lengthKmBd
                  ? `${waterBody.loticDetails.lengthKmBd} km`
                  : null
              }
            />
            <DetailRow
              label="Average width"
              value={
                waterBody.loticDetails.averageWidthM
                  ? `${waterBody.loticDetails.averageWidthM} m`
                  : null
              }
            />
            <DetailRow
              label="Max depth"
              value={
                waterBody.loticDetails.maxDepthM
                  ? `${waterBody.loticDetails.maxDepthM} m`
                  : null
              }
            />
            <DetailRow
              label="Mean discharge"
              value={
                waterBody.loticDetails.meanDischargeM3s
                  ? `${waterBody.loticDetails.meanDischargeM3s} m³/s`
                  : null
              }
            />
            <DetailRow label="Flow regime" value={waterBody.loticDetails.flowRegime} />
            <DetailRow label="Hydrological origin" value={waterBody.loticDetails.hydrologicalOrigin} />
            <DetailRow label="Outfall to" value={waterBody.loticDetails.outfallTo} />
            <DetailRow label="Divisions traversed" value={waterBody.loticDetails.divisionsTraversed} />
            <DetailRow label="Districts traversed" value={waterBody.loticDetails.districtsTraversed} />
            <DetailRow
              label="BWDB gauging stations"
              value={waterBody.loticDetails.bwdbGaugingStations}
            />
            {waterBody.transboundaryFlag && waterBody.transboundaryCountries && (
              <DetailRow
                label="Transboundary countries"
                value={waterBody.transboundaryCountries}
              />
            )}
          </div>
        </article>
      )}

      {/* Lentic (wetland/lake) details */}
      {waterBody.lenticDetails && (
        <article className="panel">
          <h2>Wetland / Lake Details</h2>
          <div className="obs-detail-grid">
            <DetailRow
              label="Area (monsoon)"
              value={
                waterBody.lenticDetails.areaMonsoonSqKm
                  ? `${waterBody.lenticDetails.areaMonsoonSqKm} km²`
                  : null
              }
            />
            <DetailRow
              label="Area (dry season)"
              value={
                waterBody.lenticDetails.areaDrySqKm
                  ? `${waterBody.lenticDetails.areaDrySqKm} km²`
                  : null
              }
            />
            <DetailRow
              label="Water volume estimate"
              value={
                waterBody.lenticDetails.waterVolumeEst
                  ? `${waterBody.lenticDetails.waterVolumeEst} m³`
                  : null
              }
            />
            <DetailRow label="Seasonality" value={waterBody.lenticDetails.seasonality} />
            {waterBody.transboundaryFlag && waterBody.transboundaryCountries && (
              <DetailRow
                label="Transboundary countries"
                value={waterBody.transboundaryCountries}
              />
            )}
          </div>
        </article>
      )}

      {/* Location coverage */}
      {waterBody.upazilas.length > 0 && (
        <article className="panel">
          <h2>Location Coverage</h2>
          <div className="obs-detail-grid">
            {districts.map((d) => {
              const upazilas = waterBody.upazilas
                .filter((u) => u.upazila.district.name === d)
                .map((u) => u.upazila.name);
              return (
                <div className="obs-detail-row" key={d}>
                  <span>{d}</span>
                  <strong>{upazilas.join(', ')}</strong>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* Water level stations */}
      {waterBody.stations && waterBody.stations.length > 0 && (
        <article className="panel">
          <h2>Water Level Stations</h2>
          <div className="table" role="table" aria-label="Associated stations">
            <div className="table-row table-head" role="row">
              <span>Station</span>
              <span>Code</span>
              <span>River</span>
              <span>Tidal</span>
            </div>
            {waterBody.stations.map(({ station }) => (
              <div className="table-row" role="row" key={station.id}>
                <span>{station.name}</span>
                <span className="tag muted">{station.stationCode}</span>
                <span>{station.riverName ?? '—'}</span>
                <span>{station.tidalStatus ?? '—'}</span>
              </div>
            ))}
          </div>
        </article>
      )}
    </>
  );
}
