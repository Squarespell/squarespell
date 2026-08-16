/** Sitemap discovery and parsing, including one level of sitemap-index recursion. */

import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from './safeFetch';
import type { RobotsInfo, SitemapInfo } from './types';

const GUESSES = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml'];
const MAX_SITEMAP_URLS = 3000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'url' || name === 'sitemap',
});

async function loadOne(url: string) {
  const res = await safeFetch(url, { timeoutMs: 10_000, maxBytes: 8_000_000 });
  if (res.status !== 200) return null;
  if (!/xml|text/.test(res.contentType || '')) return null;
  return res.body;
}

function parseUrlset(xml: string) {
  const doc = parser.parse(xml);
  const out: Array<{ loc: string; lastmod?: string }> = [];
  let isIndex = false;

  const urlset = doc?.urlset;
  const sitemapindex = doc?.sitemapindex;

  if (sitemapindex?.sitemap) {
    isIndex = true;
    for (const s of sitemapindex.sitemap) {
      const loc = typeof s?.loc === 'string' ? s.loc.trim() : '';
      if (loc) out.push({ loc, lastmod: s?.lastmod ? String(s.lastmod) : undefined });
    }
  } else if (urlset?.url) {
    for (const u of urlset.url) {
      const loc = typeof u?.loc === 'string' ? u.loc.trim() : String(u?.loc ?? '').trim();
      if (loc) out.push({ loc, lastmod: u?.lastmod ? String(u.lastmod) : undefined });
    }
  }
  return { entries: out, isIndex, hasRoot: !!(urlset || sitemapindex) };
}

export async function fetchSitemap(origin: string, robots: RobotsInfo): Promise<SitemapInfo> {
  const candidates: Array<{ url: string; source: 'robots' | 'guess' }> = [];
  for (const s of robots.sitemaps.slice(0, 3)) candidates.push({ url: s, source: 'robots' });
  for (const g of GUESSES) {
    const u = new URL(g, origin).toString();
    if (!candidates.some((c) => c.url === u)) candidates.push({ url: u, source: 'guess' });
  }

  for (const cand of candidates) {
    let xml: string | null = null;
    try {
      xml = await loadOne(cand.url);
    } catch {
      continue;
    }
    if (!xml) continue;

    let parsed;
    try {
      parsed = parseUrlset(xml);
    } catch (e: any) {
      return {
        found: true,
        source: cand.source,
        url: cand.url,
        urls: [],
        totalUrls: 0,
        isIndex: false,
        parseError: e?.message || 'XML parse error',
      };
    }
    if (!parsed.hasRoot) continue;

    if (parsed.isIndex) {
      const all: Array<{ loc: string; lastmod?: string }> = [];
      for (const child of parsed.entries.slice(0, 5)) {
        try {
          const childXml = await loadOne(child.loc);
          if (!childXml) continue;
          const childParsed = parseUrlset(childXml);
          all.push(...childParsed.entries);
          if (all.length > MAX_SITEMAP_URLS) break;
        } catch {
          /* skip unreadable child sitemaps */
        }
      }
      return {
        found: true,
        source: cand.source,
        url: cand.url,
        urls: all.slice(0, MAX_SITEMAP_URLS),
        totalUrls: all.length,
        isIndex: true,
      };
    }

    return {
      found: true,
      source: cand.source,
      url: cand.url,
      urls: parsed.entries.slice(0, MAX_SITEMAP_URLS),
      totalUrls: parsed.entries.length,
      isIndex: false,
    };
  }

  return { found: false, source: 'none', url: '', urls: [], totalUrls: 0, isIndex: false };
}
