/**
 * Owner customer list (GET /api/admin/customers) and the admin metrics it corrects: "paying" and MRR come only from
 * Stripe, never from the stored plan column, so a legacy grant or an unconfirmed paid plan is never counted as revenue.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { resetStripe, stripeSubscriptions, stripeBehaviour } from '../helpers/stripeFake';

const DAY = 86400;
const nowS = () => Math.floor(Date.now() / 1000);

async function admin() {
  const u = await makeUser({ email: 'admin@example.test', plan: 'free', createdDaysAgo: 100 });
  await sql('update users set email_verified_at = now() where id = $1', [u.id]);
  return u;
}
const linkStripe = (id: string, customer: string, subscription: string) =>
  sql('update users set stripe_customer_id = $2, stripe_subscription_id = $3 where id = $1', [id, customer, subscription]);

function sub(id: string, customer: string, status: string, unitAmount: number, opts: { interval?: string; percentOff?: number; trialEnd?: number } = {}) {
  return {
    id, object: 'subscription', customer, status, currency: 'usd', cancel_at_period_end: false,
    created: nowS() - 10 * DAY, current_period_end: nowS() + 20 * DAY, trial_end: opts.trialEnd ?? null,
    discount: opts.percentOff ? { coupon: { percent_off: opts.percentOff } } : null,
    items: { data: [{ quantity: 1, price: { id: 'price_x', unit_amount: unitAmount, recurring: { interval: opts.interval ?? 'month', interval_count: 1 } } }] },
  };
}

async function customers(u: { token: string }) {
  const r = await (await api()).get('/api/admin/customers').set(bearer(u));
  return r;
}

beforeEach(async () => { await resetData(); resetStripe(); });

describe('GET /api/admin/customers', () => {
  it('is for admins only', async () => {
    const someone = await makeUser({ plan: 'pro' });
    expect((await (await api()).get('/api/admin/customers')).status).toBe(401);
    expect((await customers(someone)).status).toBe(403);
    expect((await customers(await admin())).status).toBe(200);
  });

  it('marks each account by what Stripe confirms, not by the stored plan', async () => {
    const owner = await admin();
    const paying = await makeUser({ plan: 'business', createdDaysAgo: 40, email: 'paying@quiz-test.example' });
    await linkStripe(paying.id, 'cus_paid', 'sub_paid');
    const yearly = await makeUser({ plan: 'pro', createdDaysAgo: 60, email: 'yearly@quiz-test.example' });
    await linkStripe(yearly.id, 'cus_year', 'sub_year');
    const cardTrial = await makeUser({ plan: 'free', createdDaysAgo: 3, email: 'cardtrial@quiz-test.example' });
    await linkStripe(cardTrial.id, 'cus_trial', 'sub_trial');
    const legacy = await makeUser({ plan: 'agency', createdDaysAgo: 200, email: 'legacy@quiz-test.example' });
    await sql(`insert into legacy_entitlements (user_id, original_plan) values ($1, 'agency')`, [legacy.id]);
    const unpaidPlan = await makeUser({ plan: 'pro', createdDaysAgo: 20, email: 'nopay@quiz-test.example' });
    const trial = await makeUser({ plan: 'free', createdDaysAgo: 2, email: 'trial@quiz-test.example' });
    const ended = await makeUser({ plan: 'free', createdDaysAgo: 30, email: 'ended@quiz-test.example' });
    stripeSubscriptions.push(
      sub('sub_paid', 'cus_paid', 'active', 3500),
      sub('sub_year', 'cus_year', 'active', 19200, { interval: 'year' }),
      sub('sub_trial', 'cus_trial', 'trialing', 1900, { trialEnd: nowS() + 11 * DAY }),
      sub('sub_orphan', 'cus_elsewhere', 'active', 1200, { percentOff: 20 }),
    );

    const r = await customers(owner);
    expect(r.status).toBe(200);
    const by = (u: { id: string }) => r.body.customers.find((c: any) => c.id === u.id);
    expect(by(paying)).toMatchObject({ status: 'paying', monthly_cents: 3500, free_grant: false });
    expect(by(yearly)).toMatchObject({ status: 'paying', monthly_cents: 1600 });
    expect(by(cardTrial)).toMatchObject({ status: 'card_trial', monthly_cents: 0 });
    expect(by(legacy)).toMatchObject({ status: 'free_grant', plan: 'business', free_grant: true, monthly_cents: 0 });
    expect(by(unpaidPlan)).toMatchObject({ status: 'plan_not_paid', monthly_cents: 0 });
    expect(by(trial).status).toBe('trial');
    expect(by(trial).trial_ends_at).toBeTruthy();
    expect(by(ended).status).toBe('trial_ended');
    expect(by(owner).is_admin).toBe(true);
    expect(by(paying).is_admin).toBe(false);

    // MRR = active subscriptions only (35 + 192/12 + 12 less 20%), including one not linked to any account
    expect(r.body.stripe).toEqual({ checked: true, error: null });
    expect(r.body.summary.mrr_cents).toBe(3500 + 1600 + 960);
    expect(r.body.summary.unlinked_active_subscriptions).toBe(1);
    expect(r.body.summary.by_status).toMatchObject({ paying: 2, card_trial: 1, free_grant: 1, plan_not_paid: 1, trial: 1, trial_ended: 2 });
    expect(r.body.summary.total).toBe(8);
  });

  it('counts quizzes, views and leads per account and never returns secrets', async () => {
    const owner = await admin();
    const u = await makeUser({ plan: 'free', createdDaysAgo: 5 });
    await sql(`update users set password_hash = 'hash-must-not-leak', google_sub = 'google-sub-must-not-leak', last_login_at = now() where id = $1`, [u.id]);
    const live = await makeQuiz(u, { status: 'live' });
    await makeQuiz(u, { status: 'draft' });
    await sql('update quizzes set view_count = 7 where id = $1', [live.id]);
    await sql(`insert into leads (quiz_id, user_id, email, answers) values ($1,$2,'a@x.example','{}'::jsonb), ($1,$2,'b@x.example','{}'::jsonb)`, [live.id, u.id]);
    await sql(`insert into leads (quiz_id, user_id, email, answers, created_at) values ($1,$2,'old@x.example','{}'::jsonb, now() - interval '45 days')`, [live.id, u.id]);
    await sql(`insert into held_leads (quiz_id, user_id, email) values ($1,$2,'held@x.example')`, [live.id, u.id]);

    const r = await customers(owner);
    const c = r.body.customers.find((x: any) => x.id === u.id);
    expect(c).toMatchObject({ quizzes: { total: 2, published: 1 }, views: 7, leads: { total: 3, last_30_days: 2, held: 1 }, sign_in_with: 'Google' });
    expect(c.last_sign_in_at).toBeTruthy();
    expect(r.body.summary.with_published_quiz).toBe(1);
    // the admin's own request also counts as a sign-in
    expect(r.body.summary.signed_in_last_30_days).toBe(2);
    const text = JSON.stringify(r.body);
    expect(text).not.toContain('hash-must-not-leak');
    expect(text).not.toContain('google-sub-must-not-leak');
    expect(text).not.toMatch(/password|token/i);
  });

  it('still lists everyone when Stripe cannot be read, without guessing revenue', async () => {
    const owner = await admin();
    const paying = await makeUser({ plan: 'business' });
    await linkStripe(paying.id, 'cus_paid', 'sub_paid');
    const legacy = await makeUser({ plan: 'agency', createdDaysAgo: 200 });
    await sql(`insert into legacy_entitlements (user_id, original_plan) values ($1, 'agency')`, [legacy.id]);
    stripeBehaviour.failSubscriptionsList = true;

    const r = await customers(owner);
    expect(r.status).toBe(200);
    expect(r.body.stripe.checked).toBe(false);
    expect(r.body.summary.mrr_cents).toBeNull();
    expect(r.body.customers.find((c: any) => c.id === paying.id).status).toBe('unverified');
    expect(r.body.customers.find((c: any) => c.id === legacy.id).status).toBe('free_grant');
  });
});

describe('GET /api/admin/metrics', () => {
  it('takes MRR from Stripe only, active users from sign-ins and activation from accounts with a published quiz', async () => {
    const owner = await admin();
    const legacy = await makeUser({ plan: 'agency', createdDaysAgo: 200 });
    await sql(`insert into legacy_entitlements (user_id, original_plan) values ($1, 'agency')`, [legacy.id]);
    const paying = await makeUser({ plan: 'business' });
    await linkStripe(paying.id, 'cus_paid', 'sub_paid');
    stripeSubscriptions.push(sub('sub_paid', 'cus_paid', 'active', 3500));
    await sql(`update users set last_login_at = now() where id = $1`, [paying.id]);
    await sql(`update users set last_login_at = now() - interval '40 days' where id = $1`, [legacy.id]);
    await makeQuiz(paying, { status: 'live' });
    await makeQuiz(paying, { status: 'live' });
    await makeQuiz(paying, { status: 'live' });

    const r = await (await api()).get('/api/admin/metrics').set(bearer(owner));
    expect(r.status).toBe(200);
    expect(r.body.revenue).toMatchObject({ mrr: 35, mrrSource: 'stripe', activeSubscriptions: 1 });
    // the paying account and the admin (signed in by this request); not the account last seen 40 days ago
    expect(r.body.users.activeLastMonth).toBe(2);
    // 1 of 3 accounts has a published quiz (3 quizzes used to read as 100%)
    expect(r.body.metrics.activationRate).toBe(33);

    stripeBehaviour.failSubscriptionsList = true;
    const down = await (await api()).get('/api/admin/metrics').set(bearer(owner));
    expect(down.body.revenue).toMatchObject({ mrr: null, mrrSource: 'unavailable' });
  });
});
