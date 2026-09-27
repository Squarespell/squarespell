/**
 * Phase 1 - referrals: code issue, public tracking, use limits, conversion, and owner-only stats/list.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, bearer } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { convertReferral } from '../../services/referrals';

beforeEach(resetData);

async function codeFor(user: { id: string; token: string; csrfToken: string }) {
  const r = await (await api()).get('/api/referrals/code').set(bearer(user));
  expect(r.status).toBe(200);
  return r.body as { code: string; url: string };
}
const track = async (code: any, email: any) => (await api()).post('/api/public/referral/track').send({ code, email });

describe('referral codes', () => {
  it('requires a session', async () => {
    const r = await (await api()).get('/api/referrals/code');
    expect(r.status).toBe(401);
  });

  it('issues one stable code per user, with a sign-up link that carries it, and different users get different codes', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const first = await codeFor(a);
    const again = await codeFor(a);
    const other = await codeFor(b);
    expect(first.code).toMatch(/^[A-Z0-9]{7,}$/);
    expect(again.code).toBe(first.code);
    expect(other.code).not.toBe(first.code);
    expect(first.url).toContain('/sign-up?ref=' + first.code);
    expect(await sql('select 1 from referral_codes where user_id=$1', [a.id])).toHaveLength(1);
  });
});

describe('tracking a referral', () => {
  it('records a pending referral for a valid code', async () => {
    const owner = await makeUser();
    const { code } = await codeFor(owner);
    const r = await track(code, 'friend@customer.example');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true });
    const rows = await sql<any>('select referrer_id, referred_email, status from referrals');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ referrer_id: owner.id, referred_email: 'friend@customer.example', status: 'pending' });
  });

  it('rejects missing input and unknown codes without creating anything', async () => {
    const owner = await makeUser();
    await codeFor(owner);
    expect((await track(undefined, 'friend@customer.example')).status).toBe(400);
    expect((await track('CODE123', undefined)).status).toBe(400);
    const unknown = await track('NOSUCHCODE', 'friend@customer.example');
    expect(unknown.status).toBe(400);
    expect(await sql('select 1 from referrals')).toHaveLength(0);
  });

  it('stops accepting referrals once the code reaches its use limit', async () => {
    const owner = await makeUser();
    const { code } = await codeFor(owner);
    await sql('update referral_codes set max_uses=1 where code=$1', [code]);
    expect((await track(code, 'one@customer.example')).status).toBe(200);
    expect((await track(code, 'two@customer.example')).status).toBe(400);
    expect(await sql('select 1 from referrals')).toHaveLength(1);
  });
});

describe('referral stats and list', () => {
  it('shows the owner their referrals, moves pending to converted, and never shows another user\'s', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const { code } = await codeFor(owner);
    await track(code, 'p1@customer.example');
    await track(code, 'p2@customer.example');

    let stats = await (await api()).get('/api/referrals/stats').set(bearer(owner));
    expect(stats.body).toMatchObject({ totalReferred: 2, pending: 2, converted: 0 });

    expect((await convertReferral('p1@customer.example', code)).success).toBe(true);
    stats = await (await api()).get('/api/referrals/stats').set(bearer(owner));
    expect(stats.body).toMatchObject({ totalReferred: 2, pending: 1, converted: 1 });

    const list = await (await api()).get('/api/referrals/list').set(bearer(owner));
    expect(list.status).toBe(200);
    expect(list.body.referrals.map((x: any) => x.referred_email).sort()).toEqual(['p1@customer.example', 'p2@customer.example']);

    const theirs = await (await api()).get('/api/referrals/list').set(bearer(stranger));
    expect(theirs.body.referrals).toEqual([]);
    const theirStats = await (await api()).get('/api/referrals/stats').set(bearer(stranger));
    expect(theirStats.body).toMatchObject({ totalReferred: 0, converted: 0, pending: 0 });
  });

  it('converting an email with no pending referral is a no-op that reports failure', async () => {
    expect((await convertReferral('nobody@customer.example', 'X')).success).toBe(false);
  });
});
