import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Auth flows and the profile page carry no indexable content and
      // shouldn't show up in search results.
      disallow: ['/login', '/register', '/forgot-password', '/reset-password', '/profile'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
