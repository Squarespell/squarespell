// One-button connect: end-to-end check for STAGING with disposable data only. Run inside the staging backend container.
//   MODE=setup    create a disposable user, two live quizzes and a connected site; verify it; publish tab, popup and inline slot
//   MODE=mutate   update, pause, resume, move, remove, wrong-domain heartbeat, simulated failure with rollback, manual-embed regression
//   MODE=cleanup  disconnect and delete every disposable record, then confirm the counts are back to the baseline
// Needs (from the container / caller): CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL, BACKEND_URL, and PK (the public Clerk key).
// It prints PASS/FAIL lines only. It never prints a token, key or secret.
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const MODE = process.env.MODE || 'setup';
const APP = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const API = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const HOST = new URL(API).hostname; // the fixture website is served at the API host's own root (staging only)
const FAPI = 'https://' + Buffer.from((process.env.PK || '').split('_')[2] || '', 'base64').toString().replace(/\$$/, '');
const STATE = '/tmp/connect-e2e.json';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let failed = 0;
const out = (n, ok, d) => { if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' (' + d + ')' : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bapi = async (m, p, b) => { const r = await fetch('https://api.clerk.com/v1' + p, { method: m, headers: { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s) => fs.writeFileSync(STATE, JSON.stringify(s));

// A Clerk DEVELOPMENT instance (pk_test_) needs a dev-browser token on every frontend-API call; production instances do not.
async function devBrowserQuery(which) {
  if (!/^pk_test_/.test(process.env.PK || '')) return '';
  const r = await fetch(FAPI + '/v1/dev_browser', { method: 'POST', headers: { Origin: APP } });
  const j = await r.json().catch(() => null);
  const t = j && (which === 'token' ? j.token : j.id);
  return t ? '?__clerk_db_jwt=' + encodeURIComponent(t) : '';
}
async function jwtFor(clerkId) {
  const st = await bapi('POST', '/sign_in_tokens', { user_id: clerkId, expires_in_seconds: 300 });
  let dq = await devBrowserQuery('id');
  let fr = await fetch(FAPI + '/v1/client/sign_ins' + dq, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: APP }, body: new URLSearchParams({ strategy: 'ticket', ticket: st.j.token }) });
  if (fr.status === 401 && dq) {
    const st2 = await bapi('POST', '/sign_in_tokens', { user_id: clerkId, expires_in_seconds: 300 });
    dq = await devBrowserQuery('token');
    fr = await fetch(FAPI + '/v1/client/sign_ins' + dq, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: APP }, body: new URLSearchParams({ strategy: 'ticket', ticket: st2.j.token }) });
  }
  const fj = await fr.json();
  const sess = fj.client && fj.client.sessions && fj.client.sessions[0];
  let jwt = sess && sess.last_active_token && sess.last_active_token.jwt;
  if (!jwt && sess) {
    const ck = (fr.headers.getSetCookie ? fr.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
    const tr = await fetch(FAPI + '/v1/client/sessions/' + sess.id + '/tokens' + dq, { method: 'POST', headers: { Cookie: ck, Origin: APP } });
    jwt = (await tr.json()).jwt;
  }
  return jwt;
}
const call = async (jwt, m, p, b, extra) => {
  const r = await fetch(API + p, { method: m, headers: Object.assign({ Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Origin: APP }, extra || {}), body: b ? JSON.stringify(b) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { s: r.status, j };
};
const manifest = async (key) => { const r = await fetch(API + '/api/public/connect/manifest?site=' + key, { cache: 'no-store' }); return { s: r.status, j: r.status === 200 ? await r.json() : null }; };
const heartbeat = async (key, origin) => { const r = await fetch(API + '/api/public/connect/heartbeat?site=' + key, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: origin }, body: JSON.stringify({ version: '1.0.0', slots: ['hero-quiz'], path: '/' }) }); return r.status; };
const emailCounts = async () => { const o = {}; for (const t of ['platform_email_logs', 'email_sends', 'email_sequence_queue', 'email_logs']) { const r = await sb.from(t).select('id', { count: 'exact', head: true }); o[t] = r.error ? -1 : r.count; } return o; };
const baseline = async () => { const o = {}; for (const t of ['users', 'quizzes', 'connected_sites', 'quiz_installations', 'manifest_versions', 'installation_events', 'verification_checks']) { const r = await sb.from(t).select('id', { count: 'exact', head: true }); o[t] = r.count; } return o; };
const quizBody = (title, slug, userId) => ({ user_id: userId, title, slug, status: 'live', mode: 'lead_quiz', settings: {},
  questions: [{ id: 'q1', text: 'Q1', type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 2 }] }],
  outcomes: [{ id: 'low', title: 'Low', description: 'low', minScore: 0, maxScore: 1 }, { id: 'high', title: 'High', description: 'high', minScore: 2, maxScore: 2 }] });

(async () => {
  const S = load();
  if (MODE === 'setup') {
    S.base = await baseline(); S.emailBefore = await emailCounts();
    const rd = await fetch(API + '/api/health/ready'); out('staging API ready', rd.status === 200, 'status ' + rd.status);
    const email = 'delivered+cxe2e' + Date.now() + '@resend.dev';
    const cu = await bapi('POST', '/users', { email_address: [email], first_name: 'ZZ', last_name: 'Connect E2E', skip_password_requirement: true });
    S.clerkId = cu.j && cu.j.id; out('disposable Clerk user created', !!S.clerkId, 'status ' + cu.s); if (!S.clerkId) return save(S);
    save(S);
    const jwt = await jwtFor(S.clerkId); out('signed in on the staging Clerk instance', !!jwt); if (!jwt) return;
    const pl = await call(jwt, 'GET', '/api/user/plan'); out('first authenticated call created the database user', pl.s === 200, 'status ' + pl.s);
    await sleep(3000);
    const u = await sb.from('users').select('id').eq('clerk_user_id', S.clerkId).maybeSingle(); S.dbUserId = u.data && u.data.id; out('database user exists', !!S.dbUserId); if (!S.dbUserId) return save(S);
    const stamp = Date.now().toString(36);
    const qa = await sb.from('quizzes').insert(quizBody('CX quiz A', 'cx-a-' + stamp, S.dbUserId)).select('id,slug').single();
    const qb = await sb.from('quizzes').insert(quizBody('CX quiz B', 'cx-b-' + stamp, S.dbUserId)).select('id,slug').single();
    S.qa = qa.data; S.qb = qb.data; out('two disposable live quizzes', !!(S.qa && S.qb));
    const cfg = await call(jwt, 'GET', '/api/connect/config'); out('feature flag is on in staging', cfg.j && cfg.j.enabled === true);
    const site = await call(jwt, 'POST', '/api/connect/sites', { platform: 'html', domain: HOST });
    out('site connected (draft, bound to the normalised hostname)', site.s === 201 && site.j.site.state === 'draft' && site.j.site.hostname === HOST, 'status ' + site.s);
    S.siteId = site.j && site.j.site.id; S.key = site.j && site.j.site.site_key; out('site key is high entropy', /^ssq_[A-Za-z0-9_-]{32}$/.test(S.key || ''));
    const page = await fetch('https://' + HOST + '/'); const html = await page.text();
    out('fixture page carries the loader with this site key', page.status === 200 && html.includes('data-site="' + S.key + '"') && html.includes('/connect/loader.js'), 'status ' + page.status);
    const ver = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/verify');
    out('server-side page check detects the loader and marks Verified', ver.s === 200 && ver.j.result.ok === true && ver.j.site.state === 'verified', ver.j && ver.j.result && String(ver.j.result.reason));
    out('inline slot detected on the page', !!(ver.j && ver.j.site.slots_seen.includes('hero-quiz')));
    out('correct-domain heartbeat accepted', (await heartbeat(S.key, 'https://' + HOST)) === 200);
    out('wrong-domain heartbeat rejected', (await heartbeat(S.key, 'https://evil.example')) === 403);
    let m = await manifest(S.key); out('new site serves an empty manifest', m.s === 200 && m.j.installations.length === 0 && m.j.version === 0);
    const tab = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/installations', { quizId: S.qa.id, mode: 'floating_tab', options: { buttonText: 'Take the quiz' } });
    out('floating tab published', tab.s === 201 && tab.j.installation.status === 'live', 'status ' + tab.s); S.tabId = tab.j && tab.j.installation.id;
    const pop = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/installations', { quizId: S.qb.id, mode: 'popup', exclude: ['/contact'], options: { trigger: 'delay', delaySeconds: 2 } });
    out('popup published', pop.s === 201 && pop.j.installation.status === 'live', 'status ' + pop.s); S.popId = pop.j && pop.j.installation.id;
    const inl = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/installations', { quizId: S.qa.id, mode: 'inline', slot: 'hero-quiz', include: ['/'] });
    out('inline slot used', inl.s === 201 && inl.j.installation.status === 'live', 'status ' + inl.s); S.inlId = inl.j && inl.j.installation.id;
    const dup = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/installations', { quizId: S.qa.id, mode: 'inline', slot: 'hero-quiz', include: ['/'] });
    out('duplicate publish is one installation, no new version', dup.s === 200 && dup.j.created === false && dup.j.changed === false);
    m = await manifest(S.key); out('public manifest lists all three and only display data', m.s === 200 && m.j.installations.length === 3 && !/user_id|email|token/.test(JSON.stringify(m.j)), 'version ' + (m.j && m.j.version));
    S.versionAfterSetup = m.j && m.j.version; save(S);
    console.log('OPEN THIS IN A BROWSER TO SEE THE LOADER RUN: https://' + HOST + '/');
  } else if (MODE === 'mutate') {
    const jwt = await jwtFor(S.clerkId); out('signed in again', !!jwt); if (!jwt) return;
    const inst = (id) => '/api/connect/installations/' + id;
    let m = await manifest(S.key); const v0 = m.j.version;
    const up = await call(jwt, 'PATCH', inst(S.tabId), { options: { buttonText: 'Find my fit' } });
    m = await manifest(S.key); out('update publishes a new version', up.s === 200 && m.j.version === v0 + 1 && m.j.installations.find((i) => i.id === S.tabId).options.buttonText === 'Find my fit', 'v' + m.j.version);
    const pa = await call(jwt, 'POST', inst(S.popId) + '/pause'); m = await manifest(S.key);
    out('pause removes it from the manifest', pa.s === 200 && !m.j.installations.some((i) => i.id === S.popId));
    const re = await call(jwt, 'POST', inst(S.popId) + '/resume'); m = await manifest(S.key);
    out('resume puts it back', re.s === 200 && m.j.installations.some((i) => i.id === S.popId));
    const mv = await call(jwt, 'POST', inst(S.inlId) + '/move', { include: ['/pricing'], exclude: [] }); m = await manifest(S.key);
    out('move changes the pages', mv.s === 200 && JSON.stringify(m.j.installations.find((i) => i.id === S.inlId).include) === '["/pricing"]');
    // Simulated failure: the previous manifest must stay exactly as it was.
    const before = JSON.stringify((await manifest(S.key)).j.installations); const vBefore = (await manifest(S.key)).j.version;
    const bad = await call(jwt, 'PATCH', inst(S.tabId), { options: { buttonText: 'Should not appear' } }, { 'x-connect-fault': 'after_manifest' });
    const after = await manifest(S.key);
    out('simulated failure returns publish_failed', bad.s === 502 && bad.j && bad.j.code === 'publish_failed', 'status ' + bad.s);
    out('previous manifest content is preserved after the failure', JSON.stringify(after.j.installations) === before && !JSON.stringify(after.j).includes('Should not appear'), 'version ' + vBefore + ' -> ' + after.j.version);
    const row = await sb.from('quiz_installations').select('status,options').eq('id', S.tabId).single(); out('installation restored to live with its old settings', row.data.status === 'live' && row.data.options.buttonText === 'Find my fit');
    const ev = await sb.from('installation_events').select('action').eq('site_id', S.siteId); const acts = (ev.data || []).map((e) => e.action);
    out('rollback and failure are in the audit history', acts.includes('rollback') && acts.includes('updated_failed'));
    const rm = await call(jwt, 'DELETE', inst(S.popId)); m = await manifest(S.key);
    out('remove takes it off the site', rm.s === 200 && !m.j.installations.some((i) => i.id === S.popId));
    const w = await heartbeat(S.key, 'https://not-this-site.example'); out('wrong-domain heartbeat still rejected', w === 403);
    // Existing manual embeds are untouched.
    const ej = await fetch(APP + '/embed.js'); const ejt = await ej.text();
    out('manual embed loader /embed.js still served', ej.status === 200 && /javascript/.test(ej.headers.get('content-type') || '') && /data-squarespell-quiz/.test(ejt) && ej.headers.get('access-control-allow-origin') === '*', 'status ' + ej.status);
    const ep = await fetch(APP + '/embed/' + S.qa.slug + '?embed=1'); out('iframe embed page still served', ep.status === 200, 'status ' + ep.status);
    const qp = await fetch(APP + '/quiz/' + S.qa.slug); out('public quiz link still served', qp.status === 200, 'status ' + qp.status);
    const pq = await fetch(API + '/api/quiz/' + S.qa.slug); const pj = await pq.json().catch(() => ({})); out('public quiz API still served', pq.status === 200 && pj.title === 'CX quiz A');
    const vj = await fetch(APP + '/embed/version.json'); out('embed version file still served', vj.status === 200);
    const ld = await fetch(APP + '/connect/loader.js'); const ldt = await ld.text();
    out('loader served with final domain only, no cookies API, no legacy host', ld.status === 200 && ldt.includes(APP) && !/quiz\.squarespell\.com|app\.squarespell\.com|document\.cookie/.test(ldt), 'status ' + ld.status);
    const after2 = await emailCounts(); out('no email was sent or queued', JSON.stringify(after2) === JSON.stringify(S.emailBefore), JSON.stringify(after2));
    save(S);
  } else if (MODE === 'cleanup') {
    if (S.clerkId) { const jwt = await jwtFor(S.clerkId); if (jwt && S.siteId) { const d = await call(jwt, 'POST', '/api/connect/sites/' + S.siteId + '/disconnect'); out('site disconnected through the API', d.s === 200 && d.j.site.state === 'disconnected', 'status ' + d.s); const m = await manifest(S.key); out('manifest gone after disconnect', m.s === 404); } }
    if (S.dbUserId) {
      await sb.from('connected_sites').delete().eq('user_id', S.dbUserId);
      await sb.from('quizzes').delete().eq('user_id', S.dbUserId);
      await sb.from('platform_email_logs').delete().eq('user_id', S.dbUserId).then(() => {}, () => {});
      await sb.from('users').delete().eq('id', S.dbUserId);
    }
    if (S.clerkId) { const d = await bapi('DELETE', '/users/' + S.clerkId); out('disposable Clerk user deleted', d.s === 200, 'status ' + d.s); }
    const now = await baseline(); out('every table is back to the baseline', JSON.stringify(now) === JSON.stringify(S.base), JSON.stringify(now));
    out('email tables unchanged', JSON.stringify(await emailCounts()) === JSON.stringify(S.emailBefore));
    try { fs.unlinkSync(STATE); } catch (e) {}
  }
  console.log(failed ? 'RESULT: ' + failed + ' FAILED' : 'RESULT: ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERROR', String(e && e.message).slice(0, 200)); process.exit(1); });
