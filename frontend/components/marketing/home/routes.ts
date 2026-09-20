import { QUIZ_BUILDER_PATH } from '@/lib/urls';

/**
 * Every destination the public homepage links to. All of them are routes of
 * this Squarespell Quiz application. Nothing here points at WordPress,
 * WooCommerce or the Squarespell marketplace.
 */
export const ROUTES = {
  builder: QUIZ_BUILDER_PATH,
  login: '/sign-in',
  trial: '/sign-up',
  templates: '/templates',
  integrations: '/integrations',
  support: '/support',
} as const;

/** Same URL handling as the existing /tools/quiz-funnel gateway. */
export function builderHref(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const full = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed;
  return ROUTES.builder + '?url=' + encodeURIComponent(full);
}
