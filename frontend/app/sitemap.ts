import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// The stable public marketing/product routes on the final domain. Per-quiz pages (/quiz/[slug], /q/[slug]) are individual users'
// content and are intentionally excluded. /tools/quiz-funnel is excluded: it is a noindex gateway whose canonical is elsewhere.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    ['/', 'weekly', 1],
    ['/pricing', 'monthly', 0.8],
    ['/templates', 'monthly', 0.7],
    ['/integrations', 'monthly', 0.6],
    ['/support', 'monthly', 0.5],
    ['/terms', 'yearly', 0.3],
    ['/privacy', 'yearly', 0.3],
  ];
  return pages.map(([path, changeFrequency, priority]) => ({ url: SITE_URL + path, lastModified: now, changeFrequency, priority }));
}
import type { MetadataRoute } from 'next';

// No sitemap existed anywhere in this app before. This covers the stable,
// public marketing/product routes. Per-quiz pages (/quiz/[slug]) are
// intentionally excluded — they're individual users' content, numerous,
// and already individually indexable/crawlable via their own canonical
// metadata (app/quiz/[slug]/layout.tsx); a static build-time sitemap isn't
// the right place to enumerate a constantly-changing, user-generated set.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://app.squarespell.com';
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/tools/quiz-funnel`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/tools/quiz-funnel/build`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
