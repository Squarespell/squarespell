import { log } from '../lib/logger';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { clerkClient } from '@clerk/clerk-sdk-node';
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
 * Verify the JWT token using Clerk's SDK with full signature validation.
 * Replaces the previous insecure manual base64 decode that had zero
 * signature verification (anyone could forge tokens).
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

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      // Optional: PEM public key for networkless verification (Clerk "JWT key").
      // When unset (production default) Clerk's JWKS endpoint is used.
      ...(process.env.CLERK_JWT_KEY ? { jwtKey: process.env.CLERK_JWT_KEY } : {}),
      // Optional override of the Clerk Backend API base URL (proxy / test double).
      ...(process.env.CLERK_API_URL ? { apiUrl: process.env.CLERK_API_URL } : {}),
    });

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid token', code: 'token_invalid' });
    }

    req.userId = payload.sub;
    next();
  } catch (err: any) {
    const reason: string = err?.reason || '';
    // Never log the token itself; only the classification.
    if (reason === 'token-expired') {
      return res.status(401).json({ error: 'Session expired', code: 'token_expired' });
    }
    // Errors raised while *obtaining the verification key* (Clerk unreachable, secret key rejected/missing)
    // are outages or misconfiguration, not a bad token: answer 503 so clients retry instead of signing users out.
    const providerFailure =
      reason.startsWith('jwk-remote') || reason.startsWith('jwk-failed') || reason === 'secret-key-missing' ||
      err instanceof TypeError || /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Clerk Secret Key is invalid/i.test(String(err?.message));
    if (providerFailure) {
      log.error('Clerk verification unavailable', { reason: reason || undefined, err: err?.message });
      return res.status(503).json({ error: 'Authentication service temporarily unavailable', code: 'auth_provider_unavailable' });
    }
    log.warn('Token verification failed', { reason: reason || undefined });
    return res.status(401).json({ error: 'Invalid token', code: 'token_invalid' });
  }
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

    // Auto-create user  -  do NOT set id, let Supabase auto-generate the UUID
    let email = '';
    try {
      const clerkUser = await clerkClient.users.getUser(req.userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    } catch (e: any) {
      log.info('Clerk lookup failed, continuing without email', { err: e?.message });
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id: req.userId,
        email,
        plan: 'free',
        quiz_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = unique violation: a parallel request (the dashboard fires several at once on first
      // login) created the row first. Use that row instead of failing.
      if (error.code === '23505') {
        const { data: raced, error: reErr } = await lookup();
        if (raced && !reErr) {
          req.dbUserId = raced.id;
          (req as any).userPlan = raced.plan || 'free';
          return next();
        }
      }
      return dbUnavailable(res, error.message);
    }

    req.dbUserId = newUser?.id;
    (req as any).userPlan = 'free';
    next();
  } catch (err: any) {
    log.error('attachUser error', { err: err.message });
    return res.status(500).json({ error: 'Authentication error', code: 'auth_error' });
  }
}
