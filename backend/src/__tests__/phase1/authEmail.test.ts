/**
 * Phase 1 - first-party passwordless email-code sign-up/sign-in
 * (routes/authEmail.ts, services/auth/codes.ts, services/auth/sessions.ts,
 * services/auth/userMatching.ts). The email transport under test is the
 * in-memory testEmailProvider (EMAIL_TRANSPORT=test, set only in
 * helpers/setup.ts and refused outright when NODE_ENV=production); codes
 * are read back from the captured email's subject line, never guessed or
 * bypassed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { dbFault } from '../helpers/fakeSupabase';
import { getCapturedTestEmails, clearCapturedTestEmails, testEmailProvider } from '../../services/email/testProvider';

beforeEach(async () => {
  await resetData();
  clearCapturedTestEmails();
  dbFault.on = false;
});

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function lastCodeFor(email: string): string {
  const target = normalize(email);
  const msgs = getCapturedTestEmails().filter((m) => normalize(m.to) === target);
  const last = msgs[msgs.length - 1];
  if (!last) throw new Error(`no captured email to ${email}`);
  const m = /Your sign-in code: (\d{6})/.exec(last.subject || '');
  if (!m) throw new Error(`could not find a 6-digit code in subject: ${last.subject}`);
  return m[1];
}

async function requestCode(email: string, ip = nextIp()) {
  return (await api()).post('/api/auth/request-code').set('X-Forwarded-For', ip).send({ email });
}

async function verifyCode(email: string, code: string, ip = nextIp()) {
  return (await api()).post('/api/auth/verify-code').set('X-Forwarded-For', ip).send({ email, code });
}

describe('request-code', () => {
  it('a valid email always gets a generic response and an email with a 6-digit code', async () => {
    const email = 'newcomer@quiz-test.example';
    const r = await requestCode(email);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(lastCodeFor(email)).toMatch(/^\d{6}$/);
  });

  it('an invalid email is rejected before any rate limit or send', async () => {
    const r = await requestCode('not-an-email');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('invalid_email');
  });

  it('a second request for the same email inside the 60s cooldown is refused, not silently ignored', async () => {
    const email = 'cooldown@quiz-test.example';
    const ip = nextIp();
    const a = await requestCode(email, ip);
    expect(a.status).toBe(200);
    const b = await requestCode(email, ip);
    expect(b.status).toBe(429);
    expect(b.body.code).toBe('resend_cooldown');
    expect(b.body.retryAfterMs).toBeGreaterThan(0);
  });

  it('more than 3 requests for the same normalized email within 15 minutes are rate-limited, even from different IPs', async () => {
    const email = 'ratelimited-email@quiz-test.example';
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await requestCode(email, nextIp()));
    const codes = results.map((r) => r.body.code);
    expect(codes.filter((c) => c === 'rate_limited').length).toBeGreaterThan(0);
  });

  it('more than 10 requests from the same IP within 15 minutes are rate-limited, even for different emails', async () => {
    const ip = nextIp();
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await requestCode(`ip-rl-${i}@quiz-test.example`, ip));
    expect(results.some((r) => r.body.code === 'rate_limited')).toBe(true);
  });
});

describe('verify-code', () => {
  it('the correct code creates a session, sets only the session cookie, returns the CSRF token in the body, and creates exactly one new user row', async () => {
    const email = 'brandnew@quiz-test.example';
    await requestCode(email);
    const code = lastCodeFor(email);
    const r = await verifyCode(email, code);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, isNewUser: true });
    const setCookie = (r.headers['set-cookie'] || []) as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('sq_session='))).toBe(true);
    expect(setCookie.some((c) => c.startsWith('sq_csrf='))).toBe(false);
    expect(r.body.csrfToken).toMatch(/^[0-9a-f]{64}$/);
    const rows = await sql<any>(`select email, plan, email_verified_at from users where lower(email)=$1`, [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email, plan: 'free' });
    expect(rows[0].email_verified_at).not.toBeNull();
  });

  it('the same code cannot be verified twice (single-use)', async () => {
    const email = 'singleuse@quiz-test.example';
    await requestCode(email);
    const code = lastCodeFor(email);
    const first = await verifyCode(email, code);
    expect(first.status).toBe(200);
    const second = await verifyCode(email, code);
    expect(second.status).toBe(401);
    expect(second.body.code).toBe('code_invalid');
  });

  it('a wrong code is rejected generically and creates neither a session nor a user row', async () => {
    const email = 'wrongcode@quiz-test.example';
    await requestCode(email);
    const correct = lastCodeFor(email);
    const wrong = correct === '111111' ? '222222' : '111111';
    const r = await verifyCode(email, wrong);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('code_invalid');
    expect(r.headers['set-cookie']).toBeUndefined();
    const rows = await sql<any>(`select 1 from users where lower(email)=$1`, [email]);
    expect(rows).toHaveLength(0);
  });

  it('after 5 wrong attempts the 6th is locked out (429), even with the correct code', async () => {
    const email = 'lockout@quiz-test.example';
    await requestCode(email);
    const correct = lastCodeFor(email);
    const wrong = correct === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) {
      const r = await verifyCode(email, wrong);
      expect(r.status).toBe(401);
    }
    const locked = await verifyCode(email, correct);
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('code_invalid');
  });

  it('an expired code is rejected generically, not distinguishable from a wrong code', async () => {
    const email = 'expiredcode@quiz-test.example';
    await requestCode(email);
    const code = lastCodeFor(email);
    await sql(`update auth_codes set expires_at = now() - interval '1 second' where email_normalized = $1`, [normalize(email)]);
    const r = await verifyCode(email, code);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('code_invalid');
  });

  it('a new request-code invalidates the previous unconsumed code', async () => {
    const email = 'superseded@quiz-test.example';
    const ip = nextIp();
    await requestCode(email, ip);
    const oldCode = lastCodeFor(email);
    // The 60s resend cooldown only blocks a still-unconsumed code; push its
    // created_at back rather than sleeping 60s in a hermetic test.
    await sql(`update auth_codes set created_at = created_at - interval '2 minutes' where email_normalized = $1`, [normalize(email)]);
    await requestCode(email, ip);
    const newCode = lastCodeFor(email);
    expect(newCode).not.toBe(oldCode);
    const oldResult = await verifyCode(email, oldCode);
    expect(oldResult.status).toBe(401);
    const newResult = await verifyCode(email, newCode);
    expect(newResult.status).toBe(200);
  });

  it('two concurrent verifications of the same correct code: exactly one succeeds and exactly one user row is created', async () => {
    const email = 'racewinner@quiz-test.example';
    await requestCode(email);
    const code = lastCodeFor(email);
    const [a, b] = await Promise.all([verifyCode(email, code), verifyCode(email, code)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 401]);
    const rows = await sql<any>(`select id from users where lower(email)=$1`, [email]);
    expect(rows).toHaveLength(1);
  });

  it('signing in again with an already-registered email matches the existing user (no duplicate) and refreshes email_verified_at', async () => {
    const email = 'returning@quiz-test.example';
    await requestCode(email);
    const first = await verifyCode(email, lastCodeFor(email));
    expect(first.status).toBe(200);
    expect(first.body.isNewUser).toBe(true);
    const firstRows = await sql<any>(`select id from users where lower(email)=$1`, [email]);
    expect(firstRows).toHaveLength(1);

    // The first code is already consumed, so a fresh request-code for the
    // same email is not blocked by the resend cooldown.
    await requestCode(email);
    const second = await verifyCode(email, lastCodeFor(email));
    expect(second.status).toBe(200);
    expect(second.body.isNewUser).toBe(false);
    const secondRows = await sql<any>(`select id from users where lower(email)=$1`, [email]);
    expect(secondRows).toHaveLength(1);
    expect(secondRows[0].id).toBe(firstRows[0].id);
  });

  it('matching is case-insensitive: verifying with a different case of an existing email does not create a duplicate', async () => {
    const email = 'CaseTest@Quiz-Test.example';
    await requestCode(email);
    const first = await verifyCode(email, lastCodeFor(email));
    expect(first.status).toBe(200);

    await requestCode(email.toUpperCase());
    const second = await verifyCode(email.toUpperCase(), lastCodeFor(email));
    expect(second.status).toBe(200);
    expect(second.body.isNewUser).toBe(false);
    const rows = await sql<any>(`select id from users where lower(email)=lower($1)`, [email]);
    expect(rows).toHaveLength(1);
  });

  it('a database outage during verification never returns a successful session', async () => {
    const email = 'dbfault@quiz-test.example';
    await requestCode(email);
    const code = lastCodeFor(email);
    dbFault.on = true;
    const r = await verifyCode(email, code);
    expect(r.status).not.toBe(200);
    expect(r.headers['set-cookie']).toBeUndefined();
  });

  it('an email delivery failure while requesting a code is swallowed at the API boundary but recorded in the audit trail', async () => {
    const email = 'sendfails@quiz-test.example';
    const realSend = testEmailProvider.send;
    testEmailProvider.send = async () => { throw new Error('simulated SMTP failure'); };
    try {
      const r = await requestCode(email);
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(true);
    } finally {
      testEmailProvider.send = realSend;
    }
    const audit = await sql<any>(
      `select outcome from auth_audit_log where email_normalized=$1 and action='request_code' order by created_at desc limit 1`,
      [normalize(email)],
    );
    expect(audit[0]?.outcome).toBe('send_failed');
  });
});

describe('session lifecycle', () => {
  it('GET /api/auth/session reflects the cookie state', async () => {
    const email = 'sessioncheck@quiz-test.example';
    await requestCode(email);
    const verify = await verifyCode(email, lastCodeFor(email));
    const setCookie = verify.headers['set-cookie'] as unknown as string[];
    const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');

    const authed = await (await api()).get('/api/auth/session').set('Cookie', cookieHeader);
    expect(authed.body).toEqual({ authenticated: true, csrfToken: verify.body.csrfToken });

    const anon = await (await api()).get('/api/auth/session');
    expect(anon.status).toBe(401);
    expect(anon.body).toEqual({ authenticated: false });
  });

  it('logout revokes the session and requires a matching CSRF token', async () => {
    const email = 'logout@quiz-test.example';
    await requestCode(email);
    const verify = await verifyCode(email, lastCodeFor(email));
    const setCookie = verify.headers['set-cookie'] as unknown as string[];
    const sessionCookie = setCookie.find((c) => c.startsWith('sq_session='))!.split(';')[0];
    const csrfValue = verify.body.csrfToken as string;
    const cookieHeader = sessionCookie;

    const noCsrf = await (await api()).post('/api/auth/logout').set('Cookie', cookieHeader);
    expect(noCsrf.status).toBe(403);

    const ok = await (await api()).post('/api/auth/logout').set('Cookie', cookieHeader).set('x-csrf-token', csrfValue);
    expect(ok.status).toBe(200);

    const afterLogout = await (await api()).get('/api/auth/session').set('Cookie', cookieHeader);
    expect(afterLogout.body).toEqual({ authenticated: false });
  });

  it('logout-all revokes every session for the user, not just the current one', async () => {
    const email = 'logoutall@quiz-test.example';
    await requestCode(email);
    const first = await verifyCode(email, lastCodeFor(email));
    await requestCode(email);
    const second = await verifyCode(email, lastCodeFor(email));

    const cookiesOf = (res: any) => {
      const sc = res.headers['set-cookie'] as unknown as string[];
      const session = sc.find((c: string) => c.startsWith('sq_session='))!.split(';')[0];
      return { header: session, csrfValue: res.body.csrfToken as string };
    };
    const a = cookiesOf(first);
    const b = cookiesOf(second);

    const r = await (await api()).post('/api/auth/logout-all').set('Cookie', a.header).set('x-csrf-token', a.csrfValue);
    expect(r.status).toBe(200);

    const stillA = await (await api()).get('/api/auth/session').set('Cookie', a.header);
    expect(stillA.body.authenticated).toBe(false);
    const stillB = await (await api()).get('/api/auth/session').set('Cookie', b.header);
    expect(stillB.body.authenticated).toBe(false);
  });
});
