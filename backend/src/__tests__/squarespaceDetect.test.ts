/**
 * Squarespace detection used by the scraper (services/squarespaceDetect.ts). SEO plan Segment 3, task 3.9: the API
 * accepted a WordPress site as Squarespace because its meta description mentioned Squarespace.
 */
import { describe, expect, it } from 'vitest';
import { isSquarespaceSite, squarespaceSignals } from '../services/squarespaceDetect';

const SQSP_71 = `<!doctype html>
<!-- This is Squarespace. --><!-- fixture-bakery -->
<html><head><title>Fixture Bakery</title>
<link rel="stylesheet" type="text/css" href="https://static1.squarespace.com/static/versioned-site-css/abc/site.css"/>
<script>Static.SQUARESPACE_CONTEXT = {"websiteId":"fx","templateVersion":"7.1"};</script>
</head><body></body></html>`;

// Shaped like squarespellquiz.com (WordPress): Squarespace is only mentioned in text.
const WP_ABOUT_SQUARESPACE = `<!doctype html><html><head>
<meta name="description" content="AI quiz builder for Squarespace leads." />
<meta property="og:description" content="Build a lead quiz for your Squarespace site." />
<link rel="https://api.w.org/" href="https://example.com/wp-json/" />
<link rel="stylesheet" href="https://example.com/wp-content/plugins/site/assets/site.css" />
</head><body><p>Works with any Squarespace site, even with images on https://static1.squarespace.com/static/x.png</p></body></html>`;

describe('isSquarespaceSite', () => {
  it('accepts a Squarespace page by its bootstrap script and page comment', () => {
    expect(isSquarespaceSite(SQSP_71)).toBe(true);
    expect(squarespaceSignals(SQSP_71)).toEqual({ strong: true, squarespaceAsset: true, otherPlatform: null });
  });

  it('accepts a generator meta tag in either attribute order', () => {
    expect(isSquarespaceSite('<meta name="generator" content="Squarespace 7.1">')).toBe(true);
    expect(isSquarespaceSite("<meta content='Squarespace' name='generator'>")).toBe(true);
  });

  it('accepts a "Server: Squarespace" response header', () => {
    expect(isSquarespaceSite('<html><body>Custom page</body></html>', 'Squarespace')).toBe(true);
  });

  it('rejects a WordPress site that only mentions Squarespace (the squarespellquiz.com false positive)', () => {
    expect(isSquarespaceSite(WP_ABOUT_SQUARESPACE, 'hcdn')).toBe(false);
    expect(squarespaceSignals(WP_ABOUT_SQUARESPACE).otherPlatform).toBe('wordpress');
  });

  it('counts a script from a Squarespace host only when no other platform shows up', () => {
    const script = '<script src="https://assets.squarespace.com/universal/scripts-compressed/common.js"></script>';
    expect(isSquarespaceSite(`<html><head>${script}</head></html>`)).toBe(true);
    const mixed = `<html><head>${script}<link rel="stylesheet" href="/wp-content/themes/x/style.css"></head></html>`;
    expect(isSquarespaceSite(mixed)).toBe(false);
  });

  it('rejects Shopify, Wix and Webflow pages', () => {
    const shopify = '<script src="https://cdn.shopify.com/s/files/1/theme.js"></script><script>Shopify.shop = "x.myshopify.com";</script>';
    const wix = '<meta name="generator" content="Wix.com Website Builder"><script src="https://static.parastorage.com/services/x.js"></script>';
    const webflow = '<html data-wf-site="64a" data-wf-page="64b"><script src="https://assets.website-files.com/js/webflow.js"></script></html>';
    expect(squarespaceSignals(shopify).otherPlatform).toBe('shopify');
    expect(squarespaceSignals(wix).otherPlatform).toBe('wix');
    expect(squarespaceSignals(webflow).otherPlatform).toBe('webflow');
    for (const page of [shopify, wix, webflow]) expect(isSquarespaceSite(page)).toBe(false);
  });

  it('copes with an empty page and no header', () => {
    expect(isSquarespaceSite('')).toBe(false);
    expect(isSquarespaceSite('', null)).toBe(false);
  });
});
