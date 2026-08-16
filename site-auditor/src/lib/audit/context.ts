/** Everything the check modules read from. Assembled once by the pipeline. */

import type { PageFacts } from './extract';
import type { FaqAnalysis } from './aeo/gaps';
import type {
  AssetProbe,
  CheckResult,
  Evidence,
  Finding,
  RobotsInfo,
  Severity,
  SitemapInfo,
  SquarespaceDetection,
  CategoryId,
  Confidence,
} from './types';

export interface SiteProbes {
  httpRoot: { status: number; location: string } | null;
  wwwVariant: { status: number; location: string } | null;
  random404: { status: number; body: string; bytes: number } | null;
  homeDuplicate: { status: number; body: string } | null;
  config: { status: number; location: string } | null;
  gitHead: { status: number } | null;
  dotEnv: { status: number } | null;
}

export interface AuditContext {
  origin: string;
  startUrl: string;
  homepage: PageFacts;
  /** Raw homepage HTML, needed by a few Squarespace signature checks. */
  homepageHtml: string;
  pages: PageFacts[];
  /** Pages that returned 2xx and have HTML. Most checks operate on these. */
  htmlPages: PageFacts[];
  failedPages: PageFacts[];
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  squarespace: SquarespaceDetection;
  probes: Partial<SiteProbes>;
  images: AssetProbe[];
  assets: AssetProbe[];
  cert?: { validTo: string; validFrom: string; issuer: string; subjectAltNames: string };
  aiBotProbe?: { agent: string; status: number; blocked: boolean }[];
  internalLinkGraph: Map<string, Set<string>>;
  brokenLinks: Array<{ from: string; to: string; status: number }>;
  /**
   * HEAD-probe sample of sitemap URLs outside the crawled set, used to
   * estimate broken-page rate across the whole site rather than only the
   * pages we happened to crawl (see pipeline.ts, sampleSitemapHealth).
   */
  sitemapSample?: { checked: number; broken: Array<{ url: string; status: number }> };
  budgetHit: boolean;
  discovered: number;
  /** Question-coverage analysis. Absent when the site could not be profiled. */
  aeo?: FaqAnalysis;
}

export interface BuildFindingInput {
  id: string;
  category: CategoryId;
  severity: Severity;
  confidence?: Confidence;
  title: string;
  detail: string;
  evidence?: Evidence[];
  urls?: string[];
  affected: number;
  applicable: number;
  squarespacePath?: string;
  effort?: Finding['effort'];
  platformLocked?: boolean;
  /**
   * Per-finding interpretation, for checks that emit more than one shape of
   * finding under the same id. Without this, a check with two variants gets one
   * narrative written for the other variant, which reads as a non sequitur.
   * Where this is omitted the narrative layer supplies the copy for the id.
   */
  narrative?: { why: string; action: string; impact: string };
}

export function finding(input: BuildFindingInput): Finding {
  return {
    id: input.id,
    category: input.category,
    severity: input.severity,
    confidence: input.confidence || 'verified',
    title: input.title,
    detail: input.detail,
    evidence: input.evidence || [],
    affectedUrls: (input.urls || []).slice(0, 5),
    affectedCount: input.affected,
    applicableCount: input.applicable,
    squarespacePath: input.squarespacePath,
    effort: input.effort || 'medium',
    platformLocked: input.platformLocked,
    narrative: input.narrative ? { ...input.narrative, source: 'engine' } : undefined,
  };
}

/** A check that produced no finding. Still contributes a pass to the score. */
export function pass(
  id: string,
  category: CategoryId,
  severity: Severity,
  applicable: number,
  strength?: string
): CheckResult {
  return { id, category, severity, applicable, affected: 0, findings: [], strength };
}

/** A check that does not apply to this site. Excluded from numerator AND denominator. */
export function na(id: string, category: CategoryId, severity: Severity): CheckResult {
  return { id, category, severity, applicable: 0, affected: 0, findings: [] };
}

export function fail(
  f: Finding,
  applicable: number,
  opts?: { gamma?: number; unscored?: boolean }
): CheckResult {
  return {
    id: f.id,
    category: f.category,
    severity: f.severity,
    applicable,
    affected: f.affectedCount,
    gamma: opts?.gamma,
    findings: [f],
    unscored: opts?.unscored,
  };
}

export function truncate(s: string, n = 160): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/** "1 page" / "4 pages". Machine pluralisation like "page(s)" is one of the
 *  clearest signals that nobody wrote the sentence. */
export function count(n: number, noun: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? noun : (pluralForm ?? noun + 's')}`;
}

/** Agreement for the verb that follows a counted noun. */
export function verb(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
