/** Hermetic self-test of scripts/smoke/smoke.mjs against the in-process app and the local database. */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { getApp, makeUser } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';

const SCRIPT = path.resolve(__dirname, '../../../../scripts/smoke/smoke.mjs');
let server: Server; let base: string;
beforeAll(async () => { server = (await getApp()).listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r)); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; });
afterAll(() => { server.close(); });
beforeEach(resetData);

function run(args: string[], env: Record<string, string> = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH!, ...env } });
    let out = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code: code ?? -1, out }));
  });
}

describe('smoke script', () => {
  it('passes every step against a healthy backend, tags its data P1-SMOKE, archives the quiz, and never prints the token', async () => {
    const u = await makeUser({ plan: 'pro' });
    const r = await run(['--base-url', base], { SMOKE_SESSION_TOKEN: u.token, SMOKE_CSRF_TOKEN: u.csrfToken });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/13\/13 steps passed/);
    expect(r.out).not.toContain(u.token);
    expect(r.out).not.toContain(u.csrfToken);
    const quiz = (await sql<any>(`select title, status from quizzes`))[0];
    expect(quiz.title).toContain('P1-SMOKE');
    expect(quiz.status).toBe('archived');
    const lead = (await sql<any>(`select name, email from leads`))[0];
    expect(lead.email).toContain('p1-smoke-');
  });

  it('exits 1 with a clear failing step when the backend misbehaves (expired session)', async () => {
    const crypto = await import('node:crypto');
    const u = await makeUser({ plan: 'pro' });
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await sql(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [u.id, expiredHash, new Date(Date.now() - 3600_000).toISOString()],
    );
    const r = await run(['--base-url', base], { SMOKE_SESSION_TOKEN: expiredToken, SMOKE_CSRF_TOKEN: u.csrfToken });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL\s+auth: session token accepted.*token_expired/);
  });

  it('refuses live hosts without --allow-live (exit 3) before making any request', async () => {
    for (const url of ['https://squarespell-api.onrender.com', 'https://app.squarespell.com', 'https://www.squarespellquiz.com']) {
      const r = await run(['--base-url', url], { SMOKE_SESSION_TOKEN: 'placeholder', SMOKE_CSRF_TOKEN: 'placeholder' });
      expect(r.code, url).toBe(3);
      expect(r.out).toMatch(/Refusing to run/);
    }
  });

  it('requires the session and csrf tokens from the environment', async () => {
    const r = await run(['--base-url', base]);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/SMOKE_SESSION_TOKEN \/ SMOKE_CSRF_TOKEN are not set/);
  });
});
