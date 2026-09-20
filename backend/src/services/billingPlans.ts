/**
 * Plan <-> Stripe price mapping for the Squarespell Quiz app.
 *
 * The app's plan names are core / pro / business (plus legacy aliases). Price ids come from environment variables
 * that are read AT REQUEST TIME (not frozen at import) and are never defaulted: a missing mapping is an explicit error.
 *
 * NOTE (Phase 2 decision, not changed here): the live Stripe catalog contains Starter / Pro / Agency products, while
 * this code and the pricing page use Core / Pro / Business. No mapping between the two is guessed.
 */

type Billing = 'monthly' | 'yearly';

const ENV: Record<string, Record<Billing, string>> = {
  core: { monthly: 'STRIPE_CORE_PRICE_ID', yearly: 'STRIPE_CORE_YEARLY_PRICE_ID' },
  pro: { monthly: 'STRIPE_PRO_PRICE_ID', yearly: 'STRIPE_PRO_YEARLY_PRICE_ID' },
  business: { monthly: 'STRIPE_BUSINESS_PRICE_ID', yearly: 'STRIPE_BUSINESS_YEARLY_PRICE_ID' },
};
/** Legacy plan names still stored on old accounts -> the canonical plan whose price they use. */
const ALIAS: Record<string, string> = { starter: 'core', growth: 'core', agency: 'business' };

export const CANONICAL_PLANS = Object.keys(ENV);
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function isKnownPlan(plan: unknown): plan is string {
  return typeof plan === 'string' && (own(ENV, plan) || own(ALIAS, plan));
}

export type PriceResolution =
  | { status: 'ok'; priceId: string }
  | { status: 'unknown_plan' }
  | { status: 'missing'; envVar: string };

export function resolvePlanPrice(plan: unknown, billing: Billing): PriceResolution {
  if (!isKnownPlan(plan)) return { status: 'unknown_plan' };
  const canonical = own(ALIAS, plan) ? ALIAS[plan] : plan;
  const envVar = ENV[canonical][billing];
  const priceId = process.env[envVar];
  if (!priceId) return { status: 'missing', envVar };
  return { status: 'ok', priceId };
}

/** Stripe price id -> canonical app plan, or null when the id is not one of the configured plan prices. */
export function priceIdToPlanName(priceId: string | undefined | null): string | null {
  if (!priceId) return null;
  for (const plan of CANONICAL_PLANS) {
    for (const billing of ['monthly', 'yearly'] as Billing[]) {
      const configured = process.env[ENV[plan][billing]];
      if (configured && configured === priceId) return plan;
    }
  }
  return null;
}

export class PlanMappingError extends Error {
  readonly code = 'plan_mapping_missing';
  constructor(message: string) { super(message); this.name = 'PlanMappingError'; }
}
