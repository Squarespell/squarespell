/**
 * Phase 1 - tenant isolation. User A owns data in every tenant-scoped table;
 * user B (a different paying customer) then attacks every authenticated route
 * with A's identifiers. No response may reveal A's data and no A row may change.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp, makeUser, makeQuiz, bearer, TestUser } from '../helpers/testkit';
import { listRoutes } from '../helpers/routes';
import { resetData, sql } from '../helpers/db';

const MARK = 'A-PRIVATE-MARKER-7f3a';
let A: TestUser, B: TestUser;
let ids: Record<string, string> = {};

const TABLES = [
  'quizzes', 'leads', 'integrations', 'email_campaigns', 'email_sequences', 'ab_tests', 'saved_templates', 'lead_tags',
  'lead_tag_assignments', 'lead_segments', 'auto_tag_rules', 'email_automation_rules', 'teams', 'team_members', 'team_quizzes',
  'notifications', 'result_page_blocks', 'quiz_translations', 'squarespace_connections', 'squarespace_products',
  'product_outcome_mappings', 'api_keys', 'quiz_payments', 'users', 'partial_completions', 'consent_records', 'quiz_question_events',
];

async function snapshot(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const t of TABLES) {
    const rows = await sql<any>(t === 'users' ? `select id, clerk_user_id, email, plan, quiz_count, brand_kit, lead_addon from users order by 1` : `select * from ${t} order by 1`);
    out[t] = JSON.stringify(rows);
  }
  return out;
}

beforeEach(async () => {
  await resetData();
  ids = {};
  A = await makeUser({ plan: 'business', email: `a-${MARK}@victim.example` });
  B = await makeUser({ plan: 'business', email: 'attacker@other.example' });
  const quiz = await makeQuiz(A, { title: `Quiz ${MARK}`, status: 'live', slug: 'a-private-quiz' });
  ids.quiz = quiz.id;
  const lead = (await sql<any>(`insert into leads (quiz_id, user_id, name, email, answers, outcome_id) values ($1,$2,$3,$4,'{}'::jsonb,'low') returning id`, [quiz.id, A.id, `Lead ${MARK}`, `lead-${MARK}@victim.example`]))[0];
  ids.lead = lead.id; ids.leadEmail = `lead-${MARK}@victim.example`;
  ids.integration = (await sql<any>(`insert into integrations (user_id, type, config) values ($1,'webhook',$2::jsonb) returning id`, [A.id, JSON.stringify({ url: `https://hooks.example/${MARK}` })]))[0].id;
  ids.campaign = (await sql<any>(`insert into email_campaigns (tenant_id, name, subject, from_name, from_email, html) values ($1,$2,'s','n','a@victim.example','<p>x</p>') returning id`, [A.id, `Campaign ${MARK}`]))[0].id;
  ids.sequence = (await sql<any>(`insert into email_sequences (quiz_id, outcome_id, name, emails) values ($1,'low',$2,'[]'::jsonb) returning id`, [quiz.id, `Seq ${MARK}`]))[0].id;
  ids.abtest = (await sql<any>(`insert into ab_tests (user_id, quiz_id, name, variants) values ($1,$2,$3,'[]'::jsonb) returning id`, [A.id, quiz.id, `AB ${MARK}`]))[0].id;
  ids.template = (await sql<any>(`insert into saved_templates (user_id, name, blocks) values ($1,$2,'[]'::jsonb) returning id`, [A.id, `Tpl ${MARK}`]))[0].id;
  ids.tag = (await sql<any>(`insert into lead_tags (user_id, name) values ($1,$2) returning id`, [A.id, `Tag ${MARK}`]))[0].id;
  await sql(`insert into lead_tag_assignments (lead_id, tag_id) values ($1,$2)`, [ids.lead, ids.tag]);
  ids.segment = (await sql<any>(`insert into lead_segments (user_id, name, rules) values ($1,$2,'[]'::jsonb) returning id`, [A.id, `Seg ${MARK}`]))[0].id;
  ids.rule = (await sql<any>(`insert into auto_tag_rules (user_id, tag_id, conditions) values ($1,$2,'{}'::jsonb) returning id`, [A.id, ids.tag]))[0].id;
  ids.automation = (await sql<any>(`insert into email_automation_rules (user_id, name, trigger_config, action_config) values ($1,$2,'{}'::jsonb,'{}'::jsonb) returning id`, [A.id, `Auto ${MARK}`]))[0].id;
  ids.team = (await sql<any>(`insert into teams (name, owner_id) values ($1,$2) returning id`, [`Team ${MARK}`, A.id]))[0].id;
  await sql(`insert into team_members (team_id, user_id, email, role) values ($1,$2,$3,'owner')`, [ids.team, A.id, A.email]);
  await sql(`insert into team_quizzes (team_id, quiz_id) values ($1,$2)`, [ids.team, quiz.id]);
  ids.notification = (await sql<any>(`insert into notifications (user_id, type, title) values ($1,'x',$2) returning id`, [A.id, `Notif ${MARK}`]))[0].id;
  ids.block = (await sql<any>(`insert into result_page_blocks (quiz_id, outcome_id, block_type, config) values ($1,'low','text',$2::jsonb) returning id`, [quiz.id, JSON.stringify({ text: MARK })]))[0].id;
  await sql(`insert into quiz_translations (quiz_id, language_code, translations) values ($1,'fr',$2::jsonb)`, [quiz.id, JSON.stringify({ title: MARK })]);
  const conn = (await sql<any>(`insert into squarespace_connections (user_id, site_id, api_key_encrypted, site_title) values ($1,'site1','enc',$2) returning id`, [A.id, `Site ${MARK}`]))[0];
  ids.connection = conn.id;
  ids.product = (await sql<any>(`insert into squarespace_products (connection_id, user_id, squarespace_id, name) values ($1,$2,'p1',$3) returning id`, [conn.id, A.id, `Prod ${MARK}`]))[0].id;
  await sql(`insert into product_outcome_mappings (quiz_id, outcome_id, product_id, custom_headline) values ($1,'low',$2,$3)`, [quiz.id, ids.product, `Headline ${MARK}`]);
  await sql(`insert into partial_completions (quiz_id, session_id, answers, email, name) values ($1,'sess-a','{}'::jsonb,$2,$3)`, [quiz.id, `partial-${MARK}@victim.example`, `Partial ${MARK}`]);
  await sql(`insert into consent_records (lead_id, email, quiz_id, consent_type, consent_given) values ($1,$2,$3,'marketing',true)`, [ids.lead, ids.leadEmail, quiz.id]);
  await sql(`insert into quiz_question_events (quiz_id, session_id, question_index, event_type, answer_data) values ($1,'sess-a',0,'answer',$2::jsonb)`, [quiz.id, JSON.stringify({ v: MARK })]);
  await sql(`insert into api_keys (user_id, key_hash, key_prefix, name) values ($1,'hash','sq_live_x',$2)`, [A.id, `Key ${MARK}`]);
  await sql(`insert into quiz_payments (quiz_id, lead_id, amount_cents) values ($1,$2,4200)`, [quiz.id, ids.lead]);
  await sql(`update users set brand_kit = $2::jsonb where id=$1`, [A.id, JSON.stringify({ site_name: MARK })]).catch(() => {});
  await sql(`insert into analytics_events (quiz_id, event_type, session_id) values ($1,'view','s-a')`, [quiz.id]);
});

function fill(path: string): string {
  const map: Record<string, string> = {
    quizId: ids.quiz, testId: ids.abtest, sequenceId: ids.sequence, teamId: ids.team, leadId: ids.lead, campaignId: ids.campaign,
    outcomeId: 'low', blockId: ids.block, productId: ids.product, lang: 'fr', index: '0', userId: A.id, stage: 'hot', type: 'welcome', email: ids.leadEmail, slug: 'a-private-quiz',
  };
  return path.replace(/:([A-Za-z]+)/g, (_m, name) => {
    if (name !== 'id') return map[name] ?? '1';
    // ambiguous ":id": choose by route family
    if (/\/leads\//.test(path)) return ids.lead;
    if (/\/integrations\//.test(path)) return ids.integration;
    if (/\/emails\/campaigns\//.test(path)) return ids.campaign;
    if (/\/templates\/saved\//.test(path)) return ids.template;
    if (/\/tags\//.test(path)) return ids.tag;
    if (/\/segments\//.test(path)) return ids.segment;
    if (/\/auto-tag-rules\//.test(path)) return ids.rule;
    if (/\/automations\//.test(path)) return ids.automation;
    if (/\/teams\//.test(path)) return ids.team;
    if (/\/commerce\/connections\//.test(path)) return ids.connection;
    if (/\/notifications\//.test(path)) return ids.notification;
    if (/\/suppressions\//.test(path)) return ids.lead;
    return ids.quiz;
  });
}

const attackBody = () => ({
  title: 'hijack', name: 'hijack', email: 'x@y.example', plan: 'free', status: 'archived', active: false, enabled: false, language: 'fr',
  tag_id: ids.tag, tagId: ids.tag, quiz_id: ids.quiz, quizId: ids.quiz, lead_id: ids.lead, outcome_id: 'low', product_id: ids.product,
  team_id: ids.team, role: 'editor', config: { url: 'https://evil.example' }, translations: { title: 'hijack' }, css: 'x{}', custom_css: 'x{}',
  variants: [], winner_variant_id: 'a', settings: { hijacked: true }, rules: [], conditions: {}, emails: [], product_ids: [ids.product],
  block_type: 'text', block_order: 1, order: [ids.block], blocks: [], subject: 'hijack', html: '<p>hijack</p>',
});

const SKIP = new Set([
  'GET /api/quizzes/public/ab-test/:testId/assign', // public by design (visitor assignment)
  'POST /api/user/notifications', // creates a notification for the caller
]);

describe('tenant isolation sweep: B calls every authenticated route with A\'s ids', () => {
  it('no response discloses A\'s data (read routes)', async () => {
    const app = await getApp();
    const routes = listRoutes(app).filter((r) => r.handlers.includes('requireAuth') && r.path.includes(':') && !SKIP.has(`${r.method} ${r.path}`));
    expect(routes.length).toBeGreaterThan(80);
    const leaks: string[] = [];
    for (const r of routes) {
      const url = fill(r.path);
      const req = (request(app) as any)[r.method.toLowerCase()](url).set(bearer(B)).timeout({ response: 8000, deadline: 12000 });
      const res = await (r.method === 'GET' || r.method === 'DELETE' ? req : req.send(attackBody())).catch((e: any) => ({ status: 0, text: '', body: {}, error: e }));
      const body = JSON.stringify(res.body ?? {}) + (res.text ?? '');
      if (body.includes(MARK) || body.includes('victim.example')) leaks.push(`${r.method} ${url} -> ${res.status} discloses A's data`);
    }
    expect(leaks).toEqual([]);
  });

  it('B\'s mutating attempts leave every A-owned row untouched', async () => {
    const app = await getApp();
    const before = await snapshot();
    const routes = listRoutes(app).filter((r) => r.handlers.includes('requireAuth') && r.path.includes(':') && r.method !== 'GET' && !SKIP.has(`${r.method} ${r.path}`));
    const hits: string[] = [];
    for (const r of routes) {
      const url = fill(r.path);
      const req = (request(app) as any)[r.method.toLowerCase()](url).set(bearer(B)).timeout({ response: 8000, deadline: 12000 });
      const res = await (r.method === 'DELETE' ? req : req.send(attackBody())).catch((e: any) => ({ status: 0, error: e }));
      const after = await snapshot();
      const changed = TABLES.filter((t) => after[t] !== before[t]);
      if (changed.length) { hits.push(`${r.method} ${url} -> ${res.status} changed: ${changed.join(',')}`); Object.assign(before, after); }
    }
    expect(hits).toEqual([]);
  });
});

describe('explicit tenant-isolation contract (the flows that matter most)', () => {
  it('B cannot read, update, delete, publish, pause, duplicate or list A\'s quiz', async () => {
    const app = await getApp();
    const q = ids.quiz;
    for (const [m, p] of [['get', `/api/quizzes/${q}`], ['patch', `/api/quizzes/${q}`], ['delete', `/api/quizzes/${q}`], ['post', `/api/quizzes/${q}/publish`], ['post', `/api/quizzes/${q}/pause`], ['post', `/api/quizzes/${q}/duplicate`], ['post', `/api/quizzes/${q}/restore`]] as const) {
      const res = await (request(app) as any)[m](p).set(bearer(B)).send({ title: 'hijack' });
      expect([403, 404], `${m} ${p} -> ${res.status}`).toContain(res.status);
    }
    const list = await request(app).get('/api/quizzes').set(bearer(B));
    expect(JSON.stringify(list.body)).not.toContain(MARK);
    const row = (await sql<any>(`select title,status from quizzes where id=$1`, [q]))[0];
    expect(row.title).toContain(MARK);
    expect(row.status).toBe('live');
  });

  it('B cannot read A\'s leads through any lead endpoint (list, detail, per-quiz list, export, dashboard feed, GDPR export)', async () => {
    const app = await getApp();
    const urls = ['/api/leads', `/api/leads/${ids.lead}`, `/api/quizzes/${ids.quiz}/leads`, `/api/quizzes/${ids.quiz}/leads/export`, '/api/dashboard/activity', `/api/gdpr/export/${encodeURIComponent(ids.leadEmail)}`, `/api/gdpr/consent/${encodeURIComponent(ids.leadEmail)}`, `/api/quizzes/${ids.quiz}/payments`];
    for (const u of urls) {
      const res = await request(app).get(u).set(bearer(B));
      expect(JSON.stringify(res.body) + res.text, u).not.toMatch(/A-PRIVATE-MARKER|victim\.example/);
    }
  });

  it('B cannot read A\'s analytics', async () => {
    const app = await getApp();
    for (const s of ['', '/timeseries', '/funnel', '/dropoff', '/results', '/devices', '/time-to-complete', '/question-heatmap', '/partial-stats']) {
      const res = await request(app).get(`/api/analytics/${ids.quiz}${s}`).set(bearer(B));
      expect([200, 403, 404], `${s} -> ${res.status}`).toContain(res.status);
      if (res.status === 200) expect(JSON.stringify(res.body), s).not.toMatch(/"view_count":[1-9]|"total_views":[1-9]|"views":[1-9]/);
    }
  });

  it('B cannot list or use A\'s integrations, brand kit, campaigns, saved templates', async () => {
    const app = await getApp();
    for (const u of ['/api/integrations', '/api/user/brand-kit', '/api/emails/campaigns', '/api/emails/templates/saved', '/api/tags', '/api/segments', '/api/automations', '/api/teams', '/api/quizzes/teams']) {
      const res = await request(app).get(u).set(bearer(B));
      expect(JSON.stringify(res.body) + res.text, u).not.toMatch(/A-PRIVATE-MARKER|victim\.example/);
    }
  });

  it('slug guessing: a draft/archived quiz is not served publicly; a live quiz never exposes the owner id', async () => {
    const draft = await makeQuiz(A, { status: 'draft', slug: 'a-draft-quiz' });
    const arch = await makeQuiz(A, { status: 'archived', slug: 'a-archived-quiz' });
    const app = await getApp();
    expect((await request(app).get('/api/quiz/a-draft-quiz')).status).toBe(404);
    expect((await request(app).get('/api/quiz/a-archived-quiz')).status).toBe(404);
    expect((await request(app).get(`/api/quiz/${draft.id}`)).status).toBe(404);
    const live = await request(app).get('/api/quiz/a-private-quiz');
    expect(live.status).toBe(200);
    expect(JSON.stringify(live.body)).not.toContain(A.id);
    expect(live.body.user_id).toBeUndefined();
    void arch;
  });

  it('unauthenticated access to any resource id -> 401, not data', async () => {
    const app = await getApp();
    for (const u of [`/api/quizzes/${ids.quiz}`, `/api/leads/${ids.lead}`, `/api/analytics/${ids.quiz}`, `/api/quizzes/${ids.quiz}/leads/export`]) {
      expect((await request(app).get(u)).status).toBe(401);
    }
  });

  it('IDOR probing with non-uuid / SQL-looking ids returns a clean 4xx, never a 500 with database internals', async () => {
    const app = await getApp();
    for (const id of ['undefined', "1' OR '1'='1", '../../etc/passwd', '00000000-0000-0000-0000-000000000000']) {
      const res = await request(app).get(`/api/quizzes/${encodeURIComponent(id)}`).set(bearer(B));
      expect(res.status, id).toBeLessThan(500);
      expect(JSON.stringify(res.body)).not.toMatch(/invalid input syntax|PGRST|postgres|relation "/i);
    }
  });
});
