import { log } from '../lib/logger';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, authConfigured } from '../services/auth/crypto';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  dbUserId?: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify the access token issued by our own sign-in (routes/auth.ts). It is an HS256 JWT signed with AUTH_SECRET,
 * checked locally: signature, issuer and expiry. `sub` is the account's sign-in identity (users.clerk_user_id).
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  }
  if (!authConfigured()) {
    log.error('AUTH_SECRET is not set; cannot verify sign-in tokens');
    return res.status(503).json({ error: 'Authentication service temporarily unavailable', code: 'auth_provider_unavailable' });
  }

  // Never log the token itself; only the classification.
  const result = verifyAccessToken(authHeader.substring(7));
  if (!result.ok) {
    if (result.reason === 'expired') {
      return res.status(401).json({ error: 'Session expired', code: 'token_expired' });
    }
    log.warn('Token verification failed', { reason: result.reason });
    return res.status(401).json({ error: 'Invalid token', code: 'token_invalid' });
  }

  req.userId = result.claims.sub;
  next();
}

function dbUnavailable(res: Response, detail?: string) {
  log.error('attachUser: database unavailable', { err: detail });
  return res.status(503).json({ error: 'Service temporarily unavailable', code: 'db_unavailable' });
}

export async function attachUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) return next();

  try {
    const lookup = () => supabase
      .from('users')
      .select('id, clerk_user_id, plan, created_at, last_login_at')
      .eq('clerk_user_id', req.userId)
      .single();

    // Look up by clerk_user_id (text), not id (uuid)
    const { data: existing, error: lookupError } = await lookup();

    // PGRST116 = "no rows returned" (normal for new users). Any other error is an outage or a
    // schema problem. Continuing without a database user id (the previous "fail open") let requests
    // run with req.dbUserId undefined, so answer explicitly instead.
    if (lookupError && lookupError.code !== 'PGRST116') {
      return dbUnavailable(res, lookupError.message);
    }

    if (existing) {
      req.dbUserId = existing.id;
      (req as any).userPlan = existing.plan || 'free';
      // Update last_login_at for win-back email tracking (at most once per hour
      // to avoid hammering the DB on every request)
      var lastLogin = existing.last_login_at ? new Date(existing.last_login_at).getTime() : 0;
      if (Date.now() - lastLogin > 3600000) {
        Promise.resolve(supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', existing.id)).catch(function() {});
      }
      return next();
    }

    // Accounts are created by sign-up (routes/auth.ts); a valid token for a missing account means it was deleted.
    return res.status(401).json({ error: 'Account not found', code: 'account_not_found' });
  } catch (err: any) {
    log.error('attachUser error', { err: err.message });
    return res.status(500).json({ error: 'Authentication error', code: 'auth_error' });
  }
}
