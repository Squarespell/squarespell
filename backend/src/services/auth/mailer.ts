import { emailProvider } from '../email';

const FROM_ADDRESS = process.env.SMTP_USER || 'info@squarespellquiz.com';
const FROM_NAME = 'Squarespell Quiz';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Sends the 6-digit sign-in code. Deliberately minimal (plain content, no
 * tracking pixels or links) since it carries a time-sensitive secret.
 */
export async function sendAuthCodeEmail(email: string, code: string): Promise<void> {
  const safeCode = escapeHtml(code);
  const html = '<p>Your Squarespell Quiz sign-in code is:</p>'
    + '<p style="font-size:28px;font-weight:700;letter-spacing:4px">' + safeCode + '</p>'
    + '<p>This code expires in 10 minutes and can only be used once. '
    + "If you didn't request this, you can safely ignore this email.</p>";

  await emailProvider.send({
    to: email,
    from: FROM_ADDRESS,
    fromName: FROM_NAME,
    subject: 'Your sign-in code: ' + code,
    html,
  });
}

