/**
 * Free-trial abuse protection (migration 037, services/trialGuard.ts): one free trial per website, one account per
 * mailbox, no throwaway inboxes, and possible-duplicate hints for the owner. Real routes, PGlite, local fakes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, bearer, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { resetStripe } from '../helpers/stripeFake';
import { resetOutbox } from '../helpers/mailFake';
import { canonicalEmail, siteHostname, duplicateHints, signalHash } from '../../services/trialGuard';

const PASSWORD = 'correct horse battery';
const CRON = () => ({ 'x-cron-secret': process.env.CRON_SECRET! });
const DAY = 86400000;
const lead = (over: Record<string, any> = {}) => ({ name: 'Ada Lovelace', email: 'ada@customer.example', answers: { 0: 2, 1: 2 }, ...over });
const submit = async (slug: string, body: any) => (await api()).post(`/api/quiz/${slug}/lead`).set('X-Forwarded-For', nextIp()).send(body);

async function signup(email: string, opts: { ip?: string; cookie?: string } = {}) {
  const req = (await api()).post('/api/auth/signup').set('x-forwarded-for', opts.ip ?? nextIp());
  if (opts.cookie) req.set('Cookie', opts.cookie);
  return req.send({ email, password: PASSWORD, firstName: 'Ada' });
}
function deviceCookie(res: any): string {
  const all: string[] = [].concat(res.headers['set-cookie'] || []);
  const c = all.find((x) => x.startsWith('sq_device='));
  return c ? c.split(';')[0] : '';
}
async function admin() {
  const u = await makeUser({ email: 'admin@example.test', plan: 'free', createdDaysAgo: 100 });
  await sql('update users set email_verified_at = now() where id = $1', [u.id]);
  return u;
}

beforeEach(async () => { await resetData(); resetStripe(); resetOutbox(); });

describe('rules', () => {
  it('canonicalEmail: Gmail dots, googlemail.com and +tags are one mailbox; the database function agrees', async () => {
    const cases: [string, string][] = [
      ['John.Doe+promo@GoogleMail.com', 'johndoe@gmail.com'],
      [' j.o.h.n.doe@gmail.com ', 'johndoe@gmail.com'],
      ['ada+trial2@outlook.com', 'ada@outlook.com'],
      ['a.b@studio.example', 'a.b@studio.example'],
      ['+only@studio.example', '+only@studio.example'],
      ['not-an-email', 'not-an-email'],
    ];
    for (const [input, expected] of cases) {
      expect(canonicalEmail(input)).toBe(expected);
      const row = await sql<{ c: string }>('select public.canonical_email($1) as c', [input]);
      expect(row[0].c).toBe(expected);
    }
  });

  it('siteHostname: the customer website only, never our own hosts, local or IP addresses', () => {
    expect(siteHostname('https://www.Example.com/')).toBe('example.com');
    expect(siteHostname('http://shop.example.co.uk:8080/page?x=1')).toBe('shop.example.co.uk');
    expect(siteHostname('bobcat-ruby-kjys.squarespace.com')).toBe('bobcat-ruby-kjys.squarespace.com');
    for (const bad of ['https://app.squarespellquiz.com', 'https://squarespellquiz.com', 'http://localhost:3000', 'https://192.168.0.1', 'https://[::1]/', 'javascript:alert(1)', 'mailto:a@b.example', '', 'nodot', 42]) {
      expect(siteHostname(bad as any)).toBeNull();
    }
  });

  it('duplicateHints: same browser always, same network only within 30 days', () => {
    const now = Date.now();
    const users = [
      { id: 'a', email: 'a@x.example', created_at: new Date(now).toISOString(), signup_ip_hash: 'net1' },
      { id: 'b', email: 'b@x.example', created_at: new Date(now - 5 * DAY).toISOString(), signup_ip_hash: 'net1' },
      { id: 'c', email: 'c@x.example', created_at: new Date(now - 60 * DAY).toISOString(), signup_ip_hash: 'net1' },
      { id: 'd', email: 'd@x.example', created_at: new Date(now - 60 * DAY).toISOString(), signup_ip_hash: null },
    ];
    const hints = duplicateHints(users, [{ user_id: 'c', device_hash: 'dev1' }, { user_id: 'd', device_hash: 'dev1' }]);
    expect(hints.get('a')).toEqual([{ user_id: 'b', email: 'b@x.example', reason: 'same network' }]);
    expect(hints.get('c')).toEqual([{ user_id: 'd', email: 'd@x.example', reason: 'same browser' }]);
    expect(hints.get('d')).toEqual([{ user_id: 'c', email: 'c@x.example', reason: 'same browser' }]);
  });
});

describe('one free trial per website', () => {
  const SITE = 'https://www.studio.example';

  it('a new account on a website whose trial another account used up gets its leads held; other websites are unaffected', async () => {
    const first = await makeUser({ plan: 'free', createdDaysAgo: 20 });
    const firstQuiz = await makeQuiz(first);
    expect((await submit(firstQuiz.slug, lead({ site: SITE + '/contact' }))).body).toMatchObject({ held: true });
    const recorded = await sql<any>('select hostname, user_id, trial_ends_at from site_trials');
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ hostname: 'studio.example', user_id: first.id });
    expect(new Date(recorded[0].trial_ends_at).getTime()).toBeLessThan(Date.now());

    const second = await makeUser({ plan: 'free', createdDaysAgo: 1 });
    const quiz = await makeQuiz(second);
    const r = await submit(quiz.slug, lead({ site: 'https://studio.example/quiz' }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ success: true, held: true });
    const held = await sql<any>('select metadata from held_leads where user_id = $1', [second.id]);
    expect(held).toHaveLength(1);
    expect(held[0].metadata).toMatchObject({ held_reason: 'site_trial_used', site: 'studio.example' });
    expect(await sql('select id from leads where user_id = $1', [second.id])).toHaveLength(0);

    // A different website, or a quiz link opened directly, still collects leads during this account's own trial.
    const other = await submit(quiz.slug, lead({ email: 'bo@customer.example', site: 'https://new-site.example' }));
    expect(other.body.held).toBeFalsy();
    const direct = await submit(quiz.slug, lead({ email: 'cy@customer.example' }));
    expect(direct.body.held).toBeFalsy();
    const delivered = await sql<any>('select email, metadata from leads where user_id = $1 order by email', [second.id]);
    expect(delivered.map((l) => l.email)).toEqual(['bo@customer.example', 'cy@customer.example']);
    expect(delivered[0].metadata.site).toBe('new-site.example');

    // The dashboard is told which website, so it can explain why leads are waiting.
    const plan = await (await api()).get('/api/user/plan').set(bearer(second));
    expect(plan.body.site_trial_used).toEqual(['studio.example']);
    expect(plan.body.held_leads.count).toBe(1);

    // Closing the first account does not give the website a new trial.
    await sql('delete from users where id = $1', [first.id]);
    const again = await submit(quiz.slug, lead({ email: 'di@customer.example', site: SITE }));
    expect(again.body.held).toBe(true);
  });

  it('while the website’s first trial is still running, another account on it is not held', async () => {
    const first = await makeUser({ plan: 'free', createdDaysAgo: 2 });
    await submit((await makeQuiz(first)).slug, lead({ site: SITE }));
    const second = await makeUser({ plan: 'free', createdDaysAgo: 1 });
    const r = await submit((await makeQuiz(second)).slug, lead({ site: SITE }));
    expect(r.status).toBe(201);
    expect(r.body.held).toBeFalsy();
  });

  it('a paying account is never held, and its website still counts as having had its trial', async () => {
    const paying = await makeUser({ plan: 'pro', createdDaysAgo: 60 });
    const p = await submit((await makeQuiz(paying)).slug, lead({ site: SITE }));
    expect(p.body.held).toBeFalsy();
    const newcomer = await makeUser({ plan: 'free', createdDaysAgo: 1 });
    const n = await submit((await makeQuiz(newcomer)).slug, lead({ site: SITE }));
    expect(n.body.held).toBe(true);
  });
});

describe('one account per mailbox', () => {
  it('Gmail dots, googlemail.com and +tags reach the existing account instead of opening a new one', async () => {
    expect((await signup('ada.lovelace@gmail.com')).status).toBe(201);
    const dup = await signup('AdaLovelace+trial2@googlemail.com');
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('account_exists');
    expect(await sql('select id from users')).toHaveLength(1);
    const login = await (await api()).post('/api/auth/login').set('x-forwarded-for', nextIp()).send({ email: 'adalovelace@gmail.com', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('ada.lovelace@gmail.com');
  });

  it('+tags on any provider are the same mailbox', async () => {
    expect((await signup('ada@studio.example')).status).toBe(201);
    expect((await signup('ada+second@studio.example')).status).toBe(409);
  });

  it('throwaway inboxes cannot sign up', async () => {
    for (const email of ['someone@mailinator.com', 'someone@inbox.mailinator.com', 'someone@yopmail.com']) {
      const r = await signup(email);
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('disposable_email');
    }
    expect(await sql('select id from users')).toHaveLength(0);
  });

  it('every account gets its canonical mailbox, whatever creates it, and it follows email changes', async () => {
    const u = await makeUser({ email: 'Bo.B+x@GMAIL.com' });
    expect((await sql<any>('select email_canonical from users where id = $1', [u.id]))[0].email_canonical).toBe('bob@gmail.com');
    await sql(`update users set email = 'new.name@studio.example' where id = $1`, [u.id]);
    expect((await sql<any>('select email_canonical from users where id = $1', [u.id]))[0].email_canonical).toBe('new.name@studio.example');
  });
});

describe('possible duplicates, shown to the owner only', () => {
  it('accounts from the same browser or the same network are flagged; only hashes are stored', async () => {
    const owner = await admin();
    const a = await signup('first@studio.example', { ip: '203.0.113.7' });
    const cookieA = deviceCookie(a);
    expect(cookieA).toMatch(/^sq_device=[A-Za-z0-9_-]{16,64}$/);
    const b = await signup('second@other.example', { ip: '198.51.100.9', cookie: cookieA });
    expect(deviceCookie(b)).toBe(''); // the browser already has one
    await signup('third@else.example', { ip: '203.0.113.7' });

    const devices = await sql<any>('select device_hash from account_devices');
    expect(devices.length).toBeGreaterThanOrEqual(3);
    expect(devices.every((d) => d.device_hash.length === 64 && !cookieA.includes(d.device_hash))).toBe(true);
    const ipRows = await sql<any>(`select signup_ip_hash from users where email = 'first@studio.example'`);
    expect(ipRows[0].signup_ip_hash).toBe(signalHash('ip', '203.0.113.7'));

    const r = await (await api()).get('/api/admin/customers').set(bearer(owner));
    expect(r.status).toBe(200);
    const by = (email: string) => r.body.customers.find((c: any) => c.email === email);
    expect(by('first@studio.example').possible_duplicates).toEqual(expect.arrayContaining([
      { email: 'second@other.example', reason: 'same browser' },
      { email: 'third@else.example', reason: 'same network' },
    ]));
    expect(by('second@other.example').possible_duplicates).toEqual([{ email: 'first@studio.example', reason: 'same browser' }]);
    expect(by('admin@example.test').possible_duplicates).toEqual([]);
    expect(JSON.stringify(r.body)).not.toContain(signalHash('ip', '203.0.113.7'));
  });

  it('the hourly job forgets old signals: network hash after 90 days, browser hash 12 months after last use', async () => {
    const old = await makeUser({ createdDaysAgo: 100 });
    const recent = await makeUser({ createdDaysAgo: 10 });
    await sql(`update users set signup_ip_hash = 'x' where id in ($1, $2)`, [old.id, recent.id]);
    await sql(`insert into account_devices (user_id, device_hash, last_seen_at) values ($1, repeat('a', 64), now() - interval '13 months'), ($2, repeat('b', 64), now())`, [old.id, recent.id]);
    const r = await (await api()).post('/api/cron/cleanup-preview-cache').set(CRON()).send({});
    expect(r.status).toBe(200);
    expect(r.body.signup_signals_purged).toBe(2);
    expect((await sql<any>('select id from users where signup_ip_hash is not null')).map((x) => x.id)).toEqual([recent.id]);
    expect((await sql<any>('select user_id from account_devices')).map((x) => x.user_id)).toEqual([recent.id]);
  });
});
