export interface SendOpts {
  to: string; from: string; fromName?: string;
  subject: string; html: string; replyTo?: string;
  headers?: Record<string,string>; tags?: {name:string;value:string}[];
  /** Resend idempotency key (Idempotency-Key header). Same key + same payload within 24h
   * returns the original result instead of sending again. Must be deterministic per retry —
   * never randomize it, or Resend's own dedup layer is defeated. */
  idempotencyKey?: string;
}

export interface EmailProvider {
  send(opts: SendOpts): Promise<{ messageId: string }>;
  /** Send up to 100 emails in a single API call. Returns one messageId per input. */
  sendBatch(batch: SendOpts[]): Promise<{ messageIds: string[] }>;
}
