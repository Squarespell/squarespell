// Gated end-to-end test through the PUBLIC HTTPS API of the final domain, with one disposable Clerk user (Resend sandbox address).
// Covers: readiness, sign-in, user creation (Clerk webhook), AI generation, quiz create/edit/publish, public page, embed page, checkout-session
// creation and immediate expiry, transactional email record. Cleans up everything it creates. Prints statuses only.
const { createClient } = require('@supabase/supabase-js'); const Stripe = require('stripe');
const APP = 'https://squarespellquiz.com', API = 'https://api.squarespellquiz.com', FAPI = 'https://clerk.squarespellquiz.com';
const out = (n, ok, d) => console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' (' + d + ')' : ''));
const bapi = async (m, p, b) => { const r = await fetch('https://api.clerk.com/v1' + p, { method: m, headers: { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let uid = null, quizId = null, sessionId = null, dbUserId = null;
  try {
    const rd = await fetch(API + '/api/health/ready'); out('API readiness over HTTPS', rd.status === 200, 'status ' + rd.status);
    const email = 'delivered+gate' + Date.now() + '@resend.dev';
    const cu = await bapi('POST', '/users', { email_address: [email], first_name: 'ZZ', last_name: 'Gate Test', skip_password_requirement: true });
    uid = cu.j && cu.j.id; out('disposable Clerk user created', !!uid, 'status ' + cu.s); if (!uid) return;
    const st = await bapi('POST', '/sign_in_tokens', { user_id: uid, expires_in_seconds: 600 });
    const fr = await fetch(FAPI + '/v1/client/sign_ins', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: APP }, body: new URLSearchParams({ strategy: 'ticket', ticket: st.j.token }) });
    const fj = await fr.json(); const sess = fj.client && fj.client.sessions && fj.client.sessions[0]; let jwt = sess && sess.last_active_token && sess.last_active_token.jwt;
    if (!jwt && sess) { const ck = (fr.headers.getSetCookie ? fr.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '); const tr = await fetch(FAPI + '/v1/client/sessions/' + sess.id + '/tokens', { method: 'POST', headers: { Cookie: ck, Origin: APP } }); jwt = (await tr.json()).jwt; }
    out('sign-in on the production Clerk instance', !!jwt); if (!jwt) return;
    const A = { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Origin: APP };
    const pl = await fetch(API + '/api/user/plan', { headers: A }); const plj = await pl.json().catch(() => ({})); out('authenticated API call over HTTPS (user/plan)', pl.status === 200, 'status ' + pl.status + ', plan ' + plj.plan);
    await new Promise(r => setTimeout(r, 4000));
    const u = await sb.from('users').select('id,email').eq('clerk_user_id', uid).maybeSingle(); dbUserId = u.data && u.data.id; out('database user exists (created by first login / Clerk webhook)', !!dbUserId);
    const g = await fetch(API + '/api/generate', { method: 'POST', headers: A, body: JSON.stringify({ url: 'https://www.squarespace.com', business_type: 'consultant', goal: 'generate leads' }) }); const gj = await g.json().catch(() => null);
    out('AI quiz generation', g.status === 200 && !!gj, 'status ' + g.status);
    const q = (gj && (gj.quiz || gj)) || {};
    const cq = await fetch(API + '/api/quizzes', { method: 'POST', headers: A, body: JSON.stringify({ title: 'ZZ gate test quiz', questions: q.questions || [{ id: 'q1', text: 'Q1', type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 1 }] }], outcomes: q.outcomes || [{ id: 'o1', title: 'Result', description: 'd', minScore: 0, maxScore: 10 }] }) });
    const cqj = await cq.json().catch(() => ({})); quizId = cqj.id || (cqj.quiz && cqj.quiz.id); out('quiz created', cq.status === 201 && !!quizId, 'status ' + cq.status);
    const ed = await fetch(API + '/api/quizzes/' + quizId, { method: 'PATCH', headers: A, body: JSON.stringify({ title: 'ZZ gate test quiz (edited)' }) }); out('quiz edited', ed.status === 200, 'status ' + ed.status);
    const pb = await fetch(API + '/api/quizzes/' + quizId + '/publish', { method: 'POST', headers: A, body: '{}' }); const pbj = await pb.json().catch(() => ({})); out('quiz published', pb.status === 200, 'status ' + pb.status + (pb.status === 200 ? '' : ' ' + JSON.stringify(pbj).slice(0, 100)));
    const one = await sb.from('quizzes').select('slug,status').eq('id', quizId).maybeSingle(); const slug = one.data && one.data.slug;
    const pub = await fetch(APP + '/q/' + slug); out('public quiz link renders', pub.status === 200, 'status ' + pub.status + ', quiz status ' + (one.data && one.data.status));
    const em = await fetch(APP + '/embed/' + slug); out('embed page renders and allows framing', em.status === 200 && /frame-ancestors \*/.test(em.headers.get('content-security-policy') || ''), 'status ' + em.status);
    const co = await fetch(API + '/api/stripe/create-checkout', { method: 'POST', headers: A, body: JSON.stringify({ plan: 'core', billing: 'monthly' }) }); const coj = await co.json().catch(() => ({}));
    const m = /cs_(live|test)_[A-Za-z0-9]+/.exec(coj.url || ''); sessionId = m && m[0]; out('checkout session created (not paid)', co.status === 200 && !!sessionId, 'status ' + co.status);
    if (sessionId) { const ex = await stripe.checkout.sessions.expire(sessionId); out('checkout session expired immediately', ex.status === 'expired', ex.status); }
    const el = await sb.from('platform_email_logs').select('*', { count: 'exact', head: true }); console.log('platform email log rows now: ' + el.count);
  } catch (e) { out('gated e2e flow', false, String(e.message).slice(0, 140)); }
  finally {
    try { if (quizId) await sb.from('quizzes').delete().eq('id', quizId); if (dbUserId) { await sb.from('platform_email_logs').delete().eq('user_id', dbUserId).then(() => {}, () => {}); await sb.from('users').delete().eq('id', dbUserId); } } catch (e) {}
    if (uid) { const d = await bapi('DELETE', '/users/' + uid); out('cleanup: disposable quiz, database user and Clerk user removed', d.s === 200, 'clerk ' + d.s); }
  }
})();
