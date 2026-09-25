export interface SendOpts {
  to: string; from: string; fromName?: string;
  subject: string; html: string; replyTo?: string;
  headers?: Record<string,string>; tags?: {name:string;value:string}[];
}

export interface EmailProvider {
  send(opts: SendOpts): Promise<{ messageId: string }>;
  /** Send up to 100 emails in a single API call. Returns one messageId per input. */
  sendBatch(batch: SendOpts[]): Promise<{ messageIds: string[] }>;
}

/**
 * Every outbound email now originates from the single Hostinger mailbox this
 * server authenticates as -- unlike Resend's verified-domain model, a plain
 * SMTP account can't send `from` an arbitrary address. Call sites that used
 * to send from a distinct semantic address (results@, digest@, hello@...)
 * should keep it as `replyTo` instead, so replies still land somewhere
 * sensible even though the envelope sender is always this mailbox.
 */
export const PLATFORM_FROM_ADDRESS = process.env.SMTP_USER || 'info@squarespellquiz.com';
