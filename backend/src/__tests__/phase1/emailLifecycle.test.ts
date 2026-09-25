/**
 * Phase 1 - email lifecycle with the in-memory test email transport (nothing is sent to a real provider).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, waitFor, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { getCapturedTestEmails, clearCapturedTestEmails, testEmailBehaviour } from '../../services/email/testProvider';

const outbox = () => getCapturedTestEmails();

beforeEach(async () => { await resetData(); clearCapturedTestEmails(); });

const lead = (over: Record<string, any> = {}) => ({ name: 'Ada Lovelace', email: 'ada@customer.example', answers: { 0: 2, 1: 2 }, ...over });
const CRON = () => ({ 'x-cron-secret': process.env.CRON_SECRET! });

describe('lead confirmation and owner notification', () => {
  it('a new lead triggers exactly one confirmation email to the lead (with unsubscribe headers) and one notification to the owner', async () => {
    const owner = await makeUser({ plan: 'pro', email: 'owner@business.example' });
    const quiz = await makeQuiz(owner, { slug: 'mail' });
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(201);
    expect(await waitFor(() => outbox().length >= 2)).toBe(true);
    await new Promise((res) => setTimeout(res, 200));
    const toLead = outbox().filter((m) => String(m.to) === 'ada@customer.example');
    const toOwner = outbox().filter((m) => String(m.to) === 'owner@business.example');
    expect(toLead).toHaveLength(1);
    expect(toOwner).toHaveLength(1);
    expect(toLead[0].subject).toContain('High');
    expect(toLead[0].headers!['List-Unsubscribe']).toContain('/api/public/unsubscribe');
    expect(toLead[0].headers!['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(toOwner[0].subject).toContain('New lead');
  });

  it('when the email provider throws, the lead is still saved and the API still answers success', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'mail-fail' });
    testEmailBehaviour.mode = 'throw';
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(201);
    expect(await sql(`select 1 from leads`)).toHaveLength(1);
  });

  it('the result-email service reports failure honestly when the provider throws', async () => {
    const { sendResultEmail } = await import('../../services/resultEmail');
    testEmailBehaviour.mode = 'throw';
    const ok = await sendResultEmail({ to: 'x@customer.example', quizTitle: 'Q', outcomeTitle: 'O', outcomeDescription: 'd', branding: {}, leadId: 'l1', quizId: 'q1' });
    expect(ok).toBe(false);
    clearCapturedTestEmails();
    const ok2 = await sendResultEmail({ to: 'y@customer.example', quizTitle: 'Q', outcomeTitle: 'O', outcomeDescription: 'd', branding: {}, leadId: 'l2', quizId: 'q1' });
    expect(ok2).toBe(true);
    expect(outbox()).toHaveLength(1);
  });
});

describe('unsubscribe', () => {
  it('the link in an email opens a confirmation page and the confirmation records the unsubscribe', async () => {
    const { buildUnsubscribeUrl } = await import('../../services/unsubscribe');
    const url = new URL(buildUnsubscribeUrl('Gone@Customer.example'));
    const app = await api();
    const page = await app.get(url.pathname + url.search);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Confirm Unsubscribe');
    const done = await app.post('/api/public/unsubscribe').type('form').send({ email: 'Gone@Customer.example' });
    expect(done.status).toBe(200);
    const status = await app.get('/api/public/unsubscribe/status?email=gone@customer.example');
    expect(status.body.unsubscribed).toBe(true);
  });

  it('RFC 8058 one-click POST (what Gmail/Apple Mail send) unsubscribes without a form', async () => {
    const { buildUnsubscribeUrl } = await import('../../services/unsubscribe');
    const url = new URL(buildUnsubscribeUrl('oneclick@customer.example'));
    const r = await (await api()).post(url.pathname + url.search).type('form').send({ 'List-Unsubscribe': 'One-Click' });
    expect(r.status).toBe(200);
    expect((await (await api()).get('/api/public/unsubscribe/status?email=oneclick@customer.example')).body.unsubscribed).toBe(true);
  });

  it('an unsubscribed address gets no result email and no sequence email; resubscribe restores delivery', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'unsub' });
    const app = await api();
    await app.post('/api/public/unsubscribe').type('form').send({ email: 'ada@customer.example' });
    await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead()).expect(201);
    await new Promise((res) => setTimeout(res, 300));
    expect(outbox().filter((m) => String(m.to) === 'ada@customer.example')).toHaveLength(0);
    await app.post('/api/public/resubscribe').send({ email: 'ada@customer.example' }).expect(200);
    await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email: 'again@customer.example' })).expect(201);
    expect(await waitFor(() => outbox().some((m) => String(m.to) === 'again@customer.example'))).toBe(true);
  });
});

describe('follow-up sequences (email_sequence_queue)', () => {
  async function seed(delayDays: number[], email = 'ada@customer.example') {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'seq-' + Math.random().toString(36).slice(2, 6) });
    await sql(`insert into email_sequences (quiz_id, outcome_id, name, enabled, emails) values ($1,'high','Nurture',true,$2::jsonb)`,
      [quiz.id, JSON.stringify(delayDays.map((d, i) => ({ delay_days: d, subject: `Step ${i + 1}`, body: `Body ${i + 1}` })))]);
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email }));
    expect(r.status).toBe(201);
    await waitFor(async () => (await sql(`select 1 from email_sequence_queue`)).length === delayDays.length);
    clearCapturedTestEmails();
    return { owner, quiz, leadId: r.body.lead_id as string };
  }
  const run = async () => (await api()).post('/api/cron/process-email-queue').set(CRON()).send({});
  const statuses = async () => (await sql<any>(`select email_index, status, retry_count from email_sequence_queue order by email_index`));

  it('a matching lead is enqueued once per step; due steps are sent exactly once, future steps wait', async () => {
    await seed([0, 3]);
    expect((await statuses()).map((s: any) => s.status)).toEqual(['pending', 'pending']);
    const r1 = await run();
    expect(r1.status).toBe(200);
    expect(outbox().filter((m) => m.subject === 'Step 1')).toHaveLength(1);
    expect(outbox().filter((m) => m.subject === 'Step 2')).toHaveLength(0);
    expect((await statuses()).map((s: any) => s.status)).toEqual(['sent', 'pending']);
    await run();
    expect(outbox().filter((m) => m.subject === 'Step 1')).toHaveLength(1); // not re-sent
  });

  it('every sequence email carries the CAN-SPAM footer and unsubscribe headers', async () => {
    await seed([0]);
    await run();
    const m = outbox().find((x) => x.subject === 'Step 1')!;
    expect(m.html).toMatch(/Unsubscribe/);
    expect(m.headers!['List-Unsubscribe']).toBeTruthy();
  });

  it('a recipient who unsubscribed after enqueueing is skipped once and never retried', async () => {
    await seed([0]);
    await (await api()).post('/api/public/unsubscribe').type('form').send({ email: 'ada@customer.example' });
    await run();
    expect(outbox()).toHaveLength(0);
    expect((await statuses())[0].status).toBe('skipped');
    await run();
    expect(outbox()).toHaveLength(0);
  });

  it('provider failures are retried with backoff and are not marked sent', async () => {
    await seed([0]);
    testEmailBehaviour.mode = 'throw';
    await run();
    let s = (await statuses())[0];
    expect(s.status).toBe('retry');
    expect(s.retry_count).toBe(1);
    const next = (await sql<any>(`select send_at from email_sequence_queue`))[0].send_at;
    expect(new Date(next).getTime()).toBeGreaterThan(Date.now());
    testEmailBehaviour.mode = 'ok';
    await run(); // not due yet: no send storm
    expect(outbox()).toHaveLength(0);
    await sql(`update email_sequence_queue set send_at = now() - interval '1 minute'`);
    await run();
    expect(outbox()).toHaveLength(1);
    s = (await statuses())[0];
    expect(s.status).toBe('sent');
  });

  it('after the maximum number of retries the item is marked failed and stops being attempted', async () => {
    await seed([0]);
    testEmailBehaviour.mode = 'throw';
    for (let i = 0; i < 7; i++) {
      await sql(`update email_sequence_queue set send_at = now() - interval '1 minute' where status in ('pending','retry')`);
      await run();
    }
    expect((await statuses())[0].status).toBe('failed');
  });
});

describe('GDPR deletion e-mail', () => {
  it('the confirmation link in the deletion e-mail points at the API host (the Next.js app has no /api/gdpr route) and completes the deletion', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'gdpr-del' });
    await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email: 'forget@customer.example' })).expect(201);
    clearCapturedTestEmails();
    await (await api()).post('/api/gdpr/delete-request').set('X-Forwarded-For', nextIp()).send({ email: 'forget@customer.example', quiz_slug: quiz.slug }).expect(200);
    const mail = outbox().find((m) => String(m.to) === 'forget@customer.example')!;
    const href = mail.html!.match(/href="([^"]+confirm-delete[^"]+)"/)![1];
    expect(href.startsWith(process.env.BACKEND_URL!)).toBe(true);
    const u = new URL(href);
    const done = await (await api()).get(u.pathname + u.search);
    expect(done.status).toBe(200);
    expect(await sql(`select 1 from leads where email='forget@customer.example'`)).toHaveLength(0);
  });
});
