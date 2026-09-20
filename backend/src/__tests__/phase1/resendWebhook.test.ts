/** Resend delivery webhooks: authenticated with the Svix signature, suppression written to the real table shape. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Webhook } from 'svix';
import { api } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';

beforeEach(resetData);

function signed(evt: any, secret = process.env.RESEND_WEBHOOK_SECRET!) {
  const payload = JSON.stringify(evt);
  const id = 'msg_' + Math.random().toString(36).slice(2);
  const ts = new Date();
  return { payload, headers: { 'svix-id': id, 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': new Webhook(secret).sign(id, ts, payload), 'content-type': 'application/json' } };
}
const bounce = (email: string) => ({ type: 'email.bounced', created_at: new Date().toISOString(), data: { to: [email], headers: { 'X-Send-Id': '00000000-0000-0000-0000-0000000000aa' }, bounce: { type: 'hard', message: 'mailbox not found' } } });
const complaint = (email: string) => ({ type: 'email.complained', created_at: new Date().toISOString(), data: { to: [email], headers: { 'X-Send-Id': '00000000-0000-0000-0000-0000000000ab' } } });

describe('POST /api/webhooks/resend', () => {
  const saved = process.env.RESEND_WEBHOOK_SECRET;
  afterEach(() => { process.env.RESEND_WEBHOOK_SECRET = saved; });

  it('rejects unsigned requests (anyone on the internet could otherwise suppress or fabricate delivery events)', async () => {
    const r = await (await api()).post('/api/webhooks/resend').set('content-type', 'application/json').send(JSON.stringify(bounce('victim@customer.example')));
    expect(r.status).toBe(400);
    expect(await sql(`select 1 from email_unsubscribes`)).toHaveLength(0);
  });
  it('rejects a signature made with another secret', async () => {
    const s = signed(bounce('victim@customer.example'), 'whsec_' + Buffer.from('another-secret-value-000000').toString('base64'));
    const r = await (await api()).post('/api/webhooks/resend').set(s.headers).send(s.payload);
    expect(r.status).toBe(400);
  });
  it('refuses to run (503) when RESEND_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const r = await (await api()).post('/api/webhooks/resend').set('content-type', 'application/json').send(JSON.stringify(bounce('x@customer.example')));
    expect(r.status).toBe(503);
  });
  it('a signed hard bounce and a signed spam complaint suppress the address, and a replay is harmless', async () => {
    const b = signed(bounce('Bounced@Customer.example'));
    expect((await (await api()).post('/api/webhooks/resend').set(b.headers).send(b.payload)).status).toBe(200);
    expect((await (await api()).post('/api/webhooks/resend').set(b.headers).send(b.payload)).status).toBe(200);
    const c = signed(complaint('angry@customer.example'));
    expect((await (await api()).post('/api/webhooks/resend').set(c.headers).send(c.payload)).status).toBe(200);
    const rows = await sql<any>(`select email, reason from email_unsubscribes order by email`);
    expect(rows.map((r: any) => r.email)).toEqual(['angry@customer.example', 'bounced@customer.example']);
    const { isUnsubscribed } = await import('../../services/unsubscribe');
    expect(await isUnsubscribed('bounced@customer.example')).toBe(true);
  });
  it('a message id in place of a recipient address is never written to the suppression list', async () => {
    const evt = { type: 'email.complained', created_at: new Date().toISOString(), data: { email_id: 'msg-not-an-address', headers: { 'X-Send-Id': '00000000-0000-0000-0000-0000000000ac' } } };
    const s = signed(evt);
    await (await api()).post('/api/webhooks/resend').set(s.headers).send(s.payload);
    expect(await sql(`select 1 from email_unsubscribes`)).toHaveLength(0);
  });
});
