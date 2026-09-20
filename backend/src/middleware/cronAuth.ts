import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Guards every /api/cron/* endpoint. Fails CLOSED:
 *  - no CRON_SECRET configured -> 503 (an unset secret must never equal an absent header)
 *  - missing / wrong x-cron-secret -> 401
 * Comparison is constant-time.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'Cron endpoints are not configured', code: 'cron_not_configured' });
  }
  const given = req.headers['x-cron-secret'];
  const a = crypto.createHash('sha256').update(String(Array.isArray(given) ? given[0] : given ?? '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (typeof given !== 'string' || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
