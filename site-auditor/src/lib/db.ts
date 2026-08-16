/**
 * Supabase access. Server-only.
 *
 * Every write uses the service-role key, which never reaches the browser. The
 * `auditor` schema denies the anon role entirely, so there is no client-side
 * path to audit or lead data even if the publishable key leaks.
 *
 * All persistence is best-effort: an audit must still render for the user if
 * the database is unavailable.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import type { AuditReport } from './audit/types';
import { buildGrowthIntelligence } from './audit/growth';

// The `auditor` schema is not the default `public` one, so the generic
// parameters differ from the plain SupabaseClient type. Infer it instead.
type AuditorClient = ReturnType<typeof createAuditorClient>;

function createAuditorClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'auditor' },
  });
}

let cached: AuditorClient | null = null;

export function db(): AuditorClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createAuditorClient(url, key);
  return cached;
}

export function isDbConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * One-way, salted hash of the requester's IP. Used for rate limiting and abuse
 * detection only. We never store the address itself, and without the salt the
 * hash cannot be reversed to an IP.
 */
export function hashRequester(ip: string, userAgent = ''): string {
  const salt = process.env.HASH_SALT || 'squarespell-auditor-dev-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}|${ip}|${userAgent.slice(0, 120)}`)
    .digest('hex')
    .slice(0, 40);
}

export function shareToken(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || '0.0.0.0';
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
  reason?: string;
}

/**
 * Two-tier limit: a short burst window plus a daily cap. Fails open, if the
 * database is unreachable we would rather serve an audit than block a real user,
 * because the crawler itself is already tightly budget-bounded.
 */
export async function checkRateLimit(requesterHash: string): Promise<RateLimitVerdict> {
  const burstLimit = Number(process.env.RATE_LIMIT_BURST || 3);
  const burstWindow = 120;
  const dailyLimit = Number(process.env.RATE_LIMIT_DAILY || 15);
  const dailyWindow = 86_400;

  const client = db();
  if (!client) {
    return { allowed: true, remaining: burstLimit, limit: burstLimit, retryAfterSeconds: 0 };
  }

  try {
    const [{ data: burst }, { data: daily }] = await Promise.all([
      client.rpc('bump_rate_limit', { p_key: `burst:${requesterHash}`, p_window_seconds: burstWindow }),
      client.rpc('bump_rate_limit', { p_key: `daily:${requesterHash}`, p_window_seconds: dailyWindow }),
    ]);

    const burstCount = Number(burst ?? 0);
    const dailyCount = Number(daily ?? 0);

    if (dailyCount > dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        retryAfterSeconds: 3600,
        reason: `You have run ${dailyLimit} audits today. The limit resets in a few hours, this keeps the tool free and fast for everyone.`,
      };
    }
    if (burstCount > burstLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: burstLimit,
        retryAfterSeconds: burstWindow,
        reason: 'That is a lot of audits in a short space of time. Give it a couple of minutes and try again.',
      };
    }
    return {
      allowed: true,
      remaining: Math.max(0, burstLimit - burstCount),
      limit: burstLimit,
      retryAfterSeconds: 0,
    };
  } catch (e) {
    console.error('[db] rate limit check failed, failing open', e);
    return { allowed: true, remaining: burstLimit, limit: burstLimit, retryAfterSeconds: 0 };
  }
}

export interface SaveAuditInput {
  report: AuditReport;
  requesterHash: string;
  country?: string;
  utm?: Record<string, string>;
  referrer?: string;
}

export async function saveAudit(input: SaveAuditInput): Promise<{ id: string; token: string } | null> {
  const client = db();
  const token = shareToken();
  if (!client) return null;

  const r = input.report;
  const categoryScores = Object.fromEntries(r.score.categories.map((c) => [c.id, c.score]));

  try {
    const { data, error } = await client
      .from('audits')
      .insert({
        share_token: token,
        status: 'complete',
        input_url: r.inputUrl.slice(0, 2000),
        final_url: r.finalUrl.slice(0, 2000),
        host: r.host,
        site_name: r.siteName?.slice(0, 300),
        is_squarespace: r.squarespace.isSquarespace,
        sqs_version: r.squarespace.version,
        sqs_confidence: r.squarespace.confidence,
        sqs_status: r.squarespace.siteStatus,
        score_overall: r.score.overall,
        score_grade: r.score.grade,
        category_scores: categoryScores,
        finding_count: r.findings.length,
        critical_count: r.findings.filter((f) => f.severity === 'critical').length,
        high_count: r.findings.filter((f) => f.severity === 'high').length,
        opportunity_tier: r.opportunity.tier,
        opportunity_services: r.opportunity.services,
        report: r,
        ai_used: r.coverage.aiUsed,
        requester_hash: input.requesterHash,
        country: input.country?.slice(0, 8),
        utm: input.utm || {},
        referrer: input.referrer?.slice(0, 500),
        duration_ms: r.coverage.durationMs,
      })
      .select('id, share_token')
      .single();

    if (error) throw error;
    return { id: data.id, token: data.share_token };
  } catch (e) {
    console.error('[db] saveAudit failed', e);
    return null;
  }
}

export async function saveFailedAudit(input: {
  inputUrl: string;
  host: string;
  code: string;
  message: string;
  requesterHash: string;
  utm?: Record<string, string>;
}): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    await client.from('audits').insert({
      share_token: shareToken(),
      status: 'failed',
      input_url: input.inputUrl.slice(0, 2000),
      host: input.host,
      error_code: input.code,
      error_message: input.message.slice(0, 500),
      requester_hash: input.requesterHash,
      utm: input.utm || {},
    });
  } catch (e) {
    console.error('[db] saveFailedAudit failed', e);
  }
}

export async function getAuditByToken(token: string): Promise<AuditReport | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('audits')
      .select('id, share_token, report, status')
      .eq('share_token', token)
      .single();
    if (error || !data?.report) return null;
    const report = data.report as AuditReport;
    report.id = data.share_token;
    return report;
  } catch {
    return null;
  }
}

/**
 * Attaches Google's performance measurement to a saved audit.
 *
 * Written into the stored report itself rather than a side table, so a share
 * link opened tomorrow shows the same page the person who ran it saw.
 */
export async function savePerf(token: string, perf: AuditReport['perf']): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    const { data } = await client
      .from('audits')
      .select('report')
      .eq('share_token', token)
      .single();
    const report = (data?.report || null) as AuditReport | null;
    if (!report) return;
    report.perf = perf;
    await client.from('audits').update({ report }).eq('share_token', token);
  } catch (e) {
    console.error('[db] savePerf failed', e);
  }
}

/**
 * Attaches a competitor comparison to a saved audit, same rule as savePerf.
 *
 * Also recomputes `growthIntelligence`: it was built once when the audit
 * completed, before any competitor data existed, so its competitive fields
 * were necessarily empty. `buildGrowthIntelligence` is a pure function over
 * the report, no new crawl or check, so redoing it here just lets the
 * already-computed comparison flow into the competitive parts of growth
 * intelligence (Part 13 of the brief) without a second database write path.
 */
export async function saveComparison(token: string, comparison: AuditReport['comparison']): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    const { data } = await client.from('audits').select('report').eq('share_token', token).single();
    const report = (data?.report || null) as AuditReport | null;
    if (!report) return;
    report.comparison = comparison;
    report.growthIntelligence = buildGrowthIntelligence(report);
    await client.from('audits').update({ report }).eq('share_token', token);
  } catch (e) {
    console.error('[db] saveComparison failed', e);
  }
}

export interface AuditCard {
  host: string;
  score: number;
  headline: string;
  pagesCrawled: number;
  checksApplied: number;
}

/**
 * Just enough of an audit to draw its share card.
 *
 * The full report is a document of a hundred kilobytes or more, and pulling all
 * of it into an image function that also has to run a WebAssembly renderer is
 * how you turn a preview image into a 500. Postgres can reach into the stored
 * JSON and return the four fields the card actually needs.
 */
export async function getAuditCard(token: string): Promise<AuditCard | null> {
  const client = db();
  if (!client || !token) return null;
  try {
    const { data, error } = await client
      .from('audits')
      .select(
        'host, score_overall, headline:report->summary->>headline, pages:report->coverage->pagesCrawled, checks:report->coverage->checksApplicable'
      )
      .eq('share_token', token)
      .single();
    if (error || !data) return null;
    const row = data as any;
    return {
      host: String(row.host || ''),
      score: Number(row.score_overall) || 0,
      headline: String(row.headline || ''),
      pagesCrawled: Number(row.pages) || 0,
      checksApplied: Number(row.checks) || 0,
    };
  } catch (e) {
    console.error('[db] getAuditCard failed', e);
    return null;
  }
}

export interface HistoryPoint {
  score: number;
  at: string;
  token: string;
}

/**
 * Previous audits of the same site.
 *
 * A score on its own is a judgement; a score with a previous one beside it is
 * feedback. This is the cheapest thing in the product that makes somebody come
 * back, and it needs no account, no email and no scheduler: they simply run it
 * again and we show them what moved.
 *
 * Keyed on host rather than on who ran it, because the site is the subject.
 */
export async function getHistory(host: string, limit = 6): Promise<HistoryPoint[]> {
  const client = db();
  if (!client || !host) return [];
  try {
    const { data, error } = await client
      .from('audits')
      .select('score_overall, created_at, share_token')
      .eq('host', host)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .filter((r: any) => typeof r.score_overall === 'number')
      .map((r: any) => ({ score: r.score_overall, at: r.created_at, token: r.share_token }));
  } catch {
    return [];
  }
}

export async function saveLead(input: {
  auditToken?: string;
  email: string;
  name?: string;
  businessName?: string;
  website?: string;
  interest?: string;
  marketingConsent: boolean;
  requesterHash: string;
  utm?: Record<string, string>;
}): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    let auditId: string | null = null;
    if (input.auditToken) {
      const { data } = await client
        .from('audits')
        .select('id')
        .eq('share_token', input.auditToken)
        .single();
      auditId = data?.id ?? null;
    }
    const { error } = await client.from('leads').upsert(
      {
        audit_id: auditId,
        email: input.email.toLowerCase().slice(0, 320),
        name: input.name?.slice(0, 200) || null,
        business_name: input.businessName?.slice(0, 200) || null,
        website: input.website?.slice(0, 500) || null,
        interest: input.interest?.slice(0, 120) || null,
        marketing_consent: input.marketingConsent,
        requester_hash: input.requesterHash,
        utm: input.utm || {},
      },
      { onConflict: 'email,audit_id' }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[db] saveLead failed', e);
    return false;
  }
}

export async function trackEvent(
  name: string,
  props: Record<string, unknown> = {},
  auditToken?: string,
  requesterHash?: string
): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    let auditId: string | null = null;
    if (auditToken) {
      const { data } = await client.from('audits').select('id').eq('share_token', auditToken).single();
      auditId = data?.id ?? null;
    }
    await client.from('events').insert({
      name: name.slice(0, 80),
      audit_id: auditId,
      props,
      requester_hash: requesterHash,
    });
  } catch {
    /* analytics must never break a request */
  }
}
