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

// Preview endpoints: 5 per hour per IP
export const previewLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'ratelimit:preview',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

// Lead submission: 3 per minute per IP per quiz
export const leadLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  prefix: 'ratelimit:lead',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

// Public quiz fetch: 60 per minute per IP
export const publicQuizLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:quiz',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

// GDPR confirm-delete: 5 attempts per hour per user
export const deletionLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'ratelimit:deletion',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

// Quiz checkout session creation: 10 per minute per IP per quiz — public,
// unauthenticated endpoint that calls out to Stripe, so needs abuse protection.
export const checkoutLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:checkout',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

// process-other: free-text "other" answer classification calls out to an
// LLM (processOtherAnswer) and was previously completely unrated-limited —
// 10 per minute per IP per quiz keeps cost/abuse bounded while still
// allowing normal quiz-taking traffic through.
export const processOtherLimiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:process-other',
  analytics: true,
  ...(redis ? {} : { ephemeralCache: new Map() }),
});

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
export async function safeLimit(limiter: Ratelimit, key: string): Promise<{ success: boolean }> {
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
