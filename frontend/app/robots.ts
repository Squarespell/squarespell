import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

// Until the approved launch build (NEXT_PUBLIC_ALLOW_INDEXING=true) the whole site is disallowed, so staging,
// previews and the gated production build can never be crawled. After launch: crawl the public pages, keep the
// authenticated/internal routes (dashboard, admin, auth callbacks, embed iframes, unsubscribe) out.
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
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
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
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
