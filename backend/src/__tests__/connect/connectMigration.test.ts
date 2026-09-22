/** Migration 033: idempotent, purely additive, reversible, and its constraints and functions behave as documented. */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getDb, resetData, sql } from '../helpers/db';
import { makeUser, makeQuiz } from '../helpers/testkit';
import { generateSiteKey } from '../../services/connect/rules';

const ROOT = path.resolve(__dirname, '../../..');
const UP = fs.readFileSync(path.join(ROOT, 'migrations/033_connected_sites.sql'), 'utf8').replace(/CREATE INDEX CONCURRENTLY/gi, 'CREATE INDEX');
const DOWN = fs.readFileSync(path.join(ROOT, 'migrations/rollback/033_connected_sites.down.sql'), 'utf8');
const NEW_TABLES = ['connected_sites', 'site_authorizations', 'quiz_installations', 'manifest_versions', 'installation_events', 'verification_checks'];
const tableExists = async (t: string) => (await sql('select 1 from pg_tables where schemaname=$1 and tablename=$2', ['public', t])).length === 1;

beforeEach(async () => { await resetData(); });

describe('migration 033', () => {
  it('embeds no identity (no email, domain, uuid or customer name)', () => {
    expect(UP).not.toMatch(/[A-Za-z0-9._-]+@[A-Za-z0-9-]+\./);
    expect(UP).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(UP).not.toMatch(/riverlight|squarespellquiz\.com|squarespell\.com/i);
  });
  it('can be applied again and again without error or change', async () => {
    const db = await getDb();
    await db.exec(UP);
    await db.exec(UP);
    for (const t of NEW_TABLES) expect(await tableExists(t)).toBe(true);
  });
  it('is purely additive: it neither reads nor changes existing rows', async () => {
    const owner = await makeUser({ plan: 'pro' });
    await makeQuiz(owner, { status: 'live' });
    const before = JSON.stringify([await sql('select * from users order by id'), await sql('select * from quizzes order by id')]);
    const db = await getDb();
    await db.exec(UP);
    expect(JSON.stringify([await sql('select * from users order by id'), await sql('select * from quizzes order by id')])).toBe(before);
  });
  it('can be reversed, the reversal is repeatable, and re-applying afterwards works; existing data survives', async () => {
    const owner = await makeUser({ plan: 'pro' });
    await makeQuiz(owner, { status: 'live' });
    const db = await getDb();
    await db.exec(DOWN);
    await db.exec(DOWN);
    for (const t of NEW_TABLES) expect(await tableExists(t)).toBe(false);
    expect((await sql('select 1 from users')).length).toBe(1);
    expect((await sql('select 1 from quizzes')).length).toBe(1);
    await db.exec(UP);
    for (const t of NEW_TABLES) expect(await tableExists(t)).toBe(true);
  });
  it('reversal drops only the objects the migration created', () => {
    const drops = (DOWN.match(/DROP (TABLE|FUNCTION) IF EXISTS [a-z_.]+/gi) || []).map((s) => s.split(' ').pop());
    expect(drops.sort()).toEqual(['public.connect_publish_manifest', 'public.connect_rollback_manifest', ...NEW_TABLES.map((t) => 'public.' + t)].sort());
  });
});

describe('constraints', () => {
  async function seed() {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { status: 'live' });
    const site = (await sql<{ id: string }>('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4) returning id', [owner.id, 'html', 'customer.invalid', generateSiteKey()]))[0];
    return { owner, quiz, site };
  }
  const insertInst = (s: any, over: Record<string, any> = {}) =>
    sql('insert into quiz_installations (site_id, user_id, quiz_id, mode, placement_ref, status) values ($1,$2,$3,$4,$5,$6) returning id', [s.site.id, s.owner.id, s.quiz.id, over.mode ?? 'popup', over.slot ?? null, over.status ?? 'live']);

  it('hostnames must be lower-case, keys long and unique, platforms known, states known', async () => {
    const { owner } = await seed();
    const ins = (host: string, key: string, platform = 'html', state = 'draft') => sql('insert into connected_sites (user_id, platform, hostname, site_key, state) values ($1,$2,$3,$4,$5)', [owner.id, platform, host, key, state]);
    await expect(ins('UPPER.invalid', generateSiteKey())).rejects.toThrow();
    await expect(ins('other.invalid', 'short')).rejects.toThrow();
    await expect(ins('other.invalid', generateSiteKey(), 'wix')).rejects.toThrow();
    await expect(ins('other.invalid', generateSiteKey(), 'html', 'connected')).rejects.toThrow();
    const key = generateSiteKey();
    await ins('one.invalid', key);
    await expect(ins('two.invalid', key)).rejects.toThrow();
  });
  it('one active site per hostname per account; a disconnected one frees the hostname', async () => {
    const s = await seed();
    await expect(sql('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4)', [s.owner.id, 'html', 'customer.invalid', generateSiteKey()])).rejects.toThrow();
    await sql('update connected_sites set state=$1 where id=$2', ['disconnected', s.site.id]);
    await sql('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4)', [s.owner.id, 'html', 'customer.invalid', generateSiteKey()]);
  });
  it('an inline installation needs a valid slot; the same placement cannot be live twice; a removed one does not block', async () => {
    const s = await seed();
    await expect(insertInst(s, { mode: 'inline' })).rejects.toThrow();
    await expect(insertInst(s, { mode: 'inline', slot: 'Bad Slot' })).rejects.toThrow();
    await insertInst(s, { mode: 'inline', slot: 'hero' });
    await expect(insertInst(s, { mode: 'inline', slot: 'hero' })).rejects.toThrow();
    await insertInst(s, { mode: 'popup' });
    await expect(insertInst(s, { mode: 'popup' })).rejects.toThrow();
    await sql('update quiz_installations set status=$1 where mode=$2', ['removed', 'popup']);
    await insertInst(s, { mode: 'popup' });
    await expect(insertInst(s, { mode: 'carousel' })).rejects.toThrow();
  });
  it('deleting the owner removes everything they connected (no orphans)', async () => {
    const s = await seed();
    await insertInst(s);
    await sql('delete from users where id=$1', [s.owner.id]);
    for (const t of NEW_TABLES) expect(await sql('select 1 from ' + t)).toHaveLength(0);
  });
});

describe('manifest functions', () => {
  it('publish allocates increasing versions and keeps exactly one current; rollback restores the previous one', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const site = (await sql<{ id: string }>('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4) returning id', [owner.id, 'html', 'customer.invalid', generateSiteKey()]))[0];
    const pub = async (marker: string) => (await sql<{ v: number }>('select public.connect_publish_manifest($1,$2,$3::jsonb,$4) as v', [site.id, owner.id, JSON.stringify({ v: 1, marker }), 'user']))[0].v;
    expect(await pub('one')).toBe(1);
    expect(await pub('two')).toBe(2);
    expect(await pub('three')).toBe(3);
    expect((await sql('select 1 from manifest_versions where site_id=$1 and is_current', [site.id])).length).toBe(1);
    expect((await sql<any>('select version, body from manifest_versions where is_current'))[0]).toMatchObject({ version: 3, body: { marker: 'three', version: 3 } });
    const rb = async () => (await sql<{ v: number | null }>('select public.connect_rollback_manifest($1,$2) as v', [site.id, owner.id]))[0].v;
    expect(await rb()).toBe(2);
    expect((await sql<any>('select version from manifest_versions where is_current'))[0].version).toBe(2);
    expect(await rb()).toBe(1);
    expect(await rb()).toBeNull();
    expect((await sql<any>('select version from manifest_versions where is_current'))[0].version).toBe(1);
    expect((await sql('select 1 from manifest_versions where site_id=$1', [site.id])).length).toBe(3);
  });
  it('both functions refuse another account\'s site', async () => {
    const a = await makeUser({ plan: 'pro' });
    const b = await makeUser({ plan: 'pro' });
    const site = (await sql<{ id: string }>('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4) returning id', [a.id, 'html', 'customer.invalid', generateSiteKey()]))[0];
    await expect(sql('select public.connect_publish_manifest($1,$2,$3::jsonb,$4)', [site.id, b.id, '{}', 'user'])).rejects.toThrow(/site_not_found/);
    await expect(sql('select public.connect_rollback_manifest($1,$2)', [site.id, b.id])).rejects.toThrow(/site_not_found/);
    expect(await sql('select 1 from manifest_versions')).toHaveLength(0);
  });
  it('anon and authenticated roles cannot execute the functions', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const fn of ['public.connect_publish_manifest(uuid,uuid,jsonb,text)', 'public.connect_rollback_manifest(uuid,uuid)']) {
        expect((await sql<{ ok: boolean }>('select has_function_privilege($1,$2,$3) as ok', [role, fn, 'EXECUTE']))[0].ok).toBe(false);
      }
    }
  });
});
