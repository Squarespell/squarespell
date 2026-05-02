/**
 * Central URL configuration for Squarespell.
 *
 * Two production domains - both permanent, both hardcoded on purpose:
 *
 *   MARKETING_URL  - squarespell.com           (Squarespace marketing site)
 *   APP_URL        - app.squarespell.com       (the entire Squarespell app)
 *
 * Everything user-facing in the product lives under APP_URL on a single
 * subdomain so visitors never see the URL bar bounce between subdomains.
 * This matches how Linear, Vercel, Notion, and Stripe organize their apps.
 *
 * URL structure under APP_URL:
 *
 *   /tools                           tools hub (lists all Squarespell tools)
 *   /tools/quiz-funnel               marketing landing page for the quiz tool
 *   /tools/quiz-funnel/build         public no-login quiz builder (Stages 1-6)
 *   /q/:slug                         public published quiz (lead capture)
 *   /embed.js                        embed loader for site owners
 *   /sign-in, /sign-up               Clerk auth
 *   /dashboard, /dashboard/*         authenticated dashboard
 *
 * The quiz.squarespell.com subdomain is now a permanent 301 redirect to
 * app.squarespell.com (handled in middleware.ts) so any old embed code or
 * shared links continue to work but resolve to the canonical home.
 *
 * If you ever need to change a domain, change the constant below in a PR.
 * That's strictly better than editing a Vercel env var in the dashboard.
 */

export const MARKETING_URL = 'https://squarespell.com';
export const APP_URL = 'https://app.squarespell.com';

/* ------------------------------------------------------------------ */
/* Internal route paths (single source of truth)                       */
/* ------------------------------------------------------------------ */

/** Path to the public no-login quiz builder. */
export const QUIZ_BUILDER_PATH = '/tools/quiz-funnel/build';

/** Path to the marketing landing page for the quiz tool. */
export const QUIZ_FUNNEL_LANDING_PATH = '/tools/quiz-funnel';

/* ------------------------------------------------------------------ */
/* Helpers for common URL shapes                                       */
/* ------------------------------------------------------------------ */

/** Public URL a visitor sees when they land on a shared quiz. */
export const publicQuizUrl = (slug: string): string =>
  `${APP_URL}/q/${slug}`;

/** URL to the JS embed loader a Squarespace site owner drops into a Code Block. */
export const embedScriptUrl = (): string => `${APP_URL}/embed.js`;

/** Full embed snippet for copy/paste install (div + script format).
 *  The script tag also carries data-quiz as a fallback — if the <div> is
 *  stripped (e.g. Squarespace Code Injection puts it in <head> where divs
 *  are invalid), the embed loader can still discover the quiz slug from
 *  the script element itself. */
export const embedSnippet = (slug: string): string =>
  `<div data-squarespell-quiz="${slug}"></div>\n<script src="${embedScriptUrl()}" data-quiz="${slug}" async></script>`;

/** Authenticated dashboard landing URL. */
export const dashboardUrl = (): string => `${APP_URL}/dashboard`;

/** Quiz builder entry URL (with optional ?url= autostart). */
export const tryFlowUrl = (siteUrl?: string): string => {
  if (!siteUrl) return `${APP_URL}${QUIZ_BUILDER_PATH}`;
  return `${APP_URL}${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(siteUrl)}`;
};


/* ------------------------------------------------------------------ */
/* UTM auto-tagging                                                    */
/* ------------------------------------------------------------------ */

interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/**
 * Append UTM parameters to any URL. Skips mailto:, tel:, and fragment-only
 * links. Preserves existing query params. If the URL already has a given
 * utm_ param, it is NOT overwritten (user intent wins).
 */
export function addUtmParams(
  url: string,
  params: UtmParams
): string {
  if (!url || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
    return url;
  }
  try {
    const u = new URL(url, 'https://placeholder.invalid');
    const mapping: Array<[string, string | undefined]> = [
      ['utm_source', params.source],
      ['utm_medium', params.medium],
      ['utm_campaign', params.campaign],
      ['utm_content', params.content],
      ['utm_term', params.term],
    ];
    for (const [key, val] of mapping) {
      if (val && !u.searchParams.has(key)) {
        u.searchParams.set(key, val);
      }
    }
    // If the original URL was relative (no protocol), return just path+search
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      return u.pathname + u.search + u.hash;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Build UTM params for a quiz CTA click. */
export function quizUtm(slug: string, outcomeName?: string): UtmParams {
  return {
    source: 'squarespell',
    medium: 'quiz',
    campaign: slug,
    content: outcomeName ? outcomeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) : 'cta',
  };
}

/** Build UTM params for an email CTA click. */
export function emailUtm(campaignName?: string): UtmParams {
  return {
    source: 'squarespell',
    medium: 'email',
    campaign: campaignName ? campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) : 'campaign',
  };
}
