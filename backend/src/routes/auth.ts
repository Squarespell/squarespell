/**
 * Our own sign-in (replaces Clerk). Mounted at /api/auth.
 *
 * The browser holds one HttpOnly session cookie, scoped to /api/auth on the API host. The app asks
 * GET /api/auth/session for a 15-minute access token and sends that as "Authorization: Bearer" to every other
 * endpoint (middleware/auth.ts verifies it locally). Signing out revokes the session row.
 *
 *   GET  /config                 which sign-in methods are on, and the public Google client id for its button
 *   POST /signup                 { email, password, firstName? }   creates the account and signs in
 *   POST /login                  { email, password }
 *   POST /logout
 *   GET  /session                current user + fresh access token (401 when signed out)
 *   POST /forgot-password        { email }   always answers the same, emails a reset link when the account exists
 *   POST /reset-password         { token, password }   also confirms the email address and signs out other browsers
 *   POST /verify-email           { token }
 *   POST /resend-verification    (signed in)
 *   POST /google                 { credential }   an ID token from Google's own button; signs in or creates the account
 *
 * Accounts that came from Clerk have no password yet: signing in (or signing up again) with that address emails
 * them a link to set one.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../db/supabaseClient';
import { log } from '../lib/logger';
import { makeLimiter, safeLimit, getClientIp } from '../services/rateLimiter';
import { sendPlatformEmail } from '../services/platformEmails';
import {
  hashPassword, verifyPassword, passwordProblem, randomToken, sha256, signAccessToken,
  normalizeEmail, looksLikeEmail, authConfigured,
} from '../services/auth/crypto';
import { sendAuthEmail } from '../services/auth/authEmails';
import { googleClientId, verifyGoogleIdToken } from '../services/auth/google';

const router = Router();

export const SESSION_COOKIE = 'sq_session';
const SESSION_DAYS = 30;
const DAY_MS = 86400000;

const loginIpLimiter = makeLimiter('auth-login-ip', 20, '1 m', 60000);
const loginEmailLimiter = makeLimiter('auth-login-email', 10, '1 h', 3600000);
const signupIpLimiter = makeLimiter('auth-signup-ip', 10, '1 h', 3600000);
const emailLinkLimiter = makeLimiter('auth-email-link', 5, '1 h', 3600000);
const tokenLimiter = makeLimiter('auth-token-ip', 30, '1 m', 60000);

const USER_FIELDS = 'id, clerk_user_id, email, first_name, password_hash, email_verified_at, google_sub, plan';

function appUrl(): string {
  return (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '');
}

function apiUrl(): string {
  return (process.env.BACKEND_URL || '').replace(/\/+$/, '');
}

function secureCookies(): boolean {
  return process.env.NODE_ENV === 'production' || /^https:/.test(apiUrl());
}

function readCookie(req: Request, name: string): string {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return ''; }
    }
  }
  return '';
}

function cookie(name: string, value: string, opts: { path: string; maxAgeSec: number }): string {
  return [
    name + '=' + encodeURIComponent(value), 'Path=' + opts.path, 'Max-Age=' + opts.maxAgeSec,
    'HttpOnly', 'SameSite=Lax', secureCookies() ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function appendCookie(res: Response, value: string) {
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev.map(String) : prev ? [String(prev)] : [];
  res.setHeader('Set-Cookie', list.concat(value));
}

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email || '',
    firstName: u.first_name || '',
    emailVerified: !!u.email_verified_at,
  };
}

async function findUserByEmail(email: string): Promise<any | null> {
  const { data } = await supabase.from('users').select(USER_FIELDS).ilike('email', email.replace(/[\\%_]/g, '\\$&'))
    .order('created_at', { ascending: true }).limit(1);
  return (data && data[0]) || null;
}

async function startSession(req: Request, res: Response, user: any): Promise<void> {
  const token = randomToken();
  const { error } = await supabase.from('auth_sessions').insert({
    user_id: user.id,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString(),
    user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    ip: getClientIp(req).slice(0, 64),
  });
  if (error) throw new Error('could not create session: ' + error.message);
  appendCookie(res, cookie(SESSION_COOKIE, token, { path: '/api/auth', maxAgeSec: SESSION_DAYS * 86400 }));
  supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id).then(function () {}, function () {});
}

function clearSessionCookie(res: Response) {
  appendCookie(res, cookie(SESSION_COOKIE, '', { path: '/api/auth', maxAgeSec: 0 }));
}

/** The session row + user behind the request's cookie, or null. */
async function currentSession(req: Request): Promise<{ session: any; user: any } | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const { data: session } = await supabase.from('auth_sessions')
    .select('id, user_id, expires_at, revoked_at, last_seen_at').eq('token_hash', sha256(token)).maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const { data: user } = await supabase.from('users').select(USER_FIELDS).eq('id', session.user_id).maybeSingle();
  if (!user) return null;
  return { session, user };
}

/** Creates a single-use email link token and returns the raw value (only its hash is stored). */
async function issueEmailToken(userId: string, purpose: 'verify_email' | 'reset_password', ttlMs: number): Promise<string> {
  const token = randomToken();
  // Older unused links of the same kind stop working once a new one is sent.
  await supabase.from('auth_tokens').update({ used_at: new Date().toISOString() })
    .eq('user_id', userId).eq('purpose', purpose).is('used_at', null);
  const { error } = await supabase.from('auth_tokens').insert({
    user_id: userId, purpose, token_hash: sha256(token), expires_at: new Date(Date.now() + ttlMs).toISOString(),
  });
  if (error) throw new Error('could not create email link: ' + error.message);
  return token;
}

/** Marks a link token used and returns its user id, or null when it is unknown, used or expired. */
async function consumeEmailToken(token: unknown, purpose: 'verify_email' | 'reset_password'): Promise<string | null> {
  if (typeof token !== 'string' || !token || token.length > 200) return null;
  const { data: row } = await supabase.from('auth_tokens').select('id, user_id, expires_at, used_at')
    .eq('token_hash', sha256(token)).eq('purpose', purpose).maybeSingle();
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) return null;
  // Claim it atomically: only the request that flips used_at from NULL wins.
  const { data: claimed } = await supabase.from('auth_tokens').update({ used_at: new Date().toISOString() })
    .eq('id', row.id).is('used_at', null).select('id');
  if (!claimed || !claimed.length) return null;
  return row.user_id;
}

async function sendSetPasswordLink(user: any, kind: 'reset' | 'set'): Promise<void> {
  const token = await issueEmailToken(user.id, 'reset_password', kind === 'set' ? DAY_MS : 3600000);
  await sendAuthEmail(kind === 'set' ? 'set_password' : 'reset_password', user.email, {
    firstName: user.first_name || '',
    link: appUrl() + '/reset-password?token=' + encodeURIComponent(token),
  });
}

async function sendVerificationLink(user: any): Promise<void> {
  const token = await issueEmailToken(user.id, 'verify_email', 3 * DAY_MS);
  await sendAuthEmail('verify_email', user.email, {
    firstName: user.first_name || '',
    link: appUrl() + '/verify-email?token=' + encodeURIComponent(token),
  });
}

function notConfigured(res: Response) {
  return res.status(503).json({ error: 'Sign-in is not configured on this server', code: 'auth_not_configured' });
}

function googleEnabled(): boolean {
  return !!googleClientId();
}

router.get('/config', function (_req, res) {
  res.json({ google: googleEnabled(), googleClientId: googleClientId() || null });
});

router.post('/signup', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  const ip = getClientIp(req);
  if (!(await safeLimit(signupIpLimiter, ip)).success) return res.status(429).json({ error: 'Too many sign-ups from this network. Try again later.', code: 'rate_limited' });
  const email = normalizeEmail(req.body?.email);
  const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim().slice(0, 80) : '';
  if (!looksLikeEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', code: 'invalid_email' });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem, code: 'weak_password' });

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      if (!existing.password_hash) {
        if ((await safeLimit(emailLinkLimiter, email)).success) await sendSetPasswordLink(existing, 'set');
        return res.status(409).json({ error: 'You already have an account. We emailed you a link to set your password.', code: 'password_not_set' });
      }
      return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', code: 'account_exists' });
    }
    const { data: user, error } = await supabase.from('users').insert({
      clerk_user_id: 'usr_' + crypto.randomBytes(12).toString('hex'),
      email,
      first_name: firstName || null,
      password_hash: await hashPassword(req.body.password),
      plan: 'free',
      quiz_count: 0,
    }).select(USER_FIELDS).single();
    if (error || !user) throw new Error(error?.message || 'insert failed');
    await startSession(req, res, user);
    sendVerificationLink(user).catch(function (e) { log.error('[auth] verification email failed', { err: e?.message }); });
    sendPlatformEmail({ userId: user.id, email, emailType: 'welcome', firstName }).catch(function (e) {
      log.error('[auth] welcome email failed', { err: e?.message });
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (e: any) {
    log.error('[auth] signup failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not create the account. Try again.', code: 'signup_failed' });
  }
});

router.post('/login', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!(await safeLimit(loginIpLimiter, getClientIp(req))).success || (email && !(await safeLimit(loginEmailLimiter, email)).success)) {
    return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.', code: 'rate_limited' });
  }
  const invalid = function () { return res.status(401).json({ error: 'Wrong email or password.', code: 'invalid_credentials' }); };
  if (!looksLikeEmail(email) || !password || password.length > 200) return invalid();
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      await hashPassword(password); // same work as a real check, so timing does not reveal which emails exist
      return invalid();
    }
    if (!user.password_hash) {
      if ((await safeLimit(emailLinkLimiter, email)).success) await sendSetPasswordLink(user, 'set');
      return res.status(409).json({
        error: 'We moved to a new sign-in. We emailed you a link to set your password.', code: 'password_not_set',
      });
    }
    if (!(await verifyPassword(password, user.password_hash))) return invalid();
    await startSession(req, res, user);
    return res.json({ user: publicUser(user) });
  } catch (e: any) {
    log.error('[auth] login failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not sign in. Try again.', code: 'login_failed' });
  }
});

router.post('/logout', async function (req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token && token.length <= 200) {
    await supabase.from('auth_sessions').update({ revoked_at: new Date().toISOString() }).eq('token_hash', sha256(token));
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/session', async function (req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authConfigured()) return notConfigured(res);
  if (!(await safeLimit(tokenLimiter, getClientIp(req))).success) return res.status(429).json({ error: 'Too many requests', code: 'rate_limited' });
  try {
    const found = await currentSession(req);
    if (!found) {
      if (readCookie(req, SESSION_COOKIE)) clearSessionCookie(res);
      return res.status(401).json({ error: 'Not signed in', code: 'signed_out' });
    }
    const { session, user } = found;
    // Sliding expiry: an active browser stays signed in; refreshed at most once a day.
    if (Date.now() - new Date(session.last_seen_at).getTime() > DAY_MS) {
      await supabase.from('auth_sessions').update({
        last_seen_at: new Date().toISOString(), expires_at: new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString(),
      }).eq('id', session.id);
      appendCookie(res, cookie(SESSION_COOKIE, readCookie(req, SESSION_COOKIE), { path: '/api/auth', maxAgeSec: SESSION_DAYS * 86400 }));
    }
    const access = signAccessToken({ sub: user.clerk_user_id, uid: user.id, sid: session.id, email: user.email });
    return res.json({ user: publicUser(user), token: access.token, expiresAt: access.expiresAt });
  } catch (e: any) {
    log.error('[auth] session lookup failed', { err: e?.message });
    return res.status(503).json({ error: 'Sign-in is temporarily unavailable', code: 'auth_unavailable' });
  }
});

router.post('/forgot-password', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  const email = normalizeEmail(req.body?.email);
  const done = function () { return res.json({ ok: true, message: 'If an account uses this email, we sent a link to reset the password.' }); };
  if (!looksLikeEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', code: 'invalid_email' });
  if (!(await safeLimit(emailLinkLimiter, email)).success || !(await safeLimit(signupIpLimiter, getClientIp(req))).success) return done();
  try {
    const user = await findUserByEmail(email);
    if (user) await sendSetPasswordLink(user, user.password_hash ? 'reset' : 'set');
  } catch (e: any) {
    log.error('[auth] forgot-password failed', { err: e?.message });
  }
  return done();
});

router.post('/reset-password', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  if (!(await safeLimit(loginIpLimiter, getClientIp(req))).success) return res.status(429).json({ error: 'Too many attempts. Try again in a minute.', code: 'rate_limited' });
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem, code: 'weak_password' });
  try {
    const userId = await consumeEmailToken(req.body?.token, 'reset_password');
    if (!userId) return res.status(400).json({ error: 'This link has expired or was already used. Ask for a new one.', code: 'invalid_token' });
    const now = new Date().toISOString();
    const { data: user, error } = await supabase.from('users').select(USER_FIELDS).eq('id', userId).single();
    if (error || !user) throw new Error(error?.message || 'user missing');
    // The link was opened from this inbox, so the address is confirmed too.
    await supabase.from('users').update({
      password_hash: await hashPassword(req.body.password),
      email_verified_at: user.email_verified_at || now,
    }).eq('id', userId);
    // A new password signs out every other browser.
    await supabase.from('auth_sessions').update({ revoked_at: now }).eq('user_id', userId).is('revoked_at', null);
    await startSession(req, res, user);
    return res.json({ user: publicUser({ ...user, email_verified_at: user.email_verified_at || now }) });
  } catch (e: any) {
    log.error('[auth] reset-password failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not set the password. Try again.', code: 'reset_failed' });
  }
});

router.post('/verify-email', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  try {
    const userId = await consumeEmailToken(req.body?.token, 'verify_email');
    if (!userId) return res.status(400).json({ error: 'This link has expired or was already used.', code: 'invalid_token' });
    await supabase.from('users').update({ email_verified_at: new Date().toISOString() }).eq('id', userId).is('email_verified_at', null);
    return res.json({ ok: true });
  } catch (e: any) {
    log.error('[auth] verify-email failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not confirm the email. Try again.', code: 'verify_failed' });
  }
});

router.post('/resend-verification', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  const found = await currentSession(req);
  if (!found) return res.status(401).json({ error: 'Not signed in', code: 'signed_out' });
  if (found.user.email_verified_at) return res.json({ ok: true, alreadyVerified: true });
  if (!(await safeLimit(emailLinkLimiter, found.user.email)).success) return res.status(429).json({ error: 'We already sent a few links. Check your inbox or try again later.', code: 'rate_limited' });
  try {
    await sendVerificationLink(found.user);
    return res.json({ ok: true });
  } catch (e: any) {
    log.error('[auth] resend-verification failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not send the email. Try again.', code: 'send_failed' });
  }
});

/* ---------------- Sign in with Google ---------------- */

const googleLimiter = makeLimiter('auth-google-ip', 30, '1 m', 60000);

router.post('/google', async function (req: Request, res: Response) {
  if (!authConfigured()) return notConfigured(res);
  if (!googleEnabled()) return res.status(503).json({ error: 'Google sign-in is not available right now.', code: 'google_unavailable' });
  if (!(await safeLimit(googleLimiter, getClientIp(req))).success) return res.status(429).json({ error: 'Too many attempts. Try again in a minute.', code: 'rate_limited' });
  let identity;
  try {
    identity = await verifyGoogleIdToken(req.body?.credential);
  } catch (e: any) {
    log.warn('[auth] google token rejected', { reason: e?.message });
    return res.status(401).json({ error: 'Google sign-in did not finish. Please try again.', code: 'google_failed' });
  }
  try {
    const now = new Date().toISOString();
    let { data: user } = await supabase.from('users').select(USER_FIELDS).eq('google_sub', identity.sub).maybeSingle();
    if (!user) {
      user = await findUserByEmail(identity.email);
      if (user) {
        // Google confirmed this address belongs to the person signing in, so link it to the existing account.
        await supabase.from('users').update({ google_sub: identity.sub, email_verified_at: user.email_verified_at || now }).eq('id', user.id);
        user = { ...user, google_sub: identity.sub, email_verified_at: user.email_verified_at || now };
      } else {
        const created = await supabase.from('users').insert({
          clerk_user_id: 'usr_' + crypto.randomBytes(12).toString('hex'),
          email: identity.email, first_name: identity.givenName || null, google_sub: identity.sub, email_verified_at: now,
          plan: 'free', quiz_count: 0,
        }).select(USER_FIELDS).single();
        if (created.error || !created.data) throw new Error(created.error?.message || 'insert failed');
        user = created.data;
        sendPlatformEmail({ userId: user.id, email: identity.email, emailType: 'welcome', firstName: identity.givenName }).catch(function () {});
        await startSession(req, res, user);
        return res.status(201).json({ user: publicUser(user), created: true });
      }
    }
    await startSession(req, res, user);
    return res.json({ user: publicUser(user) });
  } catch (e: any) {
    log.error('[auth] google sign-in failed', { err: e?.message });
    return res.status(500).json({ error: 'Could not sign in with Google. Try again.', code: 'google_failed' });
  }
});

export default router;
