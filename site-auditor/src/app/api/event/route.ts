/** POST /api/event, first-party product analytics. No cross-site identifiers. */

import { NextRequest } from 'next/server';
import { clientIp, hashRequester, trackEvent } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'report_viewed',
  'finding_expanded',
  'cta_clicked',
  'share_copied',
  'print_clicked',
  'category_opened',
  'lead_form_opened',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '');
    if (!ALLOWED.has(name)) return Response.json({ ok: true });
    const requesterHash = hashRequester(clientIp(req.headers), req.headers.get('user-agent') || '');
    const props = body?.props && typeof body.props === 'object' ? body.props : {};
    await trackEvent(name, props, typeof body?.auditToken === 'string' ? body.auditToken : undefined, requesterHash);
  } catch {
    /* never surface analytics failures */
  }
  return Response.json({ ok: true });
}
