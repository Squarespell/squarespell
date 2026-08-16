/**
 * Bounded, polite crawler.
 *
 * Constraints that keep this cheap and non-abusive:
 *   - hard page cap and wall-clock deadline
 *   - fixed concurrency (never bursts on a small business's server)
 *   - breadth-first from the homepage, seeded with sitemap URLs
 *   - duplicate URL collapsing via canonicalisation
 *   - robots.txt is respected for our own user agent
 */

import { safeFetch, pool, USER_AGENT } from './safeFetch';
import { isAllowed } from './robots';
import { canonicalise, isCrawlablePage, sameSite } from './url';
import type { PageData, RobotsInfo, SitemapInfo, CrawlResult } from './types';

export interface CrawlOptions {
  maxPages: number;
  concurrency: number;
  perRequestTimeoutMs: number;
  deadline: number;
  onPage?: (url: string, index: number, total: number) => void;
}

/**
 * Crawl priority.
 *
 * A pure breadth-first crawl on a blog-heavy site spends its whole budget on
 * post pages and never reaches /contact, which then produces the single worst
 * false positive this tool can make ("there is no way to contact you"). We sort
 * the frontier so the pages that carry the most audit signal are always
 * visited, and blog posts fill whatever budget is left.
 */
function crawlPriority(url: string): number {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return 5;
  }
  if (path === '/' || path === '') return 0;
  if (/(contact|get-in-touch|enquir|book|schedule|appointment)/.test(path)) return 1;
  if (/(service|work|pricing|prices|packages|plans|offer|shop|store|products?)/.test(path)) return 2;
  if (/(about|our-story|team|who-we-are|testimonial|review|case-stud)/.test(path)) return 3;
  if (/(blog|news|journal|post|article)\//.test(path)) return 8;
  if (/(privacy|terms|cookie|legal)/.test(path)) return 9;
  return 5;
}

export async function crawl(
  startUrl: string,
  robots: RobotsInfo,
  sitemap: SitemapInfo,
  opts: CrawlOptions
): Promise<CrawlResult> {
  const start = canonicalise(startUrl) || startUrl;
  const queue: Array<{ url: string; depth: number }> = [{ url: start, depth: 0 }];
  const seen = new Set<string>([start]);
  const pages: PageData[] = [];
  const internalLinks = new Map<string, Set<string>>();
  let discovered = 1;
  let budgetHit = false;

  // Seed from the sitemap: this is how we reach "Not Linked" pages, which on
  // Squarespace are listed in sitemap.xml but absent from the navigation.
  const seeds = sitemap.urls
    .map((u) => canonicalise(u.loc))
    .filter((u): u is string => !!u && sameSite(u, start) && isCrawlablePage(u));
  for (const s of seeds) {
    if (!seen.has(s)) {
      seen.add(s);
      queue.push({ url: s, depth: 1 });
      discovered++;
    }
  }

  while (queue.length > 0 && pages.length < opts.maxPages) {
    if (Date.now() > opts.deadline) {
      budgetHit = true;
      break;
    }
    // Re-sort each round: newly discovered high-value pages jump the queue.
    queue.sort((a, b) => crawlPriority(a.url) - crawlPriority(b.url) || a.depth - b.depth);
    const batch = queue.splice(0, Math.min(opts.concurrency, opts.maxPages - pages.length));

    const results = await pool(batch, opts.concurrency, async (item) => {
      const path = (() => {
        try {
          return new URL(item.url).pathname;
        } catch {
          return '/';
        }
      })();
      if (!isAllowed(robots, USER_AGENT, path)) return null;

      try {
        const res = await safeFetch(item.url, {
          timeoutMs: opts.perRequestTimeoutMs,
          maxBytes: 2_500_000,
          wantCert: item.depth === 0,
        });
        const page: PageData = {
          url: item.url,
          finalUrl: res.finalUrl,
          status: res.status,
          ok: res.status >= 200 && res.status < 300,
          depth: item.depth,
          redirectChain: res.redirectChain,
          headers: res.headers,
          html: /html|xml/.test(res.contentType) || !res.contentType ? res.body : '',
          bytes: res.bytes,
          ttfbMs: res.ttfbMs,
          contentType: res.contentType,
        };
        return page;
      } catch (e: any) {
        return {
          url: item.url,
          finalUrl: item.url,
          status: 0,
          ok: false,
          depth: item.depth,
          redirectChain: [],
          headers: {},
          html: '',
          bytes: 0,
          ttfbMs: 0,
          contentType: '',
          error: e?.message || 'request failed',
        } as PageData;
      }
    });

    for (const page of results) {
      if (!page) continue;
      pages.push(page);
      opts.onPage?.(page.url, pages.length, opts.maxPages);

      if (!page.ok || !page.html) continue;
      // Collect outbound internal links for the link graph + BFS frontier.
      const hrefs = Array.from(page.html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi))
        .map((m) => m[1])
        .slice(0, 400);
      const set = new Set<string>();
      for (const href of hrefs) {
        let abs: string | null = null;
        try {
          abs = canonicalise(new URL(href, page.finalUrl).toString());
        } catch {
          continue;
        }
        if (!abs || !sameSite(abs, start) || !isCrawlablePage(abs)) continue;
        set.add(abs);
        if (!seen.has(abs)) {
          seen.add(abs);
          discovered++;
          if (pages.length + queue.length < opts.maxPages * 3) {
            queue.push({ url: abs, depth: page.depth + 1 });
          }
        }
      }
      internalLinks.set(page.finalUrl, set);
    }
  }

  if (queue.length > 0) budgetHit = true;

  return {
    pages,
    discovered,
    crawled: pages.length,
    budgetHit,
    internalLinks,
    brokenInternal: [],
  };
}

/**
 * Probes a small set of well-known URLs that reveal a lot for very little cost:
 * host consolidation, soft-404 behaviour, the Squarespace `/home` duplicate,
 * and exposed sensitive paths.
 */
export async function probeSiteLevel(origin: string, deadline: number) {
  const u = new URL(origin);
  const host = u.hostname;
  const bare = host.replace(/^www\./, '');
  const targets = {
    httpRoot: `http://${host}/`,
    wwwVariant: host.startsWith('www.') ? `https://${bare}/` : `https://www.${bare}/`,
    random404: `${u.origin}/sqspell-probe-${Math.random().toString(36).slice(2, 10)}`,
    homeDuplicate: `${u.origin}/home`,
    config: `${u.origin}/config`,
    gitHead: `${u.origin}/.git/HEAD`,
    dotEnv: `${u.origin}/.env`,
  };

  const entries = Object.entries(targets);
  const results = await pool(entries, 4, async ([key, target]) => {
    if (Date.now() > deadline) return [key, null] as const;
    try {
      const noFollow = key === 'httpRoot' || key === 'wwwVariant' || key === 'config';
      const res = await safeFetch(target, {
        timeoutMs: 7000,
        maxBytes: key === 'random404' || key === 'homeDuplicate' ? 400_000 : 8_000,
        noFollow,
        discardBody: key === 'gitHead' || key === 'dotEnv',
      });
      return [
        key,
        {
          status: res.status,
          location: res.headers['location'] || '',
          finalUrl: res.finalUrl,
          body: res.body,
          bytes: res.bytes,
          headers: res.headers,
        },
      ] as const;
    } catch {
      return [key, null] as const;
    }
  });

  return Object.fromEntries(results) as Record<
    keyof typeof targets,
    { status: number; location: string; finalUrl: string; body: string; bytes: number; headers: Record<string, string> } | null
  >;
}
