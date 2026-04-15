export interface EmailProvider {
  send(opts: {
    to: string; from: string; fromName?: string;
    subject: string; html: string; replyTo?: string;
    headers?: Record<string,string>; tags?: {name:string;value:string}[];
  }): Promise<{ messageId: string }>;
  verifyDomain(domain: string): Promise<{ records: any[] }>;
}
