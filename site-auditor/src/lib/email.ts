/**
 * Transactional email.
 *
 * One provider, Resend, chosen over an SDK because a single fetch to a
 * documented endpoint has no dependency to keep current and no surprise in the
 * bundle. Without a key configured, sending is a no-op that reports why, and
 * the caller falls back to telling the person to download the PDF themselves.
 * A missing key must never look like a delivered email.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export interface SendResult {
  sent: boolean;
  reason?: 'no_key' | 'provider_error' | 'exception';
  detail?: string;
}

export interface Attachment {
  filename: string;
  /** Base64-encoded content. */
  content: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: false, reason: 'no_key' };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo || process.env.EMAIL_REPLY_TO || undefined,
        attachments: input.attachments,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error('[email] provider rejected the send', res.status, detail);
      return { sent: false, reason: 'provider_error', detail };
    }
    return { sent: true };
  } catch (e: any) {
    console.error('[email] send failed', e);
    return { sent: false, reason: 'exception', detail: String(e?.message || e).slice(0, 200) };
  }
}

/**
 * The covering note for a report.
 *
 * Written as a short human message rather than a marketing template: the
 * document is the thing, and the email exists to deliver it and say what it
 * contains. Plain text is generated alongside because a fair number of people
 * read mail that way, and an HTML-only email is a broken email for them.
 */
export function reportEmail(input: {
  host: string;
  score: number;
  headline: string;
  critical: number;
  high: number;
  shareUrl?: string;
  name?: string;
}): { subject: string; html: string; text: string } {
  const greeting = input.name ? `Hi ${input.name},` : 'Hi,';
  const counts =
    input.critical > 0
      ? `${input.critical} critical and ${input.high} high-priority issue${input.high === 1 ? '' : 's'}`
      : input.high > 0
        ? `${input.high} high-priority issue${input.high === 1 ? '' : 's'}`
        : 'no critical or high-priority issues';

  const lines = [
    greeting,
    '',
    `Your Squarespace audit for ${input.host} is attached as a PDF.`,
    '',
    `It scored ${input.score} out of 100, with ${counts}. ${input.headline}`,
    '',
    'The report opens with the three things worth doing first, then every finding with the evidence behind it, why it matters, what to change, and what changes when you do.',
    input.shareUrl ? `` : '',
    input.shareUrl ? `You can also read it in the browser: ${input.shareUrl}` : '',
    '',
    'If anything in it is unclear, reply to this email and a person will answer.',
    '',
    'Squarespell',
    'squarespell.com',
  ].filter((l) => l !== undefined);

  const text = lines.join('\n');

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#3c4249;line-height:1.6">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6eaed;border-radius:8px;padding:28px">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:1.2px;color:#9aa2aa">SQUARESPELL SITE AUDIT</div>
    <h1 style="margin:10px 0 0;font-size:22px;color:#14171a;letter-spacing:-0.3px">${esc(input.host)}</h1>
    <div style="margin:18px 0 6px;font-size:38px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${
      input.score >= 80 ? '#0a875a' : input.score >= 60 ? '#9a6410' : '#b4271b'
    }">${input.score}</div>
    <div style="font-size:12px;color:#9aa2aa;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">OUT OF 100 · ${esc(counts.toUpperCase())}</div>
    <p style="margin:18px 0 0;font-size:16px;color:#14171a;font-weight:600">${esc(input.headline)}</p>
    <p style="margin:14px 0 0">The full report is attached as a PDF. It opens with the three things worth doing first, then every finding with the evidence behind it, why it matters, what to change, and what changes when you do.</p>
    ${
      input.shareUrl
        ? `<p style="margin:14px 0 0"><a href="${esc(input.shareUrl)}" style="color:#0a875a">Read it in your browser</a></p>`
        : ''
    }
    <p style="margin:18px 0 0">If anything in it is unclear, reply to this email and a person will answer.</p>
    <p style="margin:22px 0 0;font-size:13px;color:#818a93">Squarespell · <a href="https://squarespell.com" style="color:#818a93">squarespell.com</a></p>
  </div>
</body></html>`;

  return { subject: `Your Squarespace audit for ${input.host}`, html, text };
}
