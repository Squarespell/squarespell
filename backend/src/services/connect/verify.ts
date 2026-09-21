import { safeFetch, SafeFetchError, SafeFetchOptions } from './urlSafety';
import { hostnameFromHeader } from './hostname';
import { ReasonCode, isValidSlot } from './rules';

export interface PageScan { loaderFound: boolean; keyMatches: boolean; slots: string[] }
export interface VerifyResult {
  ok: boolean;
  reason: ReasonCode | null;
  url: string;
  status: number | null;
  loaderFound: boolean;
  slots: string[];
}

const SCRIPT_TAG = /<script\b[^>]*>/gi;
const attr = (tag: string, name: string): string | null => {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

/** Looks for the site loader (any script whose src ends in /connect/loader.js, with a data-site key) and named slots. */
export function scanHtml(html: string, siteKey: string): PageScan {
  let loaderFound = false;
  let keyMatches = false;
  for (const tag of html.match(SCRIPT_TAG) || []) {
    const src = attr(tag, 'src') || '';
    if (!/\/connect\/loader(\.v\d+)?\.js(\?|$)/i.test(src)) continue;
    loaderFound = true;
    if (attr(tag, 'data-site') === siteKey) keyMatches = true;
  }
  const slots: string[] = [];
  const slotRe = /data-squarespell-slot\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = slotRe.exec(html))) {
    const name = (m[1] ?? m[2] ?? '').toLowerCase();
    if (isValidSlot(name) && !slots.includes(name)) slots.push(name);
  }
  return { loaderFound, keyMatches, slots: slots.slice(0, 20) };
}

const PASSWORD_PAGE = /(password[- ]protected|sqs-password|site-password|lock-screen|enter (the )?password)/i;

/**
 * Server-side page check for a connected site. The hostname is the site's canonical hostname; the check follows redirects
 * (each re-validated) but fails with wrong_domain if the page ends up on a different hostname.
 */
export async function verifySite(input: { hostname: string; siteKey: string; path?: string; fetchOptions?: SafeFetchOptions; scheme?: 'https' | 'http'; testPort?: number }): Promise<VerifyResult> {
  const path = input.path && input.path.startsWith('/') ? input.path : '/';
  // testPort exists only so the test suite can reach a loopback fixture; it is ignored outside NODE_ENV=test.
  const port = process.env.NODE_ENV === 'test' && input.testPort ? ':' + input.testPort : '';
  const url = (input.scheme || 'https') + '://' + input.hostname + port + path;
  const fail = (reason: ReasonCode, status: number | null = null): VerifyResult => ({ ok: false, reason, url, status, loaderFound: false, slots: [] });
  let res;
  try {
    res = await safeFetch(url, input.fetchOptions);
  } catch (e: any) {
    if (e instanceof SafeFetchError) return fail(e.code === 'timeout' ? 'timeout' : 'unreachable');
    return fail('unreachable');
  }
  const finalHost = hostnameFromHeader(res.finalUrl);
  if (!finalHost || finalHost !== input.hostname) return fail('wrong_domain', res.status);
  if (res.status === 401 || res.status === 403) return fail('page_requires_login', res.status);
  if (res.status >= 400) return fail('unreachable', res.status);
  if (PASSWORD_PAGE.test(res.body) && /type\s*=\s*["']password["']/i.test(res.body)) return fail('page_requires_login', res.status);
  const scan = scanHtml(res.body, input.siteKey);
  if (!scan.loaderFound || !scan.keyMatches) return { ok: false, reason: 'loader_not_found', url, status: res.status, loaderFound: scan.loaderFound, slots: scan.slots };
  return { ok: true, reason: null, url, status: res.status, loaderFound: true, slots: scan.slots };
}
