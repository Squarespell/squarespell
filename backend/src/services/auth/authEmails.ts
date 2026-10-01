/** Sign-in emails (confirm address, set password, reset password), sent through the Hostinger mailbox. */
import { mailer } from '../email/mailer';

export type AuthEmailKind = 'verify_email' | 'set_password' | 'reset_password';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]; });
}

const COPY: Record<AuthEmailKind, { subject: string; heading: string; body: string; button: string; footer: string }> = {
  verify_email: {
    subject: 'Confirm your email for Squarespell Quiz',
    heading: 'Confirm your email',
    body: 'Click the button below to confirm this is your email address.',
    button: 'Confirm email',
    footer: 'This link works for 3 days. If you did not create a Squarespell Quiz account, you can ignore this email.',
  },
  set_password: {
    subject: 'Set your Squarespell Quiz password',
    heading: 'Set your password',
    body: 'We moved Squarespell Quiz to a new sign-in. Your account, quizzes and leads are all still there. Choose a password to sign in again.',
    button: 'Set password',
    footer: 'This link works for 24 hours and can be used once. If you did not ask for it, you can ignore this email.',
  },
  reset_password: {
    subject: 'Reset your Squarespell Quiz password',
    heading: 'Reset your password',
    body: 'Someone (hopefully you) asked to reset the password for this account. Click the button below to choose a new one.',
    button: 'Reset password',
    footer: 'This link works for 1 hour and can be used once. If you did not ask for it, you can ignore this email; your password stays the same.',
  },
};

export function renderAuthEmail(kind: AuthEmailKind, data: { firstName?: string; link: string }) {
  const c = COPY[kind];
  const hello = data.firstName ? 'Hi ' + esc(data.firstName) + ',' : 'Hi,';
  const link = esc(data.link);
  const html = '<!doctype html><html><body style="margin:0;padding:0;background:#F4F6FF">' +
    '<div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:Inter,Arial,sans-serif;color:#0B1233">' +
    '<div style="font-size:18px;font-weight:600;color:#3154FF;margin-bottom:20px">Squarespell Quiz</div>' +
    '<div style="background:#FFFFFF;border-radius:14px;padding:28px 24px;border:1px solid #E3E8FF">' +
    '<h1 style="font-size:22px;line-height:1.3;margin:0 0 14px">' + c.heading + '</h1>' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 8px">' + hello + '</p>' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 24px">' + c.body + '</p>' +
    '<a href="' + link + '" style="display:inline-block;background:#3154FF;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">' + c.button + '</a>' +
    '<p style="font-size:13px;line-height:1.6;color:#5B6488;margin:24px 0 0">If the button does not work, paste this link into your browser:<br>' +
    '<span style="word-break:break-all;color:#3154FF">' + link + '</span></p>' +
    '</div>' +
    '<p style="font-size:12px;line-height:1.6;color:#5B6488;margin:16px 4px 0">' + c.footer + '</p>' +
    '</div></body></html>';
  const text = c.heading + '\n\n' + (data.firstName ? 'Hi ' + data.firstName + ',' : 'Hi,') + '\n\n' + c.body + '\n\n' +
    data.link + '\n\n' + c.footer + '\n';
  return { subject: c.subject, html, text };
}

export async function sendAuthEmail(kind: AuthEmailKind, to: string, data: { firstName?: string; link: string }): Promise<void> {
  const m = renderAuthEmail(kind, data);
  const r = await mailer.emails.send({ from: 'Squarespell Quiz <no-reply@squarespellquiz.com>', to, subject: m.subject, html: m.html, text: m.text });
  if (r.error) throw new Error(r.error.message);
}
