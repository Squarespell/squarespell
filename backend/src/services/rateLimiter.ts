import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

export function getClientIp(req: any): string {
  return ((req.headers['x-forwarded-for'] as string) || req.ip || 'unknown').split(',')[0].trim();
}
