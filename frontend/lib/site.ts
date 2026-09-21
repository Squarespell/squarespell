import type { Metadata } from 'next';

/** Public origin of this deployment (canonical URLs, Open Graph, sitemap). Build-time value; defaults to the production domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://squarespellquiz.com').replace(/\/+$/, '');

/**
 * Search indexing is OFF unless the build sets NEXT_PUBLIC_ALLOW_INDEXING=true. Only the approved production build does;
 * staging and previews are built without it and stay noindex.
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

export const SITE_NAME = 'Squarespell Quiz';

/**
 * Canonical, Open Graph, Twitter and robots metadata for a public page.
 * Pass indexable: false for a page that must never be indexed, whatever the build flag says.
 */
export function pageSeo(path: string, opts: { title?: string; description?: string; indexable?: boolean } = {}): Metadata {
  const url = SITE_URL + path;
  const index = ALLOW_INDEXING && opts.indexable !== false;
  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    robots: { index, follow: index },
    openGraph: { url, siteName: SITE_NAME, type: 'website', locale: 'en_US', title: opts.title, description: opts.description },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  };
}
