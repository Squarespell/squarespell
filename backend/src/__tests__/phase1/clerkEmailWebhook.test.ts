/**
 * Clerk email.created self-delivery: Svix-authenticated, Resend-relayed, and crash-safe.
 *
 * Crash safety has two independent layers that these tests exercise separately:
 *  - Resend's own idempotency key (same key within 24h -> same cached result, no re-send),
 *    simulated faithfully by the FakeResend test double (see helpers/resendFake.ts), not just
 *    tracked by our own DB.
 *  - The clerk_email_deliveries row's explicit pending/accepted/failed status, which tells apart
 *    "already sent", "someone else is actively sending it right now" and "a prior attempt crashed
 *    and this is safe to retry" — never mere row existence.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Webhook } from 'svix';
import { api } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { outbox, resendBehaviour, resetOutbox, seedIdempotencyResult } from '../helpers/resendFake';

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

const idempotencyKeyFor = (emailId: string) => 'clerk-verification/' + emailId;

async function post(evt: any) {
  const s = signed(evt);
  return (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
}

/** Insert a clerk_email_deliveries row directly, bypassing the handler, to set up a specific pre-crash state. */
async function seedRow(over: Partial<{ clerk_email_id: string; slug: string; status: string; attempt_count: number; updated_at: string; resend_message_id: string | null }>) {
  const emailId = over.clerk_email_id!;
  await sql(
    `INSERT INTO clerk_email_deliveries (clerk_email_id, clerk_event_id, slug, resend_idempotency_key, resend_message_id, status, attempt_count, created_at, updated_at)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, now(), COALESCE($7::timestamptz, now()))`,
    [emailId, over.slug ?? 'verification_code', idempotencyKeyFor(emailId), over.resend_message_id ?? null, over.status ?? 'pending', over.attempt_count ?? 1, over.updated_at ?? null],
  );
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

  it('relays the verification-code email through Resend using the pre-rendered Clerk content, with a deterministic idempotency key', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent({ to_email_address: 'newuser@customer.example', subject: '654321 is your verification code' });
    const r = await post(evt);
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe('newuser@customer.example');
    expect(outbox[0].subject).toBe('654321 is your verification code');
    expect(outbox[0].idempotencyKey).toBe(idempotencyKeyFor(evt.data.id));
    const rows = await sql<any>(`select clerk_email_id, slug, status, resend_message_id, resend_idempotency_key from clerk_email_deliveries`);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('accepted');
    expect(rows[0].slug).toBe('verification_code');
    expect(rows[0].resend_idempotency_key).toBe(idempotencyKeyFor(evt.data.id));
    expect(rows[0].resend_message_id).toBeTruthy();
  });

  it('ignores Clerk email types other than the verification-code template', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const r = await post(emailCreatedEvent({ slug: 'magic_link' }));
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(0);
    expect(await sql(`select 1 from clerk_email_deliveries`)).toHaveLength(0);
  });

  it('[accepted request never sends twice] an already-accepted event short-circuits without calling Resend again', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    const s = signed(evt);
    const first = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    const retry = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(outbox).toHaveLength(1);
    const rows = await sql<any>(`select status from clerk_email_deliveries`);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('accepted');
  });

  it('[failed request remains retryable] a Resend failure marks the row failed and returns 500; a later retry with the same key succeeds', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    resendBehaviour.mode = 'throw';
    const evt = emailCreatedEvent();
    const r = await post(evt);
    expect(r.status).toBe(500);
    let rows = await sql<any>(`select status, attempt_count, resend_idempotency_key from clerk_email_deliveries`);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('failed');
    expect(rows[0].attempt_count).toBe(1);
    // never delete evidence of the failed attempt to allow a retry
    expect(await sql(`select 1 from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id])).toHaveLength(1);

    resendBehaviour.mode = 'ok';
    const s = signed(evt);
    const retry = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(retry.status).toBe(200);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].idempotencyKey).toBe(idempotencyKeyFor(evt.data.id));
    rows = await sql<any>(`select status, attempt_count from clerk_email_deliveries`);
    expect(rows[0].status).toBe('accepted');
    expect(rows[0].attempt_count).toBe(2);
  });

  it('[crash after DB reservation, before the Resend request] a stale pending row (no Resend record) is reclaimed and the email is still sent exactly once', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    await seedRow({ clerk_email_id: evt.data.id, status: 'pending', attempt_count: 1 });
    // Backdate past PENDING_STALE_MS so the handler reclaims it instead of treating it as still in flight.
    await sql(`update clerk_email_deliveries set updated_at = now() - interval '5 minutes' where clerk_email_id = $1`, [evt.data.id]);

    const r = await post(evt);
    expect(r.status).toBe(200);
    expect(outbox).toHaveLength(1);
    const rows = await sql<any>(`select status, attempt_count from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows[0].status).toBe('accepted');
    expect(rows[0].attempt_count).toBe(2);
  });

  it('[retry while a fresh pending reservation is still active] does not send again and asks for a retry (409), unlike a stale one', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    await seedRow({ clerk_email_id: evt.data.id, status: 'pending', attempt_count: 1 }); // updated_at defaults to now() — fresh

    const r = await post(evt);
    expect(r.status).toBe(409);
    expect(outbox).toHaveLength(0);
    const rows = await sql<any>(`select status, attempt_count from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].attempt_count).toBe(1);
  });

  it('[Resend accepted but the DB success update never landed; retry returns the same Resend email id] recovers to accepted without a second send', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    const key = idempotencyKeyFor(evt.data.id);
    // Simulate: the crashed attempt's Resend call actually succeeded (Resend has it cached under
    // this key) but the process died before writing 'accepted' back, so the row is still pending.
    seedIdempotencyResult(key, 'email_from_crashed_attempt');
    await seedRow({ clerk_email_id: evt.data.id, status: 'pending', attempt_count: 1 });
    await sql(`update clerk_email_deliveries set updated_at = now() - interval '5 minutes' where clerk_email_id = $1`, [evt.data.id]);

    const r = await post(evt);
    expect(r.status).toBe(200);
    // Resend itself never received a second outbound send for this key.
    expect(outbox).toHaveLength(0);
    const rows = await sql<any>(`select status, resend_message_id from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows[0].status).toBe('accepted');
    expect(rows[0].resend_message_id).toBe('email_from_crashed_attempt');
  });

  it('[concurrent duplicate webhook attempts] two simultaneous deliveries of the same brand-new event produce exactly one Resend send', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const evt = emailCreatedEvent();
    const s = signed(evt);
    const [r1, r2] = await Promise.all([
      (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload),
      (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload),
    ]);
    // One request wins the DB reservation and sends; the other hits the unique constraint and
    // either short-circuits on an already-accepted row (200) or backs off on a still-pending one
    // (409, "retry later") — either is correct, the exact interleaving isn't. What must never
    // happen is a second Resend send or a 5xx from either.
    expect([r1.status, r2.status]).not.toContain(500);
    expect([r1.status, r2.status].sort()).toEqual(expect.arrayContaining([200]));
    expect(outbox).toHaveLength(1);
    const rows = await sql<any>(`select status from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('accepted');
  });

  it('[Resend idempotency conflict] a concurrent_idempotent_requests response is treated as retryable, not a hard failure', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    resendBehaviour.mode = 'concurrent-conflict';
    const evt = emailCreatedEvent();
    const r = await post(evt);
    expect(r.status).toBe(409);
    expect(outbox).toHaveLength(0);
    let rows = await sql<any>(`select status, updated_at from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows[0].status).toBe('pending'); // not 'failed' — this is not a permanent failure

    // An immediate retry, while Resend's own conflict is presumably still active, is correctly
    // reported as still in progress (409) rather than raced against — see the separate
    // "fresh pending reservation" test. Once the row is stale (the in-flight attempt is presumed
    // gone, e.g. that process crashed), a retry reclaims it and Resend itself decides whether it
    // actually still conflicts.
    await sql(`update clerk_email_deliveries set updated_at = now() - interval '5 minutes' where clerk_email_id = $1`, [evt.data.id]);
    resendBehaviour.mode = 'ok';
    const s = signed(evt);
    const retry = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(retry.status).toBe(200);
    expect(outbox).toHaveLength(1);
    rows = await sql<any>(`select status from clerk_email_deliveries where clerk_email_id = $1`, [evt.data.id]);
    expect(rows[0].status).toBe('accepted');
  });

  it('never logs or stores the OTP, the recipient address, the subject, or the HTML/text body', async () => {
    process.env.CLERK_SELF_DELIVERY_ENABLED = 'true';
    const logs: string[] = [];
    const { log } = await import('../../lib/logger');
    const original = { info: log.info, warn: log.warn, error: log.error };
    (log as any).info = (...a: any[]) => { logs.push(JSON.stringify(a)); return original.info.apply(log, a as any); };
    (log as any).warn = (...a: any[]) => { logs.push(JSON.stringify(a)); return original.warn.apply(log, a as any); };
    (log as any).error = (...a: any[]) => { logs.push(JSON.stringify(a)); return original.error.apply(log, a as any); };
    try {
      await post(emailCreatedEvent({
        to_email_address: 'secret-recipient@customer.example',
        subject: '999999 is your verification code',
        body: '<html>999999 is your OTP</html>',
        data: { otp_code: '999999' },
      }));
    } finally {
      Object.assign(log, original);
    }
    const joined = logs.join('\n');
    expect(joined).not.toContain('secret-recipient@customer.example');
    expect(joined).not.toContain('999999');

    const rows = await sql<any>(`select * from clerk_email_deliveries`);
    const serializedRows = JSON.stringify(rows);
    expect(serializedRows).not.toContain('secret-recipient@customer.example');
    expect(serializedRows).not.toContain('999999');
    expect(serializedRows).not.toContain('verification code');
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
