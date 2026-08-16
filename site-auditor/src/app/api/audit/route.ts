/**
 * POST /api/audit, runs an audit and streams progress as NDJSON.
 *
 * Streaming rather than a job queue: the whole pipeline is budget-bounded to
 * well under the function limit, so a queue would add infrastructure, latency
 * and failure modes without buying anything. The client gets live progress and
 * the finished report over one connection, and the report is persisted before
 * the stream closes so it survives as a shareable link.
 */

import { NextRequest } from 'next/server';
import { runAudit, AuditError, DEFAULT_CONFIG } from '@/lib/audit/pipeline';
import { interpretReport } from '@/lib/ai/interpret';
import {
  checkRateLimit,
  clientIp,
  getAuditByToken,
  getHistory,
  hashRequester,
  saveAudit,
  saveFailedAudit,
  trackEvent,
} from '@/lib/db';
import { normaliseInput, prettyHost } from '@/lib/audit/url';
import { diffReports } from '@/lib/audit/diff';
import type { ProgressEvent } from '@/lib/audit/types';

export const runtime = 'nodejs';
// 60s is the Hobby-plan ceiling. Raise this (and vercel.json) to 300 on Pro.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!rawUrl || rawUrl.length > 2000) {
    return Response.json(
      { error: 'Enter the address of the Squarespace site you want to audit.', code: 'EMPTY_URL' },
      { status: 400 }
    );
  }

  const ip = clientIp(req.headers);
  const requesterHash = hashRequester(ip, req.headers.get('user-agent') || '');
  const country = req.headers.get('x-vercel-ip-country') || undefined;

  const utm: Record<string, string> = {};
  if (body?.utm && typeof body.utm === 'object') {
    for (const k of UTM_KEYS) {
      const v = body.utm[k];
      if (typeof v === 'string' && v.length < 200) utm[k] = v;
    }
  }

  // Optional, additive: entirely unused by the UI today. runAudit's own
  // sanitiser (pipeline.ts) trims, bounds and drops anything malformed, so
  // this is passed through as-is rather than re-validated here.
  const businessContext = body?.businessContext && typeof body.businessContext === 'object' ? body.businessContext : undefined;

  const verdict = await checkRateLimit(requesterHash);
  if (!verdict.allowed) {
    await trackEvent('audit_rate_limited', { host: prettyHost(normaliseInput(rawUrl)) }, undefined, requesterHash);
    return Response.json(
      { error: verdict.reason, code: 'RATE_LIMITED', retryAfterSeconds: verdict.retryAfterSeconds },
      { status: 429, headers: { 'retry-after': String(verdict.retryAfterSeconds) } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: ProgressEvent | Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          closed = true;
        }
      };

      try {
        await trackEvent('audit_started', { host: prettyHost(normaliseInput(rawUrl)), utm }, undefined, requesterHash);

        const report = await runAudit(rawUrl, send, DEFAULT_CONFIG, businessContext);

        send({ type: 'stage', stage: 'ai', label: 'Writing your recommendations', pct: 92 });
        await interpretReport(report);

        send({ type: 'stage', stage: 'save', label: 'Finishing your report', pct: 97 });
        // Read the history before saving this one, so "previously" means
        // previously rather than including the audit being run right now.
        report.history = await getHistory(report.host);
        // Best-effort: the diff is a nice-to-have layered on top of an audit
        // that must render regardless. A lookup failure here is silently
        // swallowed, same policy as every other persistence call in this file.
        if (report.history.length) {
          try {
            const previous = await getAuditByToken(report.history[0].token);
            report.diff = diffReports(report, previous);
          } catch (e) {
            console.error('[api/audit] diff lookup failed', e);
          }
        }
        const saved = await saveAudit({ report, requesterHash, country, utm, referrer: body?.referrer });
        if (saved) report.id = saved.token;

        await trackEvent(
          'audit_completed',
          {
            host: report.host,
            score: report.score.overall,
            version: report.squarespace.version,
            findings: report.findings.length,
            opportunity: report.opportunity.tier,
            ai: report.coverage.aiUsed,
          },
          report.id || undefined,
          requesterHash
        );

        send({ type: 'stage', stage: 'done', label: 'Report ready', pct: 100 });
        send({ type: 'done', report });
      } catch (e: any) {
        const isAuditError = e instanceof AuditError;
        const code = isAuditError ? e.code : 'AUDIT_FAILED';
        const message = isAuditError
          ? e.message
          : 'Something went wrong while auditing this site. Please try again.';
        if (!isAuditError) console.error('[api/audit] unexpected failure', e);

        await saveFailedAudit({
          inputUrl: rawUrl,
          host: prettyHost(normaliseInput(rawUrl)),
          code,
          message,
          requesterHash,
          utm,
        });
        send({ type: 'error', code, message, hint: isAuditError ? e.hint : undefined });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
