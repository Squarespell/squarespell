/**
 * Asking trial users to pay without losing anything: leads held after the trial (migration 036), released on payment,
 * deleted after 30 days; billing deferred to the trial end; the win-back offer; and the emails that carry it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Stripe from 'stripe';
import { api, makeUser, makeQuiz, bearer, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { outbox, resetOutbox } from '../helpers/mailFake';
import { stripeCalls, resetStripe } from '../helpers/stripeFake';
import { WINBACK_COUPON_ID, deferBillingUntil, winbackEligible, trialEndsAt } from '../../services/upgradeOffers';

const stripe = new Stripe('sk_test_local_fixture');
const CRON = () => ({ 'x-cron-secret': process.env.CRON_SECRET! });
const lead = (over: Record<string, any> = {}) => ({ name: 'Ada Lovelace', email: 'ada@customer.example', answers: { 0: 2, 1: 2 }, ...over });
const DAY = 86400000;

beforeEach(async () => { await resetData(); resetOutbox(); resetStripe(); });

async function expiredOwnerQuiz(days = 20, email?: string) {
  const owner = await makeUser({ plan: 'free', createdDaysAgo: days, email });
  const quiz = await makeQuiz(owner, { slug: 'held-' + Math.random().toString(36).slice(2, 7) });
  return { owner, quiz };
}
const submit = async (slug: string, body: any) => (await api()).post(`/api/quiz/${slug}/lead`).set('X-Forwarded-For', nextIp()).send(body);

function checkoutCompleted(userId: string, plan = 'pro') {
  const evt = {
    id: 'evt_' + Math.random().toString(36).slice(2, 12), object: 'event', api_version: '2023-10-16', created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed', livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null },
    data: { object: { id: 'cs_held', customer: 'cus_held', subscription: 'sub_held', metadata: { db_user_id: userId, plan } } },
  };
  const payload = JSON.stringify(evt);
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  return api().then((a) => a.post('/api/stripe/webhook').set('content-type', 'application/json').set('stripe-signature', sig).send(payload));
}

describe('after the trial ends, leads are held instead of lost', () => {
  it('the visitor gets a normal success, the lead is held (not in leads), nothing is counted or emailed', async () => {
    const { owner, quiz } = await expiredOwnerQuiz(20, 'owner@expired.example');
    const r = await submit(quiz.slug, lead());
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ success: true, held: true, duplicate: false });
    expect(await sql<any>(`select * from leads where user_id=$1`, [owner.id])).toHaveLength(0);
    const held = await sql<any>(`select * from held_leads where user_id=$1`, [owner.id]);
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ quiz_id: quiz.id, email: 'ada@customer.example', name: 'Ada Lovelace', outcome_id: 'high', score: 4 });
    expect(new Date(held[0].expires_at).getTime() - Date.now()).toBeGreaterThan(29 * DAY);
    expect((await sql<any>(`select lead_count from quizzes where id=$1`, [quiz.id]))[0].lead_count).toBe(0);
    await new Promise((res) => setTimeout(res, 300));
    expect(outbox).toHaveLength(0);
    // The dashboard lead list does not show held leads.
    const list = await (await api()).get('/api/leads').set(bearer(owner));
    expect(list.body).toHaveLength(0);
  });

  it('the same visitor submitting again is a duplicate, not a second held lead', async () => {
    const { owner, quiz } = await expiredOwnerQuiz();
    await submit(quiz.slug, lead());
    const again = await submit(quiz.slug, lead());
    expect(again.status).toBe(201);
    expect(again.body).toMatchObject({ held: true, duplicate: true });
    expect(await sql<any>(`select id from held_leads where user_id=$1`, [owner.id])).toHaveLength(1);
  });

  it('choosing a plan releases the held leads into the dashboard with their original time, and counts them', async () => {
    const { owner, quiz } = await expiredOwnerQuiz();
    await submit(quiz.slug, lead());
    await submit(quiz.slug, lead({ email: 'grace@customer.example', name: 'Grace Hopper' }));
    // One held lead older than 30 days is not released.
    await sql(`insert into held_leads (quiz_id, user_id, email, expires_at) values ($1, $2, 'old@customer.example', now() - interval '1 day')`, [quiz.id, owner.id]);
    const r = await checkoutCompleted(owner.id, 'pro');
    expect(r.status).toBe(200);
    const leads = await sql<any>(`select email, metadata from leads where user_id=$1 order by email`, [owner.id]);
    expect(leads.map((l) => l.email)).toEqual(['ada@customer.example', 'grace@customer.example']);
    expect(leads[0].metadata).toMatchObject({ held_until_plan: true, score: 4 });
    expect((await sql<any>(`select lead_count from quizzes where id=$1`, [quiz.id]))[0].lead_count).toBe(2);
    expect(await sql<any>(`select id from held_leads where user_id=$1`, [owner.id])).toHaveLength(0);
    expect((await sql<any>(`select plan from users where id=$1`, [owner.id]))[0].plan).toBe('pro');
  });

  it('the hourly job deletes held leads after 30 days', async () => {
    const { owner, quiz } = await expiredOwnerQuiz();
    await submit(quiz.slug, lead());
    await sql(`insert into held_leads (quiz_id, user_id, email, expires_at) values ($1, $2, 'old@customer.example', now() - interval '1 minute')`, [quiz.id, owner.id]);
    const r = await (await api()).post('/api/cron/cleanup-preview-cache').set(CRON()).send({});
    expect(r.status).toBe(200);
    expect(r.body.held_leads_purged).toBe(1);
    expect((await sql<any>(`select email from held_leads where user_id=$1`, [owner.id])).map((x) => x.email)).toEqual(['ada@customer.example']);
  });

  it('the plan API reports held leads and the win-back offer to the owner', async () => {
    const { owner, quiz } = await expiredOwnerQuiz(20);
    await submit(quiz.slug, lead());
    const r = await (await api()).get('/api/user/plan').set(bearer(owner));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ trial_active: false, offer: 'winback', billing_starts_at: null });
    expect(r.body.held_leads.count).toBe(1);
    expect(r.body.held_leads.first_expires_at).toBeTruthy();
  });
});

describe('choosing a plan during the trial costs no trial days', () => {
  it('checkout during the trial starts billing at the trial end', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 3 });
    const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'yearly' });
    expect(r.status).toBe(200);
    const created = (await sql<any>(`select created_at from users where id=$1`, [u.id]))[0].created_at;
    const expected = Math.floor(trialEndsAt(new Date(created).toISOString())!.getTime() / 1000);
    expect(stripeCalls.checkout[0].subscription_data).toEqual({ trial_end: expected });
    expect(stripeCalls.checkout[0].discounts).toBeUndefined();
    expect(r.body.billing_starts_at).toBe(new Date(expected * 1000).toISOString());
    const plan = await (await api()).get('/api/user/plan').set(bearer(u));
    expect(plan.body).toMatchObject({ trial_active: true, offer: null, billing_starts_at: r.body.billing_starts_at });
  });

  it('with less than two days left billing starts at checkout (Stripe needs 48 hours)', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 13 });
    await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'monthly' });
    expect(stripeCalls.checkout[0].subscription_data).toBeUndefined();
  });
});

describe('win-back offer: 20% off the first 3 monthly payments', () => {
  it('applies to a monthly plan after a trial that ended without a plan, and the coupon is created once', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 20 });
    const app = await api();
    const a = await app.post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'monthly', offer: 'winback' });
    expect(a.status).toBe(200);
    expect(a.body.offer).toBe('winback');
    expect(stripeCalls.checkout[0].discounts).toEqual([{ coupon: WINBACK_COUPON_ID }]);
    expect(stripeCalls.checkout[0].metadata).toMatchObject({ offer: 'winback', plan: 'pro' });
    expect(stripeCalls.couponsCreated).toHaveLength(1);
    expect(stripeCalls.couponsCreated[0]).toMatchObject({ id: WINBACK_COUPON_ID, percent_off: 20, duration: 'repeating', duration_in_months: 3 });
    await app.post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'core', billing: 'monthly', offer: 'winback' });
    expect(stripeCalls.couponsCreated).toHaveLength(1);
    expect(stripeCalls.checkout[1].discounts).toEqual([{ coupon: WINBACK_COUPON_ID }]);
  });

  it('is not applied to yearly billing, during the trial, after the window, or to a paying account', async () => {
    const app = await api();
    const expired = await makeUser({ plan: 'free', createdDaysAgo: 20 });
    await app.post('/api/stripe/create-checkout').set(bearer(expired)).send({ plan: 'pro', billing: 'yearly', offer: 'winback' });
    const inTrial = await makeUser({ plan: 'free', createdDaysAgo: 5 });
    await app.post('/api/stripe/create-checkout').set(bearer(inTrial)).send({ plan: 'pro', billing: 'monthly', offer: 'winback' });
    const late = await makeUser({ plan: 'free', createdDaysAgo: 14 + 46 });
    await app.post('/api/stripe/create-checkout').set(bearer(late)).send({ plan: 'pro', billing: 'monthly', offer: 'winback' });
    expect(stripeCalls.checkout).toHaveLength(3);
    for (const c of stripeCalls.checkout) expect(c.discounts).toBeUndefined();
    expect(stripeCalls.couponsCreated).toHaveLength(0);
    const now = new Date();
    expect(winbackEligible({ plan: 'pro', created_at: new Date(now.getTime() - 20 * DAY).toISOString() }, now)).toBe(false);
    expect(winbackEligible({ plan: 'free', created_at: new Date(now.getTime() - 20 * DAY).toISOString(), stripe_subscription_id: 'sub_x' }, now)).toBe(false);
    expect(deferBillingUntil({ plan: 'pro', created_at: new Date(now.getTime() - 2 * DAY).toISOString() }, now)).toBeNull();
  });
});

describe('trial emails', () => {
  it('3 days after the trial ended: one email with the waiting leads and the offer link; the 30-day email is the last call', async () => {
    const { owner, quiz } = await expiredOwnerQuiz(17, 'returning@owner.example');
    await submit(quiz.slug, lead());
    await submit(quiz.slug, lead({ email: 'b@customer.example', name: 'Bea Smith' }));
    const app = await api();
    expect((await app.post('/api/cron/trial-reminders').set(CRON()).send({})).status).toBe(200);
    const mail = outbox.filter((m) => String(m.to) === 'returning@owner.example');
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toBe('2 leads are waiting in your Squarespell account');
    expect(String(mail[0].html)).toContain('offer=winback');
    expect(String(mail[0].html)).toContain('20% off your first 3 months');
    // Sent once only.
    await app.post('/api/cron/trial-reminders').set(CRON()).send({});
    expect(outbox.filter((m) => String(m.to) === 'returning@owner.example')).toHaveLength(1);
    // The day-30 email to an account with nothing waiting.
    await makeUser({ plan: 'free', createdDaysAgo: 30, email: 'quiet@owner.example' });
    await app.post('/api/cron/trial-reminders').set(CRON()).send({});
    const last = outbox.filter((m) => String(m.to) === 'quiet@owner.example');
    expect(last).toHaveLength(1);
    expect(last[0].subject).toBe('Last chance: 20% off Squarespell for 3 months');
    expect(owner.id).toBeTruthy();
  });

  it('the trial emails state the real price and what happens after the trial (no "quizzes go offline", no $19)', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 11, email: 'day11@owner.example' });
    await (await api()).post('/api/cron/trial-reminders').set(CRON()).send({});
    const m = outbox.find((x) => String(x.to) === 'day11@owner.example');
    expect(m).toBeTruthy();
    const html = String(m!.html);
    expect(html).toContain('$9 a month, billed yearly');
    expect(html).not.toMatch(/\$19|go offline|go offline/);
    expect(html).toContain('/dashboard/billing?plan=pro');
    expect(u.id).toBeTruthy();
  });
});
