import type { Metadata } from 'next';
import LegalPage from '../../../components/legal-page';

export const metadata: Metadata = {
  title: 'Methodology — Delta Signal',
  description: 'Where Delta Signal\'s data comes from, how it is aggregated, and what its numbers do and do not mean.',
};

export default function MethodologyPage() {
  return (
    <LegalPage
      label="About the data"
      title="Methodology"
      intro="Delta Signal aggregates public environmental data for Bangladesh from a small number of external providers. This page explains where each number comes from, how it is computed, and its limitations."
      sections={[
        {
          title: 'Data sources',
          children: (
            <>
              <p><strong>Open-Meteo</strong> — current conditions, hourly and daily weather, air quality, and marine forecasts, fetched at district and union level.</p>
              <p><strong>GloFAS (Global Flood Awareness System), via Copernicus</strong> — river discharge forecasts at monitored water level stations.</p>
              <p><strong>GBIF (Global Biodiversity Information Facility)</strong> — species occurrence records observed within Bangladesh.</p>
            </>
          ),
        },
        {
          title: '30-day rolling averages',
          children: (
            <p>Division and district climate figures (temperature, humidity, rainfall, wind, UV index, PM2.5, PM10) are 30-day rolling aggregates computed nightly from daily union-level readings, then rolled up bottom-up: union → upazila → district → division. Rainfall is a 30-day <strong>total</strong>; temperature and UV index are 30-day <strong>means</strong>. These describe recent trends, not current conditions — see the &ldquo;Right now&rdquo; panel on the homepage for live readings.</p>
          ),
        },
        {
          title: 'Air quality scale',
          children: (
            <p>District air quality rankings use the US EPA PM2.5 (2024) breakpoints: Good (0–9.0 µg/m³), Moderate (9.1–35.4), Unhealthy for sensitive groups (35.5–55.4), Unhealthy (55.5–125.4), Very unhealthy (125.5–225.4), Hazardous (225.5+). Sensitive groups include children, older adults, and people with respiratory conditions.</p>
          ),
        },
        {
          title: 'River discharge signals',
          children: (
            <p>Station-level flood risk compares a station&apos;s current forecast discharge against its historical mean and 75th-percentile discharge. A ratio at or above 1.5× the historical mean (or above the historical 75th percentile) is flagged as elevated; 2× the mean (or 1.5× the 75th percentile) is flagged as high. These are simulated signals for situational awareness, not official flood warnings.</p>
          ),
        },
        {
          title: 'Update cadence',
          children: (
            <p>Current weather refreshes every 15 minutes; hourly and air-quality data every 2 hours; daily forecasts every 12 hours. River discharge, radiation, and marine forecasts refresh daily. Biodiversity occurrences sync daily from GBIF. Union-level climate aggregates recompute nightly. Emissions data refreshes weekly from the World Bank Climate Change API.</p>
          ),
        },
        {
          title: 'Limitations',
          children: (
            <>
              <p>Delta Signal is an independent public platform, not a government service. All figures are modeled estimates from third-party providers — they are not official government measurements and should not be the sole basis for safety-critical decisions.</p>
              <p>Coverage varies by district and by provider; a district showing no value for a given indicator means that provider has no recent reading for that location, not that conditions are absent.</p>
            </>
          ),
        },
      ]}
    />
  );
}
