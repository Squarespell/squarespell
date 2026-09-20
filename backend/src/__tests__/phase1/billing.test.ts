/**
 * Phase 1 - Stripe billing safety. Signatures are computed locally with the official stripe
 * library and a locally generated signing secret; the Stripe API itself is a local stub.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import { api, makeUser, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { outbox, resetOutbox } from '../helpers/resendFake';
import { stripeCalls, resetStripe } from '../helpers/stripeFake';

const stripe = new Stripe('sk_test_local_fixture');
const SECRET = () => process.env.STRIPE_WEBHOOK_SECRET!;

function event(type: string, object: any, id = 'evt_' + Math.random().toString(36).slice(2, 12), extra: any = {}) {
  return { id, object: 'event', api_version: '2023-10-16', created: Math.floor(Date.now() / 1000), type, data: { object, ...extra }, livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null } };
}
function post(evt: any, opts: { secret?: string; header?: string | null; body?: string } = {}) {
  const payload = opts.body ?? JSON.stringify(evt);
  const sig = opts.header === null ? undefined : (opts.header ?? stripe.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? SECRET() }));
  return api().then((a) => { let r = a.post('/api/stripe/webhook').set('content-type', 'application/json'); if (sig) r = r.set('stripe-signature', sig); return r.send(payload); });
}

beforeEach(async () => { await resetData(); resetOutbox(); resetStripe(); });

describe('Stripe webhook: signature verification', () => {
  it('missing signature header -> 400 invalid_signature, nothing processed', async () => {
    const r = await post(event('checkout.session.completed', {}), { header: null });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('invalid_signature');
  });
  it('signature made with the wrong secret -> 400', async () => {
    const r = await post(event('checkout.session.completed', {}), { secret: 'whsec_not_the_real_secret_at_all' });
    expect(r.status).toBe(400);
  });
  it('payload tampered after signing -> 400 and no plan change', async () => {
    const u = await makeUser({ plan: 'free' });
    const evt = event('checkout.session.completed', { id: 'cs_1', customer: 'cus_1', subscription: 'sub_1', metadata: { db_user_id: u.id, plan: 'pro' } });
    const good = JSON.stringify(evt);
    const sig = stripe.webhooks.generateTestHeaderString({ payload: good, secret: SECRET() });
    const tampered = good.replace('"pro"', '"business"');
    const r = await post(evt, { header: sig, body: tampered });
    expect(r.status).toBe(400);
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('free');
  });
  it('stale timestamp (replay of an old signed request beyond the 5-minute tolerance) -> 400', async () => {
    const evt = event('checkout.session.completed', {});
    const payload = JSON.stringify(evt);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET(), timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect((await post(evt, { header })).status).toBe(400);
  });
  it('when STRIPE_WEBHOOK_SECRET is not configured the endpoint refuses (503 webhook_not_configured), it does not accept', async () => {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const evt = event('ping', {});
      const payload = JSON.stringify(evt);
      const header = stripe.webhooks.generateTestHeaderString({ payload, secret: saved! });
      const r = await post(evt, { header, body: payload });
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('webhook_not_configured');
    } finally { process.env.STRIPE_WEBHOOK_SECRET = saved; }
  });
});

describe('Stripe webhook: processing and idempotency', () => {
  it('checkout.session.completed activates the purchased plan and sends one confirmation email', async () => {
    const u = await makeUser({ plan: 'free' });
    const r = await post(event('checkout.session.completed', { id: 'cs_1', customer: 'cus_1', subscription: 'sub_1', metadata: { db_user_id: u.id, plan: 'pro' } }));
    expect(r.status).toBe(200);
    expect(r.body.received).toBe(true);
    expect((await sql<any>(`select plan, stripe_customer_id, stripe_subscription_id from users where id=$1`, [u.id]))[0]).toEqual({ plan: 'pro', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' });
  });

  it('the same event id delivered twice (Stripe retry) is processed once and answered 200 both times', async () => {
    const u = await makeUser({ plan: 'free', email: 'payer@customer.example' });
    const evt = event('checkout.session.completed', { id: 'cs_2', customer: 'cus_2', subscription: 'sub_2', metadata: { db_user_id: u.id, plan: 'pro' } }, 'evt_dup_1');
    const a = await post(evt);
    await new Promise((r) => setTimeout(r, 200));
    const emailsAfterFirst = outbox.length;
    const b = await post(evt);
    await new Promise((r) => setTimeout(r, 200));
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect(b.body.duplicate).toBe(true);
    expect(outbox.length).toBe(emailsAfterFirst);
    expect(await sql(`select 1 from stripe_webhook_events where event_id='evt_dup_1'`)).toHaveLength(1);
  });

  it('replaying an old event cannot roll a customer back to an earlier plan', async () => {
    const u = await makeUser({ plan: 'free' });
    const first = event('checkout.session.completed', { id: 'cs_3', customer: 'cus_3', subscription: 'sub_3', metadata: { db_user_id: u.id, plan: 'core' } }, 'evt_old');
    await post(first);
    await sql(`update users set plan='business' where id=$1`, [u.id]); // later upgrade
    await post(first); // replay of the very same event
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('business');
  });

  it('unknown event types are acknowledged and ignored safely (200, no side effects)', async () => {
    const before = JSON.stringify(await sql(`select * from users`));
    const r = await post(event('some.future.event', { id: 'x' }));
    expect(r.status).toBe(200);
    expect(JSON.stringify(await sql(`select * from users`))).toBe(before);
  });

  it('events that are not about a Quiz customer (shared Stripe account: marketplace objects) are ignored, not errors', async () => {
    expect((await post(event('checkout.session.completed', { id: 'cs_woo', customer: 'cus_woo', subscription: null, metadata: {} }))).status).toBe(200);
    expect((await post(event('customer.subscription.deleted', { id: 'sub_woo', items: { data: [{ price: { id: 'price_marketplace' } }] } }))).status).toBe(200);
    expect((await post(event('invoice.payment_failed', { customer: 'cus_woo' }))).status).toBe(200);
  });

  it('subscription.updated for a known Quiz subscription syncs the plan from the price id', async () => {
    const u = await makeUser({ plan: 'core' });
    await sql(`update users set stripe_subscription_id='sub_up' where id=$1`, [u.id]);
    const r = await post(event('customer.subscription.updated', { id: 'sub_up', items: { data: [{ price: { id: process.env.STRIPE_BUSINESS_PRICE_ID } }] } }, undefined, { previous_attributes: {} }));
    expect(r.status).toBe(200);
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('business');
  });

  it('MISSING PLAN MAPPING fails clearly: a known Quiz subscription on a price we cannot map is NOT guessed - explicit 500 plan_mapping_missing, plan unchanged (Stripe will retry and alert)', async () => {
    const u = await makeUser({ plan: 'core' });
    await sql(`update users set stripe_subscription_id='sub_unmapped' where id=$1`, [u.id]);
    const r = await post(event('customer.subscription.updated', { id: 'sub_unmapped', items: { data: [{ price: { id: 'price_starter_from_stripe_catalog' } }] } }));
    expect(r.status).toBe(500);
    expect(r.body.code).toBe('plan_mapping_missing');
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('core');
  });

  it('checkout.session.completed with an unknown plan name in metadata is rejected clearly, plan unchanged', async () => {
    const u = await makeUser({ plan: 'free' });
    const r = await post(event('checkout.session.completed', { id: 'cs_9', customer: 'cus_9', subscription: 'sub_9', metadata: { db_user_id: u.id, plan: 'starter-typo' } }));
    expect(r.status).toBe(500);
    expect(r.body.code).toBe('plan_mapping_missing');
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('free');
  });

  it('subscription.deleted downgrades the Quiz user and sends the cancellation email once', async () => {
    const u = await makeUser({ plan: 'pro', email: 'leaving@customer.example' });
    await sql(`update users set stripe_subscription_id='sub_del' where id=$1`, [u.id]);
    await post(event('customer.subscription.deleted', { id: 'sub_del', current_period_end: Math.floor(Date.now() / 1000) + 86400, items: { data: [{ price: { id: process.env.STRIPE_PRO_PRICE_ID } }] } }));
    expect((await sql<any>(`select plan, stripe_subscription_id from users where id=$1`, [u.id]))[0]).toEqual({ plan: 'free', stripe_subscription_id: null });
  });

  it('a database failure while applying a paid event returns 5xx so Stripe retries (never a silent 200 that loses the upgrade)', async () => {
    const { dbFault } = await import('../helpers/fakeSupabase');
    const u = await makeUser({ plan: 'free' });
    const evt = event('checkout.session.completed', { id: 'cs_db', customer: 'cus_db', subscription: 'sub_db', metadata: { db_user_id: u.id, plan: 'pro' } }, 'evt_db_down');
    dbFault.on = true;
    let r;
    try { r = await post(evt); } finally { dbFault.on = false; }
    expect(r.status).toBeGreaterThanOrEqual(500);
    // the failed event must not be remembered as processed: the retry has to apply it
    const retry = await post(evt);
    expect(retry.status).toBe(200);
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('pro');
  });
});

describe('billing code fails clearly when a plan-to-price mapping is missing (no default price, no guessing)', () => {
  const saved: Record<string, string | undefined> = {};
  afterEach(() => { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('create-checkout uses the configured price id for the requested plan and billing period and tags the session with the plan', async () => {
    const u = await makeUser({ plan: 'free' });
    const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'yearly' });
    expect(r.status).toBe(200);
    expect(r.body.url).toContain('checkout.stripe.test');
    expect(stripeCalls.checkout[0].line_items[0].price).toBe(process.env.STRIPE_PRO_YEARLY_PRICE_ID);
    expect(stripeCalls.checkout[0].metadata).toMatchObject({ db_user_id: u.id, plan: 'pro' });
  });

  it('a plan whose price id is not configured -> 503 plan_not_configured and Stripe is never called', async () => {
    saved.STRIPE_BUSINESS_PRICE_ID = process.env.STRIPE_BUSINESS_PRICE_ID;
    delete process.env.STRIPE_BUSINESS_PRICE_ID;
    const u = await makeUser({ plan: 'free' });
    const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'business', billing: 'monthly' });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('plan_not_configured');
    expect(stripeCalls.checkout).toHaveLength(0);
  });

  it('an unknown plan name -> 400 (not a silent default)', async () => {
    const u = await makeUser({ plan: 'free' });
    for (const plan of ['starter-typo', undefined, '', 'constructor', '__proto__']) {
      const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan, billing: 'monthly' });
      expect(r.status, String(plan)).toBe(400);
    }
    expect(stripeCalls.checkout).toHaveLength(0);
  });

  it('switch-plan refuses when the target price is not configured and never touches the subscription', async () => {
    saved.STRIPE_CORE_PRICE_ID = process.env.STRIPE_CORE_PRICE_ID;
    delete process.env.STRIPE_CORE_PRICE_ID;
    const u = await makeUser({ plan: 'pro' });
    await sql(`update users set stripe_subscription_id='sub_sw' where id=$1`, [u.id]);
    const r = await (await api()).post('/api/stripe/switch-plan').set(bearer(u)).send({ plan: 'core', billing: 'monthly' });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('plan_not_configured');
    expect(stripeCalls.subsUpdate).toHaveLength(0);
    expect((await sql<any>(`select plan from users where id=$1`, [u.id]))[0].plan).toBe('pro');
  });

  it('when Stripe itself is down checkout answers a clear 502 billing_provider_unavailable', async () => {
    const { stripeBehaviour } = await import('../helpers/stripeFake');
    const u = await makeUser({ plan: 'free' });
    stripeBehaviour.failCheckout = true;
    try {
      const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'monthly' }).timeout({ response: 4000, deadline: 5000 });
      expect(r.status).toBe(502);
      expect(r.body.code).toBe('billing_provider_unavailable');
    } finally { stripeBehaviour.failCheckout = false; }
  });

  it('backend/.env.example documents every STRIPE_*_PRICE_ID variable the code reads (the code reads CORE/BUSINESS names; Stripe catalog objects are Starter/Pro/Agency - the mapping is a Phase 2 decision)', async () => {
    const fs = await import('fs'); const path = await import('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../routes/allRoutes.ts'), 'utf8');
    const used = new Set([...src.matchAll(/process\.env\.(STRIPE_[A-Z0-9_]*PRICE_ID)/g)].map((m) => m[1]));
    const example = fs.readFileSync(path.resolve(__dirname, '../../../.env.example'), 'utf8');
    const undocumented = [...used].filter((k) => !example.includes(k + '='));
    expect(undocumented).toEqual([]);
  });
});
