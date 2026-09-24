import type { EmailProvider, SendOpts } from './provider';

// Test-only in-memory transport. Captures sent messages for assertions
// instead of delivering them. Never wired into a production path -- see
// the guard in services/email/index.ts, which is the only place this file
// is imported from, and only when EMAIL_TRANSPORT=test and NODE_ENV is not
// production.

export interface CapturedTestEmail extends SendOpts {
  sentAt: string;
}

const sent: CapturedTestEmail[] = [];

export const testEmailProvider: EmailProvider = {
  async send(opts: SendOpts) {
    const messageId = 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    sent.push({ ...opts, sentAt: new Date().toISOString() });
    return { messageId };
  },
  async sendBatch(batch: SendOpts[]) {
    const ids: string[] = [];
    for (const opts of batch) {
      const r = await testEmailProvider.send(opts);
      ids.push(r.messageId);
    }
    return { messageIds: ids };
  },
};

export function getCapturedTestEmails(): CapturedTestEmail[] {
  return sent.slice();
}

export function clearCapturedTestEmails(): void {
  sent.length = 0;
}

