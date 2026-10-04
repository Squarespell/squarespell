/**
 * Rules for asking trial users to pay, in one place so the API, the checkout and the emails agree.
 *
 * - Choosing a plan during the trial never costs trial days: checkout sets the subscription's trial_end to the account's
 *   trial end, so the first charge happens when the trial would have ended. Stripe needs trial_end at least 48 hours ahead,
 *   so with less time left billing starts at checkout.
 * - After the trial ends, new leads are held for HELD_LEAD_DAYS (migration 036) and released when a plan is chosen.
 * - One win-back offer: 20% off the first 3 monthly payments, for accounts whose trial ended without a plan, for
 *   WINBACK_WINDOW_DAYS after the trial ended. Monthly billing only, so the discount is exactly 3 payments.
 */
import type Stripe from 'stripe';

export const TRIAL_DAYS = 14;
export const HELD_LEAD_DAYS = 30;
/** Most leads one expired account can hold at a time; later ones are not stored (the visitor still gets the result). */
export const HELD_LEAD_CAP = 1000;
export const WINBACK_COUPON_ID = 'squarespell_winback_20pct_3m';
export const WINBACK_PERCENT_OFF = 20;
export const WINBACK_MONTHS = 3;
export const WINBACK_WINDOW_DAYS = 45;
/** Stripe refuses a trial_end less than 48 hours away; keep an hour of margin. */
const MIN_DEFER_MS = 49 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingUser { plan?: string | null; created_at?: string | null; stripe_subscription_id?: string | null }

/** The stored plan of an account that has not paid: new sign-ups are 'free' during their trial. */
export function isUnpaidPlan(plan: string | null | undefined): boolean {
  return !plan || plan === 'free' || plan === 'trial';
}

export function trialEndsAt(createdAt: string | null | undefined): Date | null {
  if (!createdAt) return null;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) ? new Date(t + TRIAL_DAYS * DAY_MS) : null;
}

/** Unix seconds to start billing at when checking out during the trial, or null to bill at checkout. */
export function deferBillingUntil(user: BillingUser, now: Date = new Date()): number | null {
  if (!isUnpaidPlan(user.plan) || user.stripe_subscription_id) return null;
  const end = trialEndsAt(user.created_at);
  if (!end || end.getTime() - now.getTime() < MIN_DEFER_MS) return null;
  return Math.floor(end.getTime() / 1000);
}

/** True when the account's trial ended without a plan, within the win-back window. */
export function winbackEligible(user: BillingUser, now: Date = new Date()): boolean {
  if (!isUnpaidPlan(user.plan) || user.stripe_subscription_id) return false;
  const end = trialEndsAt(user.created_at);
  if (!end) return false;
  const since = now.getTime() - end.getTime();
  return since >= 0 && since <= WINBACK_WINDOW_DAYS * DAY_MS;
}

/** The win-back coupon, created once in the Stripe account the first time it is needed. */
export async function ensureWinbackCoupon(stripe: Stripe): Promise<string> {
  try {
    const existing = await stripe.coupons.retrieve(WINBACK_COUPON_ID);
    if (existing && !(existing as any).deleted) return existing.id;
  } catch (err: any) {
    if (err?.code !== 'resource_missing' && err?.statusCode !== 404) throw err;
  }
  const created = await stripe.coupons.create({
    id: WINBACK_COUPON_ID,
    percent_off: WINBACK_PERCENT_OFF,
    duration: 'repeating',
    duration_in_months: WINBACK_MONTHS,
    name: `Welcome back: ${WINBACK_PERCENT_OFF}% off ${WINBACK_MONTHS} months`,
  });
  return created.id;
}
