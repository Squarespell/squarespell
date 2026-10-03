/**
 * Local HTTP server for the URL-analysis flow: a Squarespace-looking page, a non-Squarespace page (/plain), and an
 * address that cannot be read (/down drops the connection, like a site that is offline or a made-up domain).
 */
import http from 'http';
import type { AddressInfo } from 'net';

const SQSP = `<!doctype html><html><head><title>Fixture Bakery</title>
<meta name="generator" content="Squarespace" />
<meta property="og:site_name" content="Fixture Bakery" />
<meta name="description" content="Fresh sourdough and pastries baked daily in Fixtureville." />
<script>Static.SQUARESPACE_CONTEXT = {"websiteId":"fx","templateVersion":"7.1"};</script>
</head><body><h1>Fresh sourdough</h1><p>We bake bread, pastries and cakes. Order online or visit our shop.</p><a href="/menu">Menu</a><a href="/contact">Contact</a></body></html>`;
const PLAIN = `<!doctype html><html><head><title>Plain Site</title></head><body><h1>Not a Squarespace site</h1></body></html>`;

export function startSiteFixture(): Promise<{ base: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/down')) {
      req.socket.destroy();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(req.url?.startsWith('/plain') ? PLAIN : SQSP);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })));
}
