import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

let dbPromise: Promise<PGlite> | null = null;
export const migrationWarnings: string[] = [];

/** Lazily create one in-process PostgreSQL (PGlite) per test worker and apply the repo SQL. */
export function getDb(): Promise<PGlite> {
  dbPromise ||= (async () => {
    const db = new PGlite();
    // Supabase provides these; plain PostgreSQL does not.
    await db.exec(PRELUDE);
    const files = migrationFiles();
    for (const f of files) {
      const sql = readSql(f);
      try {
        await db.exec(sql);
      } catch (e: any) {
        // Tolerant mode (used by the shared harness): apply statement by statement and record
        // each statement PostgreSQL rejects. tests/migrations.test.ts asserts there are none.
        for (const stmt of splitSql(sql)) {
          try { await db.exec(stmt); } catch (e2: any) { migrationWarnings.push(`${path.basename(f)}: ${e2.message}`); }
        }
      }
    }
    return db;
  })();
  return dbPromise;
}

export const PRELUDE = `
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
      END $$;
`;

export function migrationFiles(): string[] {
  return [
    path.join(ROOT, '..', 'SUPABASE_SCHEMA.sql'),
    ...fs.readdirSync(path.join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(ROOT, 'migrations', f)),
    path.join(ROOT, 'src/db/migrations/20260415_email_automation.sql'),
  ];
}

/** CONCURRENTLY cannot run inside PGlite's implicit transaction; semantics are otherwise identical. */
export function readSql(f: string): string {
  return fs.readFileSync(f, 'utf8').replace(/CREATE INDEX CONCURRENTLY/gi, 'CREATE INDEX');
}

/** Minimal dollar-quote-aware statement splitter. */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let cur = '', i = 0, dollar: string | null = null;
  while (i < sql.length) {
    if (dollar) {
      if (sql.startsWith(dollar, i)) { cur += dollar; i += dollar.length; dollar = null; continue; }
      cur += sql[i++]; continue;
    }
    if (sql.startsWith('--', i)) { const nl = sql.indexOf('\n', i); const end = nl === -1 ? sql.length : nl; cur += sql.slice(i, end); i = end; continue; }
    const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i, i + 40));
    if (m) { dollar = m[0]; cur += m[0]; i += m[0].length; continue; }
    if (sql[i] === ';') { if (cur.trim()) out.push(cur); cur = ''; i++; continue; }
    cur += sql[i++];
  }
  if (cur.trim()) out.push(cur);
  return out;
}

const KEEP = new Set(['templates']);

/** Remove all rows from every public table (fast reset between tests). */
export async function resetData(): Promise<void> {
  const db = await getDb();
  const t = await db.query<{ tablename: string }>(`select tablename from pg_tables where schemaname='public'`);
  const names = t.rows.map((r) => r.tablename).filter((n) => !KEEP.has(n));
  if (names.length) await db.exec(`TRUNCATE ${names.map((n) => `"${n}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function sql<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return (await db.query<T>(text, params)).rows;
}
