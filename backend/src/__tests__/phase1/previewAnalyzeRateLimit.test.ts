/**
 * SEO plan Segment 1, task 1.6 ("Check the builder path"): the public builder's POST /api/preview-analyze.
 *
 * Audit 3 Oct 2026: a visitor was refused with "Rate limit exceeded" for over 20 minutes after about six attempts,
 * some of which had failed. Only SUCCESSFUL analyses now count toward the main per-IP limit; failed attempts count
 * toward a separate, more generous one, and every 429 says how long to wait (Retry-After header + retryAfterSeconds).
 * Runs against the in-memory limiter (no Redis in tests), the local Squarespace site fixture and the local AI stub.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { api } from '../helpers/testkit';
import { resetData } from '../helpers/db';
import { anthropicStub } from '../helpers/anthropicStub';
import { startSiteFixture } from '../helpers/siteFixture';
import { PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR, PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR } from '../../services/rateLimiter';

let site: { base: string; close: () => void };
beforeAll(async () => { site = await startSiteFixture(); });
afterAll(() => site.close());
beforeEach(async () => { await resetData(); anthropicStub.reset(); });

const analyze = async (ip: string, body: Record<string, unknown>) =>
  (await api()).post('/api/preview-analyze').set('X-Forwarded-For', ip).send(body).timeout({ response: 15000, deadline: 20000 });

function expectRateLimited(r: any) {
  expect(r.status).toBe(429);
  expect(r.body.code).toBe('rate_limited');
  expect(Number.isInteger(r.body.retryAfterSeconds)).toBe(true);
  expect(r.body.retryAfterSeconds).toBeGreaterThan(0);
  expect(r.body.retryAfterSeconds).toBeLessThanOrEqual(3600);
  expect(r.headers['retry-after']).toBe(String(r.body.retryAfterSeconds));
}

describe('POST /api/preview-analyze rate limit counts successes, not failures', () => {
  it('thresholds stay modest: 10 successes per hour (was 5 attempts), 20 failures per hour', () => {
    expect(PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR).toBe(10);
    expect(PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR).toBe(20);
  });

  it('allows 10 successful analyses per IP per hour, then answers 429 with Retry-After and retryAfterSeconds; other visitors are unaffected', async () => {
    const ip = '198.51.100.10';
    for (let i = 0; i < PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR; i++) {
      const ok = await analyze(ip, { url: site.base });
      expect(ok.status).toBe(200);
      expect(ok.body.session_token).toBeTruthy();
    }
    const limited = await analyze(ip, { url: site.base });
    expectRateLimited(limited);
    // The limit is a sliding hour: the first slot frees up roughly an hour after the first success.
    expect(limited.body.retryAfterSeconds).toBeGreaterThan(3000);
    // CORS: a page on another origin may read the header.
    expect(String(limited.headers['access-control-expose-headers'] || '')).toMatch(/retry-after/i);

    const other = await analyze('198.51.100.11', { url: site.base });
    expect(other.status).toBe(200);
  });

  it('validation errors, non-Squarespace sites and AI failures (5xx) do not use up the success allowance', async () => {
    const ip = '198.51.100.20';
    const failures: number[] = [];
    for (let i = 0; i < 3; i++) failures.push((await analyze(ip, {})).status);                         // 400 url required
    for (let i = 0; i < 3; i++) failures.push((await analyze(ip, { url: 'not a url' })).status);       // 400 invalid URL
    for (let i = 0; i < 3; i++) failures.push((await analyze(ip, { url: site.base + '/plain' })).status); // 422 NOT_SQUARESPACE
    anthropicStub.mode = 'http500';
    failures.push((await analyze(ip, { url: site.base })).status);                                      // AI unavailable (5xx)
    anthropicStub.mode = 'ok';
    expect(failures.slice(0, 6).every((c) => c === 400)).toBe(true);
    expect(failures.slice(6, 9).every((c) => c === 422)).toBe(true);
    expect(failures[9]).toBeGreaterThanOrEqual(500);

    // All 10 successes are still available after 10 failures.
    for (let i = 0; i < PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR; i++) {
      expect((await analyze(ip, { url: site.base })).status).toBe(200);
    }
    expectRateLimited(await analyze(ip, { url: site.base }));
  });

  it('failed attempts are bounded by their own, more generous limit (20 per hour), which also answers 429 with a wait time', async () => {
    const ip = '198.51.100.30';
    for (let i = 0; i < PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR; i++) {
      expect((await analyze(ip, { url: 'not a url' })).status).toBe(400);
    }
    // Even a valid request is refused now: this IP has used its failure allowance for the hour.
    const limited = await analyze(ip, { url: site.base });
    expectRateLimited(limited);
    // A refused request is not counted anywhere: another visitor and the success bucket are untouched.
    expect((await analyze('198.51.100.31', { url: site.base })).status).toBe(200);
  });

  it('a 429 does not itself use up an allowance', async () => {
    const ip = '198.51.100.40';
    for (let i = 0; i < PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR; i++) await analyze(ip, { url: site.base });
    for (let i = 0; i < 5; i++) expectRateLimited(await analyze(ip, { url: site.base }));
    // Failures are still possible (and still bounded) even while the success bucket is full: the 429s above did not
    // count as failures, and the refused requests handed their failure slot straight back.
    const { previewAnalyzeFailureLimiter } = await import('../../services/rateLimiter');
    for (let i = 0; i < PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR; i++) {
      expect((await previewAnalyzeFailureLimiter.limit('analyze:' + ip)).success).toBe(true);
    }
    expect((await previewAnalyzeFailureLimiter.limit('analyze:' + ip)).success).toBe(false);
  });
});
