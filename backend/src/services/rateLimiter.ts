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

type LimitResult = { success: boolean };
export interface RateLimiter { limit(key: string): Promise<LimitResult> }

const memoryStores: Map<string, number[]>[] = [];

class MemoryLimiter implements RateLimiter {
  private store = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) { memoryStores.push(this.store); }
  async limit(key: string): Promise<LimitResult> {
    const now = Date.now();
    const hits = (this.store.get(key) || []).filter((t) => now - t < this.windowMs);
    if (hits.length >= this.max) { this.store.set(key, hits); return { success: false }; }
    hits.push(now);
    this.store.set(key, hits);
    if (this.store.size > 20000) { // bound memory: drop the oldest keys
      for (const k of Array.from(this.store.keys()).slice(0, 5000)) this.store.delete(k);
    }
    return { success: true };
  }
}

/** Test hook: clear all in-memory counters. */
export function resetMemoryLimiters() { memoryStores.forEach((m) => m.clear()); }

function makeLimiter(prefix: string, max: number, upstashWindow: '1 m' | '1 h', windowMs: number): RateLimiter {
  if (!redis) return new MemoryLimiter(max, windowMs);
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, upstashWindow), prefix: 'ratelimit:' + prefix, analytics: true });
}

const MIN = 60_000, HOUR = 3_600_000;
// Preview endpoints: 5 per hour per IP
export const previewLimiter = makeLimiter('preview', 5, '1 h', HOUR);
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
export async function safeLimit(limiter: RateLimiter, key: string): Promise<{ success: boolean }> {
  try {
    const result = await Promise.race([
      limiter.limit(key),
      new Promise<{ success: true; timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ success: true, timedOut: true }), 3000)
      ),
    ]);
    if ('timedOut' in result) {
      log.error('[RateLimiter] limit() check timed out after 3s, failing open', { key });
    }
    return { success: result.success };
  } catch (err) {
    log.error('[RateLimiter] limit() check failed, failing open', { key, err: (err as any)?.message });
    return { success: true };
  }
}
