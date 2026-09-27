import crypto from 'node:crypto';
import { supabase } from '../../db/supabaseClient';
import { log } from '../../lib/logger';

export const SESSION_COOKIE_NAME = 'sq_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // fixed 30 days, not sliding

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export interface CreatedSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

/**
 * The CSRF token is a keyed hash of the session token, so it needs no cookie and no
 * storage: the server recomputes it on every mutating request, and /api/auth/session
 * can hand it back after a page refresh. It is returned in response bodies only,
 * never logged, and unusable without the HttpOnly session cookie it is derived from.
 */
export function csrfTokenFor(sessionToken: string): string {
  return crypto.createHmac('sha256', sessionToken).update('sq-csrf-v1').digest('hex');
}

export function csrfMatches(sessionToken: string, presented: unknown): boolean {
  if (typeof presented !== 'string' || !presented) return false;
  const expected = Buffer.from(csrfTokenFor(sessionToken));
  const got = Buffer.from(presented);
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

/** Mints a new 256-bit session token and its CSRF token. Only the SHA-256 hash of the session token is ever persisted. */
export async function createSession(userId: string, ip: string, userAgent: string): Promise<CreatedSession> {
  const token = crypto.randomBytes(32).toString('hex'); // 256 bits
  const tokenHash = sha256Hex(token);
  const csrfToken = csrfTokenFor(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const { error } = await supabase.from('auth_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    user_agent: userAgent || null,
    created_ip: ip || null,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    log.error('createSession: insert failed', { err: error.message });
    throw new Error('session_create_failed');
  }

  return { token, csrfToken, expiresAt };
}

export interface SessionUser {
  sessionId: string;
  userId: string;
}

export async function getSessionFromToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const { data, error } = await supabase
    .from('auth_sessions')
    .select('id, user_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { sessionId: data.id, userId: data.user_id };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = sha256Hex(token);
  await supabase.from('auth_sessions').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await supabase
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}

/** Best-effort cleanup of long-expired sessions. Safe to run repeatedly. */
export async function cleanupExpiredSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('auth_sessions').delete().lt('expires_at', cutoff).select('id');
  if (error) {
    log.error('cleanupExpiredSessions failed', { err: error.message });
    return 0;
  }
  return data?.length || 0;
}

// Read at call time so tests can toggle it; staging and production both run with NODE_ENV=production.
const secureCookies = () => process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';

// Host-only on purpose: no `domain` attribute, so the browser sends it only to the exact API host
// that set it (never to sibling subdomains, never shared between staging and production).
function baseSessionCookie() {
  return { httpOnly: true, secure: secureCookies(), sameSite: 'lax' as const, path: '/' };
}

export function sessionCookieOptions(expires: Date) {
  return { ...baseSessionCookie(), expires };
}

/** Exactly the attributes used when the cookie was set (minus expiry), so the browser matches and removes it. */
export function clearSessionCookieOptions() {
  return baseSessionCookie();
}
