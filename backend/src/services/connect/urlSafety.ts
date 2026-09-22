import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';

/**
 * SSRF-safe server-side fetching for site verification.
 *  - public HTTP(S) hosts only, on ports 80 and 443
 *  - every resolved address is checked and the checked address is the one connected to (no DNS-rebinding window)
 *  - every redirect is re-validated from scratch
 *  - redirect count, response size and total time are capped
 */
export type SafeFetchCode = 'invalid_url' | 'unsupported_protocol' | 'blocked_address' | 'blocked_port' | 'too_many_redirects' | 'timeout' | 'network';
export class SafeFetchError extends Error {
  constructor(public code: SafeFetchCode, message: string) { super(message); this.name = 'SafeFetchError'; }
}

export type LookupResult = { address: string; family: number };
export type LookupFn = (hostname: string) => Promise<LookupResult[]>;

const defaultLookup: LookupFn = async (hostname) => (await dns.promises.lookup(hostname, { all: true, verbatim: true })) as LookupResult[];

function ipv4ToInt(ip: string): number | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x) || Number(x) > 255) return null;
    n = n * 256 + Number(x);
  }
  return n;
}

const V4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

function v4Blocked(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable: fail closed
  return V4_BLOCKS.some(([base, bits]) => {
    const b = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((b & mask) >>> 0);
  });
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split('%')[0];
  const dotted = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = ipv4ToInt(dotted[1]);
    if (n === null) return null;
    s = s.slice(0, -dotted[1].length) + ((n >>> 16) & 0xffff).toString(16) + ':' + (n & 0xffff).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function v6Blocked(ip: string): boolean {
  const g = expandV6(ip);
  if (!g) return true;
  const embedded = (hi: number, lo: number) => v4Blocked(((hi >> 8) & 255) + '.' + (hi & 255) + '.' + ((lo >> 8) & 255) + '.' + (lo & 255));
  if (g.every((x) => x === 0)) return true;                                   // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true;        // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return embedded(g[6], g[7]); // ::ffff:a.b.c.d (mapped)
  if (g.slice(0, 6).every((x) => x === 0)) return true;                       // ::a.b.c.d (deprecated compatible)
  if (g[0] === 0x64 && g[1] === 0xff9b) return true;                         // 64:ff9b::/96 NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true;                                // fc00::/7 unique local (includes fd00:ec2::254)
  if ((g[0] & 0xffc0) === 0xfe80) return true;                                // fe80::/10 link local
  if ((g[0] & 0xff00) === 0xff00) return true;                                // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;                        // documentation
  if (g[0] === 0x2002) return embedded(g[1], g[2]);                           // 6to4 embeds an IPv4 address
  if (g[0] === 0x2001 && g[1] === 0) return true;                             // Teredo
  return false;
}

/** True when the address must never be contacted (loopback, private, link-local, metadata, multicast, reserved, unparseable). */
export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return v4Blocked(ip);
  if (family === 6) return v6Blocked(ip);
  return true;
}

export interface SafeFetchOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
  lookup?: LookupFn;
  /** Honoured only when NODE_ENV is "test": lets the suite reach a LOOPBACK fixture server (127.0.0.0/8 and ::1 only; every other blocked range stays blocked). Ignored everywhere else. */
  allowLoopbackForTests?: boolean;
}
export interface SafeFetchResult { status: number; finalUrl: string; headers: Record<string, string>; body: string; truncated: boolean; redirects: string[] }

const USER_AGENT = 'SquarespellConnectVerifier/1 (+https://squarespellquiz.com)';

const isLoopback = (ip: string): boolean => ip === '::1' || /^127\./.test(ip);

async function resolvePublic(hostname: string, lookup: LookupFn, allowLoopback: boolean): Promise<LookupResult> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  const addrs: LookupResult[] = net.isIP(bare) ? [{ address: bare, family: net.isIP(bare) }] : await lookup(bare).catch(() => []);
  if (!addrs.length) throw new SafeFetchError('network', 'The domain did not resolve.');
  if (addrs.some((a) => isBlockedIp(a.address) && !(allowLoopback && isLoopback(a.address)))) throw new SafeFetchError('blocked_address', 'The address is not a public website.');
  return addrs[0];
}

function once(url: URL, ip: LookupResult, timeoutMs: number, maxBytes: number): Promise<{ status: number; headers: Record<string, string>; body: string; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        protocol: url.protocol, hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search, method: 'GET', timeout: timeoutMs,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'accept-encoding': 'identity', host: url.host },
        // Connect to the address we already validated: a second DNS answer can never redirect the connection.
        lookup: (_h: string, opts: any, cb: any) => (opts && opts.all ? cb(null, [{ address: ip.address, family: ip.family }]) : cb(null, ip.address, ip.family)),
        servername: net.isIP(url.hostname) ? undefined : url.hostname,
      } as any,
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        res.on('data', (c: Buffer) => {
          if (truncated) return;
          size += c.length;
          if (size > maxBytes) { truncated = true; chunks.push(c.subarray(0, Math.max(0, c.length - (size - maxBytes)))); res.destroy(); return; }
          chunks.push(c);
        });
        const finish = () => resolve({ status: res.statusCode || 0, headers, body: Buffer.concat(chunks).toString('utf8'), truncated });
        res.on('end', finish);
        res.on('close', finish);
        res.on('error', () => finish());
      },
    );
    req.on('timeout', () => req.destroy(new SafeFetchError('timeout', 'The website took too long to answer.')));
    req.on('error', (e: any) => reject(e instanceof SafeFetchError ? e : new SafeFetchError('network', 'The website could not be reached.')));
    const overall = setTimeout(() => req.destroy(new SafeFetchError('timeout', 'The website took too long to answer.')), timeoutMs + 500);
    req.on('close', () => clearTimeout(overall));
    req.end();
  });
}

/** Fetch a public page. Never follows a redirect without re-validating the new target. */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxRedirects = opts.maxRedirects ?? 3;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const maxBytes = opts.maxBytes ?? 512 * 1024;
  const lookup = opts.lookup ?? defaultLookup;
  const allowLoopback = process.env.NODE_ENV === 'test' && opts.allowLoopbackForTests === true;
  const redirects: string[] = [];
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let url: URL;
    try { url = new URL(current); } catch { throw new SafeFetchError('invalid_url', 'That is not a valid address.'); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new SafeFetchError('unsupported_protocol', 'Only http and https addresses can be checked.');
    if (url.username || url.password) throw new SafeFetchError('invalid_url', 'Addresses with credentials are not allowed.');
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!allowLoopback && port !== 80 && port !== 443) throw new SafeFetchError('blocked_port', 'Only standard web ports can be checked.');
    const ip = await resolvePublic(url.hostname, lookup, allowLoopback);
    const res = await once(url, ip, timeoutMs, maxBytes);
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      redirects.push(url.toString());
      if (hop === maxRedirects) throw new SafeFetchError('too_many_redirects', 'The website redirected too many times.');
      try { current = new URL(res.headers.location, url).toString(); } catch { throw new SafeFetchError('invalid_url', 'The website redirected to an invalid address.'); }
      continue;
    }
    return { status: res.status, finalUrl: url.toString(), headers: res.headers, body: res.body, truncated: res.truncated, redirects };
  }
  throw new SafeFetchError('too_many_redirects', 'The website redirected too many times.');
}
