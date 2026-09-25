/**
 * Phase 1 - lead capture, result/outcome calculation, owner dashboard visibility,
 * repeated submissions, monthly lead limits, GDPR consent gating.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { api, makeUser, makeQuiz, bearer, waitFor, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { getCapturedTestEmails, clearCapturedTestEmails } from '../../services/email/testProvider';
import { hasBranching, resolveVisitedPath } from '../../services/branching';

beforeEach(async () => { await resetData(); clearCapturedTestEmails(); });

const lead = (over: Record<string, any> = {}) => ({ name: 'Ada Lovelace', email: 'ada@customer.example', answers: { 0: 2, 1: 2 }, ...over });

async function liveQuiz(plan = 'pro', settings: any = {}, days = 1) {
  const owner = await makeUser({ plan, createdDaysAgo: days });
  const quiz = await makeQuiz(owner, { slug: 'lead-quiz-' + Math.random().toString(36).slice(2, 7), settings });
  return { owner, quiz };
}

describe('lead submission', () => {
  it('stores the lead for the quiz owner, with server-computed outcome and score, and bumps the quiz lead counter once', async () => {
    const { owner, quiz } = await liveQuiz();
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ success: true });
    const row = (await sql<any>(`select * from leads where id=$1`, [r.body.lead_id]))[0];
    expect(row).toMatchObject({ quiz_id: quiz.id, user_id: owner.id, email: 'ada@customer.example', name: 'Ada Lovelace', outcome_id: 'high' });
    expect(row.score).toBe(4);
    expect(row.metadata).toMatchObject({ score: 4, outcome_title: 'High' });
    expect((await sql<any>(`select lead_count from quizzes where id=$1`, [quiz.id]))[0].lead_count).toBe(1);
  });

  it('the owner sees the new lead in the dashboard API (list, detail with score label, per-quiz list, CSV export)', async () => {
    const { owner, quiz } = await liveQuiz();
    const app = await api();
    const r = await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    const list = await app.get('/api/leads').set(bearer(owner));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ email: 'ada@customer.example', quizzes: { title: quiz.title, slug: quiz.slug } });
    const detail = await app.get(`/api/leads/${r.body.lead_id}`).set(bearer(owner));
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ email: 'ada@customer.example', score: 4 });
    expect(detail.body.score_label).not.toBe('Unknown');
    const perQuiz = await app.get(`/api/quizzes/${quiz.id}/leads`).set(bearer(owner));
    expect(perQuiz.body).toHaveLength(1);
    const csv = await app.get(`/api/quizzes/${quiz.id}/leads/export`).set(bearer(owner));
    expect(csv.status).toBe(200);
  });

  it('validation: missing email, malformed email, disposable email, honeypot, junk name, unknown or non-live quiz', async () => {
    const { quiz } = await liveQuiz();
    const app = await api();
    const url = `/api/quiz/${quiz.slug}/lead`;
    const post = (body: any) => app.post(url).set('X-Forwarded-For', nextIp()).send(body);
    expect((await post({ name: 'Ada' })).status).toBe(400);
    expect((await post(lead({ email: 'not-an-email' }))).status).toBe(400);
    expect((await post(lead({ email: 'x@mailinator.com' }))).status).toBe(400);
    expect((await post(lead({ website: 'http://spam.example' }))).status).toBe(400);
    expect((await post(lead({ name: 'asdf' }))).status).toBe(400);
    expect((await app.post('/api/quiz/nope/lead').set('X-Forwarded-For', nextIp()).send(lead())).status).toBe(404);
    expect(await sql(`select 1 from leads`)).toHaveLength(0);
  });

  it('repeated submission (client retry after a timeout, double click): one lead, success is returned again, no duplicate emails or counters', async () => {
    const { quiz, owner } = await liveQuiz();
    const app = await api();
    const first = await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    await waitFor(() => getCapturedTestEmails().length >= 2);
    const sentAfterFirst = getCapturedTestEmails().length;
    const second = await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    const third = await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email: 'ADA@customer.example ' }));
    expect([200, 201]).toContain(second.status);
    expect([200, 201]).toContain(third.status);
    expect(second.body.lead_id).toBe(first.body.lead_id);
    expect(third.body.lead_id).toBe(first.body.lead_id);
    expect(await sql(`select 1 from leads`)).toHaveLength(1);
    expect((await sql<any>(`select lead_count from quizzes where id=$1`, [quiz.id]))[0].lead_count).toBe(1);
    await new Promise((r) => setTimeout(r, 200));
    expect(getCapturedTestEmails().length).toBe(sentAfterFirst);
    void owner;
  });

  it('concurrent identical submissions create exactly one lead and all callers get success', async () => {
    const { quiz } = await liveQuiz();
    const app = await api();
    const rs = await Promise.all([1, 2, 3, 4].map(() => app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead())));
    expect(rs.map((r) => r.status).every((s) => s === 200 || s === 201)).toBe(true);
    expect(await sql(`select 1 from leads`)).toHaveLength(1);
  });

  it('a lead-cap error is a clean 403 JSON and never exposes database internals', async () => {
    const { quiz, owner } = await liveQuiz('core');
    await sql(`insert into leads (quiz_id, user_id, email, answers) select $1,$2,'seed'||g||'@x.example','{}'::jsonb from generate_series(1,1000) g`, [quiz.id, owner.id]);
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/limit/i);
    expect(JSON.stringify(r.body)).not.toMatch(/violates|constraint|relation|LEAD_LIMIT_REACHED/);
  });

  it('the core plan limit is monthly (1,000 leads / month): last month\'s leads do not block this month', async () => {
    const { quiz, owner } = await liveQuiz('core');
    await sql(`insert into leads (quiz_id, user_id, email, answers, created_at) select $1,$2,'old'||g||'@x.example','{}'::jsonb, now() - interval '45 days' from generate_series(1,1000) g`, [quiz.id, owner.id]);
    const r = await (await api()).post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(201);
  });

  it('trial: an owner inside the 14-day trial collects leads; after day 14 collection stops with a clear trial_expired error', async () => {
    const inTrial = await liveQuiz('free', {}, 13);
    expect((await (await api()).post(`/api/quiz/${inTrial.quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead())).status).toBe(201);
    const expired = await liveQuiz('free', {}, 15);
    const r = await (await api()).post(`/api/quiz/${expired.quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead());
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('trial_expired');
  });

  it('GDPR gate: with consent required and not given, the lead is stored but no result email is sent; with consent it is', async () => {
    const { quiz } = await liveQuiz('pro', { gdpr_consent_enabled: true });
    const app = await api();
    await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email: 'noconsent@customer.example' })).expect(201);
    await new Promise((r) => setTimeout(r, 300));
    expect(getCapturedTestEmails().filter((m) => String(m.to).includes('noconsent'))).toHaveLength(0);
    await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', nextIp()).send(lead({ email: 'consent@customer.example', consent: true, consent_text: 'I agree' })).expect(201);
    expect(await waitFor(() => getCapturedTestEmails().some((m) => String(m.to).includes('consent@customer.example')))).toBe(true);
  });
});

describe('result / outcome calculation is correct and server-authoritative', () => {
  const submit = async (slug: string, body: any) => (await api()).post(`/api/quiz/${slug}/lead`).set('X-Forwarded-For', nextIp()).send(body);
  const outcomeOf = async (id: string) => (await sql<any>(`select outcome_id, score from leads where id=$1`, [id]))[0];

  it('maps totals to the right outcome including inclusive boundaries', async () => {
    const { quiz } = await liveQuiz();
    const cases: Array<[Record<number, number>, string, number]> = [
      [{ 0: 0, 1: 0 }, 'low', 0], [{ 0: 1, 1: 0 }, 'low', 1], [{ 0: 1, 1: 1 }, 'mid', 2], [{ 0: 2, 1: 1 }, 'mid', 3], [{ 0: 2, 1: 2 }, 'high', 4],
    ];
    for (const [answers, outcome, score] of cases) {
      const r = await submit(quiz.slug, lead({ email: `c${score}@customer.example`, answers }));
      expect(await outcomeOf(r.body.lead_id), JSON.stringify(answers)).toMatchObject({ outcome_id: outcome, score });
    }
  });

  it('a client cannot choose its outcome: a forged outcome_id is ignored in favour of the computed one', async () => {
    const { quiz } = await liveQuiz();
    const r = await submit(quiz.slug, lead({ answers: { 0: 0, 1: 0 }, outcome_id: 'high' }));
    expect((await outcomeOf(r.body.lead_id)).outcome_id).toBe('low');
  });

  it('empty answers score 0 and map to the outcome whose range contains 0 (never a crash)', async () => {
    const { quiz } = await liveQuiz();
    const r = await submit(quiz.slug, lead({ answers: {} }));
    expect(r.status).toBe(201);
    expect(await outcomeOf(r.body.lead_id)).toMatchObject({ outcome_id: 'low', score: 0 });
    const r2 = await submit(quiz.slug, { name: 'Bob Jones', email: 'bob@customer.example' });
    expect(r2.status).toBe(201);
  });

  it('out-of-range / hostile answer values are ignored, not trusted', async () => {
    const { quiz } = await liveQuiz();
    const r = await submit(quiz.slug, lead({ answers: { 0: 99, 1: -1, 7: 2, foo: 'bar' } }));
    expect(r.status).toBe(201);
    expect(await outcomeOf(r.body.lead_id)).toMatchObject({ score: 0 });
  });

  it('overlapping ranges (a tie) resolve deterministically to the first matching outcome in quiz order', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'tie', outcomes: [
      { id: 'first', title: 'First', minScore: 0, maxScore: 5 }, { id: 'second', title: 'Second', minScore: 2, maxScore: 5 },
    ] });
    for (let i = 0; i < 3; i++) {
      const r = await submit(quiz.slug, lead({ email: `t${i}@customer.example`, answers: { 0: 1, 1: 1 } }));
      expect((await outcomeOf(r.body.lead_id)).outcome_id).toBe('first');
    }
  });

  it('multi-select answers (arrays) add every selected option score', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'multi', outcomes: [{ id: 'lo', title: 'Lo', minScore: 0, maxScore: 2 }, { id: 'hi', title: 'Hi', minScore: 3, maxScore: 10 }] });
    const r = await submit(quiz.slug, lead({ answers: { 0: [1, 2], 1: 0 } }));
    expect(await outcomeOf(r.body.lead_id)).toMatchObject({ outcome_id: 'hi', score: 3 });
  });

  it('server and browser use the same rule: an outcome list where only some outcomes carry score ranges resolves to the same result on both sides', async () => {
    // Browser rule copied verbatim from frontend/app/quiz/[slug]/page.tsx getOutcome (guarded below against drift).
    const src = fs.readFileSync(path.resolve(__dirname, '../../../../frontend/app/quiz/[slug]/page.tsx'), 'utf8');
    const m = src.match(/function getOutcome\([^)]*\)[^{]*\{[\s\S]*?\n\}/);
    expect(m, 'getOutcome not found in the quiz page; re-check server/browser parity').toBeTruthy();
    const js = m![0].replace(/\(quiz: Quiz, answers: Record<number, number>\): QuizOutcome \| null/, '(quiz, answers)');
    const clientGetOutcome = new Function('hasBranching', 'resolveVisitedPath', `${js}; return getOutcome;`)(hasBranching, resolveVisitedPath);
    const quizDef = { questions: [{ options: [{ score: 0 }, { score: 1 }, { score: 2 }] }, { options: [{ score: 0 }, { score: 1 }, { score: 2 }] }],
      outcomes: [{ id: 'open', title: 'Open (no range)' }, { id: 'ranged', title: 'Ranged', minScore: 0, maxScore: 10 }] };
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'parity', questions: quizDef.questions, outcomes: quizDef.outcomes });
    for (const answers of [{ 0: 0, 1: 0 }, { 0: 2, 1: 2 }, {}]) {
      const clientOutcome = clientGetOutcome(quizDef, answers).id;
      const r = await submit(quiz.slug, lead({ email: `p${Object.keys(answers).length}${JSON.stringify(answers).length}@customer.example`, answers }));
      expect((await outcomeOf(r.body.lead_id)).outcome_id, JSON.stringify(answers)).toBe(clientOutcome);
    }
  });
});

describe('client_qualifier and price_calculator modes are recomputed server-side', () => {
  it('qualified / path_taken come from the score and the threshold, never from the request', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'qual', mode: 'client_qualifier', settings: { qualification_threshold: 3 } });
    const app = await api();
    const hi = await app.post('/api/quiz/qual/lead').set('X-Forwarded-For', nextIp()).send(lead({ email: 'hi@customer.example', answers: { 0: 2, 1: 2 }, qualified: false }));
    const lo = await app.post('/api/quiz/qual/lead').set('X-Forwarded-For', nextIp()).send(lead({ email: 'lo@customer.example', answers: { 0: 0, 1: 0 }, qualified: true }));
    const meta = async (id: string) => (await sql<any>(`select metadata from leads where id=$1`, [id]))[0].metadata;
    expect(await meta(hi.body.lead_id)).toMatchObject({ qualified: true, path_taken: 'booking' });
    expect(await meta(lo.body.lead_id)).toMatchObject({ qualified: false, path_taken: 'nurture' });
    void quiz;
  });
});

describe('repeated form submission is throttled per client and quiz (works without Redis)', () => {
  it('the 4th submission from one IP to one quiz inside a minute is answered 429 with a Retry-After hint; other clients are unaffected', async () => {
    const { quiz } = await liveQuiz();
    const app = await api();
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', '203.0.113.9').send(lead({ email: `rl${i}@customer.example` }))).status);
    expect(codes.slice(0, 3).every((c) => c === 201)).toBe(true);
    expect(codes.slice(3)).toEqual([429, 429]);
    const other = await app.post(`/api/quiz/${quiz.slug}/lead`).set('X-Forwarded-For', '203.0.113.10').send(lead({ email: 'other-client@customer.example' }));
    expect(other.status).toBe(201);
  });
});
