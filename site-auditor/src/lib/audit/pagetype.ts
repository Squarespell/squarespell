/**
 * Page-type classification.
 *
 * The single biggest structural gap identified in the audit-of-the-audit
 * review (see AUDIT-OF-THE-AUDIT.md, Step 5): nothing in the engine knew the
 * difference between a homepage, a gallery, a product page and a contact
 * form, so every check applied the same thresholds to all of them. That's
 * the root cause behind several specific false positives (ONPAGE-030 vs
 * ONPAGE-040 disagreeing on which pages are exempt, AEO-010 firing on
 * product pages, thin-content warnings on galleries that are thin by
 * design).
 *
 * This module is deliberately conservative: every signal it uses already
 * exists elsewhere in the codebase (URL path regexes duplicated across
 * onpage.ts, aeo/profile.ts and aeo.ts; schema.org types already extracted
 * in PageFacts.schemaTypes), consolidated into one place so check modules
 * read a shared, consistent signal instead of each hand-rolling their own
 * exclusion list. Where we cannot classify confidently, we say so rather
 * than guessing, and calling code should treat 'standard' as "not
 * confidently anything else" rather than a real conclusion about the page.
 *
 * What this does NOT attempt: detecting single-purpose ad-landing pages.
 * There is no reliable signal for that from a single server-rendered crawl
 * (no referrer data, no campaign UTM info attached to the page itself), so
 * rather than guess we simply do not classify for it. A landing page will
 * fall through to whatever its URL/content pattern otherwise matches.
 */

export type PageType =
  | 'home'
  | 'blog-post'
  | 'blog-index'
  | 'product'
  | 'product-index'
  | 'gallery'
  | 'contact'
  | 'about'
  | 'service'
  | 'standard';

export interface PageTypeInput {
  url: string;
  depth: number;
  wordCount: number;
  schemaTypes: string[];
  images: { length: number };
  forms: { length: number };
  /** Raw HTML, used only to look for a Squarespace collection-type hint. */
  html?: string;
}

const BLOG_ROOT = /\/(blog|news|journal)\/?$/i;
const BLOG_POST = /\/(blog|news|journal)\/[^/?#]+\/?$/i;

/** Squarespace product detail pages always carry a /p/ segment. */
const PRODUCT_DETAIL = /\/p\//i;
const PRODUCT_INDEX = /\/(shop|store|products?)\/?$/i;

const GALLERY_PATH = /\/(gallery|galleries|portfolio|album|albums|work|projects)(\/|$)/i;

const CONTACT_PATH = /\/(contact|contact-us|get-in-touch)(\/|$)/i;
const ABOUT_PATH = /\/(about|about-us|our-story|meet-the-team|meet-us)(\/|$)/i;

/**
 * Same list ONPAGE / aeo profile checks already use for "this is a services
 * hub or a service" — consolidated here as the single copy.
 */
const SERVICE_PATH =
  /\/(services?|service|offerings?|what-we-do|what-i-do|packages?|programs?|programmes?|treatments?|classes?|courses?|sessions?|work-with-(?:me|us))(\/|$)/i;

/**
 * Best-effort read of the per-page Squarespace collection type, when the
 * page's own inline context object states one. This is a corroborating
 * signal only — we don't have a verified enum mapping for Squarespace's
 * internal collection-type codes, so we only trust it when it spells out a
 * recognisable word (e.g. a `typeName`/`type` string containing "blog",
 * "gallery", "products", "album"). A collection object that doesn't say
 * anything legible is silently ignored rather than guessed at.
 */
function collectionHint(html: string | undefined): string | null {
  if (!html) return null;
  const anchor = html.search(/"collection"\s*:\s*\{/);
  if (anchor === -1) return null;
  // Look only in a bounded window right after the anchor — we're sniffing
  // for a word, not parsing the object, so this stays cheap even on a large
  // inline context blob.
  const window = html.slice(anchor, anchor + 2000).toLowerCase();
  if (/"typename"\s*:\s*"[^"]*blog[^"]*"|"type"\s*:\s*"[^"]*blog[^"]*"/.test(window)) return 'blog';
  if (/gallery|portfolio|album/.test(window)) return 'gallery';
  if (/products?/.test(window)) return 'products';
  if (/events?/.test(window)) return 'events';
  return null;
}

export function classifyPageType(page: PageTypeInput): PageType {
  if (page.depth === 0) return 'home';

  let path: string;
  try {
    path = new URL(page.url).pathname;
  } catch {
    path = page.url;
  }

  // Schema.org type is the most reliable single signal when present, because
  // it's a direct declaration rather than an inference from the URL.
  if (page.schemaTypes.includes('Product')) return 'product';
  if (page.schemaTypes.some((t) => t === 'BlogPosting' || t === 'Article' || t === 'NewsArticle')) {
    // A blog collection's own index page can also carry Article-ish schema in
    // rare templates, so still prefer the URL-shape check for the index case.
    if (!BLOG_ROOT.test(path)) return 'blog-post';
  }

  if (PRODUCT_DETAIL.test(path)) return 'product';
  if (BLOG_POST.test(path)) return 'blog-post';
  if (BLOG_ROOT.test(path)) return 'blog-index';
  if (PRODUCT_INDEX.test(path)) return 'product-index';
  if (GALLERY_PATH.test(path)) return 'gallery';
  if (CONTACT_PATH.test(path)) return 'contact';
  if (ABOUT_PATH.test(path)) return 'about';
  if (SERVICE_PATH.test(path)) return 'service';

  const hint = collectionHint(page.html);
  if (hint === 'blog') return 'blog-post';
  if (hint === 'gallery') return 'gallery';
  if (hint === 'products') return 'product-index';

  // Heuristic fallback: a page that is almost entirely images with very
  // little body text and no form reads as a gallery/portfolio piece by
  // convention, not as neglected content. Conservative thresholds on
  // purpose — this only fires when the shape is unambiguous.
  if (page.wordCount < 60 && page.images.length >= 6 && page.forms.length === 0) {
    return 'gallery';
  }

  return 'standard';
}

/**
 * Page types that are legitimately low-word-count by design. Checks that
 * penalise thin content should exclude these rather than apply a uniform
 * threshold (Step 3/5 of the audit review: ONPAGE-030 previously used a
 * hand-written URL regex that only covered contact/privacy/terms/thank/
 * cart/search and missed galleries and product-index pages entirely).
 */
export function isThinByDesign(type: PageType): boolean {
  return type === 'gallery' || type === 'contact' || type === 'blog-index' || type === 'product-index';
}

/**
 * Page types where being a "dead end" with few internal links is normal or
 * even good practice, rather than evidence of poor site architecture
 * (ONPAGE-040's previous version applied the internal-link-count threshold
 * to every page uniformly, including ones like /contact where a visitor is
 * meant to convert and leave, not browse onward).
 */
export function isDeadEndByDesign(type: PageType): boolean {
  return type === 'contact' || type === 'gallery';
}
