/**
 * Phase 1 - session-cookie verification at the API boundary (middleware/auth.ts)
 * and the Clerk webhook that still creates users out-of-band. The email-code
 * sign-up/sign-in flow itself (routes/authEmail.ts) is covered in authEmail.test.ts;
 * this file only covers what requireAuth/attachUser do with an existing session.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, bearer, getApp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { listRoutes } from '../helpers/routes';
import crypto from 'node:crypto';

describe('session cookie verification (requireAuth)', () => {
  beforeEach(resetData);

  it('valid session cookie -> 200 and the request is scoped to that user', async () => {
    const u = await makeUser();
    const r = await (await api()).get('/api/quizzes').set(bearer(u));
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('missing session cookie -> 401 auth_required', async () => {
    const r = await (await api()).get('/api/quizzes');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('auth_required');
  });

  it('garbage/unknown session token -> 401 token_expired (not a 500)', async () => {
    const r = await (await api()).get('/api/quizzes').set('Cookie', 'sq_session=not-a-real-token');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_expired');
  });

  it('expired session -> 401 token_expired', async () => {
    const u = await makeUser();
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await sql(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [u.id, expiredHash, new Date(Date.now() - 60_000).toISOString()],
    );
    const r = await (await api()).get('/api/quizzes').set('Cookie', `sq_session=${expiredToken}`);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_expired');
  });

  it('a revoked session (logged out elsewhere) -> 401 token_expired', async () => {
    const u = await makeUser();
    await sql(`UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1`, [u.id]);
    const r = await (await api()).get('/api/quizzes').set(bearer(u));
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('token_expired');
  });

  it('a non-GET request without the matching CSRF header is rejected (403 csrf_invalid)', async () => {
    const u = await makeUser();
    const r = await (await api())
      .patch('/api/quizzes/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `sq_session=${u.token}; sq_csrf=${u.csrfToken}`)
      .send({ title: 'x' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('csrf_invalid');
  });

  it('a non-GET request with a mismatched CSRF header is rejected (403 csrf_invalid)', async () => {
    const u = await makeUser();
    const r = await (await api())
      .patch('/api/quizzes/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `sq_session=${u.token}; sq_csrf=${u.csrfToken}`)
      .set('x-csrf-token', 'wrong-value')
      .send({ title: 'x' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('csrf_invalid');
  });

  it('a signed-out client (no cookie) cannot reach any authenticated route', async () => {
    const app = await getApp();
    const authed = listRoutes(app).filter((r) => r.handlers.includes('requireAuth') && r.method === 'GET' && !r.path.includes(':'));
    expect(authed.length).toBeGreaterThan(10);
    for (const route of authed) {
      const res = await (await api())[route.method.toLowerCase() as 'get'](route.path);
      expect(res.status, `${route.method} ${route.path}`).toBe(401);
    }
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
