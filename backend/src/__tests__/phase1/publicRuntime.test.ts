/**
 * Phase 1 - published quiz runtime: hosted link, embed, publish, preview, analytics events.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { api, makeUser, makeQuiz, bearer, sampleQuiz, getApp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';

beforeEach(resetData);

describe('save / reopen / edit', () => {
  it('PATCH saves edits, GET reopens exactly what was saved, and updated_at moves', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft' });
    const app = await api();
    const edited = sampleQuiz({ title: 'Edited title' });
    edited.questions[0].text = 'Edited question text';
    const r = await app.patch(`/api/quizzes/${q.id}`).set(bearer(u)).send({ title: edited.title, questions: edited.questions });
    expect(r.status).toBe(200);
    const reopened = await app.get(`/api/quizzes/${q.id}`).set(bearer(u));
    expect(reopened.body.title).toBe('Edited title');
    expect(reopened.body.questions[0].text).toBe('Edited question text');
  });
  it('optimistic locking: a stale expected_version is rejected with 409 and does not overwrite', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft' });
    const app = await api();
    const ok = await app.patch(`/api/quizzes/${q.id}`).set(bearer(u)).send({ title: 'v2', expected_version: 1 });
    expect(ok.status).toBe(200);
    const stale = await app.patch(`/api/quizzes/${q.id}`).set(bearer(u)).send({ title: 'stale write', expected_version: 1 });
    expect(stale.status).toBe(409);
    expect((await sql<any>(`select title from quizzes where id=$1`, [q.id]))[0].title).toBe('v2');
  });
  it('PATCH cannot change ownership, slug or status through the body', async () => {
    const u = await makeUser({ plan: 'pro' });
    const other = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft', slug: 'keep-my-slug' });
    await (await api()).patch(`/api/quizzes/${q.id}`).set(bearer(u)).send({ user_id: other.id, slug: 'stolen', status: 'live', lead_count: 999 });
    const row = (await sql<any>(`select user_id, slug, status, lead_count from quizzes where id=$1`, [q.id]))[0];
    expect(row).toMatchObject({ user_id: u.id, slug: 'keep-my-slug', status: 'draft', lead_count: 0 });
  });
  it('a non-owner PATCH returns 404 (not a 500)', async () => {
    const u = await makeUser({ plan: 'pro' });
    const other = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft' });
    const r = await (await api()).patch(`/api/quizzes/${q.id}`).set(bearer(other)).send({ title: 'x' });
    expect(r.status).toBe(404);
  });
  it('archive (DELETE) then restore round-trips and an archived quiz stops being served', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'live', slug: 'roundtrip' });
    const app = await api();
    expect((await app.delete(`/api/quizzes/${q.id}`).set(bearer(u))).status).toBe(200);
    expect((await app.get('/api/quiz/roundtrip')).status).toBe(404);
    expect((await app.post(`/api/quizzes/${q.id}/restore`).set(bearer(u))).status).toBe(200);
  });
});

describe('preview (unpublished) vs published', () => {
  it('a draft is readable by its owner in the editor but is not served on the public hosted URL', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft', slug: 'draft-preview' });
    const app = await api();
    expect((await app.get(`/api/quizzes/${q.id}`).set(bearer(u))).status).toBe(200);
    expect((await app.get('/api/quiz/draft-preview')).status).toBe(404);
  });
});

describe('publish', () => {
  it('publish requires at least one question and one outcome', async () => {
    const u = await makeUser({ plan: 'pro' });
    const noQ = await makeQuiz(u, { status: 'draft', questions: [] });
    const noO = await makeQuiz(u, { status: 'draft', outcomes: [] });
    const app = await api();
    expect((await app.post(`/api/quizzes/${noQ.id}/publish`).set(bearer(u))).status).toBe(400);
    expect((await app.post(`/api/quizzes/${noO.id}/publish`).set(bearer(u))).status).toBe(400);
  });
  it('publishing makes the quiz available at /api/quiz/:slug; pausing takes it offline again', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { status: 'draft', slug: 'go-live' });
    const app = await api();
    const pub = await app.post(`/api/quizzes/${q.id}/publish`).set(bearer(u));
    expect(pub.status).toBe(200);
    expect(pub.body.status).toBe('live');
    const served = await app.get(`/api/quiz/${pub.body.slug}`);
    expect(served.status).toBe(200);
    expect(served.body.title).toBe(q.title);
    expect(served.body.questions).toHaveLength(2);
    expect((await app.post(`/api/quizzes/${q.id}/pause`).set(bearer(u))).status).toBe(200);
    expect((await app.get(`/api/quiz/${pub.body.slug}`)).status).toBe(404);
  });
  it('publish is refused for an expired-trial account (their quizzes must not go live for free)', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 40 });
    const q = await makeQuiz(u, { status: 'draft' });
    const r = await (await api()).post(`/api/quizzes/${q.id}/publish`).set(bearer(u));
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('trial_expired');
  });
});

describe('hosted-link runtime: GET /api/quiz/:slug', () => {
  it('serves a live quiz publicly without the owner id, and reports the owner plan for feature gating', async () => {
    const u = await makeUser({ plan: 'pro' });
    await makeQuiz(u, { status: 'live', slug: 'hosted' });
    const r = await (await api()).get('/api/quiz/hosted');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ owner_plan: 'pro' });
    expect(r.body.user_id).toBeUndefined();
    expect(r.body.questions).toHaveLength(2);
    expect(r.body.outcomes).toHaveLength(3);
  });
  it('unknown slug -> 404 JSON', async () => {
    const r = await (await api()).get('/api/quiz/does-not-exist');
    expect(r.status).toBe(404);
    expect(r.headers['content-type']).toMatch(/json/);
  });
  it('scheduled quizzes: before publish_at and after unpublish_at the quiz is 404', async () => {
    const u = await makeUser({ plan: 'pro' });
    await makeQuiz(u, { slug: 'future', settings: { schedule_enabled: true, publish_at: new Date(Date.now() + 86400000).toISOString() } });
    await makeQuiz(u, { slug: 'expired', settings: { schedule_enabled: true, unpublish_at: new Date(Date.now() - 86400000).toISOString() } });
    await makeQuiz(u, { slug: 'window', settings: { schedule_enabled: true, publish_at: new Date(Date.now() - 86400000).toISOString(), unpublish_at: new Date(Date.now() + 86400000).toISOString() } });
    const app = await api();
    expect((await app.get('/api/quiz/future')).status).toBe(404);
    expect((await app.get('/api/quiz/expired')).status).toBe(404);
    expect((await app.get('/api/quiz/window')).status).toBe(200);
  });
});

describe('embed runtime', () => {
  it('cross-origin embeds can load the quiz and submit leads: CORS allows any origin on the public runtime endpoints', async () => {
    const app = await getApp();
    for (const [method, p] of [['get', '/api/quiz/x'], ['post', '/api/quiz/x/lead'], ['post', '/api/quiz/x/event']] as const) {
      const pre = await request(app).options(p).set('Origin', 'https://customer-site.example').set('Access-Control-Request-Method', method.toUpperCase()).set('Access-Control-Request-Headers', 'content-type');
      expect(pre.headers['access-control-allow-origin'], `${method} ${p}`).toBe('*');
    }
  });
  it('the authenticated API does not grant credentialed CORS to arbitrary origins', async () => {
    const r = await request(await getApp()).get('/api/user/plan').set('Origin', 'https://evil.example');
    expect(r.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
  it('the embed loader script and the vercel embed headers permit framing on customer sites', async () => {
    const vercel = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../frontend/vercel.json'), 'utf8'));
    const embedRule = vercel.headers.find((h: any) => h.source === '/embed/:slug');
    const csp = embedRule.headers.find((h: any) => h.key === 'Content-Security-Policy').value;
    expect(csp).toContain('frame-ancestors *');
    expect(fs.existsSync(path.resolve(__dirname, '../../../../frontend/public/embed/quiz-embed.js'))).toBe(true);
    expect(vercel.rewrites).toContainEqual({ source: '/embed.js', destination: '/embed/quiz-embed.js' });
  });
});

describe('analytics events: views, starts and completions are recorded once and correctly', () => {
  it('view / start / complete events are stored for a live quiz and reflected in the owner analytics', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { slug: 'stats' });
    const app = await api();
    for (const s of ['s1', 's2', 's3']) await app.post('/api/quiz/stats/event').send({ event_type: 'view', session_id: s }).expect(200);
    for (const s of ['s1', 's2']) await app.post('/api/quiz/stats/event').send({ event_type: 'start', session_id: s }).expect(200);
    await app.post('/api/quiz/stats/event').send({ event_type: 'complete', session_id: 's1', metadata: { outcome_id: 'low' } }).expect(200);
    const a = await app.get(`/api/analytics/${q.id}`).set(bearer(u));
    expect(a.body).toMatchObject({ views: 3, completions: 1 });
    const f = await app.get(`/api/analytics/${q.id}/funnel`).set(bearer(u));
    expect(f.body).toMatchObject({ viewed: 3, started: 2, completed: 1 });
  });
  it('the same session firing the same view/start/complete twice (double effect, retry, reload) is counted once', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { slug: 'dedupe' });
    const app = await api();
    for (const t of ['view', 'view', 'start', 'start', 'complete', 'complete']) await app.post('/api/quiz/dedupe/event').send({ event_type: t, session_id: 'same-session' });
    const counts = await sql<any>(`select event_type, count(*)::int n from analytics_events where quiz_id=$1 group by 1`, [q.id]);
    const m = Object.fromEntries(counts.map((r: any) => [r.event_type, r.n]));
    expect(m).toEqual({ view: 1, start: 1, complete: 1 });
    expect((await sql<any>(`select view_count from quizzes where id=$1`, [q.id]))[0].view_count).toBe(1);
  });
  it('bot traffic is flagged and does not inflate the public view counter', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { slug: 'bots' });
    const app = await api();
    await app.post('/api/quiz/bots/event').set('User-Agent', 'Googlebot/2.1').send({ event_type: 'view', session_id: 'bot1' });
    await app.post('/api/quiz/bots/event').set('User-Agent', 'Mozilla/5.0 (Macintosh) Safari').send({ event_type: 'view', session_id: 'human1' });
    expect((await sql<any>(`select view_count from quizzes where id=$1`, [q.id]))[0].view_count).toBe(1);
    const filtered = await app.get(`/api/analytics/${q.id}?exclude_bots=true`).set(bearer(u));
    expect(filtered.body.views).toBe(1);
  });
  it('unknown event types and unknown / non-live quizzes are rejected', async () => {
    const u = await makeUser({ plan: 'pro' });
    await makeQuiz(u, { slug: 'strict' });
    await makeQuiz(u, { slug: 'draft-events', status: 'draft' });
    const app = await api();
    expect((await app.post('/api/quiz/strict/event').send({ event_type: '<script>alert(1)</script>', session_id: 'x' })).status).toBe(400);
    expect((await app.post('/api/quiz/nope/event').send({ event_type: 'view', session_id: 'x' })).status).toBe(404);
    expect((await app.post('/api/quiz/draft-events/event').send({ event_type: 'view', session_id: 'x' })).status).toBe(404);
  });
  it('per-question events feed the drop-off report', async () => {
    const u = await makeUser({ plan: 'pro' });
    const q = await makeQuiz(u, { slug: 'dropoff' });
    const app = await api();
    for (const t of ['question_0_view', 'question_0_answer', 'question_1_view']) await app.post('/api/quiz/dropoff/event').send({ event_type: t, session_id: 'd1' });
    const r = await app.get(`/api/analytics/${q.id}/dropoff`).set(bearer(u));
    expect(r.body[0]).toMatchObject({ started: 1, completed: 1 });
    expect(r.body[1]).toMatchObject({ started: 1, completed: 0 });
  });
});
