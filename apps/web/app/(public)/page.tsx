import EmergencyBanner from '../../components/emergency-banner';
import HeroSection from '../../components/hero-section';
import NationalClimateBand from '../../components/national-climate-band';
import AirQualityGrid from '../../components/air-quality-grid';
import BiodiversitySection from '../../components/biodiversity-section';
import TopicsGrid from '../../components/topics-grid';
import DatasetPreview from '../../components/dataset-preview';
import PersonaFooter from '../../components/persona-footer';
import DataSourcesSection from '../../components/data-sources-section';
import PublicNav from '../../components/public-nav';

export default function HomePage() {
  return (
    <main>
      <PublicNav />
      {/* Emergency alerts — conditional, null when nothing active */}
      <EmergencyBanner />

      {/* Hero — headline, CTAs, disclaimer, and the "Right now" status card */}
      <HeroSection />

      {/* 8-division climate snapshot — 30-day rolling averages */}
      <NationalClimateBand />

      {/* District air quality ranking + GBIF occurrence/taxa counts — paired cards */}
      <section className="public-section env-snapshot" aria-label="Air quality and biodiversity">
        <AirQualityGrid />
        <BiodiversitySection />
      </section>

      {/* Topic cards linking into the map/data/biodiversity/marine/emissions pages */}
      <TopicsGrid />

      {/* Dataset catalog preview */}
      <DatasetPreview />

      {/* Persona CTAs — Citizen / Researcher / NGO */}
      <PersonaFooter />

      {/* Source attribution */}
      <DataSourcesSection />
    </main>
  );
}
