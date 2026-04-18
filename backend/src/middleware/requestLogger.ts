/**
 * Express middleware that logs every request as structured JSON.
 *
 * Emits one log entry per response with: method, path, status, duration,
 * content-length, and optional userId from the auth middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const userId = (req as any).userId || undefined;

    // Skip noisy health checks from log output
    if (req.path === '/health' || req.path === '/api/health') return;

    const data: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      status,
      duration,
      contentLength: res.get('content-length') || 0,
    };

    if (userId) data.userId = userId;
    if (req.query && Object.keys(req.query).length > 0) data.query = req.query;

    if (status >= 500) {
      log.error('request', data);
    } else if (status >= 400) {
      log.warn('request', data);
    } else {
      log.info('request', data);
    }
  });

  next();
}
