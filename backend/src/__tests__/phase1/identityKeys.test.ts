/**
 * Phase 1 - features keyed by the database user id must work for their owner.
 * Several route files compared req.userId (the Clerk id, "user_...") with uuid columns, so tags, segments,
 * automations, translations, rich results, custom CSS, GDPR, partial-completion and question analytics failed
 * for every real user. (Tenant isolation looked perfect only because nothing worked.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';

let owner: any, quiz: any, leadId: string;
beforeEach(async () => {
  await resetData();
  owner = await makeUser({ plan: 'pro' });
  quiz = await makeQuiz(owner, { slug: 'idkeys' });
  leadId = (await sql<any>(`insert into leads (quiz_id, user_id, name, email, answers, outcome_id) values ($1,$2,'Ada','ada@customer.example','{}'::jsonb,'low') returning id`, [quiz.id, owner.id]))[0].id;
  await sql(`insert into consent_records (lead_id, email, quiz_id, consent_type, consent_given) values ($1,'ada@customer.example',$2,'email_marketing',true)`, [leadId, quiz.id]);
});

describe('owner can use the feature routes', () => {
  it('lead tags: create, list, assign, read back, unassign', async () => {
    const app = await api();
    const tag = await app.post('/api/tags').set(bearer(owner)).send({ name: 'Hot', color: '#f00' });
    expect(tag.status, JSON.stringify(tag.body)).toBe(201);
    expect((await app.get('/api/tags').set(bearer(owner))).body.map((t: any) => t.name)).toContain('Hot');
    expect((await app.post(`/api/leads/${leadId}/tags`).set(bearer(owner)).send({ tag_id: tag.body.id })).status).toBe(200);
    expect((await app.get(`/api/leads/${leadId}/tags`).set(bearer(owner))).body.map((t: any) => t.name)).toEqual(['Hot']);
    expect((await app.delete(`/api/leads/${leadId}/tags/${tag.body.id}`).set(bearer(owner))).status).toBe(200);
  });
  it('segments and automations: create then list', async () => {
    const app = await api();
    const seg = await app.post('/api/segments').set(bearer(owner)).send({ name: 'VIP', rules: [] });
    expect(seg.status, JSON.stringify(seg.body)).toBe(201);
    expect((await app.get('/api/segments').set(bearer(owner))).body.map((s: any) => s.name)).toContain('VIP');
    const auto = await app.post('/api/automations').set(bearer(owner)).send({ name: 'Welcome', trigger_config: { event: 'lead_created' }, action_config: { subject: 'Hi' } });
    expect(auto.status, JSON.stringify(auto.body)).toBe(201);
    expect((await app.get('/api/automations').set(bearer(owner))).body.map((a: any) => a.name)).toContain('Welcome');
  });
  it('translations: save, list, read one', async () => {
    const app = await api();
    const put = await app.put(`/api/quizzes/${quiz.id}/translations/fr`).set(bearer(owner)).send({ translations: { title: 'Bonjour' } });
    expect(put.status, JSON.stringify(put.body)).toBe(200);
    expect((await app.get(`/api/quizzes/${quiz.id}/translations`).set(bearer(owner))).body).toHaveLength(1);
    expect((await app.get(`/api/quizzes/${quiz.id}/translations/fr`).set(bearer(owner))).status).toBe(200);
  });
  it('rich result blocks: create, list, update, reorder, delete', async () => {
    const app = await api();
    const b = await app.post(`/api/quizzes/${quiz.id}/outcomes/low/blocks`).set(bearer(owner)).send({ block_type: 'text', config: { text: 'hi' } });
    expect(b.status, JSON.stringify(b.body)).toBeLessThan(300);
    expect((await app.get(`/api/quizzes/${quiz.id}/outcomes/low/blocks`).set(bearer(owner))).body).toHaveLength(1);
    expect((await app.patch(`/api/quizzes/${quiz.id}/outcomes/low/blocks/${b.body.id}`).set(bearer(owner)).send({ block_type: 'text', config: { text: 'bye' } })).status).toBe(200);
    expect((await app.put(`/api/quizzes/${quiz.id}/outcomes/low/blocks/reorder`).set(bearer(owner)).send({ block_ids: [b.body.id] })).status).toBe(200);
    expect((await app.delete(`/api/quizzes/${quiz.id}/outcomes/low/blocks/${b.body.id}`).set(bearer(owner))).status).toBe(200);
  });
  it('custom CSS (Pro), question analytics, partial-completion stats and embed performance answer for the owner', async () => {
    const app = await api();
    expect((await app.put(`/api/quizzes/${quiz.id}/custom-css`).set(bearer(owner)).send({ css: '.quiz{color:red}' })).status).toBe(200);
    expect((await app.get(`/api/analytics/${quiz.id}/question/0/distribution`).set(bearer(owner))).status).toBe(200);
    expect((await app.get(`/api/analytics/${quiz.id}/partial-stats`).set(bearer(owner))).status).toBe(200);
    expect((await app.get(`/api/analytics/${quiz.id}/embed-performance`).set(bearer(owner))).status).toBe(200);
  });
  it('GDPR: the owner can read consent history and export data for their own lead', async () => {
    const app = await api();
    const consent = await app.get('/api/gdpr/consent/ada@customer.example').set(bearer(owner));
    expect(consent.status).toBe(200);
    expect(consent.body).toHaveLength(1);
    const exp = await app.get('/api/gdpr/export/ada@customer.example').set(bearer(owner));
    expect(exp.status).toBe(200);
    expect(exp.body.leads).toHaveLength(1);
    expect(exp.body.consent_records).toHaveLength(1);
  });
  it('GDPR exports never include another business\'s records for the same person', async () => {
    const other = await makeUser({ plan: 'pro' });
    const otherQuiz = await makeQuiz(other, { slug: 'idkeys-other' });
    await sql(`insert into consent_records (email, quiz_id, consent_type, consent_given, consent_text) values ('ada@customer.example',$1,'email_marketing',true,'OTHER-BUSINESS-TEXT')`, [otherQuiz.id]);
    const exp = await (await api()).get('/api/gdpr/export/ada@customer.example').set(bearer(owner));
    expect(JSON.stringify(exp.body)).not.toContain('OTHER-BUSINESS-TEXT');
    const hist = await (await api()).get('/api/gdpr/consent/ada@customer.example').set(bearer(owner));
    expect(JSON.stringify(hist.body)).not.toContain('OTHER-BUSINESS-TEXT');
  });
});

describe('another tenant cannot touch those records (write paths)', () => {
  it('B cannot assign A\'s tag to A\'s lead, edit or delete A\'s result blocks, or map A\'s products', async () => {
    const B = await makeUser({ plan: 'pro' });
    const app = await api();
    const tag = await app.post('/api/tags').set(bearer(owner)).send({ name: 'Secret' });
    expect((await app.post(`/api/leads/${leadId}/tags`).set(bearer(B)).send({ tag_id: tag.body.id })).status).toBe(404);
    const b = await app.post(`/api/quizzes/${quiz.id}/outcomes/low/blocks`).set(bearer(owner)).send({ block_type: 'text', config: { text: 'mine' } });
    expect((await app.patch(`/api/quizzes/${quiz.id}/outcomes/low/blocks/${b.body.id}`).set(bearer(B)).send({ block_type: 'text', config: { text: 'hijack' } })).status).toBe(404);
    expect((await app.delete(`/api/quizzes/${quiz.id}/outcomes/low/blocks/${b.body.id}`).set(bearer(B))).status).toBe(404);
    expect((await sql<any>(`select config from result_page_blocks where id=$1`, [b.body.id]))[0].config.text).toBe('mine');
  });
});
