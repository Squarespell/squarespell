// Disposable Clerk user for the browser sign-in test (email-code flow, typed by the owner). MODE=create prints the address; MODE=delete removes every disposable record.
const { createClient } = require('@supabase/supabase-js');
const bapi = async (m, p, b) => { const r = await fetch('https://api.clerk.com/v1' + p, { method: m, headers: { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (process.env.MODE === 'delete') {
    let n = 0; const users = await sb.from('users').select('id,clerk_user_id').like('email', 'info+qsignin%');
    for (const u of users.data || []) { await sb.from('quizzes').delete().eq('user_id', u.id); await sb.from('platform_email_logs').delete().eq('user_id', u.id).then(() => {}, () => {}); await sb.from('users').delete().eq('id', u.id); const d = await bapi('DELETE', '/users/' + u.clerk_user_id); n += d.s === 200 ? 1 : 0; }
    const cl = await bapi('GET', '/users?query=qsignin&limit=20'); for (const u of (Array.isArray(cl.j) ? cl.j : [])) { await bapi('DELETE', '/users/' + u.id); n++; }
    console.log('deleted disposable users: ' + n); return;
  }
  const email = 'info+qsignin' + Date.now().toString(36) + '@squarespell.com';
  const cu = await bapi('POST', '/users', { email_address: [email], first_name: 'ZZ', last_name: 'Signin Test', skip_password_requirement: true });
  console.log(cu.s === 200 ? 'CREATED ' + email : 'FAILED ' + cu.s + ' ' + JSON.stringify(cu.j).slice(0, 160));
})().catch(e => { console.log('ERROR', String(e.message).slice(0, 150)); process.exit(1); });
