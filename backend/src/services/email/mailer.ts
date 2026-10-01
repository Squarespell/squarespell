/**
 * Outgoing email through the Hostinger mailbox (SMTP). This replaced Resend so every email the product sends
 * (quiz results, sequences, campaigns, notifications, sign-in emails) goes out from our own hosting plan.
 *
 * Settings (protected server env file):
 *   SMTP_HOST  default smtp.hostinger.com
 *   SMTP_PORT  default 465 (implicit TLS); 587 uses STARTTLS
 *   SMTP_USER  the mailbox, e.g. hello@squarespellquiz.com
 *   SMTP_PASS  the mailbox password
 *   SMTP_FROM  optional sending address when it differs from SMTP_USER (must be an alias of that mailbox)
 *
 * Hostinger only relays mail whose From address belongs to the signed-in mailbox, so the address part of every
 * From is replaced with ours; the display name the caller asked for ("Acme Bakery", "Squarespell") is kept, and
 * the caller's own address becomes Reply-To when no Reply-To was given (unless it is one of our own addresses).
 *
 * `mailer.emails.send()` keeps the result shape of the old Resend client ({ data: { id } } or { error }) so the
 * existing call sites only changed their import.
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailProvider, SendOpts } from './provider';

export type MailMessage = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
};

export type MailResult = { data: { id: string } | null; error: { message: string } | null };

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function senderAddress(): string {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
}

let transporter: Transporter | null = null;
let transporterKey = '';

function getTransporter(): Transporter {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const key = [process.env.SMTP_HOST, port, process.env.SMTP_USER, process.env.SMTP_PASS].join('|');
  if (!transporter || key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
    transporterKey = key;
  }
  return transporter;
}

/** Splits `Name <addr@x>` into its parts; a bare address has no name. */
export function parseAddress(value: string): { name: string; address: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value || '');
  if (m) return { name: m[1].trim(), address: m[2].trim() };
  return { name: '', address: (value || '').trim() };
}

/** Builds the nodemailer message: our mailbox as the sender, the caller's name and address kept where allowed. */
export function buildMessage(msg: MailMessage) {
  const requested = parseAddress(msg.from);
  const ours = senderAddress();
  const replyTo = msg.reply_to || msg.replyTo ||
    (requested.address && requested.address.toLowerCase() !== ours.toLowerCase() && !/@(?:[\w-]+\.)*(?:squarespell|squarespellquiz)\.com$/i.test(requested.address)
      ? requested.address : undefined);
  return {
    from: { name: (requested.name || 'Squarespell').replace(/[\r\n"]/g, ''), address: ours },
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo,
    headers: msg.headers,
  };
}

async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (!mailConfigured()) return { data: null, error: { message: 'Email is not configured (SMTP_USER / SMTP_PASS)' } };
  try {
    const info = await getTransporter().sendMail(buildMessage(msg));
    if (info.rejected && info.rejected.length) {
      return { data: null, error: { message: 'Rejected by mail server: ' + info.rejected.join(', ') } };
    }
    return { data: { id: String(info.messageId || '').replace(/[<>]/g, '') }, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Email send failed' } };
  }
}

/** Drop-in for the old `new Resend(key)` client: `mailer.emails.send(...)` resolves to { data } or { error }. */
export const mailer = { emails: { send: sendMail } };

/** The configured mailer, or null when SMTP is not set up (callers already skip email in that case). */
export function getMailer(): typeof mailer | null {
  return mailConfigured() ? mailer : null;
}

function toMessage(o: SendOpts): MailMessage {
  return {
    from: o.fromName ? `${o.fromName} <${o.from}>` : o.from,
    to: o.to, subject: o.subject, html: o.html, replyTo: o.replyTo, headers: o.headers, tags: o.tags,
  };
}

/** Provider used by campaigns, scheduled sends and platform emails. */
export const emailProvider: EmailProvider = {
  async send(o) {
    const r = await sendMail(toMessage(o));
    if (r.error) throw new Error(r.error.message);
    return { messageId: r.data?.id || '' };
  },

  // SMTP has no batch call: send one by one over the pooled connection. A failed address does not stop the rest;
  // its slot gets an empty id, which callers already treat as "not sent".
  async sendBatch(batch) {
    const ids: string[] = [];
    let firstError: Error | null = null;
    for (const o of batch) {
      const r = await sendMail(toMessage(o));
      if (r.error) { if (!firstError) firstError = new Error(r.error.message); ids.push(''); }
      else ids.push(r.data?.id || '');
    }
    if (firstError && ids.every(function (id) { return !id; })) throw firstError;
    return { messageIds: ids };
  },
};

export type MailStatus = 'ok' | 'not_configured' | 'auth_failed' | 'connection_failed';
let statusCache: { value: MailStatus; at: number } | null = null;

/**
 * Whether the mailbox accepts our login, checked with an SMTP handshake (no email is sent) and cached for five
 * minutes. Reported by /api/health/ready and logged at start-up so a wrong mailbox password shows up immediately;
 * only this one word is exposed, never the address or the server's reply.
 */
export async function mailStatus(force = false): Promise<MailStatus> {
  if (!mailConfigured()) return 'not_configured';
  if (!force && statusCache && Date.now() - statusCache.at < 300000) return statusCache.value;
  let value: MailStatus = 'ok';
  try {
    await Promise.race([
      getTransporter().verify(),
      new Promise(function (_r, reject) { setTimeout(function () { reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })); }, 12000); }),
    ]);
  } catch (err: any) {
    value = err && (err.code === 'EAUTH' || err.responseCode === 535) ? 'auth_failed' : 'connection_failed';
  }
  statusCache = { value, at: Date.now() };
  return value;
}
