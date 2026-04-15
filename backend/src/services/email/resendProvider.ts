import { Resend } from 'resend';
import type { EmailProvider } from './provider';
const resend = new Resend(process.env.RESEND_API_KEY!);
export const resendProvider: EmailProvider = {
  async send(o) {
    const r: any = await resend.emails.send({
      from: o.fromName ? `${o.fromName} <${o.from}>` : o.from,
      to: o.to, subject: o.subject, html: o.html,
      reply_to: o.replyTo, headers: o.headers, tags: o.tags,
    } as any);
    if (r?.error) throw new Error(r.error.message);
    return { messageId: r?.data?.id || '' };
  },
};
