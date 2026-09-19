/**
 * Phase 1 - AI failure, timeout and recovery. The real Anthropic SDK is pointed at a
 * local stub server (ANTHROPIC_BASE_URL) that can answer, fail, rate-limit or never answer.
 * Test timeouts are 1.5 s per call and 1 retry (ANTHROPIC_TIMEOUT_MS / ANTHROPIC_MAX_RETRIES).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { api, makeUser, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { anthropicStub } from '../helpers/anthropicStub';
import { startSiteFixture } from '../helpers/siteFixture';

let site: { base: string; close: () => void };
beforeAll(async () => { site = await startSiteFixture(); });
afterAll(() => site.close());
beforeEach(async () => { await resetData(); anthropicStub.reset(); });

const gen = async (u: any) => (await api()).post('/api/generate').set(bearer(u)).send({ url: site.base, business_type: 'bakery', goal: 'leads' }).timeout({ response: 15000, deadline: 20000 });

describe('AI generation failure modes never leave the user waiting or the API broken', () => {
  it('a provider that never answers ends in a clear timeout error within a bounded time, with a bounded number of attempts', async () => {
    const u = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'hang';
    const t0 = Date.now();
    const r = await gen(u);
    const elapsed = Date.now() - t0;
    expect(r.status).toBe(504);
    expect(r.body.code).toBe('ai_timeout');
    expect(r.headers['content-type']).toMatch(/json/);
    expect(elapsed).toBeLessThan(6000);           // 2 attempts x 1.5 s + backoff
    expect(anthropicStub.calls).toBeLessThanOrEqual(2);
  });

  it('provider 5xx -> clear 502 ai_unavailable, bounded retries, no provider internals in the body', async () => {
    const u = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'http500';
    const r = await gen(u);
    expect(r.status).toBe(502);
    expect(r.body.code).toBe('ai_unavailable');
    expect(anthropicStub.calls).toBeLessThanOrEqual(2);
    expect(JSON.stringify(r.body)).not.toMatch(/api_error|stub failure|sk-ant|x-api-key/i);
  });

  it('provider rate limit (429) -> clear error, bounded retries', async () => {
    const u = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'http429';
    const r = await gen(u);
    expect([429, 502, 503]).toContain(r.status);
    expect(r.body.code).toMatch(/^ai_/);
    expect(anthropicStub.calls).toBeLessThanOrEqual(2);
  });

  it('unparseable model output -> clear error, and the next request succeeds once the provider recovers', async () => {
    const u = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'garbage';
    const bad = await gen(u);
    expect(bad.status).toBe(502);
    expect(bad.body.code).toBe('ai_bad_response');
    anthropicStub.mode = 'ok';
    const good = await gen(u);
    expect(good.status).toBe(200);
    expect(good.body.questions.length).toBeGreaterThan(0);
  });

  it('URL-analysis (from-url) when the AI is down: no quiz that pretends to be tailored - the fallback quiz is explicitly flagged', async () => {
    const u = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'http500';
    const r = await (await api()).post('/api/quizzes/from-url').set(bearer(u)).send({ url: site.base }).timeout({ response: 20000, deadline: 25000 });
    expect([201, 502, 504]).toContain(r.status);
    if (r.status === 201) {
      expect(r.body.ai_fallback).toBe(true);
      const row = (await sql<any>(`select settings from quizzes where id=$1`, [r.body.quiz.id]))[0];
      expect(row.settings.generated_by).toBe('fallback');
    } else {
      expect(r.body.code).toMatch(/^ai_/);
    }
  });

  it('cost is bounded: one URL-analysis request makes at most 2 model calls when everything works', async () => {
    const u = await makeUser({ plan: 'pro' });
    const r = await (await api()).post('/api/quizzes/from-url').set(bearer(u)).send({ url: site.base });
    expect(r.status).toBe(201);
    expect(anthropicStub.calls).toBeLessThanOrEqual(2);
  });

  it('the daily generation allowance follows the CURRENT plan names (business >= pro > core > free)', async () => {
    const { checkDailyAllowanceForTest } = await import('../../routes/quizzesFromUrl');
    const allowance = async (plan: string) => { const u = await makeUser({ plan }); return checkDailyAllowanceForTest(u.id); };
    const [free, core, pro, business] = [await allowance('free'), await allowance('core'), await allowance('pro'), await allowance('business')];
    expect(business).toBeGreaterThanOrEqual(pro);
    expect(pro).toBeGreaterThan(core);
    expect(core).toBeGreaterThanOrEqual(free);
  });

  it('the visitor-facing free-text "other" answer degrades gracefully when the AI is down (never an endless spinner)', async () => {
    const owner = await makeUser({ plan: 'pro' });
    anthropicStub.mode = 'http500';
    const t0 = Date.now();
    const r = await (await api()).post('/api/quiz/any/process-other').send({ free_text: 'something else', available_outcomes: [{ id: 'o1', title: 'One' }] }).timeout({ response: 15000, deadline: 20000 });
    expect(r.status).toBe(200);
    expect(r.body.matched_outcome_id).toBe('o1');
    expect(Date.now() - t0).toBeLessThan(6000);
    void owner;
  });
});

describe('anonymous AI endpoints are throttled even when Redis is not configured (cost protection)', () => {
  it('preview-generate allows 5 per hour per IP and then answers 429', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await (await api()).post('/api/preview-generate').send({ url: site.base })).status);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(2);
  });
});
