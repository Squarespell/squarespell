/**
 * Plan status and checkout for the upgrade prompts (banner, publish card, billing page).
 *
 * New sign-ups are stored with plan 'free' while their 14-day trial runs; 'trial' is the older name. Both are unpaid.
 * Checkout during the trial starts billing at the trial end (backend services/upgradeOffers.ts), so prompts can say
 * "you won't be charged until <date>" whenever billing_starts_at is set.
 */
import { track } from './analytics';
import { getAuthToken } from './auth/client';
import { PLANS } from './planCatalog';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

export type Billing = 'monthly' | 'yearly';
export interface PlanStatus {
  plan: string;
  trial_ends_at: string | null;
  trial_active?: boolean;
  held_leads?: { count: number; first_expires_at: string | null };
  total_leads?: number;
  billing_starts_at?: string | null;
  offer?: 'winback' | null;
  limits?: { quizzes: number | null; leads: number | null; emails: number | null };
  leads_this_month?: number;
  quiz_count?: number;
}

export function isUnpaid(plan: string | null | undefined): boolean {
  return !plan || plan === 'free' || plan === 'trial';
}

export function daysUntil(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86400000));
}

/** "October 19" */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** Price per month for a plan, as shown on the pricing page (yearly billing is the discounted monthly rate). */
export function monthlyPrice(planKey: string, billing: Billing): number | null {
  const p = PLANS.find((x) => x.key === planKey);
  return p ? (billing === 'yearly' ? p.yearly : p.monthly) : null;
}

export function planName(planKey: string): string {
  const p = PLANS.find((x) => x.key === planKey);
  return p ? p.name : planKey.charAt(0).toUpperCase() + planKey.slice(1);
}

/** The one-click upgrade link: billing page with the plan preselected, starting checkout as soon as it loads. */
export function checkoutHref(opts: { plan?: string; billing?: Billing; offer?: 'winback' | null; from?: string } = {}): string {
  const q = new URLSearchParams({ plan: opts.plan || 'pro', billing: opts.billing || 'yearly', checkout: '1' });
  if (opts.offer) q.set('offer', opts.offer);
  if (opts.from) q.set('from', opts.from);
  return '/dashboard/billing?' + q.toString();
}

let cached: Promise<PlanStatus | null> | null = null;

/** GET /api/user/plan, shared by every prompt on the page. */
export function fetchPlanStatus(force = false): Promise<PlanStatus | null> {
  if (cached && !force) return cached;
  cached = (async () => {
    const token = await getAuthToken();
    if (!token) return null;
    const r = await fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } });
    return r.ok ? ((await r.json()) as PlanStatus) : null;
  })().catch(() => null);
  return cached;
}

/** Starts Stripe checkout and leaves the page. Resolves with an error message when checkout could not start. */
export async function startCheckout(opts: { plan: string; billing: Billing; offer?: 'winback' | null; placement: string }): Promise<string | null> {
  track('begin_checkout', { plan: opts.plan, billing_period: opts.billing, placement: opts.placement, offer: opts.offer || 'none' });
  try {
    const token = await getAuthToken();
    if (!token) return 'Please sign in again to choose a plan.';
    const r = await fetch(API + '/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ plan: opts.plan, billing: opts.billing, ...(opts.offer ? { offer: opts.offer } : {}) }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || 'Could not start checkout. Please try again.';
  } catch {
    return 'Could not reach the payment page. Please try again.';
  }
}
