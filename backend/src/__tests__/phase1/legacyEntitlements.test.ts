/**
 * Legacy entitlements (migration 032): while an entitlement is ACTIVE the account is always entitled to Business - whatever plan
 * the stored column says - and nothing automated can take it lower. Only the explicit, audited revocation ends it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { api, makeUser, bearer, sampleQuiz } from '../helpers/testkit';
import { resetData, sql, getDb, readSql } from '../helpers/db';
import { stripeCalls, resetStripe } from '../helpers/stripeFake';

const MIGRATION = path.resolve(__dirname, '../../../migrations/032_legacy_entitlements.sql');
const BELOW_BUSINESS = ['pro', 'core', 'starter', 'growth', 'free', 'trial'];

async function runMigration() { const db = await getDb(); await db.exec(readSql(MIGRATION)); }
async function setStripe(id: string, customer: string, subscription: string) {
  await sql('UPDATE users SET stripe_customer_id = $2, stripe_subscription_id = $3 WHERE id = $1', [id, customer, subscription]);
}
const planOf = async (id: string) => (await sql<{ plan: string | null }>('SELECT plan FROM users WHERE id = $1', [id]))[0].plan;
const count = async (table: string, where = 'true', params: any[] = []) => Number((await sql<{ n: string }>('SELECT count(*) AS n FROM ' + table + ' WHERE ' + where, params))[0].n);
const setPlan = (id: string, plan: string | null) => sql('UPDATE users SET plan = $2 WHERE id = $1', [id, plan]);
const revoke = (id: string, reason = 'owner decision') => sql<any>('SELECT revoke_legacy_entitlement($1, $2) AS revoked', [id, reason]);

/** Bypasses the plan guard to put a stored plan on a user that already has an active entitlement (defence-in-depth tests). */
async function forceStoredPlan(id: string, plan: string) {
  await sql('ALTER TABLE users DISABLE TRIGGER protect_legacy_entitlement');
  try { await setPlan(id, plan); } finally { await sql('ALTER TABLE users ENABLE TRIGGER protect_legacy_entitlement'); }
}
/** A user with an ACTIVE entitlement whose stored plan is 'stored'. */
async function entitledUser(stored: string, opts: { createdDaysAgo?: number; quizCount?: number } = {}) {
  const u = await makeUser({ plan: 'agency', createdDaysAgo: opts.createdDaysAgo ?? 90, quizCount: opts.quizCount ?? 0 });
  await runMigration();
  await forceStoredPlan(u.id, stored);
  return u;
}

beforeEach(async () => { await resetData(); resetStripe(); });

describe('legacy entitlement migration', () => {
  it('selects only a paid legacy plan with no Stripe customer and no Stripe subscription', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    const stripeCustomer = await makeUser({ plan: 'agency' });
    const stripeSub = await makeUser({ plan: 'agency' });
    const paid = await makeUser({ plan: 'pro' });
    const free = await makeUser({ plan: 'free' });
    const trial = await makeUser({ plan: 'trial' });
    await setStripe(stripeCustomer.id, 'cus_test_a', '');
    await setStripe(stripeSub.id, '', 'sub_test_b');
    await setStripe(paid.id, 'cus_test_c', 'sub_test_c');
    await runMigration();
    const rows = await sql<any>('SELECT * FROM legacy_entitlements');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: legacy.id, original_plan: 'agency', effective_plan: 'business', reason_code: 'legacy_paid_no_stripe', active: true, revoked_at: null });
    expect(rows[0].granted_at).toBeTruthy();
    expect(await count('legacy_entitlement_audit', "event = 'granted'")).toBe(1);
    for (const u of [stripeCustomer, stripeSub, paid, free, trial]) expect(await count('legacy_entitlements', 'user_id = $1', [u.id])).toBe(0);
  });

  it('is safe to run twice: no duplicate rows or audit entries, and a revoked entitlement is not re-granted', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await runMigration();
    expect(await count('legacy_entitlements')).toBe(1);
    expect(await count('legacy_entitlement_audit', "event = 'granted'")).toBe(1);
    await revoke(legacy.id);
    await runMigration();
    expect(await count('legacy_entitlements')).toBe(1);
    expect(await count('legacy_entitlements', 'active')).toBe(0);
  });

  it('creates no Stripe customer, subscription or charge and changes no plan', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    const other = await makeUser({ plan: 'core' });
    await runMigration();
    expect(stripeCalls.checkout).toHaveLength(0);
    expect(stripeCalls.subsUpdate).toHaveLength(0);
    const refs = await sql<any>("SELECT count(*) AS n FROM users WHERE coalesce(stripe_customer_id, '') <> '' OR coalesce(stripe_subscription_id, '') <> ''");
    expect(Number(refs[0].n)).toBe(0);
    expect(await planOf(legacy.id)).toBe('agency');
    expect(await planOf(other.id)).toBe('core');
  });

  it('embeds no user identity: no UUID, email address or Clerk id', () => {
    const text = fs.readFileSync(MIGRATION, 'utf8');
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(text).not.toMatch(/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    expect(text).not.toMatch(/user_[A-Za-z0-9]{10,}/);
  });
});

describe('an active legacy entitlement always resolves to Business', () => {
  for (const stored of ['agency', ...BELOW_BUSINESS]) {
    it('stored plan "' + stored + '": plan response, feature guard and quiz limit all use Business', async () => {
      const u = await entitledUser(stored, { quizCount: 5 });
      const plan = await (await api()).get('/api/user/plan').set(bearer(u));
      expect(plan.status).toBe(200);
      expect(plan.body.plan).toBe('business');
      expect(plan.body.limits).toMatchObject({ quizzes: null, whiteLabel: true, customDomain: true, teamSeats: true, integrations: true, abTesting: true });
      const team = await (await api()).post('/api/teams').set(bearer(u)).send({ name: 'Crew' });
      expect(team.status, JSON.stringify(team.body)).toBe(201);
      const quiz = await (await api()).post('/api/quizzes').set(bearer(u)).send(sampleQuiz());
      expect(quiz.status, JSON.stringify(quiz.body)).toBe(201);
    });
  }

  it('controls: the same stored plans WITHOUT an entitlement keep their own limits', async () => {
    const core = await makeUser({ plan: 'core', quizCount: 5 });
    expect((await (await api()).post('/api/quizzes').set(bearer(core)).send(sampleQuiz())).body.error).toBe('quiz_limit_reached');
    const pro = await makeUser({ plan: 'pro' });
    expect((await (await api()).post('/api/teams').set(bearer(pro)).send({ name: 'Crew' })).status).toBe(403);
    const expired = await makeUser({ plan: 'free', createdDaysAgo: 90 });
    expect((await (await api()).get('/api/user/plan').set(bearer(expired))).body.plan).toBe('free');
  });

  it('activating an entitlement for an account stored below Business raises it and records that', async () => {
    const u = await makeUser({ plan: 'pro' });
    await sql("INSERT INTO legacy_entitlements (user_id, original_plan) VALUES ($1, 'pro')", [u.id]);
    expect(await planOf(u.id)).toBe('business');
    expect(await count('legacy_entitlement_audit', "event = 'plan_normalized'")).toBe(1);
  });
});

describe('automated plan changes cannot reduce an active entitlement', () => {
  it('Pro, Core, Starter, Growth, Free, Trial and NULL are all refused and audited', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    for (const p of BELOW_BUSINESS) { await setPlan(legacy.id, p); expect(await planOf(legacy.id), p).toBe('agency'); }
    await setPlan(legacy.id, null);
    expect(await planOf(legacy.id)).toBe('agency');
    expect(await count('legacy_entitlement_audit', "event = 'downgrade_blocked'")).toBe(BELOW_BUSINESS.length + 1);
    expect(await count('legacy_entitlements', 'active')).toBe(1);
  });

  it('a change to Business is allowed, and Business cannot then be reduced', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await setPlan(legacy.id, 'business');
    expect(await planOf(legacy.id)).toBe('business');
    for (const p of BELOW_BUSINESS) { await setPlan(legacy.id, p); expect(await planOf(legacy.id), p).toBe('business'); }
    expect(await count('legacy_entitlement_audit', "event = 'downgrade_blocked'")).toBe(BELOW_BUSINESS.length);
  });

  it('explicit revocation is required, audited, and afterwards every plan change works', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await expect(sql('SELECT revoke_legacy_entitlement($1, $2)', [legacy.id, ''])).rejects.toThrow(/reason/i);
    expect((await revoke(legacy.id))[0].revoked).toBe(true);
    expect((await revoke(legacy.id))[0].revoked).toBe(false);
    const row = (await sql<any>('SELECT * FROM legacy_entitlements WHERE user_id = $1', [legacy.id]))[0];
    expect(row).toMatchObject({ active: false, revoked_reason: 'owner decision' });
    expect(row.revoked_at).toBeTruthy();
    expect(await count('legacy_entitlement_audit', "event = 'revoked'")).toBe(1);
    for (const p of ['pro', 'core', 'free', 'trial']) { await setPlan(legacy.id, p); expect(await planOf(legacy.id), p).toBe(p); }
    const plan = await (await api()).get('/api/user/plan').set(bearer(legacy));
    expect(plan.body.plan).not.toBe('business');
  });

  it('users without an active entitlement are unaffected: Stripe-linked, free and trial users change plan normally', async () => {
    const stripeAgency = await makeUser({ plan: 'agency' });
    const stripePro = await makeUser({ plan: 'pro' });
    const free = await makeUser({ plan: 'free' });
    const trial = await makeUser({ plan: 'trial' });
    await setStripe(stripeAgency.id, 'cus_test_x', 'sub_test_x');
    await setStripe(stripePro.id, 'cus_test_y', 'sub_test_y');
    await runMigration();
    await setPlan(stripeAgency.id, 'free');
    await setPlan(stripePro.id, 'core');
    await setPlan(free.id, 'pro');
    await setPlan(trial.id, 'free');
    expect(await planOf(stripeAgency.id)).toBe('free');
    expect(await planOf(stripePro.id)).toBe('core');
    expect(await planOf(free.id)).toBe('pro');
    expect(await planOf(trial.id)).toBe('free');
    expect(await count('legacy_entitlement_audit', "event <> 'granted'")).toBe(0);
  });
});
