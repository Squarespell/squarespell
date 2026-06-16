import type { MetadataRoute } from 'next';

// No robots.txt existed anywhere in this app before (checked app/ and
// public/ — neither had one), which means crawlers fell back to default
// "crawl everything" behavior, including authenticated/internal routes that
// have no business being indexed (dashboard, admin, auth callbacks, embed
// iframes, the unsubscribe flow). This is the first explicit robots policy
// for app.squarespell.com.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/dashboard/',
        '/admin',
        '/admin/',
        '/embed',
        '/embed/',
        '/unsubscribe',
        '/oauth-popup',
        '/sso-callback',
        '/sso-popup-done',
        '/sign-out',
        '/api/',
        '/trpc/',
      ],
    },
    sitemap: 'https://app.squarespell.com/sitemap.xml',
    host: 'https://app.squarespell.com',
  };
}
