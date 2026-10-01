/**
 * "Sign in with Google" (Google Identity Services). The browser gets an ID token from Google's own button and posts
 * it to /api/auth/google; this module checks it before we trust anything in it:
 *   - RS256 signature against Google's published keys (cached as long as Google's Cache-Control allows),
 *   - issuer accounts.google.com, audience = our OAuth client id, not expired,
 *   - the email address is verified by Google.
 * Only the client id is needed (it is public by design, like the button itself); there is no client secret.
 */
import crypto from 'crypto';

/**
 * The Squarespell Quiz OAuth web client (Google Cloud project "squarespell-quiz", origin https://app.squarespellquiz.com).
 * Public by design: Google's button shows it to every visitor. GOOGLE_CLIENT_ID overrides it (staging, tests).
 */
const DEFAULT_CLIENT_ID = '1089949310881-j1bhkvk165q9cjgn5quecdtssu1pcqpb.apps.googleusercontent.com';

export function googleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID).trim();
}

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let keyCache: { keys: Record<string, crypto.KeyObject>; expires: number } | null = null;

export function resetGoogleKeyCache() { keyCache = null; }

async function googleKeys(force = false): Promise<Record<string, crypto.KeyObject>> {
  if (!force && keyCache && keyCache.expires > Date.now()) return keyCache.keys;
  const res = await fetch(process.env.GOOGLE_CERTS_URL || CERTS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('Google keys unavailable: ' + res.status);
  const body: any = await res.json();
  const keys: Record<string, crypto.KeyObject> = {};
  for (const jwk of body.keys || []) {
    if (jwk && jwk.kid && jwk.kty === 'RSA') keys[jwk.kid] = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  }
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  keyCache = { keys, expires: Date.now() + Math.min(maxAge ? parseInt(maxAge[1], 10) : 3600, 86400) * 1000 };
  return keys;
}

export type GoogleIdentity = { sub: string; email: string; givenName: string };

/** Returns the verified identity, or throws an Error whose message is safe to log (never the token). */
export async function verifyGoogleIdToken(token: unknown): Promise<GoogleIdentity> {
  const clientId = googleClientId();
  if (!clientId) throw new Error('google sign-in is not configured');
  if (typeof token !== 'string' || token.length > 4096) throw new Error('malformed token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  let header: any, claims: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { throw new Error('malformed token'); }
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('unexpected token header');

  let keys = await googleKeys();
  // Google rotates keys; an unknown kid means our cache is older than the token.
  if (!keys[header.kid]) keys = await googleKeys(true);
  const key = keys[header.kid];
  if (!key) throw new Error('unknown signing key');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new Error('bad signature');

  if (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') throw new Error('wrong issuer');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) throw new Error('wrong audience');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) throw new Error('expired');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('no subject');
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (!email || claims.email_verified !== true) throw new Error('email not verified by Google');
  return { sub: claims.sub, email, givenName: typeof claims.given_name === 'string' ? claims.given_name.slice(0, 80) : '' };
}
