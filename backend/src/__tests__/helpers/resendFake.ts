/**
 * Records every outbound email; can be told to fail the way Resend v3 does (returns {error}, does not throw).
 * Also re-implements Resend's real idempotency-key contract (https://resend.com/docs/dashboard/emails/idempotency-keys):
 * a repeated key within the window returns the ORIGINAL result without sending again, so tests exercise the
 * actual dedup behavior the provider abstraction relies on, not a stand-in for it.
 */
export type SentMail = { to: any; subject: string; from: string; html?: string; text?: string; headers?: any; idempotencyKey?: string };
export const outbox: SentMail[] = [];
export const resendBehaviour = { mode: 'ok' as 'ok' | 'error-result' | 'throw' | 'concurrent-conflict' };
const idempotencyResults = new Map<string, { id: string }>();
export function resetOutbox() { outbox.length = 0; resendBehaviour.mode = 'ok'; idempotencyResults.clear(); }
/** Test-only hook: seed a prior "successful send" under a key, as if a crashed attempt had already reached Resend. */
export function seedIdempotencyResult(key: string, id: string) { idempotencyResults.set(key, { id }); }

export class FakeResend {
  emails = {
    send: async (payload: any, options?: { idempotencyKey?: string }) => {
      const key = options?.idempotencyKey;
      if (key && idempotencyResults.has(key)) {
        // Resend's real behavior: same key -> same cached result, no second send.
        return { data: idempotencyResults.get(key), error: null };
      }
      if (resendBehaviour.mode === 'throw') throw new Error('resend network failure');
      if (resendBehaviour.mode === 'error-result') return { data: null, error: { name: 'validation_error', message: 'The domain is not verified' } };
      if (resendBehaviour.mode === 'concurrent-conflict') {
        return { data: null, error: { name: 'concurrent_idempotent_requests', message: 'another request with the same idempotency key is in progress' } };
      }
      outbox.push({ ...payload, idempotencyKey: key });
      const result = { id: 'email_' + outbox.length };
      if (key) idempotencyResults.set(key, result);
      return { data: result, error: null };
    },
  };
  batch = { send: async (payloads: any[]) => { payloads.forEach((p) => outbox.push(p)); return { data: payloads.map((_, i) => ({ id: 'b' + i })), error: null }; } };
  constructor(_key?: string) {}
}
