/** Records every outbound email; can be told to fail the way Resend v3 does (returns {error}, does not throw). */
export type SentMail = { to: any; subject: string; from: string; html?: string; text?: string; headers?: any };
export const outbox: SentMail[] = [];
export const resendBehaviour = { mode: 'ok' as 'ok' | 'error-result' | 'throw' };
export function resetOutbox() { outbox.length = 0; resendBehaviour.mode = 'ok'; }

export class FakeResend {
  emails = {
    send: async (payload: any) => {
      if (resendBehaviour.mode === 'throw') throw new Error('resend network failure');
      if (resendBehaviour.mode === 'error-result') return { data: null, error: { name: 'validation_error', message: 'The domain is not verified' } };
      outbox.push(payload);
      return { data: { id: 'email_' + outbox.length }, error: null };
    },
  };
  batch = { send: async (payloads: any[]) => { payloads.forEach((p) => outbox.push(p)); return { data: payloads.map((_, i) => ({ id: 'b' + i })), error: null }; } };
  constructor(_key?: string) {}
}
