// Disposable published quiz for browser embed tests. MODE=create prints the public slug; MODE=delete removes every disposable record.
const { createClient } = require('@supabase/supabase-js');
const APP = 'https://squarespellquiz.com', API = 'https://api.squarespellquiz.com', FAPI = 'https://clerk.squarespellquiz.com';
const bapi = async (m, p, b) => { const r = await fetch('https://api.clerk.com/v1' + p, { method: m, headers: { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (process.env.MODE === 'delete') {
    const users = await sb.from('users').select('id,clerk_user_id').like('email', 'delivered+embed%'); let n = 0;
    for (const u of users.data || []) { await sb.from('quizzes').delete().eq('user_id', u.id); await sb.from('platform_email_logs').delete().eq('user_id', u.id).then(() => {}, () => {}); await sb.from('users').delete().eq('id', u.id); const d = await bapi('DELETE', '/users/' + u.clerk_user_id); n += d.s === 200 ? 1 : 0; }
    const cl = await bapi('GET', '/users?query=delivered%2Bembed&limit=20'); for (const u of (Array.isArray(cl.j) ? cl.j : [])) { await bapi('DELETE', '/users/' + u.id); n++; }
    console.log('deleted disposable users: ' + n); return;
  }
  const email = 'delivered+embed' + Date.now() + '@resend.dev';
  const cu = await bapi('POST', '/users', { email_address: [email], first_name: 'ZZ', last_name: 'Embed Fixture', skip_password_requirement: true }); const uid = cu.j.id;
  const st = await bapi('POST', '/sign_in_tokens', { user_id: uid, expires_in_seconds: 600 });
  const fr = await fetch(FAPI + '/v1/client/sign_ins', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: APP }, body: new URLSearchParams({ strategy: 'ticket', ticket: st.j.token }) });
  const fj = await fr.json(); const sess = fj.client.sessions[0]; let jwt = sess.last_active_token && sess.last_active_token.jwt;
  if (!jwt) { const ck = fr.headers.getSetCookie().map(c => c.split(';')[0]).join('; '); jwt = (await (await fetch(FAPI + '/v1/client/sessions/' + sess.id + '/tokens', { method: 'POST', headers: { Cookie: ck, Origin: APP } })).json()).jwt; }
  const A = { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Origin: APP };
  await fetch(API + '/api/user/plan', { headers: A });
  const cq = await fetch(API + '/api/quizzes', { method: 'POST', headers: A, body: JSON.stringify({ title: 'ZZ embed fixture', questions: [{ id: 'q1', text: 'Disposable embed test question', type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 1 }] }], outcomes: [{ id: 'o1', title: 'Done', description: 'Disposable', minScore: 0, maxScore: 10 }] }) });
  const qj = await cq.json(); const id = qj.id || (qj.quiz && qj.quiz.id);
  await fetch(API + '/api/quizzes/' + id + '/publish', { method: 'POST', headers: A, body: '{}' });
  const one = await sb.from('quizzes').select('slug,status').eq('id', id).maybeSingle();
  console.log('SLUG=' + one.data.slug + ' status=' + one.data.status);
})().catch(e => { console.log('ERROR', String(e.message).slice(0, 150)); process.exit(1); });
