import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Static, publicly browsable top-level pages only (no auth flows, no /profile).
// Per-record detail pages (e.g. /alerts/:id) aren't enumerated here yet — add
// them with a DB-backed generator if/when this needs to scale.
const STATIC_ROUTES = [
  '',
  '/alerts',
  '/reports',
  '/observations',
  '/biodiversity',
  '/restoration',
  '/data',
  '/locations',
  '/community',
  '/organizations',
  '/industrial-sites',
  '/emissions',
  '/radiation',
  '/marine',
  '/water-bodies',
  '/map',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'hourly',
    priority: route === '' ? 1 : 0.7,
  }));
}
