import { Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { SESSION_COOKIE_NAME, csrfMatches, getSessionFromToken } from '../services/auth/sessions';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  dbUserId?: string;
  sessionId?: string;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Session-cookie auth, replacing the previous Clerk-JWT verification. Sets
 * req.userId to the session's user id (kept for the one call site that
 * still reads it) and req.sessionId for logout. CSRF: double-submit
 * cookie -- any non-GET/HEAD/OPTIONS request must send the x-csrf-token
 * header, which is derived from the HttpOnly session token (see csrfTokenFor)
 * and delivered to the page in the verify-code / GET /api/auth/session
 * response bodies, so a cross-site request cannot forge it.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  }

  let session;
  try {
    session = await getSessionFromToken(token);
  } catch (err: any) {
    log.error('requireAuth: session lookup failed', { err: err?.message });
    return res.status(503).json({ error: 'Authentication service temporarily unavailable', code: 'auth_provider_unavailable' });
  }

  if (!session) {
    return res.status(401).json({ error: 'Session expired', code: 'token_expired' });
  }

  if (!SAFE_METHODS.has(req.method)) {
    if (!csrfMatches(token, req.headers['x-csrf-token'])) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token', code: 'csrf_invalid' });
    }
  }

  req.userId = session.userId;
  req.sessionId = session.sessionId;
  next();
}

function dbUnavailable(res: Response, detail?: string) {
  log.error('attachUser: database unavailable', { err: detail });
  return res.status(503).json({ error: 'Service temporarily unavailable', code: 'db_unavailable' });
}

/**
 * Looks up the users row for the session's user id and attaches
 * req.dbUserId / (req as any).userPlan -- the same contract every existing
 * route already depends on. Unlike the old Clerk version this never
 * creates a user: by the time a session exists, verify-code has already
 * created or matched the row (see services/auth/userMatching.ts).
 */
export async function attachUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) return next();

  try {
    const { data: existing, error } = await supabase
      .from('users')
      .select('id, plan, last_login_at')
      .eq('id', req.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Session references a user row that no longer exists.
        return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
      }
      return dbUnavailable(res, error.message);
    }

    req.dbUserId = existing.id;
    (req as any).userPlan = existing.plan || 'free';

    // Preserve last_login_at tracking (used by win-back emails), same
    // once-per-hour throttle as the previous Clerk-based implementation.
    var lastLogin = existing.last_login_at ? new Date(existing.last_login_at).getTime() : 0;
    if (Date.now() - lastLogin > 3600000) {
      Promise.resolve(supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', existing.id)).catch(function() {});
    }

    next();
  } catch (err: any) {
    log.error('attachUser error', { err: err.message });
    return res.status(500).json({ error: 'Authentication error', code: 'auth_error' });
  }
}
