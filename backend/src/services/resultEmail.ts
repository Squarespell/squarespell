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
}

export async function sendResultEmail(params: ResultEmailParams): Promise<boolean> {
  if (!resend) {
    console.log('[ResultEmail] Resend not configured, skipping');
    return false;
  }

  const { to, quizTitle, outcomeTitle, outcomeDescription, ctaUrl, ctaText, branding, reportEnabled, leadId } = params;
  const primaryColor = branding.primaryColor || '#D2FF1D';
  const siteName = branding.siteName || 'Squarespell Quiz';

  // Generate report token if report is enabled
  let reportUrl = '';
  if (reportEnabled && leadId) {
    const token = generateReportToken(leadId);
    const baseUrl = process.env.FRONTEND_URL || 'https://app.squarespell.com';
    reportUrl = `${baseUrl}/api/public/leads/${leadId}/report?token=${token}`;
  }

  try {
    await resend.emails.send({
      from: `${siteName} <results@squarespell.com>`,
      to,
      subject: `Your Result: ${outcomeTitle}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:40px 32px;text-align:center">
      <h1 style="font-size:24px;margin:0 0 8px;color:#1a1a1a">${quizTitle}</h1>
      <p style="font-size:14px;color:#666;margin:0 0 32px">Here are your results</p>
      <div style="background:${primaryColor};border-radius:12px;padding:32px 24px;margin:0 0 24px">
        <h2 style="font-size:28px;margin:0 0 12px;color:#0a0f05">${outcomeTitle}</h2>
        <p style="font-size:16px;color:#0a0f05;margin:0;line-height:1.5">${outcomeDescription}</p>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#0a0f05;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;font-size:16px">${ctaText || 'Learn More'}</a>` : ''}
        ${reportUrl ? `<a href="${reportUrl}" style="display:inline-block;padding:14px 32px;background:#666666;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;font-size:16px">Download Report</a>` : ''}
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin:24px 0 0">Powered by Squarespell</p>
  </div>
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
