/**
 * Central URL configuration for Squarespell.
 *
 * Change the env vars in Vercel to swap domains WITHOUT a code change.
 * Every hardcoded URL in the app must go through this file.
 *
 * Three domains:
 *   MARKETING_URL  — squarespell.com           (marketing site, plugins, templates, services)
 *   QUIZ_URL       — quiz.squarespell.com      (public quiz try flow, embed JS, public quiz pages)
 *   APP_URL        — app.squarespell.com       (authenticated dashboard)
 *
 * Both QUIZ_URL and APP_URL route to the same Next.js app — the middleware
 * rewrites the bare quiz.squarespell.com host to /try.
 */

// NEXT_PUBLIC_* vars are inlined at build time by Next.js.
// Defaults are the current production hosts so nothing breaks if env vars are unset.
export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL || 'https://squarespell.com';

export const QUIZ_URL =
  process.env.NEXT_PUBLIC_QUIZ_URL || 'https://quiz.squarespell.com';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://app.squarespell.com';

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
