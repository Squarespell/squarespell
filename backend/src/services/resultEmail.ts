import { Resend } from 'resend';
import { generateReportToken } from './reportToken';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface ResultEmailParams {
  to: string;
  quizTitle: string;
  outcomeTitle: string;
  outcomeDescription: string;
  ctaUrl?: string;
  ctaText?: string;
  branding: {
    primaryColor?: string;
    siteName?: string;
    logoUrl?: string;
  };
  reportEnabled?: boolean;
  leadId?: string;
  ownerEmail?: string;
}

export async function sendResultEmail(params: ResultEmailParams): Promise<boolean> {
  if (!resend) {
    console.log('[ResultEmail] Resend not configured, skipping');
    return false;
  }

  const { to, quizTitle, outcomeTitle, outcomeDescription, ctaUrl, ctaText, branding, reportEnabled, leadId, ownerEmail } = params;
  const primaryColor = branding.primaryColor || '#D2FF1D';
  const siteName = branding.siteName || 'Squarespell Quiz';
  const logoUrl = branding.logoUrl || '';

  // Generate report token if report is enabled
  let reportUrl = '';
  if (reportEnabled && leadId) {
    const token = generateReportToken(leadId);
    const backendBase = process.env.BACKEND_URL || process.env.API_URL || 'https://squarespell-api.onrender.com';
      reportUrl = `${backendBase}/api/public/leads/${leadId}/report?token=${token}`;
  }

  try {
    const unsubUrl = `${process.env.FRONTEND_URL || 'https://app.squarespell.com'}/unsubscribe?email=${encodeURIComponent(to)}`;
    const plainText = [quizTitle,'',outcomeTitle,'',outcomeDescription.replace(/<[^>]+>/g,''),'',ctaUrl?`${ctaText||'Learn More'}: ${ctaUrl}`:'',reportUrl?`Download your report: ${reportUrl}`:'','','Powered by Squarespell','',`Unsubscribe: ${unsubUrl}`].filter(Boolean).join('\n');

    await resend.emails.send({
      from: `${siteName} <results@squarespell.com>`,
      to,
      ...(ownerEmail ? { reply_to: ownerEmail } : {}),
      subject: `Your Result: ${outcomeTitle}`,
      text: plainText,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@squarespell.com?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': leadId || '',
      },
      html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${outcomeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">
      Your ${quizTitle} results are ready — ${outcomeTitle}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:${primaryColor};padding:28px 32px;color:#0a0a0a;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}" style="max-height:36px;margin-bottom:10px;display:block;" />` : `<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;">${siteName}</div>`}
              <div style="font-size:22px;font-weight:700;margin-top:6px;">Your results are in</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px;">
              <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">From ${quizTitle}</div>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#111;">${outcomeTitle}</h1>
              <div style="color:#444;font-size:15px;line-height:1.65;margin:0 0 28px;">${outcomeDescription}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
                <tr>
                  ${reportUrl ? `<td align="center" style="border-radius:10px;background:${primaryColor};">
                    <a href="${reportUrl}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#0a0a0a;text-decoration:none;border-radius:10px;">⬇  Download your PDF report</a>
                  </td>` : ''}
                </tr>
              </table>
              ${ctaUrl ? `<p style="text-align:center;margin:14px 0 0;"><a href="${ctaUrl}" style="color:${primaryColor};text-decoration:none;font-weight:700;font-size:14px;">${ctaText || 'Learn more'} →</a></p>` : ''}
              ${reportUrl ? `<p style="text-align:center;margin:20px 0 0;color:#999;font-size:12px;">Your download link is valid for 30 days.</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:#fafafa;border-top:1px solid #eee;color:#777;font-size:12px;line-height:1.6;">
              <strong>Didn't land in your Inbox?</strong> Drag this email from Promotions or Spam to your Primary tab, and mark it as <em>Not Spam</em> so future reports don't get lost.
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 22px;background:#fafafa;color:#999;font-size:12px;line-height:1.5;text-align:center;">
              Sent by ${siteName} via <a href="https://squarespell.com" style="color:#888;text-decoration:none;">Squarespell</a>.<br/>
              <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    });
    console.log(`[ResultEmail] Sent to ${to} for "${quizTitle}"`);
    return true;
  } catch (err: any) {
    console.error('[ResultEmail] Failed:', err.message);
    return false;
  }
}
