/**
 * Phase 1 - the sign-in code email is retried once after a transient SMTP failure, and never duplicated.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { getCapturedTestEmails, clearCapturedTestEmails, testEmailProvider } from '../../services/email/testProvider';

beforeEach(async () => {
  await resetData();
  clearCapturedTestEmails();
});

async function requestCode(email: string) {
  return (await api()).post('/api/auth/request-code').set('X-Forwarded-For', nextIp()).send({ email });
}
async function lastOutcome(email: string) {
  const rows = await sql<any>("select outcome from auth_audit_log where email_normalized=$1 and action='request_code' order by created_at desc limit 1", [email]);
  return rows[0]?.outcome;
}

describe('sign-in code delivery retry', () => {
  it('one transient failure is retried and exactly one message is delivered', async () => {
    const realSend = testEmailProvider.send;
    let calls = 0;
    testEmailProvider.send = async (msg: any) => {
      calls++;
      if (calls === 1) throw new Error('transient SMTP failure');
      return realSend.call(testEmailProvider, msg);
    };
    try {
      const r = await requestCode('retry-once@quiz-test.example');
      expect(r.status).toBe(200);
    } finally {
      testEmailProvider.send = realSend;
    }
    expect(calls).toBe(2);
    expect(getCapturedTestEmails().filter((m) => m.to === 'retry-once@quiz-test.example')).toHaveLength(1);
    expect(await lastOutcome('retry-once@quiz-test.example')).toBe('sent');
  });

  it('a success on the first attempt sends once and does not retry', async () => {
    const realSend = testEmailProvider.send;
    let calls = 0;
    testEmailProvider.send = async (msg: any) => {
      calls++;
      return realSend.call(testEmailProvider, msg);
    };
    try {
      expect((await requestCode('no-retry@quiz-test.example')).status).toBe(200);
    } finally {
      testEmailProvider.send = realSend;
    }
    expect(calls).toBe(1);
    expect(getCapturedTestEmails().filter((m) => m.to === 'no-retry@quiz-test.example')).toHaveLength(1);
  });

  it('a permanent failure is tried twice, delivers nothing, is audited, and still answers generically', async () => {
    const realSend = testEmailProvider.send;
    let calls = 0;
    testEmailProvider.send = async () => {
      calls++;
      throw new Error('SMTP down');
    };
    let status = 0;
    try {
      status = (await requestCode('retry-fail@quiz-test.example')).status;
    } finally {
      testEmailProvider.send = realSend;
    }
    expect(status).toBe(200);
    expect(calls).toBe(2);
    expect(getCapturedTestEmails().filter((m) => m.to === 'retry-fail@quiz-test.example')).toHaveLength(0);
    expect(await lastOutcome('retry-fail@quiz-test.example')).toBe('send_failed');
  });
});
