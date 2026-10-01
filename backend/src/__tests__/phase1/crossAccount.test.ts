/**
 * Phase 1 - one account can never read or change another account's data through ids it learned or guessed.
 * Each case below was found in the pre-launch audit; account B (the attacker) targets account A's records.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';

beforeEach(resetData);

async function campaign(owner: { token: string }, over: Record<string, any> = {}) {
  const r = await (await api()).post('/api/emails/campaigns').set(bearer(owner)).send({
    name: 'Spring', subject: 'Hello', from_name: 'Shop', from_email: 'hello@shop.example', html: '<p>A secret offer</p>', ...over,
  });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body;
}

describe('email campaigns and suppressions', () => {
  it("B cannot read, generate variants for, or start an A/B test on A's campaign", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const c = await campaign(a);
    const app = await api();
    expect((await app.get('/api/ai-emails/ab-test/' + c.id).set(bearer(b))).status).toBe(404);
    expect((await app.post('/api/ai-emails/ab-test/' + c.id + '/check-winner').set(bearer(b)).send({})).status).toBe(404);
    const gen = await app.post('/api/ai-emails/ab-test/ai-generate').set(bearer(b)).send({ campaign_id: c.id, goal: 'nurture' });
    expect(gen.status).toBe(404);
    expect(JSON.stringify(gen.body)).not.toContain('secret offer');
    const create = await app.post('/api/ai-emails/ab-test').set(bearer(b)).send({ campaign_id: c.id, variants: [{ subject: 'x' }, { subject: 'y' }] });
    expect(create.status).toBe(404);
    const rows = await sql<any>(`select ab_test_enabled from email_campaigns where id=$1`, [c.id]);
    expect(rows[0].ab_test_enabled).toBeFalsy();
  });

  it("B cannot point a campaign at A's quiz (its leads and merge data)", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const quizA = await makeQuiz(a);
    const app = await api();
    const create = await app.post('/api/emails/campaigns').set(bearer(b)).send({ name: 'x', subject: 'x', from_name: 'x', from_email: 'x@b.example', html: '<p>x</p>', source_quiz_id: quizA.id });
    expect(create.status).toBe(404);
    const own = await campaign(b);
    const patch = await app.patch('/api/emails/campaigns/' + own.id).set(bearer(b)).send({ source_quiz_id: quizA.id });
    expect(patch.status).toBe(404);
    const smart = await app.post('/api/ai-emails/smart-campaign').set(bearer(b)).send({ quiz_id: quizA.id, brand_name: 'B', from_name: 'B', from_email: 'b@b.example' });
    expect(smart.status).toBe(404);
  });

  it("B cannot delete A's suppression entries", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const rows = await sql<any>(`insert into email_unsubscribes (tenant_id, email, reason) values ($1, 'person@customer.example', 'web') returning id`, [a.id]);
    await (await api()).delete('/api/emails/suppressions/' + rows[0].id).set(bearer(b));
    expect(await sql(`select 1 from email_unsubscribes where id=$1`, [rows[0].id])).toHaveLength(1);
    // The owner can.
    await (await api()).delete('/api/emails/suppressions/' + rows[0].id).set(bearer(a)).expect(200);
    expect(await sql(`select 1 from email_unsubscribes where id=$1`, [rows[0].id])).toHaveLength(0);
  });
});

describe('quiz features', () => {
  it("B cannot read A's custom CSS", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const quizA = await makeQuiz(a, { settings: { custom_css: '.secret{color:red}' } });
    const r = await (await api()).get('/api/quizzes/' + quizA.id + '/custom-css').set(bearer(b));
    expect(r.status).toBe(404);
  });

  it("B cannot build an auto-tag rule on A's tag or A's quiz", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const tagA = (await sql<any>(`insert into lead_tags (user_id, name, color) values ($1, 'VIP', '#123456') returning id`, [a.id]))[0];
    const tagB = (await sql<any>(`insert into lead_tags (user_id, name, color) values ($1, 'Mine', '#654321') returning id`, [b.id]))[0];
    const quizA = await makeQuiz(a);
    const app = await api();
    const r1 = await app.post('/api/auto-tag-rules').set(bearer(b)).send({ tag_id: tagA.id, conditions: [] });
    expect(r1.status).toBe(404);
    expect(JSON.stringify(r1.body)).not.toContain('VIP');
    const r2 = await app.post('/api/auto-tag-rules').set(bearer(b)).send({ tag_id: tagB.id, quiz_id: quizA.id, conditions: [] });
    expect(r2.status).toBe(404);
    const ok = await app.post('/api/auto-tag-rules').set(bearer(b)).send({ tag_id: tagB.id, conditions: [] });
    expect(ok.status).toBe(201);
  });

  it("B cannot add A's quiz as a variant of B's A/B test", async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const quizA = await makeQuiz(a);
    const quizB = await makeQuiz(b);
    const r = await (await api()).post('/api/quizzes/' + quizB.id + '/ab-tests').set(bearer(b)).send({
      name: 'Split', variants: [{ variant_id: 'a', quiz_id: quizB.id, weight: 50 }, { variant_id: 'b', quiz_id: quizA.id, weight: 50 }],
    });
    expect(r.status).toBe(404);
  });

  it("the public translated quiz does not reveal the owner's account id", async () => {
    const a = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(a, { slug: 'translated-public' });
    const r = await (await api()).get('/api/public/quiz/' + quiz.slug + '/translated');
    expect(r.status).toBe(200);
    expect(r.body.user_id).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain(a.id);
  });
});

describe('teams: one owner, admins cannot take over', () => {
  async function teamWithAdmin() {
    const owner = await makeUser({ plan: 'business' });
    const admin = await makeUser({ plan: 'business' });
    const created = await (await api()).post('/api/teams').set(bearer(owner)).send({ name: 'Studio' });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    await sql(`insert into team_members (team_id, user_id, email, role, accepted_at) values ($1, $2, $3, 'admin', now())`, [created.body.id, admin.clerkId, admin.email]);
    return { owner, admin, teamId: created.body.id };
  }

  it("an admin cannot demote the owner or make themselves owner", async () => {
    const { owner, admin, teamId } = await teamWithAdmin();
    const app = await api();
    expect((await app.patch(`/api/teams/${teamId}/members/${owner.clerkId}`).set(bearer(admin)).send({ role: 'viewer' })).status).toBe(403);
    expect((await app.patch(`/api/quizzes/teams/${teamId}/members/${owner.clerkId}`).set(bearer(admin)).send({ role: 'viewer' })).status).toBe(403);
    expect((await app.patch(`/api/quizzes/teams/${teamId}/members/${admin.clerkId}`).set(bearer(admin)).send({ role: 'owner' })).status).toBe(403);
    expect((await app.post(`/api/quizzes/teams/${teamId}/members`).set(bearer(admin)).send({ email: 'friend@quiz-test.example', role: 'owner' })).status).toBe(403);
    const roles = await sql<any>(`select user_id, role from team_members where team_id=$1 order by role`, [teamId]);
    expect(roles).toEqual(expect.arrayContaining([{ user_id: owner.clerkId, role: 'owner' }, { user_id: admin.clerkId, role: 'admin' }]));
  });

  it('an admin can still manage ordinary members', async () => {
    const { admin, teamId } = await teamWithAdmin();
    await sql(`insert into team_members (team_id, user_id, email, role, accepted_at) values ($1, 'usr_member', 'm@quiz-test.example', 'viewer', now())`, [teamId]);
    const r = await (await api()).patch(`/api/teams/${teamId}/members/usr_member`).set(bearer(admin)).send({ role: 'editor' });
    expect(r.status).toBe(200);
  });
});
