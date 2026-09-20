/**
 * Legacy entitlements (migration 032): a paid legacy account with no Stripe references keeps Business-level access,
 * cannot be silently downgraded by automated billing sync, and can be released only by an explicit, audited revocation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { api, makeUser, bearer } from '../helpers/testkit';
import { resetData, sql, getDb, readSql } from '../helpers/db';
import { stripeCalls, resetStripe } from '../helpers/stripeFake';

const MIGRATION = path.resolve(__dirname, '../../../migrations/032_legacy_entitlements.sql');

async function runMigration() { const db = await getDb(); await db.exec(readSql(MIGRATION)); }
async function setStripe(id: string, customer: string, subscription: string) {
  await sql('UPDATE users SET stripe_customer_id = $2, stripe_subscription_id = $3 WHERE id = $1', [id, customer, subscription]);
}
const planOf = async (id: string) => (await sql<{ plan: string }>('SELECT plan FROM users WHERE id = $1', [id]))[0].plan;
const count = async (table: string, where = 'true', params: any[] = []) => Number((await sql<{ n: string }>('SELECT count(*) AS n FROM ' + table + ' WHERE ' + where, params))[0].n);

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
    await sql('SELECT revoke_legacy_entitlement($1, $2)', [legacy.id, 'test revocation']);
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

describe('legacy entitlement resolution', () => {
  it('a legacy Agency user receives Business-level access', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    const r = await (await api()).get('/api/user/plan').set(bearer(legacy));
    expect(r.status).toBe(200);
    expect(r.body.limits).toMatchObject({ quizzes: null, whiteLabel: true, customDomain: true, teamSeats: true, integrations: true });
  });

  it('an active entitlement resolves to Business even if the stored plan is free (defence in depth)', async () => {
    const u = await makeUser({ plan: 'free', createdDaysAgo: 90 });
    const control = await makeUser({ plan: 'free', createdDaysAgo: 90 });
    await sql("INSERT INTO legacy_entitlements (user_id, original_plan) VALUES ($1, 'agency')", [u.id]);
    const r = await (await api()).get('/api/user/plan').set(bearer(u));
    expect(r.body.plan).toBe('business');
    expect(r.body.limits).toMatchObject({ whiteLabel: true, customDomain: true, teamSeats: true });
    const c = await (await api()).get('/api/user/plan').set(bearer(control));
    expect(c.body.plan).toBe('free');
    expect(c.body.limits).toMatchObject({ whiteLabel: false, customDomain: false });
  });
});

describe('automated downgrade protection', () => {
  it('an automatic downgrade to free or trial does not remove the entitlement and is audited', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await sql("UPDATE users SET plan = 'free' WHERE id = $1", [legacy.id]);
    expect(await planOf(legacy.id)).toBe('agency');
    await sql("UPDATE users SET plan = 'trial' WHERE id = $1", [legacy.id]);
    expect(await planOf(legacy.id)).toBe('agency');
    await sql('UPDATE users SET plan = NULL WHERE id = $1', [legacy.id]);
    expect(await planOf(legacy.id)).toBe('agency');
    expect(await count('legacy_entitlement_audit', "event = 'downgrade_blocked'")).toBe(3);
    expect(await count('legacy_entitlements', 'active')).toBe(1);
  });

  it('an explicit revocation is required, is audited, and then allows a later plan change', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await expect(sql('SELECT revoke_legacy_entitlement($1, $2)', [legacy.id, ''])).rejects.toThrow(/reason/i);
    const first = await sql<any>('SELECT revoke_legacy_entitlement($1, $2) AS revoked', [legacy.id, 'owner decision']);
    expect(first[0].revoked).toBe(true);
    const again = await sql<any>('SELECT revoke_legacy_entitlement($1, $2) AS revoked', [legacy.id, 'owner decision']);
    expect(again[0].revoked).toBe(false);
    const row = (await sql<any>('SELECT * FROM legacy_entitlements WHERE user_id = $1', [legacy.id]))[0];
    expect(row).toMatchObject({ active: false, revoked_reason: 'owner decision' });
    expect(row.revoked_at).toBeTruthy();
    expect(await count('legacy_entitlement_audit', "event = 'revoked'")).toBe(1);
    await sql("UPDATE users SET plan = 'free' WHERE id = $1", [legacy.id]);
    expect(await planOf(legacy.id)).toBe('free');
  });

  it('users without an active entitlement are unaffected: Stripe-linked, free and trial users change plan normally', async () => {
    const stripeAgency = await makeUser({ plan: 'agency' });
    const stripePro = await makeUser({ plan: 'pro' });
    const free = await makeUser({ plan: 'free' });
    const trial = await makeUser({ plan: 'trial' });
    await setStripe(stripeAgency.id, 'cus_test_x', 'sub_test_x');
    await setStripe(stripePro.id, 'cus_test_y', 'sub_test_y');
    await runMigration();
    await sql("UPDATE users SET plan = 'free' WHERE id = $1", [stripeAgency.id]);
    await sql("UPDATE users SET plan = 'free' WHERE id = $1", [stripePro.id]);
    await sql("UPDATE users SET plan = 'core' WHERE id = $1", [free.id]);
    await sql("UPDATE users SET plan = 'free' WHERE id = $1", [trial.id]);
    expect(await planOf(stripeAgency.id)).toBe('free');
    expect(await planOf(stripePro.id)).toBe('free');
    expect(await planOf(free.id)).toBe('core');
    expect(await planOf(trial.id)).toBe('free');
    expect(await count('legacy_entitlement_audit', "event = 'downgrade_blocked'")).toBe(0);
  });

  it('an upgrade for a legacy user is not blocked', async () => {
    const legacy = await makeUser({ plan: 'agency' });
    await runMigration();
    await sql("UPDATE users SET plan = 'pro' WHERE id = $1", [legacy.id]);
    expect(await planOf(legacy.id)).toBe('pro');
  });
});
