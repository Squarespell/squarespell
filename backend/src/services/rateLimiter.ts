import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '../lib/logger';

// Use Upstash Redis if configured, fall back to in-memory for local dev
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

// ── Limiters ────────────────────────────────────────────────────────────────
// With Upstash configured these are distributed sliding windows. Without it they USED to be silently
// unenforced (Ratelimit was built with redis: undefined, every .limit() threw, and safeLimit failed open), which left
// the anonymous AI endpoints (cost) and the lead form (spam) completely unthrottled. They now fall back to a
// per-process sliding window with the same limits: not shared across instances, but never "off".

type LimitResult = { success: boolean; /** When refused: how long until a slot frees up (best estimate). */ retryAfterMs?: number };
export interface RateLimiter {
  limit(key: string): Promise<LimitResult>;
  /** Give back one slot taken by limit() for this key (used when only some outcomes should count). */
  refund?(key: string): Promise<void>;
}

const memoryStores: Map<string, number[]>[] = [];

class MemoryLimiter implements RateLimiter {
  private store = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) { memoryStores.push(this.store); }
  async limit(key: string): Promise<LimitResult> {
    const now = Date.now();
    const hits = (this.store.get(key) || []).filter((t) => now - t < this.windowMs);
    if (hits.length >= this.max) {
      this.store.set(key, hits);
      // Hits are kept oldest first: a slot frees up when the oldest one leaves the window.
      return { success: false, retryAfterMs: Math.max(1, hits[0] + this.windowMs - now) };
    }
    hits.push(now);
    this.store.set(key, hits);
    if (this.store.size > 20000) { // bound memory: drop the oldest keys
      for (const k of Array.from(this.store.keys()).slice(0, 5000)) this.store.delete(k);
    }
    return { success: true };
  }
  async refund(key: string): Promise<void> {
    const hits = this.store.get(key);
    if (!hits || hits.length === 0) return;
    hits.pop();
    if (hits.length === 0) this.store.delete(key);
  }
}

/**
 * Upstash sliding window, adapted to RateLimiter. Refunds use the library's negative-rate support (@upstash/ratelimit
 * >= 2.0). Upstash's sliding window weights the previous fixed window, so a slot is not guaranteed free at `reset` (the
 * end of the current fixed window); one slot's share of the window is added so the Retry-After hint is not too early.
 */
export class UpstashLimiter implements RateLimiter {
  constructor(private rl: Ratelimit, private max: number, private windowMs: number) {}
  async limit(key: string): Promise<LimitResult> {
    const r = await this.rl.limit(key);
    if (r.success) return { success: true };
    const estimate = r.reset - Date.now() + Math.ceil(this.windowMs / this.max);
    return { success: false, retryAfterMs: Math.min(2 * this.windowMs, Math.max(1000, estimate)) };
  }
  async refund(key: string): Promise<void> {
    await this.rl.limit(key, { rate: -1 });
  }
}

/** Test hook: clear all in-memory counters. */
export function resetMemoryLimiters() { memoryStores.forEach((m) => m.clear()); }

export function makeLimiter(prefix: string, max: number, upstashWindow: '1 m' | '1 h', windowMs: number): RateLimiter {
  if (!redis) return new MemoryLimiter(max, windowMs);
  return new UpstashLimiter(
    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, upstashWindow), prefix: 'ratelimit:' + prefix, analytics: true }),
    max,
    windowMs,
  );
}

const MIN = 60_000, HOUR = 3_600_000;
// Preview endpoints: 5 per hour per IP (now only POST /api/preview-generate; preview-analyze has its own pair below)
export const previewLimiter = makeLimiter('preview', 5, '1 h', HOUR);
// POST /api/preview-analyze (the public "Enter your website" builder). Counted by OUTCOME, per IP, sliding 1-hour windows:
//   - successful analyses: 10 per hour (was 5 per hour counting every attempt; kept within 2x on purpose, it costs AI calls)
//   - failed attempts (bad URL, not a Squarespace site, scrape/AI timeouts, 5xx): 20 per hour, in a separate bucket, so
//     a visitor whose first try hits a hiccup is not locked out, while repeated failures (each still fetches a site and
//     may call the AI) stay bounded.
// See reserveByOutcome() below for how a slot is taken up front and handed back once the outcome is known.
export const PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR = 10;
export const PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR = 20;
export const previewAnalyzeSuccessLimiter = makeLimiter('preview-analyze-ok', PREVIEW_ANALYZE_SUCCESS_LIMIT_PER_HOUR, '1 h', HOUR);
export const previewAnalyzeFailureLimiter = makeLimiter('preview-analyze-fail', PREVIEW_ANALYZE_FAILURE_LIMIT_PER_HOUR, '1 h', HOUR);
// Lead submission: 3 per minute per IP per quiz
export const leadLimiter = makeLimiter('lead', 3, '1 m', MIN);
// Public quiz events: 60 per minute per IP (per quiz)
export const publicQuizLimiter = makeLimiter('quiz', 60, '1 m', MIN);
// GDPR confirm-delete: 5 attempts per hour per user
export const deletionLimiter = makeLimiter('deletion', 5, '1 h', HOUR);
// Quiz checkout session creation: 10 per minute per IP per quiz (public, calls Stripe)
export const checkoutLimiter = makeLimiter('checkout', 10, '1 m', MIN);
// process-other: free-text "other" answer classification calls an LLM: 10 per minute per IP per quiz
export const processOtherLimiter = makeLimiter('process-other', 10, '1 m', MIN);
// One-button connect (routes/connect.ts). Manifest: 120 per minute per IP and site. Heartbeat: 30 per minute per IP and site.
// Verify (server-side page fetch): 10 per minute per user. Publish and other installation changes: 30 per minute per user.
export const connectManifestLimiter = makeLimiter('connect-manifest', 120, '1 m', MIN);
export const connectHeartbeatLimiter = makeLimiter('connect-heartbeat', 30, '1 m', MIN);
export const connectVerifyLimiter = makeLimiter('connect-verify', 10, '1 m', MIN);
export const connectPublishLimiter = makeLimiter('connect-publish', 30, '1 m', MIN);

export function getClientIp(req: any): string {
  return ((req.headers['x-forwarded-for'] as string) || req.ip || 'unknown').split(',')[0].trim();
}

// Every public POST route calls `someLimiter.limit(key)` as its very first
// operation, completely unprotected by a try/catch, then destructures
// `.success` straight off the result. `.limit()` makes a live HTTP call to
// Upstash's REST API — if Upstash is slow, unreachable, or rejecting
// requests (free-tier throttling, transient network issues, an expired
// token, a regional outage), that await either hangs until Render's gateway
// times out the request (502) or throws an unhandled rejection (crashing/
// restarting the process, surfacing as 503 to the next caller). This was
// confirmed live: GET routes (which never touch the rate limiter) kept
// responding 200 while every POST route (/lead, /event, /checkout, etc.,
// all of which call .limit() first) was failing with 502/503 in the same
// window — i.e. a third-party rate-limiter dependency was capable of taking
// down the entire public POST surface of the API.
//
// Rate limiting is defense-in-depth, not core functionality, so on error we
// fail OPEN (allow the request through) rather than fail closed (block all
// traffic) — a brief window of unthrottled requests during a Redis blip is
// far cheaper than an outage that blocks every real user's quiz submission.
// A try/catch alone isn't enough: if Upstash accepts the TCP connection but
// never sends a response, limiter.limit() simply hangs — it never rejects,
// so nothing would ever reach the catch block, and the request would still
// ride out to whatever the platform's gateway timeout is. So this also
// races the real call against a short timeout and fails open if neither the
// success nor the error path wins in time.
export async function safeLimit(limiter: RateLimiter, key: string): Promise<{ success: boolean; retryAfterSeconds?: number }> {
  try {
    const result = await Promise.race<LimitResult & { timedOut?: true }>([
      limiter.limit(key),
      new Promise<{ success: true; timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ success: true, timedOut: true }), 3000).unref?.()
      ),
    ]);
    if (result.timedOut) {
      log.error('[RateLimiter] limit() check timed out after 3s, failing open', { key });
      return { success: true };
    }
    if (result.success) return { success: true };
    return { success: false, retryAfterSeconds: toRetryAfterSeconds(result.retryAfterMs) };
  } catch (err) {
    log.error('[RateLimiter] limit() check failed, failing open', { key, err: (err as any)?.message });
    return { success: true };
  }
}

/** Whole seconds for a Retry-After header: at least 1; 60 when the limiter gave no estimate. */
export function toRetryAfterSeconds(ms: number | undefined): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return 60;
  return Math.max(1, Math.ceil(ms / 1000));
}

/** Hand back a slot taken by limit(). Best effort and never throws or hangs: rate limiting is defense in depth. */
async function safeRefund(limiter: RateLimiter, key: string): Promise<void> {
  if (!limiter.refund) return;
  try {
    await Promise.race([limiter.refund(key), new Promise<void>((resolve) => setTimeout(resolve, 3000).unref?.())]);
  } catch (err) {
    log.error('[RateLimiter] refund failed', { key, err: (err as any)?.message });
  }
}

export type OutcomeReservation =
  | { allowed: true; /** Call once, when the outcome is known. Further calls are ignored. */ settle(succeeded: boolean): Promise<void> }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Count-by-outcome limiting: successes count toward `success`, failures toward `failure`.
 *
 * A slot is taken in BOTH buckets before the work starts, so a burst of parallel requests cannot overshoot either cap,
 * and the slot that does not apply is handed back by settle(). If either bucket is full the request is refused (and
 * the slot it did get is handed straight back) with the longer of the two waits. Like safeLimit, a limiter error or
 * timeout fails open.
 */
export async function reserveByOutcome(success: RateLimiter, failure: RateLimiter, key: string): Promise<OutcomeReservation> {
  const [ok, fail] = await Promise.all([safeLimit(success, key), safeLimit(failure, key)]);
  if (!ok.success || !fail.success) {
    if (ok.success) await safeRefund(success, key);
    if (fail.success) await safeRefund(failure, key);
    return { allowed: false, retryAfterSeconds: Math.max(ok.retryAfterSeconds || 0, fail.retryAfterSeconds || 0) || 60 };
  }
  let settled = false;
  return {
    allowed: true,
    async settle(succeeded: boolean) {
      if (settled) return;
      settled = true;
      await (succeeded ? safeRefund(failure, key) : safeRefund(success, key));
    },
  };
}

/** Standard 429 for limited public endpoints: Retry-After header plus the same wait as JSON (browsers on another
 *  origin cannot read the header unless it is exposed, so the page uses the JSON field). */
export function sendRateLimited(res: any, retryAfterSeconds: number, error = 'Rate limit exceeded. Please try again later.') {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  res.setHeader('Retry-After', String(seconds));
  return res.status(429).json({ error, code: 'rate_limited', retryAfterSeconds: seconds });
}
