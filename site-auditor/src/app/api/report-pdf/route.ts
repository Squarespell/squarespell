/**
 * GET /api/report-pdf?token=…, the audit as a designed PDF.
 *
 * Takes a share token rather than a report body, so the document is always
 * rendered from what we actually measured and stored. Accepting a report as
 * input would let anyone generate a Squarespell-branded PDF containing
 * whatever they liked.
 */

import { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ReportDocument } from '@/lib/pdf/document';
import { getAuditByToken, trackEvent, clientIp, hashRequester } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token || token.length > 64) {
    return Response.json({ error: 'A report token is required.' }, { status: 400 });
  }

  const report = await getAuditByToken(token);
  if (!report) {
    return Response.json({ error: 'That report could not be found.' }, { status: 404 });
  }

  try {
    // react-pdf types the root as a DocumentProps element; our component
    // returns exactly that, but the generic does not narrow through a custom
    // wrapper, so the cast is at the boundary rather than inside the document.
    const element = React.createElement(ReportDocument, { report }) as React.ReactElement<any>;
    const buffer = await renderToBuffer(element);
    await trackEvent(
      'pdf_downloaded',
      { host: report.host, score: report.score.overall },
      token,
      hashRequester(clientIp(req.headers), req.headers.get('user-agent') || '')
    );

    const safeHost = report.host.replace(/[^a-z0-9.-]/gi, '-');
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="squarespell-audit-${safeHost}.pdf"`,
        'cache-control': 'private, max-age=600',
      },
    });
  } catch (e) {
    console.error('[api/report-pdf] render failed', e);
    return Response.json({ error: 'The PDF could not be generated.' }, { status: 500 });
  }
}
