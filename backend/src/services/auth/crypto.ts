/**
 * The cryptography behind our own sign-in, built only on Node's crypto module.
 *
 * - Passwords: scrypt (N=2^15, r=8, p=1, 64-byte key) with a random 16-byte salt, stored as
 *   "scrypt$N$r$p$salt$hash". Verification is constant-time.
 * - Session cookies and email links: 32 random bytes; only their SHA-256 is stored.
 * - Access tokens: short-lived HS256 JWTs signed with AUTH_SECRET. The browser fetches one from /api/auth/session
 *   and sends it as "Authorization: Bearer"; the API verifies it locally on every request.
 */
import crypto from 'crypto';

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: n, r, p, maxmem: SCRYPT_MAXMEM }, function (err, key) {
      if (err) reject(err); else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = parseInt(parts[1], 10), r = parseInt(parts[2], 10), p = parseInt(parts[3], 10);
  if (!(n > 1 && r > 0 && p > 0) || n > 1 << 20) return false;
  const expected = Buffer.from(parts[5], 'base64');
  const actual = await scrypt(password, Buffer.from(parts[4], 'base64'), n, r, p);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Password rules: 10–200 characters. Long passphrases beat composition rules. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Enter a password.';
  if (password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 200) return 'Use at most 200 characters.';
  return null;
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function authSecret(): Buffer {
  const s = process.env.AUTH_SECRET || '';
  if (s.length < 32) throw new Error('AUTH_SECRET is not set (needs at least 32 characters)');
  return Buffer.from(s, 'utf8');
}

export function authConfigured(): boolean {
  return (process.env.AUTH_SECRET || '').length >= 32;
}

const ISSUER = 'squarespell-auth';
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;

export type AccessClaims = { sub: string; uid: string; sid: string; email?: string; iat: number; exp: number; iss: string };

function b64u(x: Buffer | string) { return Buffer.from(x).toString('base64url'); }

export function signAccessToken(c: { sub: string; uid: string; sid: string; email?: string }, ttlSec = ACCESS_TOKEN_TTL_SEC): { token: string; expiresAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessClaims = { sub: c.sub, uid: c.uid, sid: c.sid, email: c.email, iat: now, exp: now + ttlSec, iss: ISSUER };
  const data = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', authSecret()).update(data).digest();
  return { token: data + '.' + b64u(sig), expiresAt: payload.exp * 1000 };
}

export type VerifyResult = { ok: true; claims: AccessClaims } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' | 'wrong-issuer' };

export function verifyAccessToken(token: string): VerifyResult {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  let header: any, claims: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { return { ok: false, reason: 'malformed' }; }
  if (!header || header.alg !== 'HS256') return { ok: false, reason: 'malformed' };
  const expected = crypto.createHmac('sha256', authSecret()).update(parts[0] + '.' + parts[1]).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return { ok: false, reason: 'bad-signature' };
  if (!claims || claims.iss !== ISSUER || typeof claims.sub !== 'string' || typeof claims.uid !== 'string') return { ok: false, reason: 'wrong-issuer' };
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, claims };
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function looksLikeEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
