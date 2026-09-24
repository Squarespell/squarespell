import crypto from 'node:crypto';
import { supabase } from '../../db/supabaseClient';
import { log } from '../../lib/logger';
import { recordAuthAudit } from './audit';
import { sendAuthCodeEmail } from './mailer';

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// PBKDF2-SHA256. Codes are only 6 digits (1e6 possibilities) so the hash
// must be intentionally slow -- a high iteration count is the only lever
// available, since a code (unlike a password) cannot be made longer.
const HASH_ITERATIONS = 210_000;
const HASH_KEYLEN = 32;
const HASH_DIGEST = 'sha256';

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function generateCode(): string {
  // Rejection sampling for a uniform 6-digit code (000000-999999) from a
  // CSPRNG; avoids the modulo bias of `randomBytes(4) % 1_000_000`.
  const max = 1_000_000;
  const range = Math.floor(0x100000000 / max) * max;
  let n: number;
  do {
    n = crypto.randomBytes(4).readUInt32BE(0);
  } while (n >= range);
  return String(n % max).padStart(CODE_LENGTH, '0');
}

function hashCode(code: string, salt: Buffer): string {
  const derived = crypto.pbkdf2Sync(code, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST);
  return `pbkdf2:${HASH_ITERATIONS}:${salt.toString('base64')}:${derived.toString('base64')}`;
}

function verifyCodeHash(code: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const actual = crypto.pbkdf2Sync(code, salt, iterations, expected.length, HASH_DIGEST);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export type RequestCodeResult =
  | { ok: true }
  | { ok: false; reason: 'cooldown'; retryAfterMs: number };

/**
 * Issues a fresh code for `email`, invalidating any unconsumed prior code
 * first. Always resolves the same way whether or not the email has an
 * account -- callers must not branch on `ok` beyond the cooldown case, or
 * the endpoint becomes an account-enumeration oracle.
 */
export async function requestCode(email: string, ip: string): Promise<RequestCodeResult> {
  const emailNormalized = normalizeEmail(email);

  const { data: existing } = await supabase
    .from('auth_codes')
    .select('id, created_at')
    .eq('email_normalized', emailNormalized)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const age = Date.now() - new Date(existing.created_at).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', retryAfterMs: RESEND_COOLDOWN_MS - age };
    }
    // New code invalidates the old one: consume it (not delete -- keeps the
    // audit trail) before inserting the replacement.
    await supabase.from('auth_codes').update({ consumed_at: new Date().toISOString() }).eq('id', existing.id);
  }

  const code = generateCode();
  const salt = crypto.randomBytes(16);
  const codeHash = hashCode(code, salt);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error } = await supabase.from('auth_codes').insert({
    email_normalized: emailNormalized,
    code_hash: codeHash,
    max_attempts: MAX_ATTEMPTS,
    expires_at: expiresAt,
    created_ip: ip,
  });

  if (error) {
    log.error('requestCode: insert failed', { err: error.message });
    await recordAuthAudit({ emailNormalized, action: 'request_code', outcome: 'error', ip, detail: error.message });
    throw new Error('code_issue_failed');
  }

  try {
    await sendAuthCodeEmail(emailNormalized, code);
    await recordAuthAudit({ emailNormalized, action: 'request_code', outcome: 'sent', ip });
  } catch (err: any) {
    log.error('requestCode: send failed', { err: err?.message });
    await recordAuthAudit({ emailNormalized, action: 'request_code', outcome: 'send_failed', ip, detail: err?.message });
    // Do not throw: surfacing delivery failure to an unauthenticated caller
    // is itself an enumeration signal. The code simply expires unused.
  }

  return { ok: true };
}

export type VerifyCodeResult =
  | { ok: true; emailNormalized: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' | 'not_found' };

interface IncrementAttemptRow {
  attempt_count: number;
  max_attempts: number;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
}

/**
 * Verifies `code` for `email`. Every failure path returns the same shape so
 * the HTTP layer can show one generic message for anti-enumeration while
 * this module keeps enough detail for logging/audit.
 */
export async function verifyCode(email: string, code: string, ip: string): Promise<VerifyCodeResult> {
  const emailNormalized = normalizeEmail(email);
  const trimmedCode = String(code || '').trim();

  const { data: row } = await supabase
    .from('auth_codes')
    .select('id, code_hash, max_attempts, expires_at, consumed_at, attempt_count')
    .eq('email_normalized', emailNormalized)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'not_found', ip });
    return { ok: false, reason: 'not_found' };
  }

  // Atomically increment the attempt counter first (transaction-safe under
  // concurrent verification attempts), then evaluate the *returned* row --
  // never the one read above, which may already be stale. The RPC's return
  // type isn't in the (ungenerated) Supabase client types, hence the cast.
  const { data: incrementedRaw, error: incError } = await supabase
    .rpc('increment_auth_code_attempt', { p_id: row.id })
    .single();

  if (incError || !incrementedRaw) {
    log.error('verifyCode: attempt increment failed', { err: incError?.message });
    return { ok: false, reason: 'invalid' };
  }

  const incremented = incrementedRaw as unknown as IncrementAttemptRow;

  if (incremented.consumed_at) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'already_consumed', ip });
    return { ok: false, reason: 'invalid' };
  }

  if (new Date(incremented.expires_at).getTime() < Date.now()) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'expired', ip });
    return { ok: false, reason: 'expired' };
  }

  if (incremented.attempt_count > incremented.max_attempts) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'too_many_attempts', ip });
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (!verifyCodeHash(trimmedCode, incremented.code_hash)) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'invalid', ip });
    return { ok: false, reason: 'invalid' };
  }

  // Claim the code atomically -- only one concurrent caller can succeed even
  // if the same correct code is verified twice at once.
  const { data: claimed, error: claimError } = await supabase
    .rpc('consume_auth_code', { p_id: row.id })
    .maybeSingle();

  if (claimError || !claimed) {
    await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'race_lost', ip });
    return { ok: false, reason: 'invalid' };
  }

  await recordAuthAudit({ emailNormalized, action: 'verify_code', outcome: 'success', ip });
  return { ok: true, emailNormalized };
}

/** Best-effort cleanup of long-expired codes. Safe to run repeatedly. */
export async function cleanupExpiredCodes(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('auth_codes')
    .delete()
    .lt('expires_at', cutoff)
    .select('id');
  if (error) {
    log.error('cleanupExpiredCodes failed', { err: error.message });
    return 0;
  }
  return data?.length || 0;
}
