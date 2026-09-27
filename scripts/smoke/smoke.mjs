#!/usr/bin/env node
/**
 * Squarespell Quiz - end-to-end smoke test (API level). No dependencies; Node >= 18.
 *
 *   SMOKE_SESSION_TOKEN=<session token> SMOKE_CSRF_TOKEN=<matching csrf token> node scripts/smoke/smoke.mjs --base-url https://staging-api.example [--frontend-url https://staging-app.example] [--keep] [--allow-live]
 *
 * Flow: health -> readiness -> auth -> create -> save -> publish -> hosted link -> embed -> lead submit -> lead visible
 *       -> analytics -> cleanup (archive).
 *
 * Safety
 *  - Refuses any base URL whose host contains squarespell.com, squarespellquiz.com or onrender.com unless --allow-live is passed.
 *  - Everything it creates is tagged "P1-SMOKE" (quiz title and slug, lead email local part p1-smoke-<run>@example.com, event session ids)
 *    plus a run id. The lead NAME cannot carry the tag: the API's name validator rejects digits (that is why the name is "Smoke Tester").
 *  - The session token and its matching CSRF token are read from the SMOKE_SESSION_TOKEN / SMOKE_CSRF_TOKEN environment
 *    variables only, never from argv, and are never printed.
 *  - Cleanup ARCHIVES the quiz (soft delete). It never hard-deletes and never touches data it did not create.
 *  - A live lead submission sends real emails (result email to the lead address, notification to the owner). Use a test owner
 *    account, and expect the lead address to bounce.
 */
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const baseUrl = (opt('--base-url') || process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '');
const frontendUrl = (opt('--frontend-url') || process.env.SMOKE_FRONTEND_URL || '').replace(/\/+$/, '');
const allowLive = flag('--allow-live');
const keep = flag('--keep');
const sessionToken = process.env.SMOKE_SESSION_TOKEN;
const csrfToken = process.env.SMOKE_CSRF_TOKEN;
const TAG = 'P1-SMOKE';
const runId = Date.now().toString(36);

function fail(msg, code = 2) { console.error(msg); process.exit(code); }

if (!baseUrl) fail('Usage: SMOKE_SESSION_TOKEN=... SMOKE_CSRF_TOKEN=... node scripts/smoke/smoke.mjs --base-url <api url> [--frontend-url <app url>] [--keep] [--allow-live]');
let host;
try { host = new URL(baseUrl).hostname.toLowerCase(); } catch { fail('--base-url is not a valid URL'); }
const LIVE = /(squarespell\.com|squarespellquiz\.com|onrender\.com)$/;
for (const u of [baseUrl, frontendUrl].filter(Boolean)) {
  const h = new URL(u).hostname.toLowerCase();
  if (LIVE.test(h) && !allowLive) {
    fail(`Refusing to run against ${h}: it looks like a live host (squarespell.com / squarespellquiz.com / onrender.com). Pass --allow-live only if you really mean it.`, 3);
  }
}
if (!sessionToken || !csrfToken) fail('SMOKE_SESSION_TOKEN / SMOKE_CSRF_TOKEN are not set. Export a current session token and its matching CSRF token for a TEST account (read from the environment only).');
if (LIVE.test(host)) console.warn('WARNING: --allow-live given; running against a live host. All data is tagged ' + TAG + '.');

const results = [];
let state = { quizId: null, slug: null, leadId: null };
const auth = { Cookie: `sq_session=${sessionToken}; sq_csrf=${csrfToken}`, 'x-csrf-token': csrfToken };

async function call(method, path, { body, headers = {}, base = baseUrl } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json = null; const text = await res.text();
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, detail: detail || '' });
    console.log(`  PASS  ${name}${detail ? '  (' + detail + ')' : ''}`);
    return true;
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, detail: e.message });
    console.log(`  FAIL  ${name}  -> ${e.message}`);
    return false;
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log(`Smoke run ${TAG}-${runId} against ${baseUrl}`);

const steps = [
  ['health (liveness)', async () => { const r = await call('GET', '/api/health'); expect(r.status === 200 && r.json?.ok === true, `status ${r.status}`); }],
  ['readiness (database)', async () => { const r = await call('GET', '/api/health/ready'); expect(r.status === 200 && r.json?.checks?.database === 'up', `status ${r.status} ${JSON.stringify(r.json)}`); }],
  ['auth: session token accepted', async () => { const r = await call('GET', '/api/user/plan', { headers: auth }); expect(r.status === 200, `status ${r.status} code=${r.json?.code || '-'}`); return `plan=${r.json?.plan}`; }],
  ['create quiz', async () => {
    const r = await call('POST', '/api/quizzes', { headers: auth, body: {
      title: `${TAG} ${runId}`,
      questions: [
        { id: 'q1', text: `${TAG} question 1`, type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 2 }] },
        { id: 'q2', text: `${TAG} question 2`, type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 2 }] },
      ],
      outcomes: [{ id: 'low', title: `${TAG} low`, description: 'low', minScore: 0, maxScore: 1 }, { id: 'high', title: `${TAG} high`, description: 'high', minScore: 2, maxScore: 4 }],
    } });
    expect(r.status === 201 && r.json?.id, `status ${r.status} ${r.json?.error || ''} ${r.json?.code || ''}`);
    state.quizId = r.json.id; state.slug = r.json.slug; return `id=${state.quizId}`;
  }],
  ['save (edit and reopen)', async () => {
    const r = await call('PATCH', `/api/quizzes/${state.quizId}`, { headers: auth, body: { title: `${TAG} ${runId} edited` } });
    expect(r.status === 200, `patch status ${r.status}`);
    const g = await call('GET', `/api/quizzes/${state.quizId}`, { headers: auth });
    expect(g.status === 200 && g.json?.title === `${TAG} ${runId} edited`, 'reopened quiz does not show the edit');
  }],
  ['publish', async () => { const r = await call('POST', `/api/quizzes/${state.quizId}/publish`, { headers: auth }); expect(r.status === 200 && r.json?.status === 'live', `status ${r.status} ${r.json?.error || ''}`); state.slug = r.json.slug; return `slug=${state.slug}`; }],
  ['hosted link serves the quiz', async () => { const r = await call('GET', `/api/quiz/${state.slug}`); expect(r.status === 200 && r.json?.questions?.length === 2, `status ${r.status}`); expect(r.json.user_id === undefined, 'owner id leaked'); }],
  ['embed runtime', async () => {
    if (frontendUrl) {
      const page = await fetch(`${frontendUrl}/embed/${state.slug}`, { signal: AbortSignal.timeout(20000) });
      expect(page.status === 200, `frontend /embed/${state.slug} -> ${page.status}`);
      const js = await fetch(`${frontendUrl}/embed.js`, { signal: AbortSignal.timeout(20000) });
      expect(js.status === 200, `frontend /embed.js -> ${js.status}`);
      return 'frontend embed page + loader';
    }
    const r = await call('OPTIONS', `/api/quiz/${state.slug}/lead`, { headers: { Origin: 'https://customer-site.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    expect(r.status < 300, `preflight status ${r.status}`);
    return 'CORS preflight only (pass --frontend-url to check the embed page)';
  }],
  ['analytics events (view, start, complete)', async () => {
    const session = `${TAG}-${runId}`;
    for (const t of ['view', 'start', 'complete']) {
      const r = await call('POST', `/api/quiz/${state.slug}/event`, { headers: { 'User-Agent': 'Mozilla/5.0 P1-SMOKE' }, body: { event_type: t, session_id: session } });
      expect(r.status === 200 && r.json?.tracked === true, `${t} -> ${r.status}`);
    }
  }],
  ['lead submit', async () => {
    const r = await call('POST', `/api/quiz/${state.slug}/lead`, { body: { name: 'Smoke Tester', email: `p1-smoke-${runId}@example.com`, answers: { 0: 1, 1: 1 }, session_id: `${TAG}-${runId}` } });
    expect((r.status === 201 || r.status === 200) && r.json?.lead_id, `status ${r.status} ${r.json?.error || ''} ${r.json?.code || ''}`);
    state.leadId = r.json.lead_id;
  }],
  ['lead visible to the owner (list + detail)', async () => {
    const list = await call('GET', '/api/leads', { headers: auth });
    expect(list.status === 200 && Array.isArray(list.json) && list.json.some((l) => l.id === state.leadId), 'lead not in /api/leads');
    const d = await call('GET', `/api/leads/${state.leadId}`, { headers: auth });
    expect(d.status === 200 && d.json?.outcome_id === 'high', `detail status ${d.status} outcome=${d.json?.outcome_id}`);
  }],
  ['analytics reflect the run', async () => {
    const a = await call('GET', `/api/analytics/${state.quizId}`, { headers: auth });
    expect(a.status === 200 && a.json?.views >= 1, `views=${a.json?.views}`);
    expect(a.json.completions >= 1 && a.json.leads >= 1, `completions=${a.json.completions} leads=${a.json.leads}`);
  }],
];

let ok = true;
for (const [name, fn] of steps) {
  ok = (await step(name, fn)) && ok;
  if (!ok && ['health (liveness)', 'auth: session token accepted', 'create quiz'].includes(name)) break; // nothing else can work
}

if (state.quizId && !keep) {
  await step('cleanup (archive the P1-SMOKE quiz)', async () => {
    const r = await call('DELETE', `/api/quizzes/${state.quizId}`, { headers: auth });
    expect(r.status === 200, `status ${r.status}`);
  });
} else if (state.quizId) {
  console.log(`  NOTE  --keep: quiz ${state.quizId} (${TAG}) left in place`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed${failed.length ? ' - FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
process.exit(failed.length ? 1 : 0);
