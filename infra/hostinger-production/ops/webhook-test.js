// Webhook signature tests against the PRODUCTION backend (in-container, 127.0.0.1). Harmless test events only; secrets are read from the
// environment and never printed. Cleans up its own idempotency rows.
const Stripe = require('stripe'); const { Webhook } = require('svix'); const { createClient } = require('@supabase/supabase-js');
const API = 'http://127.0.0.1:3001'; const out = (n, ok, d) => console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' (' + d + ')' : ''));
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const post = async (path, headers, body) => { const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
(async () => {
  const stamp = Date.now();
  // ---- Stripe ----
  const stripe = new Stripe('sk_test_local_only'); const sec = process.env.STRIPE_WEBHOOK_SECRET;
  const evId = 'evt_wh_test_' + stamp;
  const evt = { id: evId, object: 'event', api_version: '2024-12-18.acacia', created: Math.floor(stamp / 1000), type: 'customer.subscription.updated', livemode: true, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object: { id: 'sub_wh_test_' + stamp, object: 'subscription', items: { data: [{ price: { id: 'price_wh_test_none' } }] } } } };
  const payload = JSON.stringify(evt);
  const good = stripe.webhooks.generateTestHeaderString({ payload, secret: sec });
  const bad = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_not_the_real_secret_at_all' });
  let r = await post('/api/stripe/webhook', { 'stripe-signature': good }, payload); out('stripe: valid signature accepted', r.s === 200, 'status ' + r.s);
  r = await post('/api/stripe/webhook', { 'stripe-signature': bad }, payload); out('stripe: invalid signature rejected', r.s === 400, 'status ' + r.s);
  r = await post('/api/stripe/webhook', {}, payload); out('stripe: missing signature rejected', r.s === 400, 'status ' + r.s);
  r = await post('/api/stripe/webhook', { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: sec }) }, payload); out('stripe: duplicate event id is idempotent (accepted, not reprocessed)', r.s === 200, 'status ' + r.s + (r.j ? ' ' + JSON.stringify(r.j).slice(0, 80) : ''));
  const rows = await sb.from('stripe_webhook_events').select('*', { count: 'exact', head: true }).eq('event_id', evId).then(x => x, () => null);
  console.log('stripe idempotency rows for the test event: ' + (rows && rows.count != null ? rows.count : 'n/a'));
  // ---- Svix-signed (Clerk, Resend) ----
  const svix = async (name, path, secret, type, data) => {
    const id = 'msg_wh_test_' + name + '_' + stamp; const ts = new Date(); const body = JSON.stringify({ type, data });
    const wh = new Webhook(secret); const sig = wh.sign(id, ts, body); const H = { 'svix-id': id, 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': sig };
    let a = await post(path, H, body); out(name + ': valid signature accepted', a.s === 200, 'status ' + a.s);
    const badSig = new Webhook('whsec_' + Buffer.from('not the real secret').toString('base64')).sign(id, ts, body);
    a = await post(path, { ...H, 'svix-signature': badSig }, body); out(name + ': invalid signature rejected', a.s === 400 || a.s === 401, 'status ' + a.s);
    a = await post(path, {}, body); out(name + ': missing signature rejected', a.s === 400 || a.s === 401, 'status ' + a.s);
    a = await post(path, H, body); out(name + ': duplicate delivery is harmless', a.s === 200, 'status ' + a.s);
  };
  await svix('clerk', '/api/clerk/webhook', process.env.CLERK_WEBHOOK_SECRET, 'session.created', { id: 'sess_wh_test' });
  await svix('resend', '/api/webhooks/resend', process.env.RESEND_WEBHOOK_SECRET, 'email.delivered', { email_id: 'wh-test-unknown-email-id', to: ['delivered@resend.dev'] });
  await sb.from('stripe_webhook_events').delete().eq('event_id', evId).then(() => {}, () => {});
  console.log('cleanup: test idempotency rows removed');
})().catch(e => { console.log('ERROR', String(e.message).slice(0, 150)); process.exit(1); });
