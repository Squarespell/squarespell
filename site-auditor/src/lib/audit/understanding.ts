/**
 * Website Understanding.
 *
 * The first "intelligence" layer above the raw checks: instead of a flat list
 * of findings, a structured answer to "what is this website, and how is it
 * trying to make money?" Everything here is assembled from data the engine
 * already computes elsewhere — `buildProfile()` (aeo/profile.ts), the
 * per-page `pageType` classification (pagetype.ts, wired into extract.ts),
 * and the pass/fail outcome of checks that already ran (conv.ts, squarespace
 * detection). No new crawling, no new AI calls, nothing fabricated: this
 * module only re-shapes facts that already exist into one coherent object,
 * with an explicit confidence label on every inferred field so a reader (or
 * a future engine consuming this) can tell a declared fact from a guess.
 *
 * This is deliberately the first "engine" in the platform sense: a stable,
 * typed summary that later engines (Opportunity, Customer Journey, Website
 * Passport, Competitor Intelligence) can read instead of each re-deriving
 * "what kind of business is this" from scratch.
 */

import type { AuditContext } from './context';
import type { CheckResult } from './types';
import type { SiteProfile } from './aeo/profile';
import type { PageType } from './pagetype';

/**
 * Mirrors the confidence vocabulary specified for this feature: a fact
 * either came from something the site declared (`observed`), or it's a
 * graded inference. `inferred` is used specifically for conclusions built by
 * combining more than one signal (e.g. primary conversion), rather than
 * reading one field.
 */
export type UnderstandingConfidence = 'observed' | 'high' | 'medium' | 'low' | 'inferred';

export interface ConfidentValue<T> {
  value: T | null;
  confidence: UnderstandingConfidence;
}

export type ConversionType = 'purchase' | 'booking' | 'contact-form' | 'none';

export interface WebsiteUnderstanding {
  /** e.g. "photographer", "dentist" — the trade in the customer's own words. */
  businessType: ConfidentValue<string> & { source: 'schema' | 'text' | 'none' };
  /** schema.org type, when the site declares one directly (LocalBusiness, Restaurant, ...). */
  entityType: ConfidentValue<string>;
  location: ConfidentValue<string>;
  isCommerce: boolean;
  services: Array<{ name: string; hasOwnPage: boolean }>;
  /** The conversion the site is most obviously built around. */
  primaryConversion: ConfidentValue<ConversionType> & { evidence: string };
  pages: {
    total: number;
    byType: Partial<Record<PageType, number>>;
    /** One representative page per important type, for a quick "here's what matters" list. */
    important: Array<{ url: string; type: PageType; title: string }>;
  };
  /**
   * True when there was enough signal across the fields above to trust this
   * profile at all (mirrors `SiteProfile.confident`, the same bar the AEO
   * question-gap analysis already uses to decide whether to run).
   */
  confident: boolean;
}

const IMPORTANT_TYPES: PageType[] = ['home', 'contact', 'service', 'product-index', 'about', 'product'];

function passed(results: CheckResult[], id: string): boolean {
  const r = results.find((x) => x.id === id);
  return !!r && r.applicable > 0 && r.affected === 0;
}

export function buildUnderstanding(
  ctx: AuditContext,
  profile: SiteProfile,
  results: CheckResult[]
): WebsiteUnderstanding {
  /* ---------------- business type ---------------- */
  const businessSource: 'schema' | 'text' | 'none' = profile.entityType
    ? 'schema'
    : profile.category
      ? 'text'
      : 'none';
  const businessType: WebsiteUnderstanding['businessType'] = {
    value: profile.category,
    // A schema.org declaration is a fact the site stated, not an inference.
    // Text matched in a title/heading is a solid signal; text matched only in
    // body copy (categoryConfident: false) is the weakest tier we surface.
    confidence: profile.entityType ? 'observed' : profile.categoryConfident ? 'high' : profile.category ? 'low' : 'low',
    source: businessSource,
  };

  const entityType: WebsiteUnderstanding['entityType'] = {
    value: profile.entityType,
    confidence: 'observed',
  };

  const location: WebsiteUnderstanding['location'] = {
    value: profile.location,
    confidence: profile.locationSource === 'schema' ? 'observed' : profile.locationSource === 'text' ? 'medium' : 'low',
  };

  /* ---------------- primary conversion ---------------- */
  // Ordered by how unambiguous the signal is: a Squarespace commerce flag is a
  // platform fact, not an inference. Booking and "some contact route" both
  // reuse a check that already ran (conv.ts) rather than re-detecting from
  // raw HTML, so this can never disagree with what the report itself says.
  const isCommerce = ctx.squarespace.features.commerce;
  let primaryConversion: WebsiteUnderstanding['primaryConversion'];
  if (isCommerce) {
    primaryConversion = {
      value: 'purchase',
      confidence: 'observed',
      evidence: 'Squarespace commerce is enabled on this site.',
    };
  } else if (passed(results, 'CONV-030')) {
    primaryConversion = {
      value: 'booking',
      confidence: 'inferred',
      evidence: 'A booking or scheduling embed was found and no commerce store is enabled.',
    };
  } else if (passed(results, 'CONV-010')) {
    primaryConversion = {
      value: 'contact-form',
      confidence: 'inferred',
      evidence: 'A contact route (form, phone, or email) exists and no store or booking flow was found.',
    };
  } else {
    primaryConversion = {
      value: 'none',
      confidence: 'observed',
      evidence: 'No contact form, phone link, email link, booking embed or store was found on any crawled page.',
    };
  }

  /* ---------------- page inventory ---------------- */
  const byType: Partial<Record<PageType, number>> = {};
  for (const p of ctx.htmlPages) {
    byType[p.pageType] = (byType[p.pageType] || 0) + 1;
  }

  const important: WebsiteUnderstanding['pages']['important'] = [];
  for (const t of IMPORTANT_TYPES) {
    const page = ctx.htmlPages.find((p) => p.pageType === t);
    if (page) important.push({ url: page.url, type: t, title: page.title || t });
    if (important.length >= 8) break;
  }

  return {
    businessType,
    entityType,
    location,
    isCommerce,
    services: profile.services.map((s) => ({ name: s.name, hasOwnPage: s.hasOwnPage })),
    primaryConversion,
    pages: {
      total: ctx.htmlPages.length,
      byType,
      important,
    },
    confident: profile.confident,
  };
}
