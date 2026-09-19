/** Structured logs must not carry credentials or customer PII. */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { log } from '../../lib/logger';

function capture(fn: () => void): string {
  const lines: string[] = [];
  const o = vi.spyOn(process.stdout, 'write').mockImplementation((s: any) => { lines.push(String(s)); return true; });
  const e = vi.spyOn(process.stderr, 'write').mockImplementation((s: any) => { lines.push(String(s)); return true; });
  const prev = process.env.LOG_LEVEL;
  try { fn(); } finally { o.mockRestore(); e.mockRestore(); process.env.LOG_LEVEL = prev; }
  return lines.join('');
}
afterEach(() => vi.restoreAllMocks());

describe('log redaction', () => {
  it('removes credentials by key name at any depth', () => {
    const out = capture(() => log.error('boom', { authorization: 'Bearer eyJhbGciOi.payload.sig', headers: { 'x-cron-secret': 'local-cron-secret', cookie: 'a=b' }, config: { api_key: 'sk_live_abcdef123456', password: 'hunter2' }, token: 'tok_123' }));
    expect(out).not.toMatch(/eyJhbGciOi|local-cron-secret|a=b|sk_live_abcdef|hunter2|tok_123/);
    expect(out).toContain('[REDACTED]');
  });
  it('masks email addresses (structured and inside free text) so customer PII does not reach the log store', () => {
    const out = capture(() => { log.error('[GDPR] Skipping result email - no consent', { email: 'ada@customer.example', to: 'bob@customer.example' }); log.warn('Email to carol@customer.example failed'); });
    expect(out).not.toMatch(/ada@customer\.example|bob@customer\.example|carol@customer\.example/);
    expect(out).toMatch(/@customer\.example/); // domain kept for debugging
  });
  it('scrubs token-looking strings in messages and error text (Stripe, Clerk, Resend, Anthropic, JWT)', () => {
    const out = capture(() => log.error('failed with sk_test_abcdefghijklmnop and whsec_abcdefghijklmnopqrstu and re_abcdefghijklmnopqrst and sk-ant-abcdefghijklmnopqrst', { err: new Error('jwt eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJl rejected') }));
    expect(out).not.toMatch(/sk_test_abcdefghijklmnop|whsec_abcdefghijklmnopqrstu|re_abcdefghijklmnopqrst|sk-ant-abcdefghijklmnopqrst|eyJhbGciOiJSUzI1NiJ9\.eyJ/);
  });
  it('keeps the useful, non-sensitive fields', () => {
    const out = capture(() => log.info('request', { method: 'POST', path: '/api/quiz/x/lead', status: 201, duration: 12 }));
    expect(out).toContain('"path":"/api/quiz/x/lead"');
    expect(out).toContain('"status":201');
  });
});
