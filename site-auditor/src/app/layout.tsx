import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Where this deployment actually lives.
 *
 * Link previews are absolute URLs, so a metadataBase pointing at a domain that
 * does not resolve yet produces a share card with a broken image, which is
 * exactly the fault this tool reports on other people's sites. Vercel sets
 * VERCEL_PROJECT_PRODUCTION_URL to the production domain, including a custom
 * one once it is connected, so the default tracks reality without anybody
 * remembering to update a variable.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Free Squarespace Website Auditor | Squarespell',
  description:
    'Enter your Squarespace URL and get a free technical audit in under a minute, SEO, AI search readiness, performance, conversion and Squarespace-specific issues, with the exact fix path for each one.',
  keywords: [
    'squarespace seo audit',
    'squarespace website checker',
    'free squarespace audit',
    'squarespace 7.1 seo',
    'squarespace site speed',
  ],
  openGraph: {
    title: 'Free Squarespace Website Auditor',
    description:
      'A real audit of your Squarespace site in under a minute. No signup, no code to paste.',
    url: SITE_URL,
    siteName: 'Squarespell',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Free Squarespace Website Auditor' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#030303',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The two families that draw the first screen. Preloading them
            stops the verdict reflowing from a fallback a beat after paint. */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/newsreader.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Squarespace Website Auditor',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: SITE_URL,
              description:
                'Free automated audit for Squarespace websites covering SEO, AI search readiness, performance, accessibility, conversion and Squarespace-specific configuration.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              provider: { '@type': 'Organization', name: 'Squarespell', url: 'https://squarespell.com' },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
