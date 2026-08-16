/** URL normalisation shared by the crawler, the link graph and every check. */

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'source', '_ga',
];

const NON_PAGE_EXT =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|pdf|zip|rar|gz|mp4|webm|mov|mp3|wav|woff2?|ttf|eot|dmg|exe|csv|xlsx?|docx?|pptx?)$/i;

/** Accepts what a non-technical user would type: `mysite.com`, `www.mysite.com/`. */
export function normaliseInput(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '';
  s = s.replace(/\s+/g, '');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  return s;
}

export function canonicalise(u: string | URL, base?: string): string | null {
  let url: URL;
  try {
    url = typeof u === 'string' ? new URL(u, base) : u;
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
  // Squarespace serves `/about` and `/about/` identically; collapse for the graph.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const params = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [k, v] of params) url.searchParams.append(k, v);
  return url.toString();
}

export function sameSite(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.toLowerCase().replace(/^www\./, '');
    const hb = new URL(b).hostname.toLowerCase().replace(/^www\./, '');
    return ha === hb;
  } catch {
    return false;
  }
}

export function isCrawlablePage(u: string): boolean {
  try {
    const url = new URL(u);
    if (NON_PAGE_EXT.test(url.pathname)) return false;
    // Squarespace system + duplicate-content surfaces we never want in a crawl.
    if (/^\/(config|account|cart|checkout|search|api|commerce|universal)(\/|$)/i.test(url.pathname)) {
      return false;
    }
    if (url.searchParams.has('format')) return false;
    if (/\/(category|tag)\//i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function pathOf(u: string): string {
  try {
    return new URL(u).pathname || '/';
  } catch {
    return u;
  }
}

export function prettyHost(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}
