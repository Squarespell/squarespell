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
