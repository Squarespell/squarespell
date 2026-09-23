import { Resend } from 'resend';
import type { EmailProvider, SendOpts } from './provider';
const resend = new Resend(process.env.RESEND_API_KEY!);

function formatPayload(o: SendOpts) {
  return {
    from: o.fromName ? `${o.fromName} <${o.from}>` : o.from,
    to: o.to, subject: o.subject, html: o.html,
    reply_to: o.replyTo, headers: o.headers, tags: o.tags,
  };
}

export const resendProvider: EmailProvider = {
  async send(o) {
    var options = o.idempotencyKey ? { idempotencyKey: o.idempotencyKey } : undefined;
    const r: any = await resend.emails.send(formatPayload(o) as any, options as any);
    if (r?.error) {
      // Preserve Resend's own error slug (e.g. "concurrent_idempotent_requests",
      // "invalid_idempotent_request") on `.code` so callers can branch on it without
      // parsing the message text. Never attach the payload (to/subject/html) here.
      throw Object.assign(new Error(r.error.message), { code: r.error.name });
    }
    return { messageId: r?.data?.id || '' };
  },

  async sendBatch(batch) {
    if (batch.length === 0) return { messageIds: [] };
    // Resend batch API accepts up to 100 emails per call
    const payloads = batch.map(formatPayload);
    const r: any = await (resend as any).batch.send(payloads);
    if (r?.error) throw Object.assign(new Error(r.error.message), { code: r.error.name });
    const ids: string[] = (r?.data || []).map((d: any) => d?.id || '');
    return { messageIds: ids };
  },
};
