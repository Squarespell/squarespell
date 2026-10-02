/**
 * Brand scraper: works on any public website (Squarespace keeps its extra extraction), and every request it makes
 * (page, redirects, stylesheets) goes through the SSRF-safe fetcher. A loopback fixture stands in for customer sites;
 * the test-only escape hatch opens loopback only, every other blocked range stays blocked.
 */
import { describe, it, expect, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { scrapeBrand, setScraperFetchOptionsForTests, UnsafeUrlError } from '../services/brandScraper';

const servers: http.Server[] = [];
async function serve(routes: Record<string, (res: http.ServerResponse, port: number) => void>, hits: string[] = []): Promise<number> {
  const s = http.createServer((q, r) => {
    hits.push(q.url || '');
    const route = routes[(q.url || '/').split('?')[0]];
    if (!route) { r.statusCode = 404; r.end('not found'); return; }
    route(r, port);
  });
  servers.push(s);
  await new Promise<void>((done) => s.listen(0, '127.0.0.1', () => done()));
  const port = (s.address() as AddressInfo).port;
  return port;
}
const html = (body: string) => (r: http.ServerResponse) => { r.setHeader('content-type', 'text/html'); r.end(body); };
const css = (body: string) => (r: http.ServerResponse) => { r.setHeader('content-type', 'text/css'); r.end(body); };

/** Every name resolves to loopback unless listed; the escape hatch only works under NODE_ENV=test (set by the suite). */
function allowFixture(privateNames: Record<string, string> = {}) {
  setScraperFetchOptionsForTests({
    allowLoopbackForTests: true,
    lookup: async (h) => [{ address: privateNames[h] || '127.0.0.1', family: 4 }],
  });
}

afterEach(async () => {
  setScraperFetchOptionsForTests({});
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => { s.closeAllConnections?.(); s.close(() => r()); })));
});

const WORDPRESS = `<!doctype html><html><head><title>Harbour Physio | Sports injury clinic</title>
<meta name="generator" content="WordPress 6.6" />
<meta property="og:site_name" content="Harbour Physio" />
<meta name="description" content="Sports injury physiotherapy and rehab in Harbourtown." />
<link rel="stylesheet" href="/wp-content/themes/harbour/style.css" />
<script type="application/ld+json">{"@type":"MedicalClinic","description":"Physiotherapy clinic for runners and cyclists."}</script>
</head><body><h1>Get back to running, faster</h1><p>Our physiotherapists treat sports injuries with hands-on care and tailored rehab plans.</p>
<ul><li>Sports massage therapy</li><li>Running gait analysis</li></ul><a href="/book">Book an assessment</a></body></html>`;

describe('any public website', () => {
  it('a WordPress site is analysed: platform, business context and colours from its own stylesheet', async () => {
    allowFixture();
    const port = await serve({
      '/': html(WORDPRESS),
      '/wp-content/themes/harbour/style.css': css(':root { --primary-color: #1e6091; --text-color: #222222; } body { background-color: #fafafa; }'),
    });
    const brand: any = await scrapeBrand(`http://harbour.example.test:${port}/`);
    expect(brand.detected).toBe(true);
    expect(brand.platform).toBe('wordpress');
    expect(brand.template_version).toBeNull();
    expect(brand.site_name).toBe('Harbour Physio');
    expect(brand.colors.primary).toBe('#1e6091');
    expect(brand.colors.text).toBe('#222222');
    expect(brand.business.meta_description).toContain('Sports injury physiotherapy');
    expect(brand.business.summary).toContain('MedicalClinic');
    expect(brand.business.headings).toContain('Get back to running, faster');
    expect(brand.business.nav_pages[0].url).toBe(`http://harbour.example.test:${port}/book`);
  });

  it('a hand-built site with no known platform still works (platform "website")', async () => {
    allowFixture();
    const port = await serve({ '/': html('<html><head><title>Plain Co</title><meta name="theme-color" content="#d62828"></head><body><h1>Handmade ceramics</h1><p>Small-batch mugs and bowls thrown in our studio.</p></body></html>') });
    const brand: any = await scrapeBrand(`http://plain.example.test:${port}/`);
    expect(brand).toMatchObject({ detected: true, platform: 'website', site_name: 'Plain Co' });
    expect(brand.colors.primary).toBe('#d62828');
    expect(brand.business.summary).toContain('ceramics');
  });

  it('Squarespace keeps its bonus path: template version and Squarespace colour variables', async () => {
    allowFixture();
    const port = await serve({
      '/': html(`<html><head><title>Sq Bakery</title><meta name="generator" content="Squarespace"><link rel="stylesheet" href="/static/site.css"><script>Static.SQUARESPACE_CONTEXT = {"templateVersion":"7.1"};</script></head><body><h1>Bread</h1></body></html>`),
      '/static/site.css': css(':root { --lightAccent-hsl: 72,100%,56%; --siteBackgroundColor: #ffffff; } .x { --lightAccentColor: hsla(var(--lightAccent-hsl),1); }'),
    });
    const brand: any = await scrapeBrand(`http://sq.example.test:${port}/`);
    expect(brand).toMatchObject({ detected: true, platform: 'squarespace', template_version: '7.1' });
    expect(brand.colors.primary).toBe('#d2ff1f');
  });

  it('follows a redirect to the canonical page and resolves links against where it landed', async () => {
    allowFixture();
    const port = await serve({
      '/': (r, p) => { r.statusCode = 301; r.setHeader('location', `http://www.shop.example.test:${p}/home`); r.end(); },
      '/home': html('<html><head><title>Shop</title></head><body><h1>Shop home</h1><a href="pricing">Pricing</a></body></html>'),
    });
    const brand: any = await scrapeBrand(`http://shop.example.test:${port}/`);
    expect(brand.detected).toBe(true);
    expect(brand.business.nav_pages[0].url).toBe(`http://www.shop.example.test:${port}/pricing`);
  });

  it('an unreachable site degrades to detected:false instead of failing the request', async () => {
    allowFixture();
    const brand: any = await scrapeBrand('http://127.0.0.1:1/');
    expect(brand.detected).toBe(false);
  });
});

describe('SSRF protection', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://[fd00:ec2::254]/',
    'http://[::ffff:10.0.0.1]/',
    'ftp://example.com/',
    'http://user:pw@example.com/',
  ])('refuses %s with UnsafeUrlError', async (url) => {
    allowFixture();
    await expect(scrapeBrand(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('refuses a public-looking name that resolves to a private address', async () => {
    allowFixture({ 'intranet.example.test': '10.0.0.9' });
    await expect(scrapeBrand('http://intranet.example.test/')).rejects.toMatchObject({ code: 'URL_NOT_PUBLIC', hostname: 'intranet.example.test' });
  });

  it('refuses a redirect into the metadata service', async () => {
    allowFixture();
    const port = await serve({ '/': (r) => { r.statusCode = 302; r.setHeader('location', 'http://169.254.169.254/latest/meta-data/'); r.end(); } });
    await expect(scrapeBrand(`http://evil.example.test:${port}/`)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('never fetches a stylesheet hosted on a private address, but still analyses the page', async () => {
    allowFixture({ 'internal.example.test': '10.0.0.9' });
    const hits: string[] = [];
    const port = await serve({
      '/': html('<html><head><title>Mixed</title><link rel="stylesheet" href="http://internal.example.test/secret.css"><link rel="stylesheet" href="/ok.css"></head><body><h1>Mixed site</h1></body></html>'),
      '/ok.css': css(':root { --primary-color: #2a9d8f; }'),
    }, hits);
    const brand: any = await scrapeBrand(`http://mixed.example.test:${port}/`);
    expect(brand.detected).toBe(true);
    expect(brand.colors.primary).toBe('#2a9d8f');
    expect(hits).toEqual(expect.arrayContaining(['/', '/ok.css']));
    expect(hits).not.toContain('/secret.css');
  });

  it('outside NODE_ENV=test the loopback escape hatch is ignored: the fixture is never contacted', async () => {
    const hits: string[] = [];
    const port = await serve({ '/': html('<h1>hi</h1>') }, hits);
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      setScraperFetchOptionsForTests({ allowLoopbackForTests: true }); // ignored outside test
      await expect(scrapeBrand(`http://127.0.0.1:${port}/`)).rejects.toBeInstanceOf(UnsafeUrlError);
    } finally {
      process.env.NODE_ENV = prev;
    }
    expect(hits).toHaveLength(0);
  });
});
