/**
 * POST /api/lead, voluntary contact capture.
 *
 * The full report is shown before this is ever offered. Nothing is gated behind
 * it: the value exchange is "we already gave you the audit, tell us where to
 * send the PDF or who to talk to". That is deliberate, a form wall in front of
 * the findings would produce more addresses and far worse leads.
 */

import { NextRequest } from 'next/server';
import { checkRateLimit, clientIp, getAuditByToken, hashRequester, saveLead, trackEvent } from '@/lib/db';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '@/lib/pdf/document';
import { isEmailConfigured, reportEmail, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Rendering and attaching the PDF happens inside this request.
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const INTERESTS = new Set(['report', 'fix_help', 'talk', 'other']);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body?.email || '').trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  // Honeypot: a real browser leaves this untouched.
  if (typeof body?.company_website === 'string' && body.company_website.length > 0) {
    return Response.json({ ok: true });
  }

  const ip = clientIp(req.headers);
  const requesterHash = hashRequester(ip, req.headers.get('user-agent') || '');

  const verdict = await checkRateLimit(`lead:${requesterHash}`);
  if (!verdict.allowed) {
    return Response.json({ error: 'Too many submissions. Please try again shortly.' }, { status: 429 });
  }

  const interest = INTERESTS.has(body?.interest) ? String(body.interest) : 'report';
  const ok = await saveLead({
    auditToken: typeof body?.auditToken === 'string' ? body.auditToken.slice(0, 64) : undefined,
    email,
    name: typeof body?.name === 'string' ? body.name.trim() : undefined,
    businessName: typeof body?.businessName === 'string' ? body.businessName.trim() : undefined,
    website: typeof body?.website === 'string' ? body.website.trim() : undefined,
    interest,
    marketingConsent: body?.marketingConsent === true,
    requesterHash,
    utm: body?.utm && typeof body.utm === 'object' ? body.utm : {},
  });

  await trackEvent('lead_captured', { interest, consent: body?.marketingConsent === true }, body?.auditToken, requesterHash);

  // Deliver the report if that is what they asked for. Failure to send is
  // never failure to capture: the lead is already saved above, and the UI
  // falls back to offering the download.
  let emailed = false;
  const token = typeof body?.auditToken === 'string' ? body.auditToken.slice(0, 64) : '';
  if (ok && token && isEmailConfigured()) {
    try {
      const report = await getAuditByToken(token);
      if (report) {
        const element = React.createElement(ReportDocument, { report }) as React.ReactElement<any>;
        const pdf = await renderToBuffer(element);
        const origin = req.nextUrl.origin;
        const mail = reportEmail({
          host: report.host,
          score: report.score.overall,
          headline: report.summary?.headline || '',
          critical: report.findings.filter((f) => f.severity === 'critical').length,
          high: report.findings.filter((f) => f.severity === 'high').length,
          shareUrl: `${origin}/r/${token}`,
          name: typeof body?.name === 'string' ? body.name.trim().split(/\s+/)[0] : undefined,
        });
        const result = await sendEmail({
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments: [
            {
              filename: `squarespell-audit-${report.host.replace(/[^a-z0-9.-]/gi, '-')}.pdf`,
              content: Buffer.from(pdf).toString('base64'),
            },
          ],
        });
        emailed = result.sent;
        await trackEvent('report_emailed', { sent: result.sent, reason: result.reason }, token, requesterHash);
      }
    } catch (e) {
      console.error('[api/lead] report delivery failed', e);
    }
  }

  if (!ok) {
    return Response.json(
      { error: 'We could not save that just now. Please email info@squarespell.com instead.' },
      { status: 503 }
    );
  }
  return Response.json({ ok: true, emailed });
}
