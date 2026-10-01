/**
 * Phase 1 - our own sign-in (routes/auth.ts + middleware/auth.ts): sign-up, sign-in, sign-out, sessions, email
 * links, accounts moved from Clerk, rate limits and the admin rule. Everything runs against the real routes, the
 * real password hashing and token signing, PGlite and the local mailbox fake.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, makeUser, bearer, nextIp } from '../helpers/testkit';
import { signToken } from '../helpers/authFake';
import { resetData, sql } from '../helpers/db';
import { dbFault } from '../helpers/fakeSupabase';
import { getApp } from '../helpers/testkit';
import { listRoutes } from '../helpers/routes';
import { outbox, resetOutbox } from '../helpers/mailFake';
import { hashPassword } from '../../services/auth/crypto';
import { isAdminUser } from '../../routes/allRoutes';
import http from 'http';
import crypto from 'crypto';
import { resetGoogleKeyCache } from '../../services/auth/google';

const PASSWORD = 'correct horse battery';

function sessionCookie(res: any): string {
  const all: string[] = [].concat(res.headers['set-cookie'] || []);
  const c = all.find((x) => x.startsWith('sq_session=') && !/Max-Age=0/.test(x));
  return c ? c.split(';')[0] : '';
}

function linkToken(mail: any): string {
  const m = /token=([A-Za-z0-9_\-%]+)/.exec(String(mail?.text || mail?.html || ''));
  return m ? decodeURIComponent(m[1]) : '';
}

async function signup(email: string, password = PASSWORD, ip = nextIp()) {
  return (await api()).post('/api/auth/signup').set('x-forwarded-for', ip).send({ email, password, firstName: 'Ada' });
}

describe('access tokens (requireAuth)', () => {
  beforeEach(resetData);

  it('valid token -> 200 and the request is scoped to that user', async () => {
    const u = await makeUser();
    const r = await (await api()).get('/api/quizzes').set(bearer(u));
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('missing Authorization header -> 401 auth_required', async () => {
    const r = await (await api()).get('/api/quizzes');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('auth_required');
  });

  it('non-Bearer scheme -> 401', async () => {
    const r = await (await api()).get('/api/quizzes').set('Authorization', 'Basic abc');
    expect(r.status).toBe(401);
  });

  it('expired token -> 401 token_expired so the client fetches a fresh one', async () => {
    const u = await makeUser();
    const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${signToken(u.clerkId, { uid: u.id, expiresInSec: -60 })}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_expired');
  });

  it('token signed with another secret (forged) -> 401 token_invalid', async () => {
    const u = await makeUser();
    const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${signToken(u.clerkId, { wrongKey: true })}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_invalid');
  });

  it('a token with alg "none" or an edited payload is rejected', async () => {
    const u = await makeUser();
    const [h, p, s] = u.token.split('.');
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + p + '.';
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    const edited = h + '.' + Buffer.from(JSON.stringify({ ...claims, sub: 'someone_else' })).toString('base64url') + '.' + s;
    for (const t of [none, edited]) {
      const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${t}`);
      expect(r.status).toBe(401);
    }
  });

  it('garbage token -> 401 token_invalid (not a 500)', async () => {
    const r = await (await api()).get('/api/quizzes').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_invalid');
  });

  it('a valid token for an account that no longer exists -> 401 account_not_found (no account is created)', async () => {
    const r = await (await api()).get('/api/user/plan').set('Authorization', `Bearer ${signToken('usr_deleted')}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('account_not_found');
    expect(await sql(`select 1 from users where clerk_user_id='usr_deleted'`)).toHaveLength(0);
  });

  it('a database outage returns 503 db_unavailable instead of continuing without a user', async () => {
    const u = await makeUser();
    dbFault.on = true;
    try {
      const r = await (await api()).get('/api/user/plan').set(bearer(u));
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('db_unavailable');
    } finally { dbFault.on = false; }
  });

  it('without AUTH_SECRET the API answers 503 auth_provider_unavailable (never 200)', async () => {
    const u = await makeUser();
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      const r = await (await api()).get('/api/quizzes').set(bearer(u));
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('auth_provider_unavailable');
    } finally { process.env.AUTH_SECRET = saved; }
  });

  it('a signed-out client (no token) cannot reach any authenticated route', async () => {
    const app = await getApp();
    const authed = listRoutes(app).filter((r) => r.handlers.includes('requireAuth') && r.method === 'GET' && !r.path.includes(':'));
    expect(authed.length).toBeGreaterThan(10);
    for (const route of authed) {
      const res = await (await api())[route.method.toLowerCase() as 'get'](route.path);
      expect(res.status, `${route.method} ${route.path}`).toBe(401);
    }
  });
});

describe('sign-up, sign-in, session and sign-out', () => {
  beforeEach(async () => { await resetData(); resetOutbox(); });

  it('sign-up creates one account, signs in with a secure HttpOnly cookie and emails a confirmation link', async () => {
    const r = await signup('Ada@Customer.Example');
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: 'ada@customer.example', firstName: 'Ada', emailVerified: false });
    const set = [].concat(r.headers['set-cookie']).join('\n');
    expect(set).toMatch(/sq_session=[^;]+; Path=\/api\/auth; Max-Age=2592000; HttpOnly; SameSite=Lax/);
    const rows = await sql<any>(`select clerk_user_id, email, plan, password_hash, email_verified_at from users`);
    expect(rows).toHaveLength(1);
    expect(rows[0].clerk_user_id).toMatch(/^usr_[0-9a-f]{24}$/);
    expect(rows[0].plan).toBe('free');
    expect(rows[0].password_hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(rows[0].password_hash).not.toContain(PASSWORD);
    expect(rows[0].email_verified_at).toBeNull();
    const stored = await sql<any>(`select token_hash from auth_sessions`);
    expect(stored).toHaveLength(1);
    expect(sessionCookie(r)).not.toContain(stored[0].token_hash);
    await new Promise((res) => setTimeout(res, 50));
    expect(outbox.some((m) => m.subject === 'Confirm your email for Squarespell Quiz' && String(m.to) === 'ada@customer.example')).toBe(true);
  });

  it('the session cookie gives a short-lived access token that works on the API; sign-out ends it', async () => {
    const r = await signup('ada@customer.example');
    const c = sessionCookie(r);
    const s = await (await api()).get('/api/auth/session').set('Cookie', c);
    expect(s.status).toBe(200);
    expect(s.headers['cache-control']).toBe('no-store');
    expect(s.body.user.email).toBe('ada@customer.example');
    expect(s.body.expiresAt - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);
    const q = await (await api()).get('/api/quizzes').set('Authorization', 'Bearer ' + s.body.token);
    expect(q.status).toBe(200);

    const out = await (await api()).post('/api/auth/logout').set('Cookie', c);
    expect(out.status).toBe(200);
    expect([].concat(out.headers['set-cookie']).join('\n')).toMatch(/sq_session=; Path=\/api\/auth; Max-Age=0/);
    const after = await (await api()).get('/api/auth/session').set('Cookie', c);
    expect(after.status).toBe(401);
  });

  it('a second account for the same email (any case) is refused', async () => {
    await signup('ada@customer.example');
    const r = await signup('ADA@customer.example');
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('account_exists');
    expect(await sql(`select 1 from users`)).toHaveLength(1);
  });

  it('sign-up validates the email and password length', async () => {
    expect((await signup('not-an-email')).body.code).toBe('invalid_email');
    expect((await signup('a@customer.example', 'short')).body.code).toBe('weak_password');
    expect(await sql(`select 1 from users`)).toHaveLength(0);
  });

  it('sign-in works with the right password (email in any case) and gives one generic error otherwise', async () => {
    await signup('ada@customer.example');
    const ok = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: ' ADA@customer.example ', password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(sessionCookie(ok)).toMatch(/^sq_session=/);
    const wrong = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example', password: 'wrong password!!' });
    const unknown = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'nobody@customer.example', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(sessionCookie(wrong)).toBe('');
  });

  it('repeated wrong passwords for one account are rate limited', async () => {
    await signup('ada@customer.example');
    let last: any;
    for (let i = 0; i < 11; i++) {
      last = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example', password: 'wrong password ' + i });
    }
    expect(last.status).toBe(429);
    const right = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example', password: PASSWORD });
    expect(right.status).toBe(429);
  });

  it('an expired or revoked session cookie is signed out', async () => {
    const r = await signup('ada@customer.example');
    const c = sessionCookie(r);
    await sql(`update auth_sessions set expires_at = now() - interval '1 minute'`);
    expect((await (await api()).get('/api/auth/session').set('Cookie', c)).status).toBe(401);
    await sql(`update auth_sessions set expires_at = now() + interval '1 day', revoked_at = now()`);
    expect((await (await api()).get('/api/auth/session').set('Cookie', c)).status).toBe(401);
  });
});

describe('email links: confirm address, forgot password, accounts moved from Clerk', () => {
  beforeEach(async () => { await resetData(); resetOutbox(); });

  it('the confirmation link marks the address confirmed and works only once', async () => {
    await signup('ada@customer.example');
    await new Promise((res) => setTimeout(res, 50));
    const token = linkToken(outbox.find((m) => m.subject.startsWith('Confirm your email')));
    expect(token).not.toBe('');
    expect((await (await api()).post('/api/auth/verify-email').send({ token })).status).toBe(200);
    expect((await sql<any>(`select email_verified_at from users`))[0].email_verified_at).not.toBeNull();
    const again = await (await api()).post('/api/auth/verify-email').send({ token });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('invalid_token');
  });

  it('forgot password answers the same for unknown emails and sends a working reset link for real ones', async () => {
    await signup('ada@customer.example');
    resetOutbox();
    const unknown = await (await api()).post('/api/auth/forgot-password').set('x-forwarded-for', nextIp()).send({ email: 'nobody@customer.example' });
    const known = await (await api()).post('/api/auth/forgot-password').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example' });
    expect(unknown.body).toEqual(known.body);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toBe('Reset your Squarespell Quiz password');

    const token = linkToken(outbox[0]);
    const weak = await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token, password: 'short' });
    expect(weak.body.code).toBe('weak_password');
    const r = await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token, password: 'a brand new passphrase' });
    expect(r.status).toBe(200);
    expect(r.body.user.emailVerified).toBe(true);
    // The old password stops working, the new one works, and the link cannot be reused.
    expect((await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example', password: PASSWORD })).status).toBe(401);
    expect((await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example', password: 'a brand new passphrase' })).status).toBe(200);
    expect((await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token, password: 'another passphrase!' })).status).toBe(400);
  });

  it('resetting the password signs out every other browser', async () => {
    const first = await signup('ada@customer.example');
    const oldCookie = sessionCookie(first);
    resetOutbox();
    await (await api()).post('/api/auth/forgot-password').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example' });
    await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token: linkToken(outbox[0]), password: 'a brand new passphrase' });
    expect((await (await api()).get('/api/auth/session').set('Cookie', oldCookie)).status).toBe(401);
  });

  it('an expired reset link is refused', async () => {
    await signup('ada@customer.example');
    resetOutbox();
    await (await api()).post('/api/auth/forgot-password').set('x-forwarded-for', nextIp()).send({ email: 'ada@customer.example' });
    await sql(`update auth_tokens set expires_at = now() - interval '1 minute' where purpose='reset_password'`);
    const r = await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token: linkToken(outbox[0]), password: 'a brand new passphrase' });
    expect(r.status).toBe(400);
  });

  it('an account from Clerk (no password yet) keeps its id and data: signing in emails a set-password link', async () => {
    const legacy = await makeUser({ email: 'Owner@Business.Example' });
    const quizRows = await sql<any>(`insert into quizzes (user_id, title, slug, status, questions, outcomes) values ($1,'Old quiz','old-quiz-1','live','[]','[]') returning id`, [legacy.id]);
    const r = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'owner@business.example', password: 'anything at all' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('password_not_set');
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toBe('Set your Squarespell Quiz password');

    const set = await (await api()).post('/api/auth/reset-password').set('x-forwarded-for', nextIp()).send({ token: linkToken(outbox[0]), password: 'my new passphrase' });
    expect(set.status).toBe(200);
    const s = await (await api()).get('/api/auth/session').set('Cookie', sessionCookie(set));
    expect(s.status).toBe(200);
    // Same account: same users.id, same sign-in identity, and the old quiz is still theirs.
    const rows = await sql<any>(`select id, clerk_user_id from users`);
    expect(rows).toEqual([{ id: legacy.id, clerk_user_id: legacy.clerkId }]);
    const quizzes = await (await api()).get('/api/quizzes').set('Authorization', 'Bearer ' + s.body.token);
    expect(quizzes.body.map((q: any) => q.id)).toContain(quizRows[0].id);
  });
});

describe('admin access', () => {
  beforeEach(resetData);

  it('admin needs a listed email that is confirmed; letter case does not matter', () => {
    expect(isAdminUser({ email: 'Admin@Example.Test', email_verified_at: new Date().toISOString() })).toBe(true);
    expect(isAdminUser({ email: 'admin@example.test', email_verified_at: null })).toBe(false);
    expect(isAdminUser({ email: 'someone@example.test', email_verified_at: new Date().toISOString() })).toBe(false);
  });

  it('an unconfirmed account using an admin address gets 403 from the admin API', async () => {
    const u = await makeUser({ email: 'admin@example.test' });
    const r = await (await api()).get('/api/admin/metrics').set(bearer(u));
    expect(r.status).toBe(403);
    await sql(`update users set email_verified_at = now() where id = $1`, [u.id]);
    const ok = await (await api()).get('/api/admin/metrics').set(bearer(u));
    expect(ok.status).toBe(200);
  });
});

describe('Sign in with Google (ID token from Google\'s button)', () => {
  // A local stand-in for Google's key endpoint, with a key pair generated for this run.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const CLIENT = 'client-123.apps.googleusercontent.com';
  let server: http.Server;
  const b64 = (x: any) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
  function idToken(over: Record<string, any> = {}, key = privateKey, kid = 'k1') {
    const now = Math.floor(Date.now() / 1000);
    const data = b64({ alg: 'RS256', kid, typ: 'JWT' }) + '.' + b64({
      iss: 'https://accounts.google.com', aud: CLIENT, sub: 'g-1001', email: 'Ada@Gmail.example', email_verified: true,
      given_name: 'Ada', iat: now - 5, exp: now + 600, ...over,
    });
    return data + '.' + crypto.sign('RSA-SHA256', Buffer.from(data), key).toString('base64url');
  }
  const post = async (credential: string) => (await api()).post('/api/auth/google').set('x-forwarded-for', nextIp()).send({ credential });

  beforeEach(async () => {
    await resetData(); resetOutbox(); resetGoogleKeyCache();
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
    server = http.createServer((_q, r) => { r.setHeader('cache-control', 'max-age=600'); r.end(JSON.stringify({ keys: [jwk] })); });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    process.env.GOOGLE_CERTS_URL = 'http://127.0.0.1:' + (server.address() as any).port + '/certs';
    process.env.GOOGLE_CLIENT_ID = CLIENT;
  });
  afterEach(async () => {
    delete process.env.GOOGLE_CERTS_URL; delete process.env.GOOGLE_CLIENT_ID;
    await new Promise((ok) => server.close(ok));
  });

  it('the config tells the app the public client id for the button', async () => {
    const r = await (await api()).get('/api/auth/config');
    expect(r.body).toEqual({ google: true, googleClientId: CLIENT });
  });

  it('a valid Google token creates a confirmed account once and signs in; the next time signs in to the same one', async () => {
    const a = await post(idToken());
    expect(a.status).toBe(201);
    expect(a.body.user).toMatchObject({ email: 'ada@gmail.example', firstName: 'Ada', emailVerified: true });
    expect(sessionCookie(a)).toMatch(/^sq_session=/);
    const b = await post(idToken());
    expect(b.status).toBe(200);
    const rows = await sql<any>(`select email, google_sub, password_hash, email_verified_at from users`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'ada@gmail.example', google_sub: 'g-1001', password_hash: null });
    expect(rows[0].email_verified_at).not.toBeNull();
  });

  it('an existing account (e.g. from Clerk) with the same email is linked, not duplicated', async () => {
    const legacy = await makeUser({ email: 'ada@gmail.example' });
    const r = await post(idToken());
    expect(r.status).toBe(200);
    const rows = await sql<any>(`select id, google_sub from users`);
    expect(rows).toEqual([{ id: legacy.id, google_sub: 'g-1001' }]);
  });

  it('rejects forged, foreign, expired and unverified tokens without creating anything', async () => {
    const bad = [
      idToken({}, other.privateKey),                        // signed by someone else
      idToken({ aud: 'another-app.apps.googleusercontent.com' }),
      idToken({ iss: 'https://evil.example' }),
      idToken({ exp: Math.floor(Date.now() / 1000) - 10 }),
      idToken({ email_verified: false }),
      idToken({}, privateKey, 'unknown-kid'),
      'not.a.token',
    ];
    for (const t of bad) {
      const r = await post(t);
      expect(r.status, t.slice(0, 20)).toBe(401);
      expect(r.body.code).toBe('google_failed');
    }
    expect(await sql(`select 1 from users`)).toHaveLength(0);
  });

  it('is off when no client id is configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await (await api()).get('/api/auth/config')).body.google).toBe(false);
    expect((await post(idToken())).status).toBe(503);
  });
});
