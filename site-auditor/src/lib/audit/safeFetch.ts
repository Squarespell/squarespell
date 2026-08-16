/**
 * SSRF-hardened HTTP client.
 *
 * Threat model: the URL is fully attacker-controlled. We must never let the
 * crawler reach private networks, link-local addresses, or cloud metadata
 * endpoints, including via DNS that resolves to them, via redirects, or via
 * DNS rebinding between the check and the connect.
 *
 * Mitigations, in order:
 *   1. Scheme / port / credential allow-listing before any network activity.
 *   2. A custom `lookup` installed on the socket so every DNS answer is
 *      validated *at connect time*. This closes the rebinding window that a
 *      "resolve-then-fetch" implementation leaves open.
 *   3. Manual redirect handling, each hop is re-validated from scratch.
 *   4. Hard caps on response bytes, redirect hops and wall-clock time.
 *   5. Decompression handled explicitly with a cap so a zip bomb cannot
 *      exhaust memory.
 */

import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import tls from 'node:tls';

export const USER_AGENT =
  'Mozilla/5.0 (compatible; SquarespellAuditBot/1.0; +https://squarespell.com/squarespace-site-auditor)';

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
const MAX_BYTES = 3_000_000; // 3 MB per response, decompressed
const MAX_REDIRECTS = 5;

export class BlockedUrlError extends Error {
  code = 'BLOCKED_URL';
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

/* ------------------------------------------------------------------ */
/* IP range validation                                                 */
/* ------------------------------------------------------------------ */

function ipv4ToInt(ip: string): number {
  const p = ip.split('.').map(Number);
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC1918
  ['100.64.0.0', 10], // CGNAT (Alibaba metadata lives at 100.100.100.200)
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + AWS/GCP/Azure metadata 169.254.169.254
  ['172.16.0.0', 12], // RFC1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // RFC1918
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function isBlockedIPv4(ip: string): boolean {
  const v = ipv4ToInt(ip);
  for (const [base, bits] of BLOCKED_V4) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((v & mask) === (ipv4ToInt(base) & mask)) return true;
  }
  return false;
}

function expandIPv6(ip: string): string[] {
  // Returns the 8 hextets as lowercase hex strings, or [] if unparseable.
  let addr = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  // IPv4-mapped / -compatible tail
  const v4m = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4m) {
    const p = v4m[1].split('.').map(Number);
    const hex =
      ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16);
    addr = addr.slice(0, v4m.index) + hex;
  }
  const [head, tail] = addr.split('::');
  const h = head ? head.split(':').filter(Boolean) : [];
  const t = tail !== undefined ? tail.split(':').filter(Boolean) : null;
  let parts: string[];
  if (t === null) {
    parts = h;
  } else {
    const fill = 8 - h.length - t.length;
    if (fill < 0) return [];
    parts = [...h, ...Array(fill).fill('0'), ...t];
  }
  if (parts.length !== 8) return [];
  return parts.map((p) => p.padStart(4, '0'));
}

function isBlockedIPv6(ip: string): boolean {
  const parts = expandIPv6(ip);
  if (parts.length !== 8) return true; // unparseable => refuse
  const first = parseInt(parts[0], 16);
  const joined = parts.join('');

  if (joined === '0'.repeat(31) + '1') return true; // ::1 loopback
  if (joined === '0'.repeat(32)) return true; // :: unspecified
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (parts[0] === '2001' && parts[1] === '0db8') return true; // doc range
  // IPv4-mapped ::ffff:a.b.c.d, validate the embedded v4 address
  if (parts.slice(0, 5).every((p) => p === '0000') && parts[5] === 'ffff') {
    const v4 = [
      parseInt(parts[6].slice(0, 2), 16),
      parseInt(parts[6].slice(2, 4), 16),
      parseInt(parts[7].slice(0, 2), 16),
      parseInt(parts[7].slice(2, 4), 16),
    ].join('.');
    return isBlockedIPv4(v4);
  }
  // EC2 IMDSv6 endpoint fd00:ec2::254 is inside fc00::/7, already blocked.
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIPv4(ip);
  if (family === 6) return isBlockedIPv6(ip);
  return true;
}

/* ------------------------------------------------------------------ */
/* URL validation                                                      */
/* ------------------------------------------------------------------ */

export function validateUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BlockedUrlError('That does not look like a valid web address.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new BlockedUrlError('Only http:// and https:// addresses can be audited.');
  }
  if (u.username || u.password) {
    throw new BlockedUrlError('Addresses containing credentials are not allowed.');
  }
  const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw new BlockedUrlError(`Port ${port} is not allowed.`);
  }
  // URL keeps IPv6 literals bracketed; strip them so net.isIP can classify.
  const host = u.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!host) throw new BlockedUrlError('Missing hostname.');
  // Literal IPs: block private ranges outright, no DNS needed.
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new BlockedUrlError('That address points to a private network.');
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new BlockedUrlError('That address points to a private network.');
  }
  // Reserved / internal-only TLDs (RFC 6761, RFC 8375, common intranet).
  if (/\.(local|internal|intranet|localdomain|home|lan|corp|test|example|invalid|onion|alt)$/.test(host)) {
    throw new BlockedUrlError('That address points to a private network.');
  }
  if (!net.isIP(host) && !host.includes('.')) {
    throw new BlockedUrlError('Enter a full domain, for example yoursite.com');
  }
  return u;
}

/** Custom DNS lookup that refuses to hand a private address to the socket. */
const guardedLookup: NonNullable<http.RequestOptions['lookup']> = (
  hostname,
  options,
  callback
) => {
  dns.lookup(hostname, { ...(options as object), all: true }, (err, addresses: any) => {
    if (err) return (callback as any)(err);
    const list: Array<{ address: string; family: number }> = Array.isArray(addresses)
      ? addresses
      : [addresses];
    const safe = list.filter((a) => !isBlockedAddress(a.address));
    if (safe.length === 0) {
      return (callback as any)(
        new BlockedUrlError(`${hostname} resolves to a private or reserved address.`)
      );
    }
    if ((options as any)?.all) return (callback as any)(null, safe);
    return (callback as any)(null, safe[0].address, safe[0].family);
  });
};

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

export interface SafeResponse {
  url: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  ttfbMs: number;
  redirectChain: string[];
  contentType: string;
  truncated: boolean;
  /** Only populated for HTTPS on the first hop when `wantCert` is set. */
  cert?: { validTo: string; validFrom: string; issuer: string; subjectAltNames: string };
}

export interface SafeFetchOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  /** Stop at the first response instead of following redirects. */
  noFollow?: boolean;
  wantCert?: boolean;
  /** Do not read the body (used for cheap asset probes). */
  discardBody?: boolean;
}

function singleRequest(
  url: URL,
  opts: Required<Pick<SafeFetchOptions, 'method' | 'timeoutMs' | 'maxBytes'>> &
    SafeFetchOptions
): Promise<{
  status: number;
  headers: Record<string, string>;
  location?: string;
  body: string;
  bytes: number;
  ttfbMs: number;
  truncated: boolean;
  cert?: SafeResponse['cert'];
}> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const start = Date.now();
    let settled = false;

    // Hard watchdog: `timeout` on the request only covers socket inactivity.
    // This guarantees the promise settles even if a stream stalls mid-body.
    const watchdog = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        req.destroy();
      } catch {
        /* ignore */
      }
      reject(new Error('Request timed out'));
    }, opts.timeoutMs + 3000);
    watchdog.unref?.();
    const done = <T>(fn: (v: T) => void) => (v: T) => {
      clearTimeout(watchdog);
      fn(v);
    };
    const resolveOnce = done(resolve);
    const rejectOnce = done(reject);

    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: opts.method,
        lookup: guardedLookup,
        // Squarespace and most CDNs are fine with these; we never send cookies.
        headers: {
          'user-agent': USER_AGENT,
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br',
          ...(opts.headers || {}),
        },
        servername: isHttps && !net.isIP(url.hostname) ? url.hostname : undefined,
        rejectUnauthorized: false, // we *report* cert problems rather than failing
        timeout: opts.timeoutMs,
        agent: false,
      },
      (res) => {
        const ttfbMs = Date.now() - start;
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          headers[k.toLowerCase()] = Array.isArray(v) ? v.join('; ') : String(v ?? '');
        }

        let cert: SafeResponse['cert'] | undefined;
        if (opts.wantCert && isHttps) {
          try {
            const socket = res.socket as tls.TLSSocket;
            const peer = socket.getPeerCertificate?.();
            if (peer && peer.valid_to) {
              cert = {
                validTo: peer.valid_to,
                validFrom: peer.valid_from,
                issuer: [peer.issuer?.O, peer.issuer?.CN].filter(Boolean).join(' '),
                subjectAltNames: (peer as any).subjectaltname || '',
              };
            }
          } catch {
            /* cert info is best-effort */
          }
        }

        const status = res.statusCode || 0;
        const location = headers['location'];

        if (opts.method === 'HEAD' || opts.discardBody) {
          res.resume();
          if (!settled) {
            settled = true;
            resolveOnce({ status, headers, location, body: '', bytes: 0, ttfbMs, truncated: false, cert });
          }
          return;
        }

        // Decompress explicitly so we can cap decompressed size.
        const enc = (headers['content-encoding'] || '').toLowerCase();
        let stream: Readable = res;
        try {
          if (enc.includes('br')) stream = res.pipe(zlib.createBrotliDecompress());
          else if (enc.includes('gzip')) stream = res.pipe(zlib.createGunzip());
          else if (enc.includes('deflate')) stream = res.pipe(zlib.createInflate());
        } catch {
          stream = res;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        let truncated = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          const buf = Buffer.concat(chunks);
          resolveOnce({
            status,
            headers,
            location,
            body: buf.toString('utf8'),
            bytes: buf.length,
            ttfbMs,
            truncated,
            cert,
          });
        };

        stream.on('data', (c: Buffer) => {
          if (settled) return;
          const room = opts.maxBytes - total;
          if (c.length >= room) {
            // Cap reached. Settle immediately, then tear down BOTH the socket
            // and the decompressor, destroying only the socket leaves a piped
            // zlib stream that never emits end/close, so the promise would hang.
            truncated = true;
            if (room > 0) chunks.push(c.subarray(0, room));
            total = opts.maxBytes;
            finish();
            try {
              res.destroy();
              if (stream !== res) (stream as any).destroy?.();
            } catch {
              /* teardown is best-effort */
            }
            return;
          }
          total += c.length;
          chunks.push(c);
        });
        stream.on('end', finish);
        stream.on('close', finish);
        stream.on('error', () => finish());
        res.on('aborted', finish);
        res.on('error', () => finish());
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      rejectOnce(err);
    });
    req.end();
  });
}

export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeResponse> {
  const opts = {
    method: options.method || 'GET',
    timeoutMs: options.timeoutMs ?? 12_000,
    maxBytes: options.maxBytes ?? MAX_BYTES,
    ...options,
  } as Required<Pick<SafeFetchOptions, 'method' | 'timeoutMs' | 'maxBytes'>> &
    SafeFetchOptions;

  let current = validateUrl(rawUrl);
  const chain: string[] = [];
  let cert: SafeResponse['cert'] | undefined;
  const deadline = Date.now() + opts.timeoutMs * (options.noFollow ? 1 : 2.5);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (Date.now() > deadline) throw new Error('Request timed out');

    const res = await singleRequest(current, {
      ...opts,
      wantCert: opts.wantCert && hop === 0,
      timeoutMs: Math.max(2000, Math.min(opts.timeoutMs, deadline - Date.now())),
    });
    if (res.cert) cert = res.cert;

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status) && res.location;
    if (!isRedirect || options.noFollow) {
      return {
        url: rawUrl,
        finalUrl: current.toString(),
        status: res.status,
        headers: res.headers,
        body: res.body,
        bytes: res.bytes,
        ttfbMs: res.ttfbMs,
        redirectChain: chain,
        contentType: (res.headers['content-type'] || '').split(';')[0].trim(),
        truncated: res.truncated,
        cert,
      };
    }

    chain.push(current.toString());
    let next: URL;
    try {
      next = new URL(res.location!, current);
    } catch {
      throw new BlockedUrlError('The site returned an invalid redirect.');
    }
    // Re-validate every hop from scratch, this is where naive clients get owned.
    current = validateUrl(next.toString());
  }

  throw new Error('Too many redirects');
}

/** Cheap HEAD probe used for images and sub-resources. Never throws. */
export async function probeAsset(url: string, timeoutMs = 6000) {
  const out = {
    url,
    status: 0,
    bytes: 0,
    contentType: '',
    cacheControl: '',
    contentEncoding: '',
    error: undefined as string | undefined,
  };
  try {
    const res = await safeFetch(url, { method: 'HEAD', timeoutMs, discardBody: true });
    out.status = res.status;
    out.bytes = Number(res.headers['content-length'] || 0);
    out.contentType = res.contentType;
    out.cacheControl = res.headers['cache-control'] || '';
    out.contentEncoding = res.headers['content-encoding'] || '';
    // Some CDNs reject HEAD; fall back to a byte-ranged GET.
    if (res.status === 405 || (res.status === 200 && !out.bytes)) {
      const g = await safeFetch(url, {
        method: 'GET',
        timeoutMs,
        maxBytes: 4096,
        headers: { range: 'bytes=0-2047' },
      });
      out.status = g.status === 206 ? 200 : g.status;
      out.contentType = g.contentType || out.contentType;
      const cr = g.headers['content-range'];
      if (cr) {
        const m = cr.match(/\/(\d+)$/);
        if (m) out.bytes = Number(m[1]);
      } else if (!out.bytes) {
        out.bytes = Number(g.headers['content-length'] || 0);
      }
      out.cacheControl = g.headers['cache-control'] || out.cacheControl;
    }
  } catch (e: any) {
    out.error = e?.message || 'probe failed';
  }
  return out;
}

/** Bounded-concurrency map. Keeps us from hammering a customer's site. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = undefined as unknown as R;
      }
    }
  });
  await Promise.all(workers);
  return results;
}
