/**
 * Access tokens for tests, made with the product's own signer (services/auth/crypto.ts) and the test AUTH_SECRET,
 * so requireAuth runs its real signature, issuer and expiry checks. `wrongKey` signs with a different secret.
 */
import crypto from 'crypto';
import { signAccessToken } from '../../services/auth/crypto';

export function signToken(sub: string, opts: { uid?: string; expiresInSec?: number; wrongKey?: boolean } = {}): string {
  if (opts.wrongKey) {
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
    try { return signAccessToken({ sub, uid: opts.uid ?? 'uid-test', sid: 'sess_test' }, opts.expiresInSec).token; }
    finally { process.env.AUTH_SECRET = saved; }
  }
  return signAccessToken({ sub, uid: opts.uid ?? 'uid-test', sid: 'sess_test' }, opts.expiresInSec).token;
}
