/**
 * POST /api/perf, real-world performance for an already-audited site.
 *
 * Separate from /api/audit on purpose. A Lighthouse run takes ten to thirty
 * seconds and would eat the crawl budget, so the report renders from our own
 * measurements first and this fills in behind it. If it fails, the report is
 * still complete, which is the same rule every other optional stage follows.
 */

import { NextRequest } from 'next/server';
import { fetchPageSpeed } from '@/lib/audit/perf/psi';
import { normaliseInput, prettyHost } from '@/lib/audit/url';
import { checkRateLimit, clientIp, hashRequester, savePerf, trackEvent } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const raw = typeof body?.url === 'string' ? body.url.trim() : '';
  const url = normaliseInput(raw);
  if (!url || raw.length > 2000) {
    return Response.json({ error: 'A site address is required.' }, { status: 400 });
  }
  const token = typeof body?.token === 'string' && body.token.length <= 64 ? body.token : undefined;

  // Same limiter as the audit itself. This costs a Google quota unit and up to
  // a minute of function time, so it is not a free endpoint to hammer.
  const requesterHash = hashRequester(clientIp(req.headers), req.headers.get('user-agent') || '');
  const verdict = await checkRateLimit(requesterHash);
  if (!verdict.allowed) {
    return Response.json({ error: verdict.reason, code: 'RATE_LIMITED' }, { status: 429 });
  }

  const started = Date.now();
  const result = await fetchPageSpeed(url, 'mobile', 50_000);

  if (token && result.status !== 'unavailable') {
    await savePerf(token, result);
  }
  await trackEvent(
    'perf_measured',
    {
      host: prettyHost(url),
      status: result.status,
      verdict: result.fieldVerdict,
      lab: result.labScore,
      ms: Date.now() - started,
    },
    token,
    requesterHash
  );

  return Response.json(result, {
    headers: { 'cache-control': 'private, max-age=300' },
  });
}
