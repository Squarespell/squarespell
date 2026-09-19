/**
 * Local Clerk: an RSA key pair generated at test start. The public key is
 * handed to the real @clerk/backend verifyToken via CLERK_JWT_KEY (Clerk's
 * networkless "JWT key" mode), so signature, expiry and claim checks are the
 * real ones; only the key source is local.
 */
import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

export const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }).toString();

function b64u(x: Buffer | string) {
  return Buffer.from(x).toString('base64url');
}

export function signToken(
  sub: string,
  opts: { expiresInSec?: number; issuedAtSec?: number; notBeforeSec?: number; wrongKey?: boolean; alg?: string } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: opts.alg ?? 'RS256', typ: 'JWT', kid: 'ins_test_local' };
  const payload: Record<string, any> = {
    sub,
    iss: 'https://clerk.test.local',
    iat: opts.issuedAtSec ?? now - 5,
    nbf: opts.notBeforeSec ?? now - 10,
    exp: now + (opts.expiresInSec ?? 300),
    sid: 'sess_test',
  };
  const data = b64u(JSON.stringify(header)) + '.' + b64u(JSON.stringify(payload));
  const key = opts.wrongKey ? otherKey.privateKey : privateKey;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), key);
  return data + '.' + b64u(sig);
}
