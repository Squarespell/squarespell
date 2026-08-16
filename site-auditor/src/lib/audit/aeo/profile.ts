/**
 * What this business appears to be, derived only from the pages we crawled.
 *
 * Every field carries where it came from, because the FAQ and topical-authority
 * analysis downstream is only as defensible as this is. If we cannot work out
 * what the business sells, we say so and skip the analysis rather than
 * generating plausible questions about a business we have guessed at. Generic
 * questions attached to the wrong trade are worse than no questions.
 */

import type { PageFacts } from '../extract';
import type { AuditContext } from '../context';
import { pathOf } from '../url';
import { titleish, tokenise } from './text';

export interface ServiceRef {
  /** Display name, e.g. "Brand Photography". */
  name: string;
  /** Where we found it. */
  source: 'nav' | 'page-title' | 'heading' | 'product' | 'schema';
  url?: string;
  /** True when a page on the site is dedicated to this service. */
  hasOwnPage: boolean;
}

export interface SiteProfile {
  name: string;
  /** schema.org type when declared, otherwise a guess from the copy, otherwise null. */
  entityType: string | null;
  /** City or region, when the site states one. */
  location: string | null;
  locationSource: 'schema' | 'text' | null;
  /** The trade in the customer's words, e.g. "photographer", "dentist". */
  category: string | null;
  /**
   * True only when the trade appears where a business states it: the title tag
   * or a heading. A match buried in body copy is frequently a passing mention,
   * and printing "we read your site as a coach" at a skincare studio because
   * the word appeared once in a paragraph is worse than saying nothing.
   */
  categoryConfident: boolean;
  services: ServiceRef[];
  /** Distinctive terms across the whole site, highest weight first. */
  topics: string[];
  isCommerce: boolean;
  /** True when we know enough to generate questions worth showing. */
  confident: boolean;
}

const CATEGORY_NOUNS =
  /\b(coach|coaching|photograph(?:er|y)|videograph(?:er|y)|designer|design studio|agency|consultan\w+|therapis\w+|therapy|counsell?\w+|salon|barber|spa|yoga|pilates|fitness|personal trainer|nutritionist|dentist|dental|clinic|doctor|physio\w*|chiropract\w+|lawyer|attorney|solicitor|accountant|bookkeep\w+|plumber|electrician|builder|contractor|roofer|roofing|landscap\w+|cleaner|cleaning|florist|baker|bakery|restaurant|caf[eé]|caterer|catering|wedding planner|planner|realtor|estate agent|architect|interior designer|marketing|copywriter|developer|artist|jewell?er|boutique|tutor|veterinar\w+|travel agent|tour operator|groomer|dog groomer|dog walker|pet sitter|tattoo artist|piercer|osteopath|podiatrist|optician|midwife|doula|celebrant|driving instructor|music teacher|dance teacher|yoga teacher|pilates instructor|swim school|nursery|childminder|handyman|joiner|carpenter|decorator|painter and decorator|tiler|plasterer|glazier|locksmith|surveyor|mortgage broker|financial adviser|recruiter|translator|photo booth|dj|band|caterer|butcher|brewery|distillery|winery|farm shop|deli|pottery studio|art studio|framer|upholsterer|seamstress|tailor|cobbler|removals|man and van|window cleaner|carpet cleaner|gardener|tree surgeon|fencing contractor|pest control|security installer|solar installer|heating engineer|gas engineer)\b/i;

const SERVICE_PATH =
  /\/(services?|service|offerings?|what-we-do|what-i-do|packages?|programs?|programmes?|treatments?|classes?|courses?|sessions?|work-with-(?:me|us)|shop|store|products?|menu)(\/|$)/i;

/** Squarespace product detail pages always carry a /p/ segment. */
const PRODUCT_PATH = /\/p\//i;

/** Shop hubs list products, not services. */
const SHOP_PATH = /\/(shop|store|products?)(\/|$)/i;

const NON_SERVICE_PATH =
  /\/(about|contact|blog|news|journal|privacy|terms|cookie|search|cart|checkout|account|login|faq|home|index|gallery|portfolio|press|careers|jobs)(\/|$)/i;

/**
 * Navigation labels that are not services.
 *
 * The first version of this treated every service-page title as a service, and
 * produced "How much does what they're saying cost?" from a testimonials
 * section. A question built from a nav label is worse than no question at all:
 * it tells the reader we did not understand their business. So the filter is
 * deliberately aggressive, and we would rather name three real services than
 * eight things that might be services.
 */
const NOISE_TITLE =
  /^(home|blog|news|shop|cart|search|contact|about|menu|untitled|welcome|start here|more|info|information|links?|gallery|portfolio|press|faqs?|policies|policy|terms|privacy|login|account|book|booking|bookings|reviews?|testimonials?|what they.?re saying|what clients say|kind words|our work|the work|work with (me|us)|lets? connect|get in touch|say hello|hello|enquire|inquiries|inquiry|newsletter|subscribe|shop all|all products|service menu|services? menu|price list|pricing|prices|the team|team|meet the team|treatments?|services?|packages?|programmes?|programs?|classes|courses|sessions|offerings?|collections?|products?)$/i;

/** Anything opening with a verb is a call to action, not the name of a service. */
const CTA_OPENER =
  /^(meet|book|shop|see|view|explore|discover|browse|read|learn|start|get|let|lets|join|watch|find|follow|contact|call|email|visit|order|buy|try|download|subscribe|sign|apply|schedule|request|claim|grab|check|delivering|creating|providing|offering|helping|making|bringing|crafting|serving|introducing|welcome)\b/i;

/** First-person or possessive phrasing marks prose, not a service name. */
const PROSE_MARKER = /\b(i|we|our|my|you|your|they|their|they.?re|us|me)\b/i;

/**
 * Language that marks a page as selling one specific thing. A service page
 * invites you to book, enquire about or buy the thing it names; an about page
 * or a portfolio piece does not.
 */
const BOOKABLE_CUE =
  /\b(book|booking|appointment|schedule|reserve|enquir\w+|inquir\w+|consultation|session|treatment|package|per session|per hour|starting at|from \$|includes?)\b/i;

/** Squarespace navigation folders arrive with this prefix. */
const FOLDER_PREFIX = /^folder:\s*/i;

function cleanName(raw: string, siteName: string): string {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  // Squarespace titles are usually "Page — Site Name" or "Page | Site Name".
  s = s.split(/\s+[|·—–-]\s+/)[0].trim();
  if (siteName) {
    const rx = new RegExp(`\\s*[|·—–-]?\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    s = s.replace(rx, '').trim();
  }
  return s;
}

function extractLocation(ctx: AuditContext): { value: string | null; source: 'schema' | 'text' | null } {
  for (const p of ctx.htmlPages) {
    for (const block of p.jsonLd) {
      let found: string | null = null;
      const walk = (n: any, depth = 0) => {
        if (found || !n || typeof n !== 'object' || depth > 6) return;
        if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
        const addr = n.address;
        if (addr && typeof addr === 'object' && !Array.isArray(addr)) {
          const city = addr.addressLocality || addr.addressRegion;
          if (typeof city === 'string' && city.trim()) {
            found = [addr.addressLocality, addr.addressRegion]
              .filter((x) => typeof x === 'string' && x.trim())
              .join(', ');
            return;
          }
        }
        for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, depth + 1);
      };
      walk(block.parsed);
      if (found) return { value: found, source: 'schema' };
    }
  }

  // Fall back to how a human would phrase it in the copy.
  //
  // Pages are joined with an explicit separator and the place name may not
  // contain a full stop: without both, "based in Leeds." ran straight past the
  // sentence end and into the next page's heading, and the site was reported as
  // being located in "Leeds. ServicesFull Groom".
  const text = ctx.htmlPages.map((p) => p.mainText).join(' ¶ ');
  const m = text.match(
    /\b(?:based in|located in|studio in|office in|serving|proudly serving)\s+([A-Z][A-Za-z'-]+(?:[ ][A-Z][A-Za-z'-]+){0,2})/
  );
  if (m && m[1] && m[1].length < 40) return { value: m[1].trim(), source: 'text' };
  return { value: null, source: null };
}

function extractEntityType(ctx: AuditContext): string | null {
  const wanted = /^(LocalBusiness|Organization|ProfessionalService|Store|Restaurant|Dentist|MedicalBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness|LegalService|FinancialService|Person|BeautySalon|HairSalon|DaySpa|ExerciseGym|SportsActivityLocation|EducationalOrganization|TravelAgency|RealEstateAgent|Photograph)/;
  for (const p of ctx.htmlPages) {
    for (const t of p.schemaTypes) if (wanted.test(t)) return t;
  }
  return null;
}

export function buildProfile(ctx: AuditContext): SiteProfile {
  const home = ctx.homepage;
  const name =
    String(ctx.squarespace.context?.website?.siteTitle || '') ||
    home.og['og:site_name'] ||
    cleanName(home.title, '') ||
    '';

  const allText = ctx.htmlPages.map((p) => p.mainText).join(' ');
  // Only trust the trade when it appears where a business states it: the title,
  // the opening of the homepage, or a heading. Matching it anywhere in the whole
  // site picks up a passing mention in a blog post and mislabels the business.
  const strongMatch =
    home.title.match(CATEGORY_NOUNS) || home.headings.map((h) => h.text).join(' . ').match(CATEGORY_NOUNS);
  const categoryMatch = strongMatch || home.mainText.slice(0, 800).match(CATEGORY_NOUNS);
  const category = categoryMatch ? categoryMatch[0].toLowerCase() : null;
  const categoryConfident = Boolean(strongMatch);

  const loc = extractLocation(ctx);

  /* ---------------- services ---------------- */
  const services = new Map<string, ServiceRef>();
  const add = (raw: string, source: ServiceRef['source'], url?: string, hasOwnPage = false) => {
    let nm = cleanName(raw, name);
    nm = nm.replace(FOLDER_PREFIX, '').trim();
    if (!nm || nm.length < 4 || nm.length > 48) return;
    if (NOISE_TITLE.test(nm)) return;
    if (/^\d+$/.test(nm)) return;
    // Products are named by the shop and are reliable. Everything else has to
    // survive the nav-label filters before we will put a question around it.
    if (source !== 'product') {
      if (CTA_OPENER.test(nm)) return;
      if (PROSE_MARKER.test(nm)) return;
      if (nm.split(/\s+/).length > 5) return;
      if (/[?!]/.test(nm)) return;
      // A name that is mostly the business name tells us nothing new.
      if (name && nm.toLowerCase().includes(name.toLowerCase()) && nm.length < name.length + 8) return;
    }
    const key = nm.toLowerCase();
    const existing = services.get(key);
    if (existing) {
      if (hasOwnPage && !existing.hasOwnPage) {
        existing.hasOwnPage = true;
        existing.url = url || existing.url;
        existing.source = source;
      }
      return;
    }
    services.set(key, { name: titleish(nm), source, url, hasOwnPage });
  };

  const crawled = new Set(ctx.htmlPages.map((p) => p.url.replace(/\/$/, '')));

  // The reliable definition of a service: something the site's own services
  // page links to or lists. Treating every shallow page as a service produced
  // "How much does work cost?" from a portfolio page, so the hub is the
  // evidence and everything else is inference.
  const hubs = ctx.htmlPages.filter(
    (p) => SERVICE_PATH.test(pathOf(p.url)) && !PRODUCT_PATH.test(pathOf(p.url))
  );
  const hubUrls = new Set(hubs.map((p) => p.url.replace(/\/$/, '')));

  // 1. Pages the hub links to. Their own H1 beats the link text when we have it.
  for (const hub of hubs) {
    const isShop = SHOP_PATH.test(pathOf(hub.url));
    // Body links only. The site navigation appears on every page, so using all
    // anchors would make the shop page "link to" the contact page and turn
    // every nav item into a service.
    for (const l of hub.contentLinks) {
      if (!l.abs || !l.internal || !l.text) continue;
      const path = pathOf(l.abs);
      if (path === '/' || NON_SERVICE_PATH.test(path)) continue;
      const key = l.abs.replace(/\/$/, '');
      if (hubUrls.has(key)) continue;
      const target = ctx.htmlPages.find((p) => p.url.replace(/\/$/, '') === key);
      const label = target?.h1[0] || target?.title || l.text;
      const isProduct = PRODUCT_PATH.test(path) || isShop;
      add(label, isProduct ? 'product' : 'page-title', l.abs, crawled.has(key));
    }
  }

  // 2. Hubs we could not crawl but that the homepage names. The owner has told
  //    us this exists, we simply ran out of crawl budget before reaching it.
  for (const l of home.links) {
    if (!l.abs || !l.internal || !l.text) continue;
    const path = pathOf(l.abs);
    if (NON_SERVICE_PATH.test(path) || path === '/') continue;
    if (!SERVICE_PATH.test(path) || PRODUCT_PATH.test(path)) continue;
    if (crawled.has(l.abs.replace(/\/$/, ''))) continue;
    add(l.text, 'nav', l.abs, false);
  }

  // 3. Flat service pages.
  //
  //    Squarespace navigation folders produce top-level URLs with no path
  //    signal at all: a facial studio's treatments live at /dermaplaning, not
  //    /treatments/dermaplaning. Accepting every shallow page turned portfolio
  //    and about pages into services, so the gate is what the page does rather
  //    than where it sits: it names one thing in a short heading, and it asks
  //    you to book or buy that thing.
  for (const p of ctx.htmlPages) {
    const path = pathOf(p.url);
    if (path === '/' || NON_SERVICE_PATH.test(path) || PRODUCT_PATH.test(path)) continue;
    if (SERVICE_PATH.test(path)) continue; // already handled as a hub
    if (p.depth > 2 || p.wordCount < 40) continue;
    const label = p.h1[0] || p.title;
    if (!label || cleanName(label, name).split(/\s+/).length > 4) continue;
    if (!BOOKABLE_CUE.test(p.mainText)) continue;
    add(label, 'page-title', p.url, true);
  }

  // 4. Headings on a hub page, which is how a single-page site lists services.
  //    On a shop page those headings are product names, not services.
  for (const hub of hubs) {
    const isShop = SHOP_PATH.test(pathOf(hub.url));
    for (const h of hub.headings) {
      if (h.level === 2 || h.level === 3) add(h.text, isShop ? 'product' : 'heading', hub.url, false);
    }
  }

  // 4. Products, for commerce sites.
  for (const p of ctx.htmlPages) {
    for (const block of p.jsonLd) {
      const walk = (n: any, depth = 0) => {
        if (!n || typeof n !== 'object' || depth > 5) return;
        if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
        const t = n['@type'];
        const types = Array.isArray(t) ? t : [t];
        if (types.some((x) => String(x) === 'Product') && typeof n.name === 'string') {
          add(n.name, 'product', p.url, true);
        }
        for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, depth + 1);
      };
      walk(block.parsed);
    }
  }

  /* ---------------- topics ---------------- */
  // Distinctive terms: frequent on this site, and not the words every site uses.
  const counts = new Map<string, number>();
  for (const t of tokenise(allText)) counts.set(t, (counts.get(t) || 0) + 1);
  const generic = new Set(
    tokenise(
      'page site website home contact about menu click here read more learn view privacy policy terms cookie copyright reserved rights email phone address follow instagram facebook subscribe newsletter'
    )
  );
  const topics = Array.from(counts.entries())
    .filter(([w, n]) => n >= 3 && w.length > 3 && !generic.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);

  const serviceList = Array.from(services.values()).slice(0, 12);

  return {
    name: name || ctx.origin.replace(/^https?:\/\//, ''),
    entityType: extractEntityType(ctx),
    location: loc.value,
    locationSource: loc.source,
    category,
    categoryConfident,
    services: serviceList,
    topics,
    isCommerce: ctx.squarespace.features.commerce,
    // We need to know either the trade or at least two named services before
    // question generation produces anything worth a business owner's time.
    confident: Boolean(category) || serviceList.length >= 2,
  };
}

/** Pages that read as a dedicated page for a named thing, used for internal-link analysis. */
export function pageFor(service: ServiceRef, pages: PageFacts[]): PageFacts | null {
  if (!service.url) return null;
  const key = service.url.replace(/\/$/, '');
  return pages.find((p) => p.url.replace(/\/$/, '') === key) || null;
}
