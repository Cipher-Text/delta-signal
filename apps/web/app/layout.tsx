import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export const metadata: Metadata = {
  title: 'Delta Signal — Bangladesh Environmental Intelligence',
  description:
    'Public environmental board for Bangladesh. Browse active alerts, verified reports, datasets, biodiversity records, and restoration projects — no login required.',
  // Google Search Console site ownership verification (HTML tag method).
  // Only rendered when GOOGLE_SITE_VERIFICATION is set — leave unset locally.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
      {/* Skipped entirely (no script injected) when the env var is unset. */}
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
      {clarityProjectId ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityProjectId}");`}
        </Script>
      ) : null}
    </html>
  );
}
