/**
 * The owner's customer list on /admin: every account with its plan, what Stripe says it pays, usage and sign-in details.
 *
 * - "Paying" always comes from Stripe, read at request time. The stored plan column alone is never counted as revenue, so a
 *   manual or legacy grant (migration 032) shows as a free grant and an unconfirmed paid plan is flagged, not added to MRR.
 * - Read-only: nothing here writes to the database or to Stripe.
 * - Callers must check admin access first. Password hashes, session data and tokens are never selected.
 */
import type Stripe from 'stripe';
import { supabase } from '../db/supabaseClient';
import { canonicalPlanName } from '../middleware/planGuard';
import { priceIdToPlanName } from './billingPlans';
import { isUnpaidPlan, trialEndsAt } from './upgradeOffers';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Rows per request when reading whole tables, so a PostgREST row cap can never cut a count short. */
const PAGE = 1000;
/** Stripe pages of 100; stop after this many subscriptions. */
const MAX_STRIPE_SUBSCRIPTIONS = 2000;

export type CustomerStatus =
  | 'paying'          // Stripe: active subscription
  | 'payment_failed'  // Stripe: past_due, unpaid or incomplete
  | 'card_trial'      // Stripe: trialing (card saved, first charge at trial end)
  | 'canceled'        // Stripe: canceled, paused or expired, and nothing newer
  | 'free_grant'      // legacy entitlement (migration 032): Business access without any payment
  | 'plan_not_paid'   // stored plan is paid but Stripe has no subscription for the account
  | 'trial'           // free 14-day trial, no card
  | 'trial_ended'     // trial over, no plan
  | 'unverified';     // Stripe could not be read and the account has a Stripe reference

export interface SubscriptionSummary {
  id: string;
  customer: string | null;
  status: string;
  plan: string | null;
  interval: string;
  interval_count: number;
  currency: string;
  /** What one billing period costs after any discount, in the smallest currency unit. */
  amount_cents: number;
  /** The same amount spread per month (yearly / 12). */
  monthly_cents: number;
  discount_percent: number | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created: string | null;
}

export interface AdminCustomer {
  id: string;
  email: string;
  name: string | null;
  signed_up_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  sign_in_with: 'Google' | 'Email';
  is_admin: boolean;
  plan: string;
  status: CustomerStatus;
  trial_ends_at: string | null;
  free_grant: boolean;
  stripe_customer_id: string | null;
  /** Monthly revenue Stripe confirms for this account (active subscriptions only). */
  monthly_cents: number;
  subscriptions: SubscriptionSummary[];
  quizzes: { total: number; published: number };
  views: number;
  leads: { total: number; last_30_days: number; held: number };
}

export interface CustomersReport {
  generated_at: string;
  stripe: { checked: boolean; error: string | null };
  summary: {
    total: number;
    by_status: Record<CustomerStatus, number>;
    mrr_cents: number | null;
    currency: string;
    /** Active Stripe subscriptions whose customer is not linked to any account here (still counted in MRR). */
    unlinked_active_subscriptions: number;
    new_last_30_days: number;
    signed_in_last_30_days: number;
    with_published_quiz: number;
  };
  customers: AdminCustomer[];
}

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

function months(interval: string, count: number): number {
  if (interval === 'year') return 12 * count;
  if (interval === 'week') return (count * 12) / 52;
  if (interval === 'day') return (count * 12) / 365;
  return count;
}

export function summarizeSubscription(s: Stripe.Subscription): SubscriptionSummary {
  let amount = 0;
  let interval = 'month';
  let count = 1;
  let priceId: string | null = null;
  for (const item of s.items?.data || []) {
    const price: any = item.price || (item as any).plan || {};
    amount += Number(price.unit_amount ?? price.amount ?? 0) * (item.quantity ?? 1);
    interval = price.recurring?.interval || price.interval || interval;
    count = price.recurring?.interval_count || price.interval_count || count;
    priceId = priceId || price.id || null;
  }
  const coupon: any = (s as any).discount?.coupon;
  let discountPercent: number | null = null;
  if (coupon?.percent_off) {
    discountPercent = Number(coupon.percent_off);
    amount = Math.round((amount * (100 - discountPercent)) / 100);
  } else if (coupon?.amount_off) {
    amount = Math.max(0, amount - Number(coupon.amount_off));
  }
  const customer = typeof s.customer === 'string' ? s.customer : (s.customer as any)?.id ?? null;
  return {
    id: s.id,
    customer,
    status: s.status,
    plan: priceIdToPlanName(priceId),
    interval,
    interval_count: count,
    currency: s.currency || 'usd',
    amount_cents: amount,
    monthly_cents: Math.round(amount / months(interval, count)),
    discount_percent: discountPercent,
    current_period_end: iso((s as any).current_period_end),
    trial_end: iso(s.trial_end),
    cancel_at_period_end: !!s.cancel_at_period_end,
    created: iso(s.created),
  };
}

/** Every subscription in the Stripe account (any status), newest first. */
export async function listStripeSubscriptions(stripe: Stripe): Promise<SubscriptionSummary[]> {
  const out: SubscriptionSummary[] = [];
  let startingAfter: string | undefined;
  while (out.length < MAX_STRIPE_SUBSCRIPTIONS) {
    const page = await stripe.subscriptions.list({ status: 'all', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    for (const s of page.data) out.push(summarizeSubscription(s));
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

/** Monthly revenue from active subscriptions only (not trialing, not past due). */
export function activeMrrCents(subs: SubscriptionSummary[]): number {
  return subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.monthly_cents, 0);
}

async function selectAll(table: string, cols: string): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(cols).order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) return out;
  }
}

const RANK: Record<string, number> = { active: 5, past_due: 4, unpaid: 4, incomplete: 4, trialing: 3, paused: 2, canceled: 1, incomplete_expired: 1 };

function classify(u: any, subs: SubscriptionSummary[], freeGrant: boolean, stripeOk: boolean, now: Date): CustomerStatus {
  const best = subs.slice().sort((a, b) => (RANK[b.status] || 0) - (RANK[a.status] || 0))[0];
  if (best) {
    if (best.status === 'active') return 'paying';
    if (best.status === 'past_due' || best.status === 'unpaid' || best.status === 'incomplete') return 'payment_failed';
    if (best.status === 'trialing') return 'card_trial';
  }
  if (!stripeOk && (u.stripe_subscription_id || u.stripe_customer_id)) return 'unverified';
  if (freeGrant) return 'free_grant';
  if (best) return 'canceled';
  if (!isUnpaidPlan(u.plan)) return 'plan_not_paid';
  const end = trialEndsAt(u.created_at);
  return end && end.getTime() > now.getTime() ? 'trial' : 'trial_ended';
}

const STATUSES: CustomerStatus[] = ['paying', 'payment_failed', 'card_trial', 'canceled', 'free_grant', 'plan_not_paid', 'trial', 'trial_ended', 'unverified'];

export async function buildCustomersReport(opts: { stripe: Stripe; isAdmin: (u: any) => boolean; now?: Date }): Promise<CustomersReport> {
  const now = opts.now ?? new Date();
  const since30 = now.getTime() - 30 * DAY_MS;

  const [users, quizzes, leads, held, grants] = await Promise.all([
    selectAll('users', 'id, email, first_name, plan, created_at, last_login_at, email_verified_at, google_sub, stripe_customer_id, stripe_subscription_id'),
    selectAll('quizzes', 'id, user_id, status, view_count'),
    selectAll('leads', 'id, user_id, created_at'),
    selectAll('held_leads', 'id, user_id'),
    selectAll('legacy_entitlements', 'id, user_id, active'),
  ]);

  let subs: SubscriptionSummary[] = [];
  let stripeError: string | null = null;
  try {
    subs = await listStripeSubscriptions(opts.stripe);
  } catch (err: any) {
    stripeError = err?.message || 'Stripe could not be reached';
  }
  const stripeOk = stripeError === null;

  const quizStats = new Map<string, { total: number; published: number; views: number }>();
  for (const q of quizzes) {
    const s = quizStats.get(q.user_id) || { total: 0, published: 0, views: 0 };
    s.total++;
    if (q.status === 'live') s.published++;
    s.views += Number(q.view_count || 0);
    quizStats.set(q.user_id, s);
  }
  const leadStats = new Map<string, { total: number; recent: number }>();
  for (const l of leads) {
    const s = leadStats.get(l.user_id) || { total: 0, recent: 0 };
    s.total++;
    if (new Date(l.created_at).getTime() >= since30) s.recent++;
    leadStats.set(l.user_id, s);
  }
  const heldCount = new Map<string, number>();
  for (const h of held) heldCount.set(h.user_id, (heldCount.get(h.user_id) || 0) + 1);
  const granted = new Set(grants.filter((g) => g.active).map((g) => g.user_id));

  const linked = new Set<string>();
  const customers: AdminCustomer[] = users.map((u) => {
    const mine = subs.filter((s) => s.id === u.stripe_subscription_id || (!!u.stripe_customer_id && s.customer === u.stripe_customer_id));
    mine.forEach((s) => linked.add(s.id));
    const freeGrant = granted.has(u.id);
    const status = classify(u, mine, freeGrant, stripeOk, now);
    const paidPlan = mine.find((s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due')?.plan;
    const q = quizStats.get(u.id) || { total: 0, published: 0, views: 0 };
    const l = leadStats.get(u.id) || { total: 0, recent: 0 };
    const trialEnd = isUnpaidPlan(u.plan) ? trialEndsAt(u.created_at) : null;
    return {
      id: u.id,
      email: u.email,
      name: u.first_name || null,
      signed_up_at: u.created_at || null,
      last_sign_in_at: u.last_login_at || null,
      email_confirmed: !!u.email_verified_at,
      sign_in_with: u.google_sub ? 'Google' : 'Email',
      is_admin: opts.isAdmin(u),
      plan: freeGrant ? 'business' : paidPlan || canonicalPlanName(u.plan || 'free'),
      status,
      trial_ends_at: trialEnd ? trialEnd.toISOString() : null,
      free_grant: freeGrant,
      stripe_customer_id: u.stripe_customer_id || null,
      monthly_cents: activeMrrCents(mine),
      subscriptions: mine,
      quizzes: { total: q.total, published: q.published },
      views: q.views,
      leads: { total: l.total, last_30_days: l.recent, held: heldCount.get(u.id) || 0 },
    };
  });
  customers.sort((a, b) => String(b.signed_up_at || '').localeCompare(String(a.signed_up_at || '')));

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<CustomerStatus, number>;
  for (const c of customers) byStatus[c.status]++;

  return {
    generated_at: now.toISOString(),
    stripe: { checked: stripeOk, error: stripeError },
    summary: {
      total: customers.length,
      by_status: byStatus,
      mrr_cents: stripeOk ? activeMrrCents(subs) : null,
      currency: subs[0]?.currency || 'usd',
      unlinked_active_subscriptions: subs.filter((s) => s.status === 'active' && !linked.has(s.id)).length,
      new_last_30_days: customers.filter((c) => c.signed_up_at && new Date(c.signed_up_at).getTime() >= since30).length,
      signed_in_last_30_days: customers.filter((c) => c.last_sign_in_at && new Date(c.last_sign_in_at).getTime() >= since30).length,
      with_published_quiz: customers.filter((c) => c.quizzes.published > 0).length,
    },
    customers,
  };
}
