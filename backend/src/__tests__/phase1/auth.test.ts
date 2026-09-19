/**
 * Phase 1 - sign-up / sign-in / sign-out / session expiry at the API boundary.
 * Clerk itself (hosted UI, OAuth) cannot run hermetically; what the API owns is
 * verifying the Clerk session JWT and mapping it to a database user.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, makeUser, bearer } from '../helpers/testkit';
import { signToken } from '../helpers/clerkFake';
import { resetData, sql } from '../helpers/db';
import { clerkDirectory, clerkBehaviour } from '../helpers/clerkDirectory';
import { dbFault } from '../helpers/fakeSupabase';
import { getApp } from '../helpers/testkit';
import { listRoutes } from '../helpers/routes';

describe('session JWT verification (requireAuth)', () => {
  beforeEach(resetData);

  it('valid session token -> 200 and the request is scoped to that user', async () => {
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

  it('expired token (session expiry) -> 401 with code token_expired so the client can refresh/sign in again', async () => {
    const u = await makeUser();
    const expired = signToken(u.clerkId, { issuedAtSec: Math.floor(Date.now() / 1000) - 4000, notBeforeSec: Math.floor(Date.now() / 1000) - 4000, expiresInSec: -3600 });
    const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${expired}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_expired');
  });

  it('token signed by a different key (forged) -> 401 token_invalid', async () => {
    const u = await makeUser();
    const forged = signToken(u.clerkId, { wrongKey: true });
    const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${forged}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_invalid');
  });

  it('garbage token -> 401 token_invalid (not a 500)', async () => {
    const r = await (await api()).get('/api/quizzes').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_invalid');
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

describe('Clerk verification outage', () => {
  it('when the JWKS endpoint is unreachable the API answers 503 auth_provider_unavailable (never 200, never a generic 401)', async () => {
    const saved = { key: process.env.CLERK_JWT_KEY, url: process.env.CLERK_API_URL };
    delete process.env.CLERK_JWT_KEY;
    process.env.CLERK_API_URL = 'http://127.0.0.1:9'; // closed local port: no live Clerk call is made
    try {
      const token = signToken('user_outage_probe');
      const r = await (await api()).get('/api/quizzes').set('Authorization', `Bearer ${token}`);
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('auth_provider_unavailable');
    } finally {
      process.env.CLERK_JWT_KEY = saved.key;
      if (saved.url === undefined) delete process.env.CLERK_API_URL; else process.env.CLERK_API_URL = saved.url;
    }
  });
});

describe('sign-up: first authenticated request creates exactly one database user (attachUser)', () => {
  beforeEach(resetData);
  afterEach(() => { dbFault.on = false; clerkBehaviour.fail = false; });

  it('a brand-new Clerk user gets a database row on first request (plan free, email from Clerk)', async () => {
    const clerkId = 'user_signup_1';
    clerkDirectory[clerkId] = 'newuser@quiz-test.example';
    const r = await (await api()).get('/api/user/plan').set('Authorization', `Bearer ${signToken(clerkId)}`);
    expect(r.status).toBe(200);
    const rows = await sql(`select clerk_user_id, email, plan from users where clerk_user_id=$1`, [clerkId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'newuser@quiz-test.example', plan: 'free' });
  });

  it('the dashboard fires several calls at once on first login: all succeed and only one user row is created', async () => {
    const clerkId = 'user_signup_race';
    clerkDirectory[clerkId] = 'race@quiz-test.example';
    const h = { Authorization: `Bearer ${signToken(clerkId)}` };
    const app = await api();
    const results = await Promise.all([
      app.get('/api/user/plan').set(h), app.get('/api/quizzes').set(h), app.get('/api/leads').set(h),
      app.get('/api/user/brand-kit').set(h), app.get('/api/dashboard/activity').set(h),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    const rows = await sql(`select id from users where clerk_user_id=$1`, [clerkId]);
    expect(rows).toHaveLength(1);
  });

  it('a database outage during sign-in returns 503 db_unavailable instead of silently continuing without a user (fail-open)', async () => {
    const clerkId = 'user_outage_db';
    clerkDirectory[clerkId] = 'outage@quiz-test.example';
    dbFault.on = true;
    const r = await (await api()).get('/api/user/plan').set('Authorization', `Bearer ${signToken(clerkId)}`);
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('db_unavailable');
  });

  it('Clerk Backend API being down does not block sign-in (email is filled in later); user row is still created', async () => {
    const clerkId = 'user_clerk_down';
    clerkBehaviour.fail = true;
    const r = await (await api()).get('/api/user/plan').set('Authorization', `Bearer ${signToken(clerkId)}`);
    expect(r.status).toBe(200);
    expect(await sql(`select 1 from users where clerk_user_id=$1`, [clerkId])).toHaveLength(1);
  });
});

describe('Clerk webhook (svix signature) - user.created', () => {
  beforeEach(resetData);
  async function signed(body: any, secret = process.env.CLERK_WEBHOOK_SECRET!) {
    const { Webhook } = await import('svix');
    const payload = JSON.stringify(body);
    const id = 'msg_' + Math.random().toString(36).slice(2);
    const ts = new Date();
    const sig = new Webhook(secret).sign(id, ts, payload);
    return { payload, headers: { 'svix-id': id, 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': sig, 'content-type': 'application/json' } };
  }
  it('valid signature creates the user once; replaying the same event is idempotent', async () => {
    const evt = { type: 'user.created', data: { id: 'user_wh_1', email_addresses: [{ email_address: 'wh1@quiz-test.example' }], first_name: 'Wh' } };
    const s = await signed(evt);
    const a = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    const b = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect(await sql(`select 1 from users where clerk_user_id='user_wh_1'`)).toHaveLength(1);
  });
  it('bad signature -> 400 and no user is created', async () => {
    const evt = { type: 'user.created', data: { id: 'user_wh_bad', email_addresses: [{ email_address: 'x@quiz-test.example' }] } };
    const s = await signed(evt, 'whsec_' + Buffer.from('some-other-secret-value-1234').toString('base64'));
    const r = await (await api()).post('/api/clerk/webhook').set(s.headers).send(s.payload);
    expect(r.status).toBe(400);
    expect(await sql(`select 1 from users where clerk_user_id='user_wh_bad'`)).toHaveLength(0);
  });
  it('missing svix headers -> 400', async () => {
    const r = await (await api()).post('/api/clerk/webhook').set('content-type', 'application/json').send('{"type":"user.created"}');
    expect(r.status).toBe(400);
  });
});
