import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="public-hero" aria-label="Delta Signal">
      <div className="public-hero-copy">
        <p className="eyebrow">Bangladesh · Environmental data</p>
        <h1>Understand Bangladesh’s environment, place by place.</h1>
        <p className="public-hero-description">
          Weather, rivers, air quality and biodiversity for every division and district —
          with the source and update time on every number.
        </p>

        <div className="button-row">
          <Link className="button" href="/map">
            Explore the map <span aria-hidden="true">↗</span>
          </Link>
          <Link className="button ghost" href="/data">
            Browse datasets
          </Link>
        </div>

        <p className="hero-open-note">
          Independent public platform — not a government service. Data from Open-Meteo, GloFAS and GBIF.
        </p>
      </div>
    </section>
  );
}
