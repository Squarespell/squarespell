import { supabase } from '../db/supabaseClient';

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'https://squarespell-api.onrender.com';

/**
 * Build an unsubscribe URL for a given email. Uses base64url-encoded token
 * so the email is not visible in plain text in the URL.
 */
export function buildUnsubscribeUrl(email: string, quizId?: string): string {
  const payload: Record<string, string> = { email };
  if (quizId) payload.quiz_id = quizId;
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${BACKEND_URL}/api/public/unsubscribe?token=${token}`;
}

/**
 * Build List-Unsubscribe headers (RFC 2369 + RFC 8058 one-click).
 */
export function buildUnsubscribeHeaders(email: string, quizId?: string): Record<string, string> {
  const url = buildUnsubscribeUrl(email, quizId);
  return {
    'List-Unsubscribe': `<${url}>, <mailto:unsubscribe@squarespell.com?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Check if an email is on the unsubscribe list. Returns true if suppressed.
 */
export async function isUnsubscribed(email: string): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}

/**
 * Default business address for CAN-SPAM compliance.
 * Customers can override via brand kit; this is the platform fallback.
 */
const DEFAULT_BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || 'Squarespell, 651 N Broad St, Suite 201, Middletown, DE 19709';

/**
 * Build the HTML footer snippet with unsubscribe link for any email.
 */
export function unsubscribeFooterHtml(email: string, quizId?: string): string {
  const url = buildUnsubscribeUrl(email, quizId);
  return `<tr>
  <td style="padding:14px 32px 22px;background:#fafafa;color:#999;font-size:12px;line-height:1.5;text-align:center;">
    <a href="${url}" style="color:#999;text-decoration:underline;">Unsubscribe</a> from future emails.
  </td>
</tr>`;
}

/**
 * Build a CAN-SPAM compliant footer with business address + unsubscribe.
 * Used by all transactional and marketing email paths.
 */
export function canSpamFooterHtml(
  email: string,
  opts?: { quizId?: string; siteName?: string; businessAddress?: string },
): string {
  const url = buildUnsubscribeUrl(email, opts?.quizId);
  const siteName = opts?.siteName || 'Squarespell';
  const address = opts?.businessAddress || DEFAULT_BUSINESS_ADDRESS;
  return `<div style="text-align:center;padding:20px 32px;font-size:12px;color:#999;line-height:1.6;">
  <span>Sent by ${siteName} via <a href="https://squarespell.com" style="color:#888;text-decoration:none;">Squarespell</a></span><br/>
  <span style="color:#bbb;">${address}</span><br/>
  <a href="${url}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
</div>`;
}

/**
 * CAN-SPAM footer for plain-text emails.
 */
export function canSpamFooterText(email: string, opts?: { quizId?: string; businessAddress?: string }): string {
  const url = buildUnsubscribeUrl(email, opts?.quizId);
  const address = opts?.businessAddress || DEFAULT_BUSINESS_ADDRESS;
  return `\n${address}\nUnsubscribe: ${url}`;
}
