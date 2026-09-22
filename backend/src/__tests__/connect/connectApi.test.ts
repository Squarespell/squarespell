/**
 * One-button connect API: tenant isolation, host binding, manifest privacy, the publish lifecycle, duplicate requests, rollback,
 * disconnect and rate limits. Runs against a real PostgreSQL engine (PGlite) with every repository migration applied.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, makeUser, makeQuiz, bearer, nextIp, TestUser } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { resetMemoryLimiters } from '../../services/rateLimiter';

const TABLES = ['connected_sites', 'quiz_installations', 'manifest_versions', 'installation_events', 'verification_checks', 'site_authorizations'];
const originalFlag = process.env.CONNECT_ENABLED;
const originalFaults = process.env.CONNECT_TEST_FAULTS;
let A: TestUser, B: TestUser;

beforeEach(async () => {
  process.env.CONNECT_ENABLED = 'true';
  delete process.env.CONNECT_TEST_FAULTS;
  await resetData();
  resetMemoryLimiters();
  A = await makeUser({ plan: 'pro', email: 'owner-a@quiz-test.example' });
  B = await makeUser({ plan: 'pro', email: 'owner-b@quiz-test.example' });
});
afterAll(() => {
  if (originalFlag === undefined) delete process.env.CONNECT_ENABLED; else process.env.CONNECT_ENABLED = originalFlag;
  if (originalFaults === undefined) delete process.env.CONNECT_TEST_FAULTS; else process.env.CONNECT_TEST_FAULTS = originalFaults;
});

const H = (u: TestUser, extra: Record<string, string> = {}) => ({ ...bearer(u), 'X-Forwarded-For': nextIp(), ...extra });
async function createSite(u: TestUser, domain = 'customer.invalid', platform = 'squarespace') {
  return (await api()).post('/api/connect/sites').set(H(u)).send({ platform, domain });
}
async function heartbeat(key: string, origin: string | null, body: any = {}, ip = nextIp(), extra: Record<string, string> = {}) {
  const r = (await api()).post('/api/public/connect/heartbeat?site=' + key).set('X-Forwarded-For', ip).set('Content-Type', 'text/plain').set(extra);
  if (origin) r.set('Origin', origin);
  return r.send(JSON.stringify(body));
}
async function verifiedSite(u: TestUser, domain = 'customer.invalid', slots: string[] = []) {
  const res = await createSite(u, domain);
  expect(res.status).toBe(201);
  const hb = await heartbeat(res.body.site.site_key, 'https://' + domain, { version: '1', slots });
  expect(hb.status).toBe(200);
  return res.body.site as { id: string; site_key: string; hostname: string };
}
const manifest = async (key: string) => (await (await api()).get('/api/public/connect/manifest?site=' + key).set('X-Forwarded-For', nextIp()));
const publish = async (u: TestUser, siteId: string, body: any, extra: Record<string, string> = {}) => (await api()).post('/api/connect/sites/' + siteId + '/installations').set(H(u, extra)).send(body);
const dbSnapshot = async () => { const o: Record<string, string> = {}; for (const t of TABLES) o[t] = JSON.stringify(await sql('select * from ' + t + ' order by 1')); return o; };
const actions = async (siteId: string) => (await sql<{ action: string }>('select action from installation_events where site_id=$1 order by created_at, id', [siteId])).map((r) => r.action);

describe('feature flag and authentication', () => {
  it('everything except the config probe is a 404 while the flag is off, and the config says so', async () => {
    delete process.env.CONNECT_ENABLED;
    const app = await api();
    expect((await app.get('/api/connect/sites').set(H(A))).status).toBe(404);
    expect((await app.post('/api/connect/sites').set(H(A)).send({ platform: 'html', domain: 'customer.invalid' })).status).toBe(404);
    expect((await app.get('/api/public/connect/manifest?site=ssq_' + 'a'.repeat(32))).status).toBe(404);
    const cfg = await app.get('/api/connect/config').set(H(A));
    expect(cfg.status).toBe(200);
    expect(cfg.body.enabled).toBe(false);
    expect(await sql('select 1 from connected_sites')).toHaveLength(0);
  });
  it('flag "TRUE" or "1" does not enable it (exactly "true")', async () => {
    process.env.CONNECT_ENABLED = '1';
    expect((await (await api()).get('/api/connect/sites').set(H(A))).status).toBe(404);
    process.env.CONNECT_ENABLED = 'TRUE';
    expect((await (await api()).get('/api/connect/sites').set(H(A))).status).toBe(404);
  });
  it('requires sign-in', async () => {
    const app = await api();
    expect((await app.get('/api/connect/sites')).status).toBe(401);
    expect((await app.post('/api/connect/sites').send({ platform: 'html', domain: 'customer.invalid' })).status).toBe(401);
  });
  it('limits are unset by default and reported as null', async () => {
    const cfg = await (await api()).get('/api/connect/config').set(H(A));
    expect(cfg.body.limits).toEqual({ maxSites: null, maxInstallationsPerSite: null });
    expect(cfg.body.platforms.planned).toEqual(['wordpress', 'shopify']);
  });
});

describe('connecting a website', () => {
  it('creates a draft site with a high-entropy key bound to the normalised hostname, and shows no private ids', async () => {
    const res = await createSite(A, 'https://WWW.Customer.Invalid/about');
    expect(res.status).toBe(201);
    expect(res.body.site).toMatchObject({ hostname: 'customer.invalid', platform: 'squarespace', state: 'draft' });
    expect(res.body.site.site_key).toMatch(/^ssq_[A-Za-z0-9_-]{32}$/);
    expect(res.body.loaderUrl).toMatch(/\/connect\/loader\.js$/);
    expect(JSON.stringify(res.body)).not.toContain(A.id);
    expect(await actions(res.body.site.id)).toEqual(['site_created']);
  });
  it('rejects bad domains, unavailable platforms and duplicates; another account may connect the same domain', async () => {
    expect((await createSite(A, 'localhost')).body.code).toBe('invalid_domain');
    expect((await createSite(A, '10.0.0.1')).status).toBe(400);
    expect((await createSite(A, 'customer.invalid', 'wix')).body.code).toBe('platform_not_available');
    expect((await createSite(A, 'customer.invalid', 'wordpress')).status).toBe(400);
    expect((await createSite(A)).status).toBe(201);
    expect((await createSite(A, 'https://www.customer.invalid/')).body.code).toBe('site_exists');
    expect((await createSite(B)).status).toBe(201);
  });
  it('lists only the caller\'s sites', async () => {
    await createSite(A, 'a-site.invalid');
    await createSite(B, 'b-site.invalid');
    const list = await (await api()).get('/api/connect/sites').set(H(A));
    expect(list.body.sites.map((s: any) => s.hostname)).toEqual(['a-site.invalid']);
  });
  it('enforces configured limits only when they are set', async () => {
    process.env.CONNECT_MAX_SITES = '1';
    try {
      expect((await createSite(A, 'one.invalid')).status).toBe(201);
      expect((await createSite(A, 'two.invalid')).body.code).toBe('site_limit_reached');
    } finally { delete process.env.CONNECT_MAX_SITES; }
    expect((await createSite(A, 'two.invalid')).status).toBe(201);
  });
});

describe('tenant isolation', () => {
  it('another account cannot read, verify, publish to, change, pause or disconnect a site or installation, and nothing changes', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live', slug: 'a-quiz' });
    const inst = (await publish(A, site.id, { quizId: quiz.id, mode: 'popup' })).body.installation;
    const before = await dbSnapshot();
    const app = await api();
    const attempts = [
      app.get('/api/connect/sites/' + site.id).set(H(B)),
      app.get('/api/connect/sites/' + site.id + '/events').set(H(B)),
      app.post('/api/connect/sites/' + site.id + '/verify').set(H(B)),
      app.post('/api/connect/sites/' + site.id + '/attention').set(H(B)).send({ reason: 'plan_does_not_allow_custom_code' }),
      app.post('/api/connect/sites/' + site.id + '/pause').set(H(B)),
      app.post('/api/connect/sites/' + site.id + '/resume').set(H(B)),
      app.post('/api/connect/sites/' + site.id + '/disconnect').set(H(B)),
      app.post('/api/connect/sites/' + site.id + '/installations').set(H(B)).send({ quizId: quiz.id, mode: 'popup' }),
      app.patch('/api/connect/installations/' + inst.id).set(H(B)).send({ include: ['/x'] }),
      app.post('/api/connect/installations/' + inst.id + '/move').set(H(B)).send({ include: ['/x'] }),
      app.post('/api/connect/installations/' + inst.id + '/pause').set(H(B)),
      app.post('/api/connect/installations/' + inst.id + '/resume').set(H(B)),
      app.delete('/api/connect/installations/' + inst.id).set(H(B)),
    ];
    for (const r of await Promise.all(attempts)) { expect(r.status).toBe(404); expect(JSON.stringify(r.body)).not.toContain('a-quiz'); }
    expect(await dbSnapshot()).toEqual(before);
  });
  it('an account cannot publish another account\'s quiz to its own site, or a draft quiz', async () => {
    const siteB = await verifiedSite(B, 'b-site.invalid');
    const quizA = await makeQuiz(A, { status: 'live' });
    expect((await publish(B, siteB.id, { quizId: quizA.id, mode: 'popup' })).body.code).toBe('quiz_not_found');
    const draft = await makeQuiz(B, { status: 'draft' });
    expect((await publish(B, siteB.id, { quizId: draft.id, mode: 'popup' })).body.code).toBe('quiz_not_live');
    expect(await sql('select 1 from quiz_installations')).toHaveLength(0);
  });
  it('malformed ids are a 404, not an error', async () => {
    const app = await api();
    expect((await app.get('/api/connect/sites/not-a-uuid').set(H(A))).status).toBe(404);
    expect((await app.delete('/api/connect/installations/..%2F..').set(H(A))).status).toBe(404);
  });
  it('tables are closed to anon and authenticated database roles (RLS on, no policy, no privileges)', async () => {
    for (const t of TABLES) {
      const rls = await sql<{ relrowsecurity: boolean }>('select relrowsecurity from pg_class where oid = $1::regclass', ['public.' + t]);
      expect(rls[0].relrowsecurity).toBe(true);
      for (const role of ['anon', 'authenticated']) {
        const p = await sql<{ ok: boolean }>('select has_table_privilege($1, $2, $3) as ok', [role, 'public.' + t, 'SELECT']);
        expect(p[0].ok).toBe(false);
      }
    }
  });
});

describe('heartbeat: host binding and verification', () => {
  it('a heartbeat from the connected hostname (or its www twin) verifies the site and records the loader version and slots', async () => {
    const res = await createSite(A);
    const key = res.body.site.site_key;
    const hb = await heartbeat(key, 'https://www.customer.invalid', { version: '1.0.0', slots: ['hero-quiz', 'Bad Slot', 'x y'] });
    expect(hb.status).toBe(200);
    const detail = await (await api()).get('/api/connect/sites/' + res.body.site.id).set(H(A));
    expect(detail.body.site).toMatchObject({ state: 'verified', loader_version_seen: '1.0.0', slots_seen: ['hero-quiz'], health: 'healthy' });
    expect(detail.body.site.last_heartbeat_at).toBeTruthy();
    expect(await actions(res.body.site.id)).toEqual(['site_created', 'verify_ok']);
  });
  it('accepts the Referer when there is no Origin', async () => {
    const res = await createSite(A);
    const r = (await api()).post('/api/public/connect/heartbeat?site=' + res.body.site.site_key).set('X-Forwarded-For', nextIp()).set('Referer', 'https://customer.invalid/pricing').set('Content-Type', 'text/plain');
    expect((await r.send('{}')).status).toBe(200);
  });
  it('rejects a heartbeat from the wrong hostname, leaves the site unverified, and logs it once', async () => {
    const res = await createSite(A);
    const key = res.body.site.site_key;
    for (const origin of ['https://evil.invalid', 'https://customer.invalid.evil.invalid', 'https://notcustomer.invalid']) {
      const hb = await heartbeat(key, origin);
      expect(hb.status).toBe(403);
      expect(hb.body.code).toBe('wrong_domain');
    }
    const site = (await sql<any>('select state, last_heartbeat_at from connected_sites where id=$1', [res.body.site.id]))[0];
    expect(site.state).toBe('draft');
    expect(site.last_heartbeat_at).toBeNull();
    expect((await sql('select 1 from verification_checks where site_id=$1 and result=$2', [res.body.site.id, 'failed'])).length).toBe(1);
    expect((await actions(res.body.site.id)).filter((a) => a === 'heartbeat_rejected')).toHaveLength(1);
  });
  it('needs an Origin or Referer; unknown, malformed and disconnected keys are 404', async () => {
    const res = await createSite(A);
    expect((await heartbeat(res.body.site.site_key, null)).status).toBe(400);
    expect((await heartbeat('ssq_' + 'z'.repeat(32), 'https://customer.invalid')).status).toBe(404);
    expect((await heartbeat('nonsense', 'https://customer.invalid')).status).toBe(404);
    await (await api()).post('/api/connect/sites/' + res.body.site.id + '/disconnect').set(H(A));
    expect((await heartbeat(res.body.site.site_key, 'https://customer.invalid')).status).toBe(404);
  });
  it('is rate limited: the 31st heartbeat in a minute from one address for one site is refused', async () => {
    const res = await createSite(A);
    const ip = '203.0.113.50';
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await heartbeat(res.body.site.site_key, 'https://customer.invalid', {}, ip)).status;
    expect(last).toBe(429);
  });
  it('the manifest endpoint is rate limited too', async () => {
    const res = await createSite(A);
    let last = 0;
    for (let i = 0; i < 121; i++) last = (await (await api()).get('/api/public/connect/manifest?site=' + res.body.site.site_key).set('X-Forwarded-For', '203.0.113.51')).status;
    expect(last).toBe(429);
  });
  it('reporting a plan without custom code marks the site for attention; other reasons are refused', async () => {
    const res = await createSite(A);
    const app = await api();
    const ok = await app.post('/api/connect/sites/' + res.body.site.id + '/attention').set(H(A)).send({ reason: 'plan_does_not_allow_custom_code' });
    expect(ok.body.site).toMatchObject({ state: 'verifying', attention_reason: 'plan_does_not_allow_custom_code' });
    expect((await app.post('/api/connect/sites/' + res.body.site.id + '/attention').set(H(A)).send({ reason: 'token_revoked' })).status).toBe(400);
  });
  it('server-side verification of a site that cannot be reached reports why and does not verify it', async () => {
    const res = await createSite(A, 'no-such-host.invalid');
    const v = await (await api()).post('/api/connect/sites/' + res.body.site.id + '/verify').set(H(A));
    expect(v.status).toBe(200);
    expect(v.body.result).toMatchObject({ ok: false, reason: 'unreachable' });
    expect(v.body.site).toMatchObject({ state: 'verifying', attention_reason: 'unreachable' });
    expect((await sql('select 1 from verification_checks where site_id=$1 and method=$2 and result=$3', [res.body.site.id, 'page_fetch', 'failed'])).length).toBe(1);
  });
});

describe('the public manifest', () => {
  it('serves an empty, versioned manifest for a new site and never exposes private data', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live', slug: 'public-slug' });
    await publish(A, site.id, { quizId: quiz.id, mode: 'popup', options: { buttonText: 'Go', evil: 'x' } });
    const m = await manifest(site.site_key);
    expect(m.status).toBe(200);
    expect(m.headers['cache-control']).toContain('max-age=60');
    expect(m.headers['access-control-allow-origin']).toBe('*');
    const text = JSON.stringify(m.body);
    for (const secret of [A.id, A.email, A.clerkId, quiz.id, site.id, 'owner-a', 'token', 'user_id', 'evil']) expect(text).not.toContain(secret);
    expect(Object.keys(m.body).sort()).toEqual(['generatedAt', 'hostname', 'installations', 'paused', 'site', 'v', 'version']);
    expect(m.body.installations[0]).toMatchObject({ quiz: 'public-slug', mode: 'popup', slot: null, options: expect.not.objectContaining({ evil: expect.anything() }) });
  });
  it('a new site serves version 0 with no installations; unknown, malformed and disconnected keys are 404', async () => {
    const res = await createSite(A);
    const m = await manifest(res.body.site.site_key);
    expect(m.body).toMatchObject({ version: 0, installations: [], paused: false, hostname: 'customer.invalid' });
    expect((await manifest('ssq_' + 'q'.repeat(32))).status).toBe(404);
    expect((await manifest("x'; drop table users;--")).status).toBe(404);
    await (await api()).post('/api/connect/sites/' + res.body.site.id + '/disconnect').set(H(A));
    expect((await manifest(res.body.site.site_key)).status).toBe(404);
  });
  it('supports conditional requests', async () => {
    const site = await verifiedSite(A);
    const first = await manifest(site.site_key);
    const again = await (await api()).get('/api/public/connect/manifest?site=' + site.site_key).set('X-Forwarded-For', nextIp()).set('If-None-Match', first.headers.etag);
    expect(again.status).toBe(304);
  });
});

describe('publishing, updating, pausing, moving and removing', () => {
  it('needs a verified site', async () => {
    const res = await createSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    expect((await publish(A, res.body.site.id, { quizId: quiz.id, mode: 'popup' })).body.code).toBe('site_not_verified');
  });
  it('runs the full lifecycle and every step is one new manifest version and one audit event', async () => {
    const site = await verifiedSite(A);
    const q1 = await makeQuiz(A, { status: 'live', slug: 'quiz-one' });
    const q2 = await makeQuiz(A, { status: 'live', slug: 'quiz-two' });
    const app = await api();
    const p = await publish(A, site.id, { quizId: q1.id, mode: 'popup', include: ['/services/*'], exclude: ['/services/private'], options: { trigger: 'delay', delaySeconds: 5 } });
    expect(p.status).toBe(201);
    expect(p.body.installation).toMatchObject({ status: 'live', published_version: 1, mode: 'popup', path_include: ['/services/*'], path_exclude: ['/services/private'] });
    let m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(1);
    expect(m.installations).toEqual([{ id: p.body.installation.id, quiz: 'quiz-one', mode: 'popup', slot: null, include: ['/services/*'], exclude: ['/services/private'], options: { trigger: 'delay', delaySeconds: 5 } }]);

    const f = await publish(A, site.id, { quizId: q2.id, mode: 'floating_tab', options: { buttonText: 'Take the quiz', accentColor: '#0F7377' } });
    expect(f.status).toBe(201);
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(2);
    expect(m.installations.map((i: any) => i.quiz).sort()).toEqual(['quiz-one', 'quiz-two']);

    const upd = await app.patch('/api/connect/installations/' + f.body.installation.id).set(H(A)).send({ options: { buttonText: 'Find my fit' } });
    expect(upd.status).toBe(200);
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(3);
    expect(m.installations.find((i: any) => i.quiz === 'quiz-two').options).toEqual({ buttonText: 'Find my fit' });

    const pause = await app.post('/api/connect/installations/' + p.body.installation.id + '/pause').set(H(A));
    expect(pause.body.installation.status).toBe('paused');
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(4);
    expect(m.installations.map((i: any) => i.quiz)).toEqual(['quiz-two']);

    const resume = await app.post('/api/connect/installations/' + p.body.installation.id + '/resume').set(H(A));
    expect(resume.body.installation.status).toBe('live');
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(5);
    expect(m.installations).toHaveLength(2);

    const move = await app.post('/api/connect/installations/' + p.body.installation.id + '/move').set(H(A)).send({ include: ['/pricing'], exclude: [] });
    expect(move.body.installation).toMatchObject({ path_include: ['/pricing'], path_exclude: [], status: 'live' });
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(6);
    expect(m.installations.find((i: any) => i.quiz === 'quiz-one').include).toEqual(['/pricing']);

    const rm = await app.delete('/api/connect/installations/' + p.body.installation.id).set(H(A));
    expect(rm.body.installation.status).toBe('removed');
    m = (await manifest(site.site_key)).body;
    expect(m.version).toBe(7);
    expect(m.installations.map((i: any) => i.quiz)).toEqual(['quiz-two']);

    expect(await actions(site.id)).toEqual(['site_created', 'verify_ok', 'published', 'published', 'updated', 'paused', 'resumed', 'moved', 'removed']);
    // The same quiz can be published again after it was removed.
    expect((await publish(A, site.id, { quizId: q1.id, mode: 'popup' })).status).toBe(201);
  });
  it('a repeated publish of the same quiz, mode and slot is one installation and changes nothing', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    const body = { quizId: quiz.id, mode: 'popup', include: ['/a'] };
    const results = await Promise.all([publish(A, site.id, body), publish(A, site.id, body), publish(A, site.id, body)]);
    expect(results.filter((r) => r.status === 201).length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect([200, 201, 409]).toContain(r.status);
    const again = await publish(A, site.id, body);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ created: false, changed: false });
    expect(await sql('select 1 from quiz_installations where status <> $1', ['removed'])).toHaveLength(1);
    const versions = await sql<{ version: number }>('select version from manifest_versions where site_id=$1 order by version', [site.id]);
    expect(versions.length).toBeGreaterThanOrEqual(1);
    const before = versions.length;
    await publish(A, site.id, body);
    expect((await sql('select 1 from manifest_versions where site_id=$1', [site.id])).length).toBe(before);
  });
  it('rejects invalid modes, page rules and slots', async () => {
    const site = await verifiedSite(A, 'customer.invalid', ['hero']);
    const quiz = await makeQuiz(A, { status: 'live' });
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'banner' })).body.code).toBe('invalid_mode');
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'popup', include: ['pricing'] })).body.code).toBe('invalid_page_rules');
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'popup', exclude: ['/a*b'] })).body.code).toBe('invalid_page_rules');
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'inline', slot: 'Bad Slot' })).body.code).toBe('invalid_slot');
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'inline' })).body.code).toBe('invalid_slot');
    expect((await publish(A, site.id, { quizId: 'nope', mode: 'popup' })).body.code).toBe('quiz_not_found');
  });
  it('inline needs a named slot that has been detected on the page', async () => {
    const site = await verifiedSite(A, 'customer.invalid', ['hero-quiz']);
    const quiz = await makeQuiz(A, { status: 'live', slug: 'inline-quiz' });
    const missing = await publish(A, site.id, { quizId: quiz.id, mode: 'inline', slot: 'not-on-the-page' });
    expect(missing.status).toBe(409);
    expect(missing.body.code).toBe('slot_missing');
    expect(await sql('select 1 from quiz_installations')).toHaveLength(0);
    const ok = await publish(A, site.id, { quizId: quiz.id, mode: 'inline', slot: 'hero-quiz', options: { height: 640, buttonText: 'ignored' } });
    expect(ok.status).toBe(201);
    expect((await manifest(site.site_key)).body.installations[0]).toMatchObject({ mode: 'inline', slot: 'hero-quiz', quiz: 'inline-quiz', options: { height: 640 } });
    // Swapping a different quiz into the same slot is another installation on the same slot.
    const other = await makeQuiz(A, { status: 'live', slug: 'other-quiz' });
    expect((await publish(A, site.id, { quizId: other.id, mode: 'inline', slot: 'hero-quiz' })).status).toBe(201);
  });
  it('pausing a site empties its manifest, blocks publishing, and resuming restores it', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    await publish(A, site.id, { quizId: quiz.id, mode: 'popup' });
    const app = await api();
    expect((await app.post('/api/connect/sites/' + site.id + '/pause').set(H(A))).body.site.state).toBe('paused');
    expect((await manifest(site.site_key)).body).toMatchObject({ paused: true, installations: [] });
    expect((await publish(A, site.id, { quizId: quiz.id, mode: 'floating_tab' })).body.code).toBe('site_paused');
    expect((await app.post('/api/connect/sites/' + site.id + '/resume').set(H(A))).body.site.state).toBe('verified');
    expect((await manifest(site.site_key)).body.installations).toHaveLength(1);
  });
  it('a quiz that is later taken offline drops out of newly built manifests', async () => {
    const site = await verifiedSite(A);
    const q1 = await makeQuiz(A, { status: 'live', slug: 'stays' });
    const q2 = await makeQuiz(A, { status: 'live', slug: 'goes' });
    await publish(A, site.id, { quizId: q1.id, mode: 'popup' });
    await publish(A, site.id, { quizId: q2.id, mode: 'floating_tab' });
    await sql('update quizzes set status=$1 where id=$2', ['draft', q2.id]);
    const q3 = await makeQuiz(A, { status: 'live', slug: 'new-one' });
    await publish(A, site.id, { quizId: q3.id, mode: 'popup', include: ['/x'] });
    expect((await manifest(site.site_key)).body.installations.map((i: any) => i.quiz).sort()).toEqual(['new-one', 'stays']);
  });
});

describe('failed changes never alter what visitors see', () => {
  it('the fault header does nothing unless the server explicitly enables test faults', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    const r = await publish(A, site.id, { quizId: quiz.id, mode: 'popup' }, { 'x-connect-fault': 'after_manifest' });
    expect(r.status).toBe(201);
  });
  it('a failed first publish leaves an empty manifest and a failed installation, with rollback and failure events', async () => {
    process.env.CONNECT_TEST_FAULTS = 'true';
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    const r = await publish(A, site.id, { quizId: quiz.id, mode: 'popup' }, { 'x-connect-fault': 'after_manifest' });
    expect(r.status).toBe(502);
    expect(r.body.code).toBe('publish_failed');
    expect((await manifest(site.site_key)).body.installations).toEqual([]);
    const inst = await sql<any>('select status, failure_reason from quiz_installations');
    expect(inst).toEqual([{ status: 'failed', failure_reason: 'publish_failed' }]);
    const acts = await actions(site.id);
    expect(acts).toContain('rollback');
    expect(acts).toContain('published_failed');
    // The customer can simply try again.
    const retry = await publish(A, site.id, { quizId: quiz.id, mode: 'popup' });
    expect([200, 201, 409]).toContain(retry.status);
  });
  it('a failed update keeps the previous manifest and the previous settings live', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live', slug: 'steady' });
    const first = await publish(A, site.id, { quizId: quiz.id, mode: 'floating_tab', options: { buttonText: 'Before' } });
    const versionBefore = (await manifest(site.site_key)).body.version;
    process.env.CONNECT_TEST_FAULTS = 'true';
    const app = await api();
    const bad = await app.patch('/api/connect/installations/' + first.body.installation.id).set(H(A, { 'x-connect-fault': 'after_manifest' })).send({ options: { buttonText: 'After' } });
    expect(bad.status).toBe(502);
    const m = (await manifest(site.site_key)).body;
    expect(m.installations[0].options).toEqual({ buttonText: 'Before' });
    expect(m.version).toBe(versionBefore);
    const row = (await sql<any>('select status, options from quiz_installations where id=$1', [first.body.installation.id]))[0];
    expect(row).toMatchObject({ status: 'live', options: { buttonText: 'Before' } });
    for (const op of ['pause', 'resume']) {
      const r = await app.post('/api/connect/installations/' + first.body.installation.id + '/' + op).set(H(A, { 'x-connect-fault': 'after_manifest' }));
      expect([502, 409, 200]).toContain(r.status);
    }
    const m2 = (await manifest(site.site_key)).body;
    expect(m2.installations.map((i: any) => i.quiz)).toEqual(['steady']);
  });
  it('a failed removal keeps the quiz live', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live', slug: 'keeps-running' });
    const first = await publish(A, site.id, { quizId: quiz.id, mode: 'popup' });
    process.env.CONNECT_TEST_FAULTS = 'true';
    const bad = await (await api()).delete('/api/connect/installations/' + first.body.installation.id).set(H(A, { 'x-connect-fault': 'after_manifest' }));
    expect(bad.status).toBe(502);
    expect((await manifest(site.site_key)).body.installations.map((i: any) => i.quiz)).toEqual(['keeps-running']);
    expect((await sql<any>('select status from quiz_installations'))[0].status).toBe('live');
  });
});

describe('disconnecting', () => {
  it('empties the manifest first, removes installations, deletes stored credentials, closes the site and allows reconnecting', async () => {
    const site = await verifiedSite(A);
    const quiz = await makeQuiz(A, { status: 'live' });
    await publish(A, site.id, { quizId: quiz.id, mode: 'popup' });
    await sql('insert into site_authorizations (site_id, user_id, method, access_token_enc) values ($1,$2,$3,$4)', [site.id, A.id, 'oauth', 'v1:00:00:00']);
    const d = await (await api()).post('/api/connect/sites/' + site.id + '/disconnect').set(H(A));
    expect(d.status).toBe(200);
    expect(d.body.site.state).toBe('disconnected');
    expect(await sql('select 1 from site_authorizations')).toHaveLength(0);
    expect((await sql<any>('select status from quiz_installations'))[0].status).toBe('removed');
    const cur = await sql<any>('select body from manifest_versions where site_id=$1 and is_current', [site.id]);
    expect(cur[0].body.installations).toEqual([]);
    expect((await manifest(site.site_key)).status).toBe(404);
    expect((await actions(site.id)).slice(-1)).toEqual(['site_disconnected']);
    expect((await createSite(A)).status).toBe(201);
    const list = await (await api()).get('/api/connect/sites').set(H(A));
    expect(list.body.sites).toHaveLength(1);
  });
  it('keeps the site connected and says so when the manifest cannot be emptied', async () => {
    process.env.CONNECT_TEST_FAULTS = 'true';
    const site = await verifiedSite(A);
    // Break publishing: remove the function the backend calls, exactly as a database outage would.
    await sql('alter function public.connect_publish_manifest(uuid, uuid, jsonb, text) rename to connect_publish_manifest_off');
    try {
      const d = await (await api()).post('/api/connect/sites/' + site.id + '/disconnect').set(H(A));
      expect(d.status).toBe(502);
      expect((await sql<any>('select state from connected_sites where id=$1', [site.id]))[0].state).toBe('verified');
      expect(await actions(site.id)).toContain('disconnect_failed');
    } finally {
      await sql('alter function public.connect_publish_manifest_off(uuid, uuid, jsonb, text) rename to connect_publish_manifest');
    }
  });
});
