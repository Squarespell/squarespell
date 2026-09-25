/**
 * Phase 1 - CSRF + logout for the host-only session cookie design.
 *
 * The session cookie is HttpOnly/Secure/SameSite=Lax and host-only (no Domain), so the
 * page on the staging frontend origin can never read it. The CSRF token is derived from the
 * session token, returned in the verify-code and GET /api/auth/session bodies, held in
 * frontend memory, and sent as x-csrf-token on every mutating request.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { api, getApp, makeUser, bearer, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { listRoutes } from '../helpers/routes';
import { clearCapturedTestEmails, getCapturedTestEmails } from '../../services/email/testProvider';
import { csrfTokenFor } from '../../services/auth/sessions';

const STAGING_ORIGIN = 'https://staging.example.test';

// app.ts reads these once, when getApp() first imports it (after this line runs).
process.env.CORS_STRICT_ORIGINS = 'true';
process.env.CORS_ORIGINS = STAGING_ORIGIN;

// Read lazily by services/auth/sessions.ts, so setting it here is enough (staging/production run NODE_ENV=production).
beforeAll(() => { process.env.COOKIE_SECURE = 'true'; });
afterAll(() => { delete process.env.COOKIE_SECURE; });

beforeEach(async () => {
  await resetData();
  clearCapturedTestEmails();
});

async function signIn(email: string) {
  const ip = nextIp();
  await (await api()).post('/api/auth/request-code').set('X-Forwarded-For', ip).send({ email });
  const msgs = getCapturedTestEmails().filter((m) => m.to.toLowerCase() === email.toLowerCase());
  const code = /Your sign-in code: (\d{6})/.exec(msgs[msgs.length - 1].subject || '')![1];
  const res = await (await api()).post('/api/auth/verify-code').set('X-Forwarded-For', ip).send({ email, code });
  expect(res.status).toBe(200);
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  const sessionSetCookie = setCookie.find((c) => c.startsWith('sq_session='))!;
  return { res, setCookie, sessionSetCookie, cookie: sessionSetCookie.split(';')[0], csrf: res.body.csrfToken as string };
}

describe('session cookie attributes and isolation', () => {
  it('is HttpOnly, Secure, SameSite=Lax, path=/ and host-only (no Domain), and there is no readable CSRF cookie', async () => {
    const s = await signIn('cookieattrs@quiz-test.example');
    const attrs = s.sessionSetCookie.toLowerCase();
    expect(attrs).toContain('httponly');
    expect(attrs).toContain('secure');
    expect(attrs).toContain('samesite=lax');
    expect(attrs).toContain('path=/');
    expect(attrs).not.toContain('domain=');
    expect(s.setCookie.some((c) => c.startsWith('sq_csrf='))).toBe(false);
    expect(s.res.headers['cache-control']).toContain('no-store');
  });

  it('the CSRF token from one session is useless on another session (staging tokens cannot be replayed across sessions or environments)', async () => {
    const a = await signIn('iso-a@quiz-test.example');
    const b = await signIn('iso-b@quiz-test.example');
    expect(a.csrf).not.toBe(b.csrf);
    const r = await (await api()).post('/api/auth/logout').set('Cookie', a.cookie).set('x-csrf-token', b.csrf);
    expect(r.status).toBe(403);
    expect(a.csrf).toBe(csrfTokenFor(a.cookie.split('=')[1]));
  });

  it('credentialed CORS is restricted to the exact configured frontend origin and never to the production origins', async () => {
    const app = await getApp();
    expect(app).toBeTruthy();
    const call = async (origin: string) => (await api()).get('/api/auth/session').set('Origin', origin);
    const allowed = await call(STAGING_ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).toBe(STAGING_ORIGIN);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    for (const origin of ['https://app.squarespell.com', 'https://squarespell.com', 'https://evil.example']) {
      const denied = await call(origin);
      expect(denied.headers['access-control-allow-origin'], origin).toBeUndefined();
    }
  });
});

describe('logout', () => {
  it('a valid CSRF token logs out, clears the cookie with the same attributes it was set with, and invalidates the session', async () => {
    const s = await signIn('logout-ok@quiz-test.example');
    const r = await (await api()).post('/api/auth/logout').set('Cookie', s.cookie).set('x-csrf-token', s.csrf);
    expect(r.status).toBe(200);
    const cleared = (r.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('sq_session='))!.toLowerCase();
    expect(cleared).toMatch(/^sq_session=;/);
    expect(cleared).toContain('path=/');
    expect(cleared).toContain('httponly');
    expect(cleared).toContain('secure');
    expect(cleared).toContain('samesite=lax');
    expect(cleared).not.toContain('domain=');
    expect(cleared).toMatch(/expires=thu, 01 jan 1970/);

    const after = await (await api()).get('/api/auth/session').set('Cookie', s.cookie);
    expect(after.status).toBe(401);
    expect(after.body).toEqual({ authenticated: false });
    const protectedCall = await (await api()).get('/api/quizzes').set('Cookie', s.cookie);
    expect(protectedCall.status).toBe(401);
    const replay = await (await api()).post('/api/auth/logout-all').set('Cookie', s.cookie).set('x-csrf-token', s.csrf);
    expect(replay.status).toBe(401);
  });

  it('logout without a CSRF token returns 403 and leaves the session valid', async () => {
    const s = await signIn('logout-nocsrf@quiz-test.example');
    const r = await (await api()).post('/api/auth/logout').set('Cookie', s.cookie);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('csrf_invalid');
    const still = await (await api()).get('/api/auth/session').set('Cookie', s.cookie);
    expect(still.body.authenticated).toBe(true);
  });

  it('logout with an invalid CSRF token returns 403 and leaves the session valid', async () => {
    const s = await signIn('logout-badcsrf@quiz-test.example');
    for (const bad of ['0'.repeat(64), 'short', s.csrf.slice(0, -1) + (s.csrf.endsWith('0') ? '1' : '0')]) {
      const r = await (await api()).post('/api/auth/logout').set('Cookie', s.cookie).set('x-csrf-token', bad);
      expect(r.status, bad).toBe(403);
    }
    const still = await (await api()).get('/api/auth/session').set('Cookie', s.cookie);
    expect(still.body.authenticated).toBe(true);
  });

  it('logout-all: needs CSRF, then revokes every session of the user', async () => {
    const first = await signIn('logoutall2@quiz-test.example');
    const second = await signIn('logoutall2@quiz-test.example');
    const noCsrf = await (await api()).post('/api/auth/logout-all').set('Cookie', first.cookie);
    expect(noCsrf.status).toBe(403);
    const ok = await (await api()).post('/api/auth/logout-all').set('Cookie', first.cookie).set('x-csrf-token', first.csrf);
    expect(ok.status).toBe(200);
    for (const s of [first, second]) {
      const r = await (await api()).get('/api/auth/session').set('Cookie', s.cookie);
      expect(r.body.authenticated).toBe(false);
    }
  });
});

describe('session restoration after a page refresh', () => {
  it('GET /api/auth/session with only the cookie returns the same CSRF token, which then authorises a mutation', async () => {
    const s = await signIn('restore@quiz-test.example');
    const restored = await (await api()).get('/api/auth/session').set('Cookie', s.cookie);
    expect(restored.status).toBe(200);
    expect(restored.body).toEqual({ authenticated: true, csrfToken: s.csrf });
    expect(restored.headers['cache-control']).toContain('no-store');
    const mutate = await (await api()).post('/api/quizzes').set('Cookie', s.cookie).set('x-csrf-token', restored.body.csrfToken).send({});
    expect(mutate.status).not.toBe(403);
    expect(mutate.status).not.toBe(401);
  });

  it('the session token and CSRF token are never written to the database in the clear', async () => {
    const s = await signIn('nostore@quiz-test.example');
    const rows = await sql<any>('select * from auth_sessions');
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain(s.cookie.split('=')[1]);
    expect(dump).not.toContain(s.csrf);
  });
});

describe('every authenticated mutating route enforces and accepts the CSRF token', () => {
  it('POST/PATCH/PUT/DELETE behind requireAuth: 403 without or with a wrong token, and never 403-csrf with the right one', async () => {
    const app = await getApp();
    const all = listRoutes(app);
    // Express runs the first matching handler, so an authed duplicate registered after a public
    // handler for the same method+path (e.g. POST /api/gdpr/delete-request) is unreachable; skip it.
    const shadowed = (r: (typeof all)[number], i: number) =>
      all.some((o, j) => j < i && o.method === r.method && o.path === r.path && !o.handlers.includes('requireAuth'));
    const routes = all.filter((r, i) => r.handlers.includes('requireAuth') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method) && !shadowed(r, i));
    expect(routes.length).toBeGreaterThan(20);
    const u = await makeUser();
    const good = bearer(u);
    const uuid = '00000000-0000-4000-8000-000000000000';
    for (const route of routes) {
      const method = route.method.toLowerCase() as 'post';
      const path = route.path.replace(/:[A-Za-z_]+\??/g, uuid);
      const label = route.method + ' ' + route.path;

      const none = await (await api())[method](path).set('Cookie', good.Cookie).send({});
      expect(none.status, label + ' without token').toBe(403);
      expect(none.body.code, label).toBe('csrf_invalid');

      const wrong = await (await api())[method](path).set('Cookie', good.Cookie).set('x-csrf-token', '0'.repeat(64)).send({});
      expect(wrong.status, label + ' wrong token').toBe(403);

      const right = await (await api())[method](path).set(good).send({});
      expect(right.body?.code, label + ' right token').not.toBe('csrf_invalid');
    }
  }, 120000);
});

describe('frontend fetch patch (lib/authFetch.ts + lib/authApi.ts)', () => {
  const API = 'https://api-staging.example.test';
  const calls: { url: string; init: any }[] = [];
  let sessionCalls = 0;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_API_URL = API;
    const native = vi.fn(async (input: any, init: any = {}) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push({ url, init });
      if (url === API + '/api/auth/session') {
        sessionCalls++;
        return new Response(JSON.stringify({ authenticated: true, csrfToken: 'restored-token' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });
    (globalThis as any).window = globalThis;
    (globalThis as any).fetch = native;
    await import('../../../../frontend/lib/authFetch');
  });

  beforeEach(() => { calls.length = 0; });

  it('restores the token from /api/auth/session once, then sends it on POST/PATCH/PUT/DELETE to the API only', async () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      await fetch(API + '/api/quizzes/abc', { method });
    }
    expect(sessionCalls).toBe(1);
    const mutations = calls.filter((c) => c.url !== API + '/api/auth/session');
    expect(mutations).toHaveLength(4);
    for (const c of mutations) {
      expect(new Headers(c.init.headers).get('x-csrf-token')).toBe('restored-token');
      expect(c.init.credentials).toBe('include');
    }
  });

  it('does not attach the token to GETs, non-API origins, or pre-session sign-in requests', async () => {
    await fetch(API + '/api/quizzes');
    await fetch('https://other.example.test/x', { method: 'POST' });
    await fetch(API + '/api/auth/request-code', { method: 'POST' });
    await fetch(API + '/api/auth/verify-code', { method: 'POST' });
    for (const c of calls) {
      expect(new Headers(c.init.headers).get('x-csrf-token'), c.url).toBeNull();
    }
  });
});
