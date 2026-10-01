import Link from 'next/link';

const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      { label: 'Map', href: '/map' },
      { label: 'Data', href: '/data' },
      { label: 'Research', href: '/observations' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'Methodology', href: '/methodology' },
      { label: 'Data sources', href: '/data' },
      { label: 'Contact', href: '/contact' },
    ],
  },
] as const;

export default function PublicFooter() {
  return (
    <footer className="public-footer-band">
      <div className="public-footer-inner">
        <div className="public-footer-top">
          <div className="public-footer-brand">
            <Link href="/" className="public-footer-logo">
              <img src="/logo.svg" alt="" width={32} height={32} />
              <span>Delta Signal</span>
            </Link>
            <p className="public-footer-desc-full">
              Independent public environmental data platform for Bangladesh. Not a government service.
            </p>
            <p className="public-footer-desc-short">
              Independent public platform — not a government service. Data: Open-Meteo, GloFAS, GBIF.
            </p>
          </div>

          <div className="public-footer-columns">
            {COLUMNS.map((col) => (
              <div
                key={col.heading}
                className={`public-footer-column public-footer-column--${col.heading.toLowerCase()}`}
              >
                <strong>{col.heading}</strong>
                {col.links.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="public-footer-bottom">
          <span>© {new Date().getFullYear()} Delta Signal</span>
        </div>
      </div>
    </footer>
  );
}
