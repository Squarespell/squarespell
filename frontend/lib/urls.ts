/**
 * Central URL configuration for Squarespell.
 *
 * Three production domains — all permanent, all hardcoded on purpose:
 *
 *   MARKETING_URL  — squarespell.com           (marketing site, plugins, templates, services)
 *   QUIZ_URL       — quiz.squarespell.com      (public quiz try flow, embed JS, public quiz pages)
 *   APP_URL        — app.squarespell.com       (authenticated dashboard)
 *
 * These used to be env-var-driven via NEXT_PUBLIC_* overrides. We removed that
 * indirection because (a) these hostnames are part of the permanent product
 * architecture and will never change without a code review, and (b) a single
 * misconfigured env var in Vercel was routing /sign-up to the backend URL and
 * crashing the claim flow. Hardcoding eliminates that entire class of bug.
 *
 * If you ever need to change a domain, change the constant below in a PR.
 * That's strictly better than editing a Vercel env var in the dashboard.
 *
 * Both QUIZ_URL and APP_URL route to the same Next.js app — the middleware
 * rewrites the bare quiz.squarespell.com host to /try and redirects any
 * non-quiz paths on the quiz host over to app.squarespell.com.
 */

export const MARKETING_URL = 'https://squarespell.com';
export const QUIZ_URL = 'https://quiz.squarespell.com';
export const APP_URL = 'https://app.squarespell.com';

/* ------------------------------------------------------------------ */
/* Helpers for common URL shapes                                       */
/* ------------------------------------------------------------------ */

/** Public URL a visitor sees when they land on a shared quiz. */
export const publicQuizUrl = (slug: string): string =>
  `${QUIZ_URL}/q/${slug}`;

/** URL to the JS embed loader a Squarespace site owner drops into a Code Block. */
export const embedScriptUrl = (): string => `${QUIZ_URL}/embed.js`;

/** Full <script> snippet for copy/paste install. */
export const embedSnippet = (slug: string): string =>
  `<script src="${embedScriptUrl()}" data-quiz="${slug}"></script>`;

/** Authenticated dashboard landing URL. */
export const dashboardUrl = (): string => `${APP_URL}/dashboard`;

/** Try / quiz preview flow entry URL. */
export const tryFlowUrl = (siteUrl?: string): string => {
  const base = `${QUIZ_URL}/`;
  if (!siteUrl) return base;
  return `${QUIZ_URL}/try?url=${encodeURIComponent(siteUrl)}`;
};
