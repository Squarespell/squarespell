/**
 * Hermetic stand-in for @supabase/supabase-js, backed by a real PostgreSQL
 * engine (PGlite, WASM) that has had the repository's SQL migrations applied.
 *
 * It implements the PostgREST query-builder surface this codebase actually
 * uses (select/insert/update/delete/upsert, filters, embeds, single/
 * maybeSingle, count/head, rpc) and mimics PostgREST result shapes and error
 * codes (PGRST116 for single() with != 1 rows; Postgres SQLSTATE otherwise).
 *
 * It is NOT PostgREST: row-level security, the REST URL grammar and PostgREST
 * quirks are not exercised. Behaviour that depends on those cannot be proven
 * by this suite (see docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md).
 */
import type { PGlite } from '@electric-sql/pglite';

type Fk = { col: string; refTable: string; refCol: string };
type Meta = { cols: Record<string, string>; pk: string; fks: Fk[]; refs: { table: string; col: string; refCol: string }[] };

const IDENT = /^[a-z_][a-z0-9_]*$/i;
function q(id: string): string {
  if (!IDENT.test(id)) throw new Error('fakeSupabase: unsafe identifier ' + id);
  return '"' + id + '"';
}

function normalize(v: any): any {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'bigint') return Number(v);
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = normalize(v[k]);
    return o;
  }
  return v;
}

function pgErr(e: any) {
  return { message: e?.message ?? String(e), code: e?.code ?? '', details: e?.detail ?? null, hint: e?.hint ?? null };
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Flip `on` to simulate a database/PostgREST outage for every query. */
export const dbFault = { on: false };

export function createFakeSupabase(db: PGlite) {
  const metaCache: Record<string, Meta> = {};
  let metaLoaded: Promise<void> | null = null;

  async function loadMeta() {
    const cols = await db.query<any>(`select table_name, column_name, udt_name from information_schema.columns where table_schema='public'`);
    const pks = await db.query<any>(`select tc.table_name, kcu.column_name from information_schema.table_constraints tc join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema where tc.constraint_type='PRIMARY KEY' and tc.table_schema='public'`);
    const fks = await db.query<any>(`select conrelid::regclass::text as tbl, a.attname as col, confrelid::regclass::text as reftbl, af.attname as refcol from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) join pg_attribute af on af.attrelid=c.confrelid and af.attnum=any(c.confkey) where c.contype='f' and connamespace='public'::regnamespace`);
    for (const r of cols.rows) {
      const m = (metaCache[r.table_name] ||= { cols: {}, pk: 'id', fks: [], refs: [] });
      m.cols[r.column_name] = r.udt_name;
    }
    for (const r of pks.rows) if (metaCache[r.table_name]) metaCache[r.table_name].pk = r.column_name;
    for (const r of fks.rows) {
      const t = String(r.tbl).replace(/"/g, '').replace(/^public\./, '');
      const rt = String(r.reftbl).replace(/"/g, '').replace(/^public\./, '');
      metaCache[t]?.fks.push({ col: r.col, refTable: rt, refCol: r.refcol });
      metaCache[rt]?.refs.push({ table: t, col: r.col, refCol: r.refcol });
    }
  }
  async function meta(table: string): Promise<Meta> {
    metaLoaded ||= loadMeta();
    await metaLoaded;
    const m = metaCache[table];
    if (!m) throw Object.assign(new Error(`relation "${table}" does not exist`), { code: '42P01' });
    return m;
  }

  function colExpr(alias: string, raw: string, asText: boolean): string {
    // supports  col, col->key, col->>key, col->a->>b
    const parts = raw.split(/(->>|->)/);
    let expr = `${alias}.${q(parts[0])}`;
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i], key = parts[i + 1];
      const last = i + 2 >= parts.length;
      expr += ` ${last && asText ? '->>' : op} '${key.replace(/'/g, "''")}'`;
    }
    return expr;
  }

  class Builder implements PromiseLike<any> {
    private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private cols = '*';
    private rows: any[] | null = null;
    private patch: any = null;
    private conds: Array<(ctx: Ctx) => string> = [];
    private orders: { col: string; asc: boolean; nulls?: 'first' | 'last' }[] = [];
    private lim: number | null = null;
    private off: number | null = null;
    private mode: 'many' | 'single' | 'maybe' = 'many';
    private countMode: string | null = null;
    private head = false;
    private wantReturn = false;
    private conflict: string | null = null;
    private ignoreDup = false;
    constructor(private table: string) {}

    select(cols = '*', opts?: { count?: string; head?: boolean }) {
      if (this.op === 'select') this.cols = cols; else { this.cols = cols; this.wantReturn = true; }
      if (opts?.count) this.countMode = opts.count;
      if (opts?.head) this.head = true;
      return this;
    }
    insert(rows: any) { this.op = 'insert'; this.rows = Array.isArray(rows) ? rows : [rows]; return this; }
    upsert(rows: any, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
      this.op = 'upsert'; this.rows = Array.isArray(rows) ? rows : [rows];
      this.conflict = opts?.onConflict ?? null; this.ignoreDup = !!opts?.ignoreDuplicates; return this;
    }
    update(patch: any) { this.op = 'update'; this.patch = patch; return this; }
    delete() { this.op = 'delete'; return this; }

    private add(fn: (ctx: Ctx) => string) { this.conds.push(fn); return this; }
    private cmp(col: string, sqlOp: string, val: any) {
      return this.add((c) => `${colExpr(c.alias, col, isTextOp(col, sqlOp))} ${sqlOp} ${c.p(val === undefined ? 'undefined' : val)}`);
    }
    eq(col: string, val: any) { if (val === null) return this.is(col, null); return this.cmp(col, '=', val); }
    neq(col: string, val: any) { return this.cmp(col, '<>', val); }
    gt(col: string, val: any) { return this.cmp(col, '>', val); }
    gte(col: string, val: any) { return this.cmp(col, '>=', val); }
    lt(col: string, val: any) { return this.cmp(col, '<', val); }
    lte(col: string, val: any) { return this.cmp(col, '<=', val); }
    like(col: string, val: any) { return this.cmp(col, 'LIKE', val); }
    ilike(col: string, val: any) { return this.cmp(col, 'ILIKE', val); }
    is(col: string, val: any) {
      return this.add((c) => `${colExpr(c.alias, col, false)} IS ${val === null ? 'NULL' : val === true ? 'TRUE' : 'FALSE'}`);
    }
    in(col: string, vals: any[]) {
      return this.add((c) => vals.length === 0 ? 'FALSE' : `${colExpr(c.alias, col, isTextOp(col, '='))} IN (${vals.map((v) => c.p(v)).join(',')})`);
    }
    contains(col: string, val: any) {
      return this.add((c) => `${colExpr(c.alias, col, false)} @> ${c.p(JSON.stringify(val))}::jsonb`);
    }
    match(obj: Record<string, any>) { for (const k of Object.keys(obj)) this.eq(k, obj[k]); return this; }
    not(col: string, op: string, val: any) {
      return this.add((c) => `NOT (${filterSql(c, col, op, val)})`);
    }
    filter(col: string, op: string, val: any) { return this.add((c) => filterSql(c, col, op, val)); }
    or(expr: string) {
      return this.add((c) => '(' + splitTop(expr).map((part) => {
        const m = part.match(/^([^.]+(?:->>?[^.]+)*)\.([a-z]+)\.(.*)$/i)!;
        return filterSql(c, m[1], m[2], m[3]);
      }).join(' OR ') + ')');
    }
    order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
      this.orders.push({ col, asc: opts?.ascending !== false, nulls: opts?.nullsFirst === undefined ? undefined : opts.nullsFirst ? 'first' : 'last' });
      return this;
    }
    limit(n: number) { this.lim = n; return this; }
    range(from: number, to: number) { this.off = from; this.lim = to - from + 1; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }

    then<T1 = any, T2 = never>(onf?: any, onr?: any): Promise<T1 | T2> { return this.exec().then(onf, onr); }

    private async exec(): Promise<any> {
      try {
        if (dbFault.on) return { data: null, error: { message: 'connection refused (simulated outage)', code: 'ECONNREFUSED', details: null, hint: null }, count: null, status: 503 };
        const m = await meta(this.table);
        const params: any[] = [];
        const ctx: Ctx = {
          alias: 't',
          p: (v: any) => { params.push(typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v); return '$' + params.length; },
        };
        const where = () => this.conds.length ? ' WHERE ' + this.conds.map((c) => c(ctx)).join(' AND ') : '';
        let result: any[] = [];
        let count: number | null = null;

        const runSelect = async (from: string, alias: string, whereSql: string, withOrder: boolean) => {
          const sel = await this.selectList(this.table, alias, this.cols);
          const inner = sel.inner.map((e) => `EXISTS (${e})`);
          const w = [whereSql.replace(/^ WHERE /, ''), ...inner].filter(Boolean);
          let sql = `SELECT ${sel.list} FROM ${from} ${alias}${w.length ? ' WHERE ' + w.join(' AND ') : ''}`;
          if (withOrder) {
            if (this.orders.length) sql += ' ORDER BY ' + this.orders.map((o) => `${colExpr(alias, o.col, false)} ${o.asc ? 'ASC' : 'DESC'}${o.nulls ? ' NULLS ' + o.nulls.toUpperCase() : ''}`).join(', ');
            if (this.lim !== null) sql += ` LIMIT ${this.lim}`;
            if (this.off !== null) sql += ` OFFSET ${this.off}`;
          }
          return sql;
        };

        if (this.op === 'select') {
          const w = where();
          if (this.countMode) {
            const cr = await db.query<any>(`SELECT count(*) AS n FROM ${q(this.table)} t${w}`, params.slice());
            count = Number(cr.rows[0].n);
          }
          if (!this.head) {
            const sql = await runSelect(q(this.table), 't', w, true);
            result = (await db.query<any>(sql, params)).rows;
          }
        } else if (this.op === 'insert' || this.op === 'upsert') {
          const rows = this.rows!;
          if (rows.length === 0) return { data: this.wantReturn ? [] : null, error: null, count: null, status: 201 };
          const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
          const vals = rows.map((r) => '(' + keys.map((k) => (k in r && r[k] !== undefined) ? castParam(ctx, m, k, r[k]) : 'DEFAULT').join(',') + ')');
          let sql = `INSERT INTO ${q(this.table)} (${keys.map(q).join(',')}) VALUES ${vals.join(',')}`;
          if (this.op === 'upsert') {
            const target = (this.conflict ?? m.pk).split(',').map((s) => s.trim());
            const upd = keys.filter((k) => !target.includes(k));
            sql += ` ON CONFLICT (${target.map(q).join(',')}) ` + (this.ignoreDup || upd.length === 0 ? 'DO NOTHING' : `DO UPDATE SET ${upd.map((k) => `${q(k)}=EXCLUDED.${q(k)}`).join(',')}`);
          }
          if (this.wantReturn) {
            const cte = `WITH m AS (${sql} RETURNING *)`;
            const s2 = await runSelect('m', 't', '', false);
            result = (await db.query<any>(`${cte} ${s2}`, params)).rows;
          } else await db.query(sql, params);
        } else if (this.op === 'update') {
          const keys = Object.keys(this.patch).filter((k) => this.patch[k] !== undefined);
          if (keys.length === 0) return { data: null, error: { message: 'empty update', code: 'PGRST100' }, count: null, status: 400 };
          const set = keys.map((k) => `${q(k)}=${castParam(ctx, m, k, this.patch[k])}`).join(',');
          const sql = `UPDATE ${q(this.table)} t SET ${set}${where()}`;
          if (this.wantReturn) {
            const s2 = await runSelect('m', 't', '', false);
            result = (await db.query<any>(`WITH m AS (${sql} RETURNING t.*) ${s2}`, params)).rows;
          } else await db.query(sql, params);
        } else if (this.op === 'delete') {
          const sql = `DELETE FROM ${q(this.table)} t${where()}`;
          if (this.wantReturn) {
            const s2 = await runSelect('m', 't', '', false);
            result = (await db.query<any>(`WITH m AS (${sql} RETURNING t.*) ${s2}`, params)).rows;
          } else await db.query(sql, params);
        }

        result = normalize(result);
        const isWrite = this.op !== 'select';
        const returning = !isWrite || this.wantReturn;
        if (!returning) return { data: null, error: null, count, status: this.op === 'insert' ? 201 : 204 };
        if (this.head) return { data: null, error: null, count, status: 200 };
        if (this.mode === 'single') {
          if (result.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: `The result contains ${result.length} rows`, hint: null }, count, status: 406 };
          return { data: result[0], error: null, count, status: 200 };
        }
        if (this.mode === 'maybe') {
          if (result.length > 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: null, hint: null }, count, status: 406 };
          return { data: result[0] ?? null, error: null, count, status: 200 };
        }
        return { data: result, error: null, count, status: this.op === 'insert' ? 201 : 200 };
      } catch (e: any) {
        return { data: null, error: pgErr(e), count: null, status: 400 };
      }
    }

    /** Build the SELECT list (with PostgREST-style embeds) for `table` aliased `alias`. */
    private async selectList(table: string, alias: string, cols: string): Promise<{ list: string; inner: string[] }> {
      const m = await meta(table);
      const items = splitTop(cols || '*');
      const out: string[] = [];
      const inner: string[] = [];
      for (const it of items) {
        const em = it.match(/^([a-z_][a-z0-9_]*)(!inner)?\((.*)\)$/is);
        if (!em) {
          if (it === '*') out.push(`${alias}.*`);
          else {
            const al = it.match(/^([a-z_][a-z0-9_]*):([a-z_][a-z0-9_]*)$/i);
            out.push(al ? `${alias}.${q(al[2])} AS ${q(al[1])}` : `${alias}.${q(it)}`);
          }
          continue;
        }
        const rel = em[1], isInner = !!em[2], sub = em[3];
        const toOne = m.fks.find((f) => f.refTable === rel);
        const toMany = m.refs.find((r) => r.table === rel);
        const rm = await meta(rel);
        const ra = 'e' + Math.abs(hash(rel + alias));
        const subSel = await this.selectList(rel, ra, sub);
        if (toOne) {
          const where = `${ra}.${q(toOne.refCol)} = ${alias}.${q(toOne.col)}`;
          out.push(`(SELECT to_jsonb(x) FROM (SELECT ${subSel.list} FROM ${q(rel)} ${ra} WHERE ${where}) x) AS ${q(rel)}`);
          if (isInner) inner.push(`SELECT 1 FROM ${q(rel)} ${ra} WHERE ${where}`);
        } else if (toMany) {
          const where = `${ra}.${q(toMany.col)} = ${alias}.${q(toMany.refCol)}`;
          out.push(`COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT ${subSel.list} FROM ${q(rel)} ${ra} WHERE ${where}) x), '[]'::jsonb) AS ${q(rel)}`);
          if (isInner) inner.push(`SELECT 1 FROM ${q(rel)} ${ra} WHERE ${where}`);
        } else throw new Error(`fakeSupabase: no relationship between ${table} and ${rel}`);
        void rm;
      }
      return { list: out.join(', '), inner };
    }
  }

  type Ctx = { alias: string; p: (v: any) => string };
  function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
  function isTextOp(col: string, _op: string) { return col.includes('->>') || col.includes('->'); }

  function filterSql(c: Ctx, col: string, op: string, val: any): string {
    const text = col.includes('->');
    const ce = (asText: boolean) => colExpr(c.alias, col, asText);
    switch (op) {
      case 'eq': return `${ce(text)} = ${c.p(val)}`;
      case 'neq': return `${ce(text)} <> ${c.p(val)}`;
      case 'gt': return `${ce(text)} > ${c.p(val)}`;
      case 'gte': return `${ce(text)} >= ${c.p(val)}`;
      case 'lt': return `${ce(text)} < ${c.p(val)}`;
      case 'lte': return `${ce(text)} <= ${c.p(val)}`;
      case 'like': return `${ce(text)} LIKE ${c.p(val)}`;
      case 'ilike': return `${ce(text)} ILIKE ${c.p(val)}`;
      case 'is': {
        const v = String(val).toLowerCase();
        return `${ce(false)} IS ${v === 'null' ? 'NULL' : v === 'true' ? 'TRUE' : 'FALSE'}`;
      }
      case 'in': {
        const list = Array.isArray(val) ? val : String(val).replace(/^\(|\)$/g, '').split(',');
        return list.length ? `${ce(text)} IN (${list.map((v: any) => c.p(v)).join(',')})` : 'FALSE';
      }
      default: throw new Error('fakeSupabase: unsupported filter op ' + op);
    }
  }

  function castParam(ctx: Ctx, m: Meta, col: string, v: any): string {
    const t = m.cols[col];
    if (v === null) return 'NULL';
    if (t === 'jsonb' || t === 'json') return `${ctx.p(JSON.stringify(v))}::${t}`;
    if (t && t.startsWith('_') && Array.isArray(v)) {
      const lit = '{' + v.map((x) => '"' + String(x).replace(/(["\\])/g, '\\$1') + '"').join(',') + '}';
      return `${ctx.p(lit)}::${t.slice(1)}[]`;
    }
    return ctx.p(v);
  }

  async function rpc(fn: string, args: Record<string, any> = {}) {
    try {
      if (dbFault.on) return { data: null, error: { message: 'connection refused (simulated outage)', code: 'ECONNREFUSED', details: null, hint: null }, status: 503 };
      metaLoaded ||= loadMeta();
      const pr = await db.query<any>(`select proretset, prorettype::regtype::text as rt from pg_proc where proname=$1 and pronamespace='public'::regnamespace limit 1`, [fn]);
      if (!pr.rows.length) return { data: null, error: { message: `Could not find the function public.${fn}`, code: 'PGRST202', details: null, hint: null }, status: 404 };
      const keys = Object.keys(args);
      const params = keys.map((k) => (typeof args[k] === 'object' && args[k] !== null ? JSON.stringify(args[k]) : args[k]));
      const named = keys.map((k, i) => `${q(k)} => $${i + 1}`).join(', ');
      if (pr.rows[0].proretset) {
        const r = await db.query<any>(`SELECT * FROM ${q(fn)}(${named})`, params);
        return { data: normalize(r.rows), error: null, status: 200 };
      }
      const r = await db.query<any>(`SELECT ${q(fn)}(${named}) AS r`, params);
      const val = r.rows[0]?.r;
      return { data: pr.rows[0].rt === 'void' ? null : normalize(val ?? null), error: null, status: 200 };
    } catch (e: any) {
      return { data: null, error: pgErr(e), status: 400 };
    }
  }

  const client: any = {
    from: (table: string) => new Builder(table),
    rpc: (fn: string, args?: any) => {
      const p = rpc(fn, args);
      return { then: (a: any, b: any) => p.then(a, b), catch: (b: any) => p.catch(b) } as any;
    },
    storage: { from: () => { throw new Error('supabase.storage is not available in the hermetic test client'); } },
    auth: { getUser: async () => ({ data: { user: null }, error: { message: 'auth not available in test client' } }) },
  };
  return client;
}
