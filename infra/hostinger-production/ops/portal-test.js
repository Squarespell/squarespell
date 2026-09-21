// Billing-portal test through the PRODUCTION backend with one disposable Clerk user and one disposable Stripe customer (CUS env).
// Prints statuses and hosts only. Cleans up the disposable Clerk user and database row.
const {createClient} = require('@supabase/supabase-js');
const CUS = process.env.CUS; const FAPI = 'https://clerk.squarespellquiz.com';
const out = (n, ok, d) => console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' (' + d + ')' : ''));
const bapi = async (m, p, b) => { const r = await fetch('https://api.clerk.com/v1' + p, { method: m, headers: { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
(async () => {
  let uid = null; const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    if (!CUS) throw new Error('CUS not set');
    const email = 'zz-portal-' + Date.now() + '@example.com';
    const cu = await bapi('POST', '/users', { email_address: [email], first_name: 'ZZ', last_name: 'Disposable', skip_password_requirement: true });
    out('disposable Clerk user created', cu.s === 200 && cu.j && cu.j.id, 'status ' + cu.s); uid = cu.j && cu.j.id; if (!uid) return;
    const st = await bapi('POST', '/sign_in_tokens', { user_id: uid, expires_in_seconds: 300 });
    const fr = await fetch(FAPI + '/v1/client/sign_ins', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://squarespellquiz.com' }, body: new URLSearchParams({ strategy: 'ticket', ticket: st.j.token }) });
    const fj = await fr.json(); const sess = fj.client && fj.client.sessions && fj.client.sessions[0];
    let jwt = sess && sess.last_active_token && sess.last_active_token.jwt;
    if (!jwt && sess) { const ck = (fr.headers.getSetCookie ? fr.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '); const tr = await fetch(FAPI + '/v1/client/sessions/' + sess.id + '/tokens', { method: 'POST', headers: { Cookie: ck, Origin: 'https://squarespellquiz.com' } }); const tj = await tr.json(); jwt = tj.jwt; }
    out('sign-in on the production Clerk instance gives a session token', !!jwt, 'status ' + fr.status); if (!jwt) return;
    const A = { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' }; const api = 'http://127.0.0.1:3001';
    const p = await fetch(api + '/api/user/plan', { headers: A }); out('backend creates the database user and accepts the token', p.status === 200, 'status ' + p.status);
    const up = await sb.from('users').update({ stripe_customer_id: CUS }).eq('clerk_user_id', uid).select('id'); out('disposable database user linked to the disposable Stripe customer', !up.error && up.data && up.data.length === 1);
    const r = await fetch(api + '/api/stripe/portal', { headers: A }); let j = null; try { j = await r.json(); } catch (e) {}
    let host = null; try { host = new URL(j.url).host; } catch (e) {}
    out('production backend returns a billing-portal URL', r.status === 200 && host === 'billing.stripe.com', 'status ' + r.status + ', host ' + host + (j && j.error ? ', error ' + String(j.error).slice(0, 100) : ''));
  } catch (e) { out('billing portal flow', false, String(e.message).slice(0, 120)); }
  finally {
    if (uid) { const d1 = await sb.from('users').delete().eq('clerk_user_id', uid); const d = await bapi('DELETE', '/users/' + uid); out('cleanup: disposable database row and Clerk user deleted', !d1.error && d.s === 200, 'clerk status ' + d.s); }
    try { const S = require('stripe'); const s = new S(process.env.STRIPE_SECRET_KEY); const subs = await s.subscriptions.list({ customer: CUS, limit: 1, status: 'all' }); const inv = await s.invoices.list({ customer: CUS, limit: 1 }); console.log('stripe customer: subscriptions=' + subs.data.length + ' invoices=' + inv.data.length); } catch (e) { console.log('stripe read check n/a: ' + (e.code || e.type)); }
  }
})();
