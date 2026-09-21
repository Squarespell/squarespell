/**
 * Production scheduler: a restart inside the same minute must not repeat a job, worker and scheduler keep separate state,
 * email jobs stay off unless enabled, and a failed job is retried only deliberately. The real script runs with a fake curl
 * and a fixed clock (NOW_EPOCH); each call of tick() is a fresh process, exactly what a container restart is.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(ROOT, 'infra/hostinger-production/scheduler/scheduler.sh');
const COMPOSE = path.join(ROOT, 'infra/hostinger-production/docker-compose.production.yml');
const STAGING_COMPOSE = path.join(ROOT, 'infra/hostinger/docker-compose.staging.yml');
const hasGnuDate = spawnSync('date', ['-u', '-d', '@0']).status === 0;

let dir: string;
let log: string;
// Monday 1 June 2026, so the weekly digest and the monthly report are both due at 10:00.
const at = (h: number, m: number) => Date.UTC(2026, 5, 1, h, m, 0) / 1000;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
  log = path.join(dir, 'curl.log');
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'curl'), '#!/bin/sh\nfor a; do last="$a"; done\necho "$last" >> "$CURL_LOG"\nprintf "%s" "§{CURL_CODE:-200}"\n'.replaceAll('§{', '$' + '{'), { mode: 0o755 });
});
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function run(mode: string, state: string, epoch: number, env: Record<string, string> = {}, args: string[] = []) {
  return spawnSync('sh', [SCRIPT, mode, ...args], {
    encoding: 'utf8',
    env: {
      PATH: path.join(dir, 'bin') + ':' + process.env.PATH,
      STATE_DIR: path.join(dir, state), NOW_EPOCH: String(epoch), SCHEDULER_ONE_TICK: '1',
      CRON_SECRET: 'test-secret-not-real', API_URL: 'http://api.invalid', CURL_LOG: log, ...env,
    },
  });
}
const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((u) => u.replace('http://api.invalid', '')) : []);
const EMAIL = { ENABLE_EMAIL_JOBS: 'true' };

describe.skipIf(!hasGnuDate)('production scheduler exactly-once behaviour', () => {
  it('a restart inside the same minute does not repeat any job', () => {
    const first = run('scheduler', 'sched', at(10, 0), EMAIL);
    expect(first.status).toBe(0);
    const due = ['/api/cron/process-scheduled-sends', '/api/cron/weekly-digest', '/api/cron/monthly-report'];
    expect(calls().sort()).toEqual([...due].sort());
    const restart = run('scheduler', 'sched', at(10, 0), EMAIL);
    expect(restart.stdout).toMatch(/SKIP \/api\/cron\/weekly-digest \(already ran in minute 202606011000\)/);
    expect(calls().sort()).toEqual([...due].sort());
    run('scheduler', 'sched', at(10, 1), EMAIL);
    expect(calls()).toHaveLength(3);
    run('scheduler', 'sched', at(10, 5), EMAIL);
    expect(calls().filter((c) => c === '/api/cron/process-scheduled-sends')).toHaveLength(2);
    expect(calls().filter((c) => c === '/api/cron/weekly-digest')).toHaveLength(1);
  });

  it('worker and scheduler keep separate state, and a restart of either does not repeat its job', () => {
    run('worker', 'worker', at(10, 0), EMAIL);
    run('scheduler', 'sched', at(10, 0), EMAIL);
    expect(calls().filter((c) => c === '/api/cron/process-email-queue')).toHaveLength(1);
    run('worker', 'worker', at(10, 0), EMAIL);
    run('scheduler', 'sched', at(10, 0), EMAIL);
    expect(calls().filter((c) => c === '/api/cron/process-email-queue')).toHaveLength(1);
    const w = fs.readdirSync(path.join(dir, 'worker', 'ran'));
    const s = fs.readdirSync(path.join(dir, 'sched', 'ran'));
    expect(w.every((f) => f.startsWith('_api_cron_process-email-queue.'))).toBe(true);
    expect(s.some((f) => f.includes('process-email-queue'))).toBe(false);
  });

  it('email jobs stay disabled unless explicitly enabled; only the preview-cache cleanup runs', () => {
    run('scheduler', 'sched', at(10, 0));
    run('worker', 'worker', at(10, 0));
    expect(calls()).toEqual([]);
    run('scheduler', 'sched', at(9, 0));
    expect(calls()).toEqual([]);
    run('scheduler', 'sched', at(10, 30));
    expect(calls()).toEqual(['/api/cron/cleanup-preview-cache']);
  });

  it('a failed job is not retried inside its minute; a deliberate retry (once mode) runs it', () => {
    const failed = run('scheduler', 'sched', at(10, 30), { CURL_CODE: '500' });
    expect(failed.stdout).toMatch(/ERROR POST \/api\/cron\/cleanup-preview-cache -> 500 \(consecutive failures: 1\)/);
    run('scheduler', 'sched', at(10, 30), { CURL_CODE: '200' });
    expect(calls()).toHaveLength(1);
    const retry = run('once', 'sched', at(10, 30), {}, ['/api/cron/cleanup-preview-cache']);
    expect(retry.status).toBe(0);
    expect(calls()).toHaveLength(2);
  });

  it('once mode only accepts cron paths', () => {
    const r = run('once', 'sched', at(10, 0), {}, ['/api/user/plan']);
    expect(r.status).toBe(2);
    expect(calls()).toEqual([]);
  });

  it('dry-run calls nothing and records nothing', () => {
    run('scheduler', 'sched', at(10, 30), { DRY_RUN: 'true' });
    expect(calls()).toEqual([]);
    expect(fs.readdirSync(path.join(dir, 'sched', 'ran'))).toEqual([]);
  });
});

describe('production compose: persistent, separate, production-only scheduler state', () => {
  const compose = fs.readFileSync(COMPOSE, 'utf8');
  const service = (name: string) => { const i = compose.indexOf('\n  ' + name + ':'); return compose.slice(i, compose.indexOf('\n\n', i)); };

  it('worker and scheduler each mount their own named volume, declared at top level', () => {
    expect(service('worker')).toContain('worker_state:/home/curl_user');
    expect(service('scheduler')).toContain('scheduler_state:/home/curl_user');
    expect(service('worker')).not.toContain('scheduler_state');
    expect(service('scheduler')).not.toContain('worker_state');
    expect(compose).toMatch(/\nvolumes:\n[\s\S]*\n  worker_state: \{\}\n  scheduler_state: \{\}/);
  });

  it('email jobs default to off and both services use the production scheduler script', () => {
    expect(compose.match(/ENABLE_EMAIL_JOBS: \$\{SCHEDULER_ENABLE_EMAIL_JOBS:-false\}/g)).toHaveLength(2);
    expect(compose.match(/\.\/scheduler\/scheduler\.sh:\/opt\/scheduler\.sh:ro/g)).toHaveLength(2);
    expect(compose).not.toContain('../hostinger/scheduler/scheduler.sh');
  });

  it('staging state is separate: staging has no such volumes and the stacks are different compose projects', () => {
    const staging = fs.readFileSync(STAGING_COMPOSE, 'utf8');
    expect(staging).not.toContain('worker_state');
    expect(staging).not.toContain('scheduler_state');
    expect(compose).toContain('name: squarespell-quiz-production');
    expect(staging).toContain('name: squarespell-quiz-staging');
  });
});
