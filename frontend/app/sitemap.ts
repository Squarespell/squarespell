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
