/**
 * One-button connect: pure units and the SSRF-safe fetcher. No database. A loopback fixture server stands in for a customer website;
 * every other blocked address range stays blocked even in tests.
 */
import { describe, it, expect, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { normalizeHostname, hostnameFromHeader, hostMatchesSite } from '../../services/connect/hostname';
import { isBlockedIp, safeFetch, SafeFetchError } from '../../services/connect/urlSafety';
import { generateSiteKey, isValidSiteKey, isValidSlot, normalizePathRule, normalizePathRules, matchesPath, sanitizeOptions, buildManifestBody } from '../../services/connect/rules';
import { scanHtml, verifySite } from '../../services/connect/verify';

const LOOPBACK = async () => [{ address: '127.0.0.1', family: 4 }];
const KEY = 'ssq_' + 'A'.repeat(32);

const servers: http.Server[] = [];
async function serve(handler: http.RequestListener): Promise<number> {
  const s = http.createServer(handler);
  servers.push(s);
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
  return (s.address() as AddressInfo).port;
}
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => { s.closeAllConnections?.(); s.close(() => r()); }))); });

describe('hostname normalization', () => {
  it('reduces addresses to one canonical hostname', () => {
    expect(normalizeHostname('https://WWW.Example.COM/path?x=1#top')).toEqual({ ok: true, hostname: 'example.com' });
    expect(normalizeHostname('example.com:8443')).toEqual({ ok: true, hostname: 'example.com' });
    expect(normalizeHostname('example.com.')).toEqual({ ok: true, hostname: 'example.com' });
    expect(normalizeHostname('  Shop.Example.Co.UK ')).toEqual({ ok: true, hostname: 'shop.example.co.uk' });
    expect(normalizeHostname('Bücher.example')).toEqual({ ok: true, hostname: 'xn--bcher-kva.example' });
  });
  it.each(['', 'localhost', '127.0.0.1', '[::1]', 'http://user:pw@example.com', 'intranet', 'printer.internal', 'host.local', 'javascript:alert(1)', '10.0.0.1', 'exa mple.com', 'ftp://example.com', 'a'.repeat(300) + '.com', 'example.123'])('rejects %j', (v) => {
    expect(normalizeHostname(v).ok).toBe(false);
  });
  it('rejects non-strings', () => { expect(normalizeHostname(undefined).ok).toBe(false); expect(normalizeHostname(42).ok).toBe(false); });
  it('reads the hostname from Origin and Referer values and binds sites to it', () => {
    expect(hostnameFromHeader('https://www.customer.example')).toBe('customer.example');
    expect(hostnameFromHeader('https://customer.example/some/page?a=1')).toBe('customer.example');
    expect(hostnameFromHeader(undefined)).toBeNull();
    expect(hostnameFromHeader('null')).toBeNull();
    expect(hostMatchesSite('customer.example', 'customer.example')).toBe(true);
    expect(hostMatchesSite('customer.example', 'evil.example')).toBe(false);
    expect(hostMatchesSite('customer.example', 'customer.example.evil.example')).toBe(false);
    expect(hostMatchesSite('customer.example', null)).toBe(false);
  });
});

describe('SSRF: blocked address ranges', () => {
  it.each([
    '127.0.0.1', '127.255.255.254', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    '255.255.255.255', '198.18.0.1', '192.0.2.10', '::', '::1', 'fe80::1', 'fc00::1', 'fd00:ec2::254', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1',
    '2002:7f00:1::', 'ff02::1', '2001:db8::1', '64:ff9b::a00:1', 'not-an-ip',
  ])('blocks %s', (ip) => { expect(isBlockedIp(ip)).toBe(true); });
  it.each(['8.8.8.8', '93.184.216.34', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8', '2002:0808:0808::'])('allows public %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('SSRF: safeFetch refuses before connecting', () => {
  const codeOf = async (url: string, lookup?: any) => { try { await safeFetch(url, { lookup }); return 'no error'; } catch (e: any) { return e instanceof SafeFetchError ? e.code : 'other:' + e?.message; } };
  it.each(['http://127.0.0.1/', 'http://localhost/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.5/', 'http://192.168.0.1/', 'http://100.64.0.1/', 'http://0.0.0.0/'])('%s is blocked', async (u) => {
    expect(await codeOf(u, LOOPBACK)).toBe('blocked_address');
  });
  it('refuses non-web ports, other protocols and credentials', async () => {
    expect(await codeOf('http://example.com:22/')).toBe('blocked_port');
    expect(await codeOf('http://example.com:6379/')).toBe('blocked_port');
    expect(await codeOf('ftp://example.com/')).toBe('unsupported_protocol');
    expect(await codeOf('file:///etc/passwd')).toBe('unsupported_protocol');
    expect(await codeOf('http://user:pw@example.com/')).toBe('invalid_url');
    expect(await codeOf('not a url')).toBe('invalid_url');
  });
  it('blocks a name that resolves to a private address, and any name with even one private answer (DNS rebinding)', async () => {
    expect(await codeOf('http://internal.example/', async () => [{ address: '10.0.0.1', family: 4 }])).toBe('blocked_address');
    expect(await codeOf('http://rebind.example/', async () => [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }])).toBe('blocked_address');
    expect(await codeOf('http://metadata.example/', async () => [{ address: '169.254.169.254', family: 4 }])).toBe('blocked_address');
  });
  it('reports an unresolvable name as a network problem, not a crash', async () => {
    expect(await codeOf('http://nowhere.example/', async () => { throw new Error('ENOTFOUND'); })).toBe('network');
  });
});

describe('SSRF: fetching a loopback fixture (test-only escape hatch)', () => {
  const opts = (extra: any = {}) => ({ allowLoopbackForTests: true, lookup: LOOPBACK, timeoutMs: 1500, ...extra });
  it('is ignored outside NODE_ENV=test: in production nothing on loopback is ever contacted', async () => {
    let hits = 0;
    const port = await serve((_q, r) => { hits++; r.end('hi'); });
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const outcome = await safeFetch('http://site.example.test:' + port + '/', opts()).then(() => 'fetched', (e: any) => e.code);
      expect(['blocked_port', 'blocked_address']).toContain(outcome);
      const literal = await safeFetch('http://127.0.0.1/', opts()).then(() => 'fetched', (e: any) => e.code);
      expect(literal).toBe('blocked_address');
    } finally { process.env.NODE_ENV = prev; }
    expect(hits).toBe(0);
  });
  it('returns the page', async () => {
    const port = await serve((_q, r) => { r.setHeader('content-type', 'text/html'); r.end('<p>hello</p>'); });
    const res = await safeFetch('http://site.example.test:' + port + '/', opts());
    expect(res.status).toBe(200);
    expect(res.body).toBe('<p>hello</p>');
  });
  it('follows a redirect between public-looking names and reports the hops', async () => {
    const port = await serve((q, r) => { if (q.url === '/start') { r.statusCode = 302; r.setHeader('location', 'http://b.example.test:' + port + '/end'); r.end(); } else r.end('done'); });
    const res = await safeFetch('http://a.example.test:' + port + '/start', opts());
    expect(res.body).toBe('done');
    expect(res.redirects).toHaveLength(1);
    expect(res.finalUrl).toContain('b.example.test');
  });
  it('re-checks every redirect: a redirect to the metadata address or a private name is refused', async () => {
    const port = await serve((q, r) => { r.statusCode = 302; r.setHeader('location', q.url === '/meta' ? 'http://169.254.169.254/latest/meta-data/' : 'http://internal.example.test:' + port + '/'); r.end(); });
    await expect(safeFetch('http://a.example.test:' + port + '/meta', opts())).rejects.toMatchObject({ code: 'blocked_address' });
    const lookup = async (h: string) => (h === 'internal.example.test' ? [{ address: '10.0.0.9', family: 4 }] : [{ address: '127.0.0.1', family: 4 }]);
    await expect(safeFetch('http://a.example.test:' + port + '/priv', opts({ lookup }))).rejects.toMatchObject({ code: 'blocked_address' });
  });
  it('stops a redirect loop', async () => {
    const port = await serve((_q, r) => { r.statusCode = 302; r.setHeader('location', '/again'); r.end(); });
    await expect(safeFetch('http://a.example.test:' + port + '/', opts({ maxRedirects: 2 }))).rejects.toMatchObject({ code: 'too_many_redirects' });
  });
  it('caps the response size', async () => {
    const port = await serve((_q, r) => { r.write('x'.repeat(2_000_000)); r.end(); });
    const res = await safeFetch('http://a.example.test:' + port + '/', opts({ maxBytes: 1024 }));
    expect(res.truncated).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(1024);
  });
  it('gives up on a server that never answers', async () => {
    const port = await serve(() => { /* never respond */ });
    await expect(safeFetch('http://a.example.test:' + port + '/', opts({ timeoutMs: 250 }))).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('site keys, slots, page rules and display options', () => {
  it('site keys are long, random, unique and validated', () => {
    const keys = Array.from({ length: 200 }, () => generateSiteKey());
    expect(new Set(keys).size).toBe(200);
    for (const k of keys) { expect(isValidSiteKey(k)).toBe(true); expect(k.length).toBeGreaterThanOrEqual(36); }
    for (const bad of ['', 'abc', 'ssq_short', 'ssq_' + '!'.repeat(32), 'sk_live_' + 'a'.repeat(32), null, 42]) expect(isValidSiteKey(bad)).toBe(false);
  });
  it('slot names', () => {
    for (const ok of ['hero', 'services-quiz', 'a1', 'x'.repeat(40)]) expect(isValidSlot(ok)).toBe(true);
    for (const bad of ['', 'Hero', '-a', 'a b', 'a_b', 'x'.repeat(41), '<b>', '../x', undefined]) expect(isValidSlot(bad)).toBe(false);
  });
  it('page rule normalisation', () => {
    expect(normalizePathRule('/Pricing/')).toBe('/pricing');
    expect(normalizePathRule('/services/*')).toBe('/services/*');
    expect(normalizePathRule('*')).toBe('*');
    expect(normalizePathRule('/*')).toBe('*');
    for (const bad of ['pricing', '/a*b', '/a/*/b', '/x y', '/x?y=1', '/x#y', '/<script>', 42, '/' + 'a'.repeat(250)]) expect(normalizePathRule(bad as any)).toBeNull();
    expect(normalizePathRules(['/a', '/A/', '/b'])).toEqual({ ok: true, rules: ['/a', '/b'] });
    expect(normalizePathRules(Array.from({ length: 21 }, (_, i) => '/p' + i)).ok).toBe(false);
    expect(normalizePathRules('/a' as any).ok).toBe(false);
    expect(normalizePathRules(undefined)).toEqual({ ok: true, rules: [] });
  });
  it('page rules: include, exclude, sections, root and case', () => {
    expect(matchesPath('/anything', [], [])).toBe(true);
    expect(matchesPath('/services', ['/services/*'], [])).toBe(true);
    expect(matchesPath('/services/web-design', ['/services/*'], [])).toBe(true);
    expect(matchesPath('/servicesx', ['/services/*'], [])).toBe(false);
    expect(matchesPath('/pricing/', ['/pricing'], [])).toBe(true);
    expect(matchesPath('/PRICING?ref=x#top', ['/pricing'], [])).toBe(true);
    expect(matchesPath('/', ['/'], [])).toBe(true);
    expect(matchesPath('/about', ['/'], [])).toBe(false);
    expect(matchesPath('/checkout/pay', ['*'], ['/checkout/*'])).toBe(false);
    expect(matchesPath('/blog/a', ['*'], ['/checkout/*'])).toBe(true);
    expect(matchesPath('/services/private', ['/services/*'], ['/services/private'])).toBe(false);
  });
  it('display options keep only known, safe fields', () => {
    expect(sanitizeOptions('popup', {})).toEqual({ trigger: 'delay', delaySeconds: 8 });
    expect(sanitizeOptions('popup', { trigger: 'exit', buttonText: '<img src=x onerror=1>Go', accentColor: '#0F7377', evil: 'x', user_id: 'u' })).toEqual({ trigger: 'exit', buttonText: 'img src=x onerror=1Go', accentColor: '#0f7377' });
    expect(sanitizeOptions('popup', { trigger: 'scroll', scrollPercent: 99 })).toEqual({ trigger: 'scroll', scrollPercent: 50 });
    expect(sanitizeOptions('floating_tab', { buttonText: 'Take the quiz', accentColor: 'red', height: 500 })).toEqual({ buttonText: 'Take the quiz' });
    expect(sanitizeOptions('inline', { height: 640, buttonText: 'x', trigger: 'exit' })).toEqual({ height: 640 });
    expect(sanitizeOptions('inline', { height: 50 })).toEqual({});
    expect(sanitizeOptions('inline', 'nonsense')).toEqual({});
    expect(sanitizeOptions('popup', { trigger: 'delay', delaySeconds: 3, hideOnMobile: true, dismissDays: 7 })).toEqual({ trigger: 'delay', delaySeconds: 3, hideOnMobile: true, dismissDays: 7 });
    expect(sanitizeOptions('popup', { hideOnMobile: 'yes', dismissDays: 400 })).toEqual({ trigger: 'delay', delaySeconds: 8 });
    expect(sanitizeOptions('floating_tab', { hideOnMobile: true, dismissDays: 7 })).toEqual({ hideOnMobile: true });
    expect(sanitizeOptions('inline', { hideOnMobile: true, dismissDays: 7 })).toEqual({});
  });
  it('the public manifest body has exactly the display fields and never any private data', () => {
    const body = buildManifestBody({ site_key: KEY, hostname: 'customer.example' }, [{ id: 'i1', quiz: 'my-quiz', mode: 'popup', slot: null, include: [], exclude: [], options: { trigger: 'delay', delaySeconds: 8 } }]);
    expect(Object.keys(body).sort()).toEqual(['generatedAt', 'hostname', 'installations', 'paused', 'site', 'v', 'version']);
    expect(JSON.stringify(body)).not.toMatch(/user_id|email|token|secret|password/i);
    expect(buildManifestBody({ site_key: KEY, hostname: 'customer.example' }, [{ id: 'i1', quiz: 'q', mode: 'popup', slot: null, include: [], exclude: [], options: {} }], true).installations).toEqual([]);
  });
});

describe('page scanning', () => {
  it('finds the loader with the matching site key', () => {
    expect(scanHtml('<script src="https://squarespellquiz.com/connect/loader.js" data-site="' + KEY + '" async></script>', KEY)).toEqual({ loaderFound: true, keyMatches: true, slots: [] });
    expect(scanHtml("<script data-site='" + KEY + "' async src='https://staging.squarespellquiz.com/connect/loader.js?v=3'></script>", KEY).keyMatches).toBe(true);
  });
  it('a loader for another site does not verify this site', () => {
    const r = scanHtml('<script src="https://squarespellquiz.com/connect/loader.js" data-site="ssq_' + 'B'.repeat(32) + '"></script>', KEY);
    expect(r.loaderFound).toBe(true);
    expect(r.keyMatches).toBe(false);
  });
  it('ignores unrelated scripts, even ones that carry the key', () => {
    expect(scanHtml('<script src="/app.js" data-site="' + KEY + '"></script>', KEY)).toEqual({ loaderFound: false, keyMatches: false, slots: [] });
    expect(scanHtml('<p>nothing here</p>', KEY).loaderFound).toBe(false);
  });
  it('detects named inline slots and ignores invalid or duplicate names', () => {
    const html = '<div data-squarespell-slot="hero-quiz"></div><div data-squarespell-slot="hero-quiz"></div><div data-squarespell-slot=\'footer\'></div><div data-squarespell-slot="Bad Slot"></div>';
    expect(scanHtml(html, KEY).slots).toEqual(['hero-quiz', 'footer']);
  });
});

describe('server-side verification of a site (loopback fixture)', () => {
  const LOADER = '<script src="https://squarespellquiz.com/connect/loader.js" data-site="' + KEY + '" async></script>';
  const run = async (handler: http.RequestListener, extra: any = {}, host = 'customer.example.test') => {
    const port = await serve(handler);
    return verifySite({ hostname: host, siteKey: KEY, scheme: 'http', testPort: port, fetchOptions: { allowLoopbackForTests: true, lookup: LOOPBACK, timeoutMs: 1200, ...extra } });
  };
  it('passes when the page carries this site\'s loader, and reports the slots it finds', async () => {
    const r = await run((_q, res) => res.end('<html>' + LOADER + '<div data-squarespell-slot="hero"></div></html>'));
    expect(r).toMatchObject({ ok: true, reason: null, loaderFound: true, slots: ['hero'] });
  });
  it('accepts the www twin of the connected hostname', async () => {
    const port = await serve((q, res) => { if (q.headers.host!.startsWith('customer')) { res.statusCode = 301; res.setHeader('location', 'http://www.customer.example.test:' + port + '/'); res.end(); } else res.end(LOADER); });
    const r = await verifySite({ hostname: 'customer.example.test', siteKey: KEY, scheme: 'http', testPort: port, fetchOptions: { allowLoopbackForTests: true, lookup: LOOPBACK, timeoutMs: 1200 } });
    expect(r.ok).toBe(true);
  });
  it('loader_not_found when the loader is missing or belongs to another site', async () => {
    expect((await run((_q, res) => res.end('<html>nothing</html>'))).reason).toBe('loader_not_found');
    expect((await run((_q, res) => res.end('<script src="https://squarespellquiz.com/connect/loader.js" data-site="ssq_' + 'C'.repeat(32) + '"></script>'))).reason).toBe('loader_not_found');
  });
  it('site_private for a Squarespace Private Site page, not a password lock', async () => {
    const priv = '<!DOCTYPE HTML><html><head><title>Private Site</title></head><body></body></html>';
    expect((await run((_q, res) => { res.statusCode = 401; res.end(priv); })).reason).toBe('site_private');
    expect((await run((_q, res) => { res.statusCode = 401; res.end(priv.replace('<body>', '<body><input type="password">')); })).reason).toBe('page_requires_login');
  });

  it('page_requires_login for 401, 403 and a password lock screen', async () => {
    expect((await run((_q, res) => { res.statusCode = 401; res.end(); })).reason).toBe('page_requires_login');
    expect((await run((_q, res) => { res.statusCode = 403; res.end(); })).reason).toBe('page_requires_login');
    expect((await run((_q, res) => res.end('<html class="sqs-password"><form><input type="password" name="password"></form>' + LOADER + '</html>'))).reason).toBe('page_requires_login');
  });
  it('unreachable for a missing page, a private address and a network failure', async () => {
    expect((await run((_q, res) => { res.statusCode = 404; res.end(); })).reason).toBe('unreachable');
    expect((await run((_q, res) => res.end(LOADER), { lookup: async () => [{ address: '10.0.0.7', family: 4 }] })).reason).toBe('unreachable');
  });
  it('wrong_domain when the site redirects to a different hostname', async () => {
    const r = await run((_q, res) => { res.statusCode = 302; res.setHeader('location', 'http://other.example.test/'); res.end(); }, { lookup: async () => [{ address: '127.0.0.1', family: 4 }] });
    expect(['wrong_domain', 'unreachable']).toContain(r.reason);
    const port = await serve((_q, res) => res.end(LOADER));
    const r2 = await verifySite({ hostname: 'customer.example.test', siteKey: KEY, scheme: 'http', testPort: port, fetchOptions: { allowLoopbackForTests: true, lookup: LOOPBACK, timeoutMs: 1200 } });
    expect(r2.ok).toBe(true);
  });
  it('wrong_domain is reported when the final hostname differs', async () => {
    const port = await serve((q, res) => { if (q.headers.host!.startsWith('customer')) { res.statusCode = 302; res.setHeader('location', 'http://other.example.test:' + port + '/'); res.end(); } else res.end(LOADER); });
    const r = await verifySite({ hostname: 'customer.example.test', siteKey: KEY, scheme: 'http', testPort: port, fetchOptions: { allowLoopbackForTests: true, lookup: LOOPBACK, timeoutMs: 1200 } });
    expect(r.reason).toBe('wrong_domain');
  });
  it('timeout when the site does not answer', async () => {
    expect((await run(() => { /* never respond */ }, { timeoutMs: 250 })).reason).toBe('timeout');
  });
});
