/**
 * Clerk email.created self-delivery: Svix-authenticated, Resend-relayed, idempotent, flag-gated.
 * Covers the staging cutover from Clerk's shared dev sender to Squarespell's own verified domain.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Webhook } from 'svix';
import { api } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { outbox, resendBehaviour, resetOutbox } from '../helpers/resendFake';

beforeEach(async () => {
  await resetData();
  resetOutbox();
});

function signed(evt: any, secret = process.env.CLERK_WEBHOOK_SECRET!) {
  const payload = JSON.stringify(evt);
  const id = 'msg_' + Math.random().toString(36).slice(2);
  const ts = new Date();
  return {
    payload,
    headers: {
      'svix-id': id,
      'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'svix-signature': new Webhook(secret).sign(id, ts, payload),
      'content-type': 'application/json',
    },
  };
}

function emailCreatedEvent(over: Record<string, any> = {}) {
  return {
    type: 'email.created',
    object: 'event',
    instance_id: 'ins_test',
    timestamp: Date.now(),
    data: {
      id: 'ema_' + Math.random().toString(36).slice(2),
      object: 'email',
      slug: 'verification_code',
      subject: '123456 is your verification code',
      body: '<html><body>123456 is your OTP code</body></html>',
      body_plain: '123456 is your OTP code',
      to_email_address: 'signup@customer.example',
      from_email_name: 'notifications',
      delivered_by_clerk: false,
      status: 'queued',
      ...over,
    },
  };
}

async function post(evt: any) {
  const s = signed(evt);
  return (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
}

describe('POST /api/clerk/webhook — email.created self-delivery', () => {
  const savedFlag = process.env.CLERK_SELF_DELIVERY_ENABLED;
  afterEach(() => {
    if (savedFlag === undefined) delete process.env.CLERK_SELF_DELIVERY_ENABLED;
    else process.env.CLERK_SELF_DELIVERY_ENABLED = savedFlag;
    resendBehaviour.mode = 'ok';
  });

  it('rejects unsigned requests', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const r = await (await api()).post('/api/clerk/webhook').set('content-type', 'application/json').send(JSON.stringify(emailCreatedEvent()));
    expect(r.status).toBe(400);
    expect(outbox).toHaveLength(0);
  });

  it('rejects a signature made with another secret', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const s = signed(emailCreatedEvent(), 'whsec_' + Buffer.from('another-secret-value-000000').toString('base64'));
    const r = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(r.status).toBe(400);
    expect(outbox).toHaveLength(0);
  });

  it('refuses to run (503) when CLERK_WEBHOOK_SECRET is not configured', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const saved = process.env.CLERK_WEBHOOK_SECRET;
    delete process.env.CLERK_WEBHOOK_SECRET;
    const r = await (await api()).post('/api/clerk/webhook').set('content-type', 'application/json').send(JSON.stringify(emailCreatedEvent()));
    expect(r.status).toBe(503);
    process.env.CLERK_WEBHOOK_SECRET = saved;
  });

  it('sends nothing while CLERK_SELF_DELIVERY_ENABLED is not "true" (default off)', async () => {
    delete process.env.CLERK_SELF_DELIVERY_ENABLED;
    const r = await post(emailCreatedEvent());
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(0);
    expect(await sql(`select 1 from clerk_email_deliveries`)).toHaveLength(0);
  });

  it('relays the verification-code email through Resend using the pre-rendered Clerk content', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const r = await post(emailCreatedEvent({ to_email_address: 'newuser@customer.example', subject: '654321 is your verification code' }));
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe('newuser@customer.example');
    expect(outbox[0].subject).toBe('654321 is your verification code');
    expect(outbox[0].html).toContain('OTP code');
    const rows = await sql<any>(`select clerk_email_id, slug, to_email, resend_message_id from clerk_email_deliveries`);
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe('verification_code');
    expect(rows[0].to_email).toBe('newuser@customer.example');
    expect(rows[0].resend_message_id).toBeTruthy();
  });

  it('ignores Clerk email types other than the verification-code template', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const r = await post(emailCreatedEvent({ slug: 'magic_link' }));
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(0);
    expect(await sql(`select 1 from clerk_email_deliveries`)).toHaveLength(0);
  });

  it('sends a duplicate event exactly once', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    const s = signed(evt);
    const first = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    const retry = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(outbox).toHaveLength(1);
    expect(await sql(`select 1 from clerk_email_deliveries`)).toHaveLength(1);
  });

  it('a Resend failure returns a retryable (500) result and releases the reservation for the next retry', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    resendBehaviour.mode = 'throw';
    const evt = emailCreatedEvent();
    const r = await post(evt);
    expect(r.status).toBe(500);
    expect(await sql(`select 1 from clerk_email_deliveries`)).toHaveLength(0);

    // Next Svix retry (same event) succeeds once Resend recovers.
    resendBehaviour.mode = 'ok';
    const s = signed(evt);
    const retry = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(retry.status).toBe(200);
    expect(outbox).toHaveLength(1);
  });

  it('never logs the OTP, the recipient address, or the raw payload for a self-delivered email', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const logs: string[] = [];
    const { log } = await import('../../lib/logger');
    const originalInfo = log.info;
    (log as any).info = (...args: any[]) => { logs.push(JSON.stringify(args)); return originalInfo.apply(log, args as any); };
    try {
      await post(emailCreatedEvent({ to_email_address: 'secret-recipient@customer.example', data: { otp_code: '999999' } }));
    } finally {
      (log as any).info = originalInfo;
    }
    const joined = logs.join('\n');
    expect(joined).not.toContain('secret-recipient@customer.example');
    expect(joined).not.toContain('999999');
  });

  it('the existing user.created flow is unaffected by the email.created branch', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = {
      type: 'user.created',
      object: 'event',
      data: {
        id: 'user_regression_' + Math.random().toString(36).slice(2),
        email_addresses: [{ email_address: 'regression@customer.example' }],
        first_name: 'Reg',
      },
    };
    const r = await post(evt);
    expect(r.status).toBe(200);
    const rows = await sql<any>(`select clerk_user_id, email from users where clerk_user_id = $1`, [evt.data.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('regression@customer.example');
  });
});
