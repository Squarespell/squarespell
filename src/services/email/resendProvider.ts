import { Resend } from 'resend';
import type { EmailProvider } from './provider';
const resend = new Resend(process.env.RESEND_API_KEY!);
export const resendProvider: EmailProvider = {
  async send(o) {
    const r = await resend.emails.send({
      from: o.fromName ? `${o.fromName} <${o.from}>` : o.from,
      to: o.to, subject: o.subject, html: o.html,
      reply_to: o.replyTo, headers: o.headers, tags: o.tags,
    } as any);
    if ((r as any).error) throw new Error((r as any).error.message);
    return { messageId: (r as any).data?.id || '' };
  },
  async verifyDomain(domain) {
    const r = await resend.domains.create({ name: domain } as any);
    return { records: (r as any).data?.records || [] };
  },
};
