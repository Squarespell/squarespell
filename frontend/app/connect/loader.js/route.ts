import { renderLoader } from '@/lib/connect/loaderSource';

/**
 * GET /connect/loader.js - the Squarespell site loader.
 * Behind the CONNECT_ENABLED feature flag (a server runtime variable, off by default): while it is off this is a plain 404.
 * The script is public and cacheable; it carries no secrets and sets no cookies.
 * Both origins come from configuration (NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL) and there is NO fallback: a build that lacks either
 * answers 503 instead of quietly pointing quiz frames at some other deployment (for example the production domain from a staging build).
 */
export const dynamic = 'force-dynamic';

const JS = 'application/javascript; charset=utf-8';

export async function GET() {
  if (process.env.CONNECT_ENABLED !== 'true') {
    return new Response('/* Not available. */', { status: 404, headers: { 'content-type': JS, 'cache-control': 'no-store' } });
  }
  const api = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!api || !site) return new Response('/* Not configured. */', { status: 503, headers: { 'content-type': JS, 'cache-control': 'no-store' } });
  let body: string;
  try {
    body = renderLoader({ api, origin: site });
  } catch {
    return new Response('/* Not configured. */', { status: 503, headers: { 'content-type': JS, 'cache-control': 'no-store' } });
  }
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': JS,
      'cache-control': 'public, max-age=300, s-maxage=60',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
    },
  });
}
