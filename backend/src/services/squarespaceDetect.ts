/**
 * Decides whether a fetched page belongs to a Squarespace site. Squarespell Quiz only works with Squarespace (see
 * NotSquarespaceError in brandScraper.ts), so a wrong "yes" lets a visitor build a quiz for a site it cannot run on.
 *
 * Only marks that Squarespace itself writes into every page count on their own: the Static.SQUARESPACE_CONTEXT
 * bootstrap script, the "This is Squarespace." comment at the top of the page, a generator meta tag, or a
 * `Server: Squarespace` response header. A script or stylesheet loaded from Squarespace's own asset hosts counts only
 * when the page shows no sign of another platform. Text that merely mentions Squarespace never counts: the old check
 * accepted any meta tag containing the word, so squarespellquiz.com (a WordPress site whose description says "for
 * Squarespace") passed as a Squarespace site.
 *
 * Checked on 3 Oct 2026 against 25 live sites, five each on Squarespace, WordPress, Shopify, Wix and Webflow: 25 of 25
 * correct (the old check: 24 of 25, the miss being squarespellquiz.com). SEO plan Segment 3, task 3.9.
 */

export type OtherPlatform = 'wordpress' | 'shopify' | 'wix' | 'webflow';

export interface SquarespaceSignals {
  /** A mark only Squarespace writes. Enough on its own. */
  strong: boolean;
  /** A script or stylesheet served from static1.squarespace.com or assets.squarespace.com. */
  squarespaceAsset: boolean;
  /** The first sign of another platform found in the page, if any. */
  otherPlatform: OtherPlatform | null;
}

const OTHER_PLATFORM_MARKS: Array<[OtherPlatform, RegExp]> = [
  ['wordpress', /\/wp-(?:content|includes)\//i],
  ['shopify', /\bcdn\.shopify\.com\//i],
  ['wix', /\bstatic\.parastorage\.com\//i],
  ['webflow', /\bdata-wf-site=/i],
];

export function squarespaceSignals(html: string, serverHeader?: string | null): SquarespaceSignals {
  const page = html || '';
  const strong =
    /\bStatic\.SQUARESPACE_CONTEXT\s*=/.test(page) ||
    page.includes('<!-- This is Squarespace. -->') ||
    /<meta\b[^>]*\bname=["']generator["'][^>]*\bcontent=["']Squarespace/i.test(page) ||
    /<meta\b[^>]*\bcontent=["']Squarespace[^"']*["'][^>]*\bname=["']generator["']/i.test(page) ||
    /squarespace/i.test(serverHeader || '');
  const squarespaceAsset =
    /<(?:script|link)\b[^>]*\b(?:src|href)=["'](?:https?:)?\/\/(?:static1|assets)\.squarespace\.com\//i.test(page);
  const other = OTHER_PLATFORM_MARKS.find(([, mark]) => mark.test(page));
  return { strong, squarespaceAsset, otherPlatform: other ? other[0] : null };
}

export function isSquarespaceSite(html: string, serverHeader?: string | null): boolean {
  const s = squarespaceSignals(html, serverHeader);
  return s.strong || (s.squarespaceAsset && !s.otherPlatform);
}
