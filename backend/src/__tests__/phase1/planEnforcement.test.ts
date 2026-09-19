/**
 * Phase 1 - usage / plan limits and server-side feature gating; trial-length consistency.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { api, makeUser, makeQuiz, bearer, sampleQuiz } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { PLAN_LIMITS, getPlanLimits } from '../../middleware/planGuard';

beforeEach(resetData);

describe('plan limit table (single source of truth)', () => {
  it('free = 0 quizzes / 0 leads; core = 5 quizzes / 1,000 leads; trial and pro = unlimited quizzes / 3,000 leads; business = unlimited', () => {
    expect(PLAN_LIMITS.free).toMatchObject({ quizzes: 0, leads: 0 });
    expect(PLAN_LIMITS.core).toMatchObject({ quizzes: 5, leads: 1000 });
    expect(PLAN_LIMITS.trial).toMatchObject({ quizzes: Infinity, leads: 3000 });
    expect(PLAN_LIMITS.pro).toMatchObject({ quizzes: Infinity, leads: 3000 });
    expect(PLAN_LIMITS.business).toMatchObject({ quizzes: Infinity, leads: Infinity });
    expect(getPlanLimits('does-not-exist')).toBe(PLAN_LIMITS.free); // unknown plan degrades to the most restrictive
  });
  it('gated features: A/B testing, integrations and sequences are Pro+; white-label, custom domain and team seats are Business only', () => {
    expect(PLAN_LIMITS.core).toMatchObject({ abTesting: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false });
    expect(PLAN_LIMITS.pro).toMatchObject({ abTesting: true, integrations: true, emailSequences: true, whiteLabel: false, customDomain: false, teamSeats: false });
    expect(PLAN_LIMITS.business).toMatchObject({ abTesting: true, integrations: true, emailSequences: true, whiteLabel: true, customDomain: true, teamSeats: true });
  });
});

describe('GET /api/user/plan reports the effective plan', () => {
  it('a free account inside the trial sees a trial end 14 days after sign-up; lead add-ons raise the limit', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 3 });
    const r = await (await api()).get('/api/user/plan').set(bearer(u));
    expect(r.status).toBe(200);
    const ends = new Date(r.body.trial_ends_at).getTime();
    const created = new Date((await sql<any>(`select created_at from users where id=$1`, [u.id]))[0].created_at).getTime();
    expect(Math.round((ends - created) / 86400000)).toBe(14);
    const core = await makeUser({ plan: 'core' });
    await sql(`update users set lead_addon=$2::jsonb where id=$1`, [core.id, JSON.stringify({ key: 'lead_500' })]);
    const p = await (await api()).get('/api/user/plan').set(bearer(core));
    expect(p.body.limits.leads).toBe(1500);
  });
});

describe('server-side enforcement of gated features (the UI hiding a button is not a control)', () => {
  const denied = (r: any) => { expect(r.status, JSON.stringify(r.body)).toBe(403); expect(r.body.error).toBe('plan_required'); expect(r.body.feature).toBeTruthy(); };

  async function abBody(owner: any) {
    const a = await makeQuiz(owner, { slug: 'ab-a-' + Math.random().toString(36).slice(2, 6) });
    const b = await makeQuiz(owner, { slug: 'ab-b-' + Math.random().toString(36).slice(2, 6) });
    return { quiz: a, body: { name: 'Headline test', variants: [{ variant_id: 'a', quiz_id: a.id, weight: 50 }, { variant_id: 'b', quiz_id: b.id, weight: 50 }] } };
  }

  it('A/B testing: core and expired-trial accounts are refused; trial, pro and business are allowed', async () => {
    for (const [plan, days, ok] of [['core', 1, false], ['free', 30, false], ['free', 2, true], ['trial', 2, true], ['pro', 1, true], ['business', 1, true]] as const) {
      const u = await makeUser({ plan, createdDaysAgo: days });
      const { quiz, body } = await abBody(u);
      const r = await (await api()).post(`/api/quizzes/${quiz.id}/ab-tests`).set(bearer(u)).send(body);
      if (ok) expect(r.status, `${plan}/${days}d`).toBe(201); else denied(r);
    }
  });

  it('integrations (webhooks, Mailchimp...): core and expired-trial are refused; pro is allowed', async () => {
    const payload = { type: 'webhook', config: { url: 'https://hooks.example.com/in' } };
    denied(await (await api()).post('/api/integrations').set(bearer(await makeUser({ plan: 'core' }))).send(payload));
    denied(await (await api()).post('/api/integrations').set(bearer(await makeUser({ plan: 'free', createdDaysAgo: 30 }))).send(payload));
    expect((await (await api()).post('/api/integrations').set(bearer(await makeUser({ plan: 'pro' }))).send(payload)).status).toBe(201);
  });

  it('follow-up email sequences: core is refused; pro is allowed', async () => {
    const emails = [{ delay_days: 1, subject: 'Hi', body: 'Body' }];
    const core = await makeUser({ plan: 'core' });
    const pro = await makeUser({ plan: 'pro' });
    const qc = await makeQuiz(core); const qp = await makeQuiz(pro);
    denied(await (await api()).post(`/api/quizzes/${qc.id}/sequences`).set(bearer(core)).send({ name: 'S', emails }));
    expect((await (await api()).post(`/api/quizzes/${qp.id}/sequences`).set(bearer(pro)).send({ name: 'S', emails })).status).toBe(201);
  });

  it('team seats: only Business can create a team', async () => {
    denied(await (await api()).post('/api/teams').set(bearer(await makeUser({ plan: 'pro' }))).send({ name: 'Crew' }));
    expect((await (await api()).post('/api/teams').set(bearer(await makeUser({ plan: 'business' }))).send({ name: 'Crew' })).status).toBe(201);
  });

  it('custom domain and white-label were already Business-only on the server (regression guard)', async () => {
    const pro = await makeUser({ plan: 'pro' });
    expect((await (await api()).patch('/api/user/custom-domain').set(bearer(pro)).send({ custom_domain: 'quiz.example.com' })).status).toBe(403);
    expect((await (await api()).patch('/api/white-label').set(bearer(pro)).send({ white_label_enabled: true })).status).toBe(403);
    const biz = await makeUser({ plan: 'business' });
    expect((await (await api()).patch('/api/user/custom-domain').set(bearer(biz)).send({ custom_domain: 'quiz.example.com' })).status).toBe(200);
  });

  it('branding removal: a paid plan may hide "powered by", a free account is forced back to visible', async () => {
    const free = await makeUser({ plan: 'free' });
    const q = await makeQuiz(free, { status: 'draft' });
    const r = await (await api()).patch(`/api/quizzes/${q.id}`).set(bearer(free)).send({ settings: { show_branding: false } });
    expect(r.body.settings.show_branding).toBe(true);
    const pro = await makeUser({ plan: 'pro' });
    const q2 = await makeQuiz(pro, { status: 'draft' });
    const r2 = await (await api()).patch(`/api/quizzes/${q2.id}`).set(bearer(pro)).send({ settings: { show_branding: false } });
    expect(r2.body.settings.show_branding).toBe(false);
  });
});

describe('trial length is consistent everywhere the customer can see it', () => {
  it('every "N-day trial" / "N days free" statement in the frontend and in backend emails equals the enforced 14 days', () => {
    const root = path.resolve(__dirname, '../../../..');
    const files: string[] = [];
    const walk = (d: string) => { for (const f of fs.readdirSync(d)) { if (['node_modules', '.next', '__tests__'].includes(f)) continue; const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|md)$/.test(p) && !p.endsWith('.b64')) files.push(p); } };
    walk(path.join(root, 'frontend/app')); walk(path.join(root, 'frontend/lib')); walk(path.join(root, 'backend/src/services'));
    const offenders: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\b(\d+)[- ]days?[ -](?:free[ -])?(?:pro )?(?:free )?trial\b|\b(\d+) days? free\b/gi)) {
        const n = Number(m[1] ?? m[2]);
        if (n !== 14) offenders.push(`${path.relative(root, f)}: "${m[0]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
