import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

/**
 * Security headers applied to every response from the Next.js server.
 * The API already applies Helmet for its own routes — these cover the web app's
 * HTML, JS bundles, and API routes handled by Next itself.
 */
const securityHeaders = [
  // Prevent browsers from sniffing content types — stops polyglot file attacks.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block clickjacking by disallowing this app from being framed by other origins.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop IE's legacy XSS filter (modern browsers ignore this, but older ones benefit).
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Only send the origin as referrer when navigating to same-origin; strip it cross-origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access — deny camera/mic/geolocation by default.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS: force HTTPS for 2 years, include subdomains, allow preloading.
  // Only set in production — localhost must not be HSTS-pinned.
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for Docker.
  output: 'standalone',

  // Point file tracing at the monorepo root so standalone output includes
  // workspace package files (@delta-signal/shared, @delta-signal/contracts).
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Compile workspace TypeScript packages — they ship source, not pre-built JS.
  transpilePackages: ['@delta-signal/shared', '@delta-signal/contracts'],

  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
