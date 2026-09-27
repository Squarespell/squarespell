import { Router, Request, Response } from 'express';
import { requestCode, verifyCode, normalizeEmail } from '../services/auth/codes';
import { matchOrCreateUser } from '../services/auth/userMatching';
import {
  createSession, getSessionFromToken, revokeSessionByToken, revokeAllSessionsForUser,
  SESSION_COOKIE_NAME, sessionCookieOptions, clearSessionCookieOptions, csrfMatches, csrfTokenFor,
} from '../services/auth/sessions';
import { recordAuthAudit } from '../services/auth/audit';
import { authCodeEmailLimiter, authCodeIpLimiter, getClientIp, safeLimit } from '../services/rateLimiter';
import { log } from '../lib/logger';

export const authEmailRouter = Router();

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

function checkCsrf(req: Request, sessionToken: string): boolean {
  return csrfMatches(sessionToken, req.headers['x-csrf-token']);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_CODE_SENT = { ok: true, message: 'If that email is valid, a code has been sent.' };

authEmailRouter.post('/request-code', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '');
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required', code: 'invalid_email' });
  }
  const ip = getClientIp(req);
  const emailNormalized = normalizeEmail(email);

  const [emailLimit, ipLimit] = await Promise.all([
    safeLimit(authCodeEmailLimiter, 'email:' + emailNormalized),
    safeLimit(authCodeIpLimiter, 'ip:' + ip),
  ]);
  if (!emailLimit.success || !ipLimit.success) {
    await recordAuthAudit({ emailNormalized, action: 'request_code', outcome: 'rate_limited', ip });
    return res.status(429).json({ error: 'Too many requests. Please try again later.', code: 'rate_limited' });
  }

  try {
    const result = await requestCode(email, ip);
    if (!result.ok && result.reason === 'cooldown') {
      return res.status(429).json({
        error: 'Please wait before requesting another code.',
        code: 'resend_cooldown',
        retryAfterMs: result.retryAfterMs,
      });
    }
    return res.json(GENERIC_CODE_SENT);
  } catch (err: any) {
    log.error('POST /request-code failed', { err: err?.message });
    return res.status(503).json({ error: 'Unable to send code right now. Please try again.', code: 'send_unavailable' });
  }
});

authEmailRouter.post('/verify-code', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '');
  const code = String(req.body?.code || '');
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required', code: 'invalid_request' });
  }
  const ip = getClientIp(req);

  const result = await verifyCode(email, code, ip);
  if (!result.ok) {
    const status = result.reason === 'too_many_attempts' ? 429 : 401;
    // One generic message regardless of `reason` -- an unauthenticated
    // caller never learns whether the email exists.
    return res.status(status).json({ error: 'Invalid or expired code', code: 'code_invalid' });
  }

  try {
    const user = await matchOrCreateUser(result.emailNormalized);
    const session = await createSession(user.id, ip, String(req.headers['user-agent'] || ''));

    res.cookie(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt));

    await recordAuthAudit({ emailNormalized: result.emailNormalized, action: 'session_create', outcome: 'success', ip });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, isNewUser: user.isNewUser, csrfToken: session.csrfToken });
  } catch (err: any) {
    log.error('POST /verify-code: session creation failed', { err: err?.message });
    return res.status(503).json({ error: 'Unable to sign you in right now. Please try again.', code: 'session_unavailable' });
  }
});

authEmailRouter.get('/session', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = token ? await getSessionFromToken(token) : null;
  if (!session) return res.status(401).json({ authenticated: false });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ authenticated: true, csrfToken: csrfTokenFor(token) });
});

authEmailRouter.post('/logout', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token && !checkCsrf(req, token)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token', code: 'csrf_invalid' });
  }
  if (token) await revokeSessionByToken(token);
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  return res.json({ ok: true });
});

authEmailRouter.post('/logout-all', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = token ? await getSessionFromToken(token) : null;
  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  }
  if (!checkCsrf(req, token)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token', code: 'csrf_invalid' });
  }
  await revokeAllSessionsForUser(session.userId);
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  return res.json({ ok: true });
});

