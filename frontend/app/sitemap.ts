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
