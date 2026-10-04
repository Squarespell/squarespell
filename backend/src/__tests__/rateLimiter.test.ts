/**
 * Unit tests for the rate-limiter building blocks used by POST /api/preview-analyze: wait-time estimates, refunds and
 * count-by-outcome reservations (services/rateLimiter.ts).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  makeLimiter,
  reserveByOutcome,
  safeLimit,
  sendRateLimited,
  toRetryAfterSeconds,
  UpstashLimiter,
  type RateLimiter,
} from '../services/rateLimiter';

afterEach(() => { vi.useRealTimers(); });

let n = 0;
const fresh = (max: number, windowMs = 60_000) => makeLimiter('unit-' + ++n, max, '1 m', windowMs);

describe('in-memory limiter', () => {
  it('reports how long until the oldest hit leaves the window', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const l = fresh(2, 60_000);
    expect((await l.limit('k')).success).toBe(true);
    vi.setSystemTime(1_000_000 + 10_000);
    expect((await l.limit('k')).success).toBe(true);
    vi.setSystemTime(1_000_000 + 15_000);
    const refused = await l.limit('k');
    expect(refused.success).toBe(false);
    expect(refused.retryAfterMs).toBe(45_000);
    expect((await safeLimit(l, 'k')).retryAfterSeconds).toBe(45);
    vi.setSystemTime(1_000_000 + 60_001);
    expect((await l.limit('k')).success).toBe(true);
  });

  it('refund() hands a slot back, and never goes below empty', async () => {
    const l = fresh(1);
    expect((await l.limit('k')).success).toBe(true);
    expect((await l.limit('k')).success).toBe(false);
    await l.refund!('k');
    expect((await l.limit('k')).success).toBe(true);
    await l.refund!('k');
    await l.refund!('k');
    await l.refund!('unknown');
    expect((await l.limit('k')).success).toBe(true);
    expect((await l.limit('k')).success).toBe(false);
  });
});

describe('Upstash adapter', () => {
  it('turns `reset` into a conservative wait and refunds with a negative rate', async () => {
    vi.useFakeTimers({ now: 5_000_000 });
    const calls: any[] = [];
    const fake: any = {
      limit: async (key: string, opts?: any) => {
        calls.push([key, opts]);
        return { success: false, reset: 5_000_000 + 600_000, remaining: 0, limit: 10 };
      },
    };
    const l = new UpstashLimiter(fake, 10, 3_600_000);
    const r = await l.limit('k');
    expect(r.success).toBe(false);
    // 10 minutes to the end of the fixed window + one slot's share of the hour (6 minutes).
    expect(r.retryAfterMs).toBe(600_000 + 360_000);
    await l.refund('k');
    expect(calls).toEqual([['k', undefined], ['k', { rate: -1 }]]);
  });
});

describe('reserveByOutcome', () => {
  it('success keeps the success slot and hands back the failure slot', async () => {
    const ok = fresh(2), fail = fresh(2);
    const r = await reserveByOutcome(ok, fail, 'ip');
    expect(r.allowed).toBe(true);
    if (r.allowed) await r.settle(true);
    // success bucket: 1 used; failure bucket: 0 used
    expect((await ok.limit('ip')).success).toBe(true);
    expect((await ok.limit('ip')).success).toBe(false);
    expect((await fail.limit('ip')).success).toBe(true);
    expect((await fail.limit('ip')).success).toBe(true);
    expect((await fail.limit('ip')).success).toBe(false);
  });

  it('failure keeps the failure slot and hands back the success slot; settle() only counts once', async () => {
    const ok = fresh(1), fail = fresh(2);
    const r = await reserveByOutcome(ok, fail, 'ip');
    if (!r.allowed) throw new Error('expected allowed');
    await r.settle(false);
    await r.settle(false);
    await r.settle(true);
    expect((await ok.limit('ip')).success).toBe(true);   // success slot was handed back exactly once
    expect((await fail.limit('ip')).success).toBe(true); // failure bucket: 1 + 1 = 2
    expect((await fail.limit('ip')).success).toBe(false);
  });

  it('refuses when either bucket is full, hands back the other slot, and reports the longer wait', async () => {
    const ok = fresh(1), fail = fresh(5);
    expect((await ok.limit('ip')).success).toBe(true);
    const r = await reserveByOutcome(ok, fail, 'ip');
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.retryAfterSeconds).toBeGreaterThan(0);
    // The failure slot taken during the refused attempt was handed back: all 5 are still free.
    for (let i = 0; i < 5; i++) expect((await fail.limit('ip')).success).toBe(true);
    expect((await fail.limit('ip')).success).toBe(false);

    const both = await reserveByOutcome(
      { limit: async () => ({ success: false, retryAfterMs: 10_000 }) },
      { limit: async () => ({ success: false, retryAfterMs: 90_000 }) },
      'ip',
    );
    expect(both).toEqual({ allowed: false, retryAfterSeconds: 90 });
  });

  it('fails open when a limiter errors, and a failing refund never throws', async () => {
    const broken: RateLimiter = {
      limit: async () => { throw new Error('redis down'); },
      refund: async () => { throw new Error('redis down'); },
    };
    const r = await reserveByOutcome(broken, broken, 'ip');
    expect(r.allowed).toBe(true);
    if (r.allowed) await expect(r.settle(false)).resolves.toBeUndefined();
  });
});

describe('429 helpers', () => {
  it('toRetryAfterSeconds rounds up to whole seconds, at least 1, default 60', () => {
    expect(toRetryAfterSeconds(1)).toBe(1);
    expect(toRetryAfterSeconds(1500)).toBe(2);
    expect(toRetryAfterSeconds(undefined)).toBe(60);
    expect(toRetryAfterSeconds(0)).toBe(60);
    expect(toRetryAfterSeconds(NaN)).toBe(60);
  });

  it('sendRateLimited sets Retry-After and the same value as retryAfterSeconds', () => {
    const headers: Record<string, string> = {};
    let status = 0;
    let body: any;
    const res: any = {
      setHeader: (k: string, v: string) => { headers[k] = v; },
      status: (s: number) => { status = s; return res; },
      json: (b: any) => { body = b; return res; },
    };
    sendRateLimited(res, 125.2);
    expect(status).toBe(429);
    expect(headers['Retry-After']).toBe('126');
    expect(body).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 126 });
  });
});
