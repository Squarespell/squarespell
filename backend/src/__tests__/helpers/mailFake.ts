/**
 * Local stand-in for the Hostinger mailbox: replaces nodemailer's SMTP transport and records every outbound email.
 * It can be told to fail the two ways a real mail server does: refuse the message (an SMTP 5xx reply) or drop the
 * connection. The product's mailer turns both into { error }, exactly as it does against smtp.hostinger.com.
 */
export type SentMail = { to: any; subject: string; from: any; replyTo?: any; html?: string; text?: string; headers?: any };
export const outbox: SentMail[] = [];
export const mailBehaviour = { mode: 'ok' as 'ok' | 'refused' | 'throw' };
export function resetOutbox() { outbox.length = 0; mailBehaviour.mode = 'ok'; }

export function createTransport(_options: any) {
  return {
    async sendMail(message: any) {
      if (mailBehaviour.mode === 'throw') throw Object.assign(new Error('connect ECONNREFUSED smtp.test:465'), { code: 'ESOCKET' });
      if (mailBehaviour.mode === 'refused') throw Object.assign(new Error('550 5.7.1 Sender address rejected'), { responseCode: 550 });
      outbox.push(message);
      return { messageId: '<local-' + outbox.length + '@smtp.test>', accepted: [].concat(message.to), rejected: [] };
    },
    close() {},
  };
}
