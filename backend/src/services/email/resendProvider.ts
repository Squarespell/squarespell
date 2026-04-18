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
    const r: any = await resend.emails.send(formatPayload(o) as any);
    if (r?.error) throw new Error(r.error.message);
    return { messageId: r?.data?.id || '' };
  },

  async sendBatch(batch) {
    if (batch.length === 0) return { messageIds: [] };
    // Resend batch API accepts up to 100 emails per call
    const payloads = batch.map(formatPayload);
    const r: any = await (resend as any).batch.send(payloads);
    if (r?.error) throw new Error(r.error.message);
    const ids: string[] = (r?.data || []).map((d: any) => d?.id || '');
    return { messageIds: ids };
  },
};
