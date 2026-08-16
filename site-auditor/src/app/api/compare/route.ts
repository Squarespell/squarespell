/**
 * POST /api/compare, benchmark an audited site against named competitors.
 *
 * Separate from /api/audit because it costs two or three more crawls and the
 * reader has to ask for it. Nobody's competitors can be guessed, and guessing
 * would produce a comparison against the wrong businesses, which is worse than
 * no comparison at all.
 */

import { NextRequest } from 'next/server';
import { runComparison } from '@/lib/audit/compare';
import { normaliseInput, prettyHost } from '@/lib/audit/url';
import {
  checkRateLimit,
  clientIp,
  getAuditByToken,
  hashRequester,
  saveComparison,
  trackEvent,
} from '@/lib/db';

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

  const token = typeof body?.token === 'string' ? body.token.slice(0, 64) : '';
  if (!token) {
    return Response.json({ error: 'A report token is required.' }, { status: 400 });
  }

  const raw: unknown = body?.competitors;
  const competitors = Array.isArray(raw)
    ? raw
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0 && u.length < 2000)
        .map((u) => u.trim())
        .slice(0, 3)
    : [];
  if (!competitors.length) {
    return Response.json({ error: 'Add at least one competitor address.' }, { status: 400 });
  }

  const requesterHash = hashRequester(clientIp(req.headers), req.headers.get('user-agent') || '');
  const verdict = await checkRateLimit(requesterHash);
  if (!verdict.allowed) {
    return Response.json({ error: verdict.reason, code: 'RATE_LIMITED' }, { status: 429 });
  }

  const report = await getAuditByToken(token);
  if (!report) {
    return Response.json({ error: 'That report could not be found.' }, { status: 404 });
  }

  // A competitor cannot be the site itself: comparing a site to itself produces
  // a meaningless row and burns a crawl.
  const self = prettyHost(report.finalUrl);
  const targets = competitors.filter((u) => prettyHost(normaliseInput(u) || u) !== self);
  if (!targets.length) {
    return Response.json(
      { error: 'Those are the same site you just audited. Add a competitor instead.' },
      { status: 400 }
    );
  }

  // Leave headroom inside the function limit for the crawl to wind down and the
  // result to be written.
  const deadline = Date.now() + 46_000;
  const comparison = await runComparison(report, targets, deadline);

  await saveComparison(token, comparison);
  await trackEvent(
    'comparison_run',
    {
      host: report.host,
      competitors: comparison.competitors.length,
      read: comparison.competitors.filter((c) => c.ok).length,
      yours: comparison.you.overall,
    },
    token,
    requesterHash
  );

  return Response.json(comparison);
}
