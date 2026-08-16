import type { MetadataRoute } from 'next';

/**
 * Crawlers are welcome, including the AI ones: this tool argues that being
 * readable by assistants is worth having, and a site that argued that while
 * blocking them would be worth ignoring.
 *
 * Individual report pages are excluded. They are readable by anyone with the
 * link, which is how sharing works, and they are not ours to publish.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/r/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
