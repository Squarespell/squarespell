/**
 * Central URL configuration for Squarespell.
 *
 * Two production domains — both permanent, both hardcoded on purpose:
 *
 *   MARKETING_URL  — squarespell.com           (Squarespace marketing site)
 *   APP_URL        — app.squarespell.com       (the entire Squarespell app)
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

/** Full <script> snippet for copy/paste install. */
export const embedSnippet = (slug: string): string =>
  `<script src="${embedScriptUrl()}" data-quiz="${slug}"></script>`;

/** Authenticated dashboard landing URL. */
export const dashboardUrl = (): string => `${APP_URL}/dashboard`;

/** Quiz builder entry URL (with optional ?url= autostart). */
export const tryFlowUrl = (siteUrl?: string): string => {
  if (!siteUrl) return `${APP_URL}${QUIZ_BUILDER_PATH}`;
  return `${APP_URL}${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(siteUrl)}`;
};
