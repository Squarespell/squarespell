/**
 * Phase 1 - foundation: schema/migrations, health checks, cron authentication,
 * async error safety. Each test states the behaviour a safe production system needs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { api } from '../helpers/testkit';
import { PRELUDE, migrationFiles, readSql, sql, resetData } from '../helpers/db';
import { dbFault } from '../helpers/fakeSupabase';

const SRC = path.resolve(__dirname, '../..');

// P2 findings (documented in docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md): non-core features whose tables/columns are
// referenced by code but defined nowhere in the repository. Their real production shape is unknown, so Phase 1 does not
// invent it. The tests pin this list: any NEW drift fails, and fixing one requires removing it here.
const KNOWN_UNRESOLVED_TABLES = ['campaigns', 'email_ab_variants', 'email_engagement_log'];
const KNOWN_UNRESOLVED_COLUMNS = ['quizzes.brand', 'quizzes.category'];

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== '__tests__') walk(p, out); } else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('schema and migrations', () => {
  it('every repository SQL migration applies cleanly, in order, to a fresh PostgreSQL', async () => {
    const db = new PGlite();
    await db.exec(PRELUDE);
    const failures: string[] = [];
    for (const f of migrationFiles()) {
      try { await db.exec(readSql(f)); } catch (e: any) { failures.push(`${path.basename(f)}: ${e.message}`); }
    }
    expect(failures).toEqual([]);
  });

  it('every table the backend queries exists after the migrations', async () => {
    const tables = new Set<string>();
    for (const f of walk(SRC)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/g)) tables.add(m[1]);
    }
    const existing = new Set((await sql<{ tablename: string }>(`select tablename from pg_tables where schemaname='public'`)).map((r) => r.tablename));
    const missing = [...tables].filter((t) => !existing.has(t)).sort();
    expect(missing).toEqual(KNOWN_UNRESOLVED_TABLES);
  });

  it('every column the backend selects from the core tables exists', async () => {
    const need: Record<string, Set<string>> = {};
    for (const f of walk(SRC)) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\.from\(\s*['"`](users|leads|quizzes)['"`]\s*\)\s*\.select\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g)) {
        const table = m[1];
        const cols = (m[2] ?? m[3] ?? m[4]).replace(/\w+\s*\([^)]*\)/g, '').split(',').map((c) => c.trim()).filter((c) => /^[a-z_]+$/.test(c));
        need[table] ||= new Set();
        cols.forEach((c) => need[table].add(c));
      }
    }
    const missing: string[] = [];
    for (const [table, cols] of Object.entries(need)) {
      const have = new Set((await sql<{ column_name: string }>(`select column_name from information_schema.columns where table_schema='public' and table_name=$1`, [table])).map((r) => r.column_name));
      for (const c of cols) if (!have.has(c)) missing.push(`${table}.${c}`);
    }
    expect(missing.sort()).toEqual(KNOWN_UNRESOLVED_COLUMNS);
  });

  it('the atomic lead-insert and counter functions exist', async () => {
    const fns = (await sql<{ proname: string }>(`select proname from pg_proc where pronamespace='public'::regnamespace`)).map((r) => r.proname);
    for (const f of ['insert_lead_with_limit_check', 'increment_lead_count', 'increment_view_count', 'increment_quiz_count', 'try_increment_quiz_count']) {
      expect(fns).toContain(f);
    }
  });
});

describe('health checks', () => {
  afterEach(() => { dbFault.on = false; });

  it('liveness: GET /health and /api/health return 200 without touching the database', async () => {
    dbFault.on = true;
    for (const p of ['/health', '/api/health']) {
      const r = await (await api()).get(p);
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(true);
    }
  });

  it('readiness: GET /api/health/ready is 200 when the database answers', async () => {
    const r = await (await api()).get('/api/health/ready');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, checks: { database: 'up' } });
  });

  it('readiness: reports 503 when the database is down and never leaks error details', async () => {
    dbFault.on = true;
    const r = await (await api()).get('/api/health/ready');
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
    expect(r.body.checks.database).toBe('down');
    expect(JSON.stringify(r.body)).not.toMatch(/refused|ECONN|supabase|127\.0\.0\.1|password|key/i);
  });
});

describe('cron endpoints are authenticated (fail closed)', () => {
  const CRON_PATHS = [
    '/api/cron/process-email-queue', '/api/cron/cleanup-gdpr-tokens', '/api/cron/cleanup-integration-errors',
    '/api/cron/process-scheduled-sends', '/api/cron/cleanup-preview-cache', '/api/cron/weekly-digest',
    '/api/cron/trial-reminders', '/api/cron/monthly-report', '/api/cron/lead-milestones',
  ];
  const saved = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = saved; });

  for (const p of CRON_PATHS) {
    it(`POST ${p} rejects a request with no secret`, async () => {
      const r = await (await api()).post(p).send({});
      expect(r.status).toBe(401);
    });
    it(`POST ${p} rejects a wrong secret`, async () => {
      const r = await (await api()).post(p).set('x-cron-secret', 'wrong').send({});
      expect(r.status).toBe(401);
    });
  }

  it('when CRON_SECRET is not configured, cron endpoints refuse to run (no header must not equal no secret)', async () => {
    delete process.env.CRON_SECRET;
    for (const p of CRON_PATHS) {
      const r = await (await api()).post(p).send({});
      expect([401, 503], `${p} -> ${r.status}`).toContain(r.status);
    }
  });

  it('a correct secret is accepted', async () => {
    const r = await (await api()).post('/api/cron/cleanup-preview-cache').set('x-cron-secret', process.env.CRON_SECRET!).send({});
    expect(r.status).toBe(200);
  });
});

describe('one failing request must not hang or crash the API', () => {
  beforeEach(resetData);
  it('an unexpected exception inside an async handler returns a JSON 500 and the server keeps serving', async () => {
    const { makeUser, bearer } = await import('../helpers/testkit');
    const { stripeBehaviour } = await import('../helpers/stripeFake');
    const u = await makeUser({ plan: 'pro' });
    stripeBehaviour.failCheckout = true;
    try {
      const r = await (await api()).post('/api/stripe/create-checkout').set(bearer(u)).send({ plan: 'pro', billing: 'monthly' }).timeout({ response: 3000, deadline: 4000 });
      expect(r.status).toBeGreaterThanOrEqual(500);
      expect(r.status).toBeLessThan(600);
      expect(r.headers['content-type']).toMatch(/json/);
      expect(r.body.error).toBeTruthy();
      expect(JSON.stringify(r.body)).not.toMatch(/at \w+ \(|node_modules/);
    } finally { stripeBehaviour.failCheckout = false; }
    const ok = await (await api()).get('/health');
    expect(ok.status).toBe(200);
  });
});
