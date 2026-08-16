/**
 * Core type definitions for the audit engine.
 *
 * Design principle: the deterministic engine is the single source of truth.
 * Every Finding must carry `evidence`, concrete, extracted-from-bytes proof.
 * The AI layer may only reference evidence that already exists here.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Confidence =
  | 'verified' // deterministic from response bytes
  | 'heuristic' // regex / proxy measure
  | 'unrendered' // limited because we do not execute JS
  | 'sampled'; // measured on a subset of pages

export type CategoryId =
  | 'tech'
  | 'onpage'
  | 'perf'
  | 'aeo'
  | 'conv'
  | 'schema'
  | 'a11y'
  | 'sec'
  | 'mobile'
  | 'social'
  | 'sqs';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  weight: number;
  blurb: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  tech: {
    id: 'tech',
    label: 'Technical SEO',
    weight: 16,
    blurb: 'Whether Google can find, crawl and index your pages at all.',
  },
  onpage: {
    id: 'onpage',
    label: 'On-Page SEO',
    weight: 15,
    blurb: 'Titles, descriptions, headings, links and content depth.',
  },
  perf: {
    id: 'perf',
    label: 'Performance',
    weight: 13,
    blurb: 'Page weight, images, scripts and response speed.',
  },
  aeo: {
    id: 'aeo',
    label: 'AI Search Readiness',
    weight: 12,
    blurb: 'Whether ChatGPT, Claude, Perplexity and AI Overviews can cite you.',
  },
  conv: {
    id: 'conv',
    label: 'Conversion',
    weight: 11,
    blurb: 'Whether a visitor can actually contact, book or buy from you.',
  },
  sqs: {
    id: 'sqs',
    label: 'Squarespace Setup',
    weight: 9,
    blurb: 'Configuration issues specific to the Squarespace platform.',
  },
  schema: {
    id: 'schema',
    label: 'Structured Data',
    weight: 8,
    blurb: 'Schema markup that powers rich results and knowledge panels.',
  },
  a11y: {
    id: 'a11y',
    label: 'Accessibility',
    weight: 7,
    blurb: 'Machine-checkable WCAG 2.2 AA issues in your markup.',
  },
  sec: {
    id: 'sec',
    label: 'Security & Privacy',
    weight: 5,
    blurb: 'HTTPS, headers, trackers, cookie consent and policy pages.',
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    weight: 2,
    blurb: 'Viewport, zoom and responsive-layout signals.',
  },
  social: {
    id: 'social',
    label: 'Social Sharing',
    weight: 2,
    blurb: 'How your links look when shared on social platforms.',
  },
};

/** A single extracted piece of proof, rendered verbatim in the report. */
export interface Evidence {
  label: string;
  value: string;
  url?: string;
}

export interface Finding {
  /** Stable check identifier, e.g. `TECH-030`. */
  id: string;
  category: CategoryId;
  severity: Severity;
  confidence: Confidence;
  /** Short, plain-English statement of the problem. */
  title: string;
  /** What we measured and why it is a problem. Written deterministically. */
  detail: string;
  /** Concrete extracted proof. Never fabricated. */
  evidence: Evidence[];
  /** URLs affected (capped at 5 for display, count kept separately). */
  affectedUrls: string[];
  affectedCount: number;
  applicableCount: number;
  /** Squarespace-specific remediation path, when one exists. */
  squarespacePath?: string;
  /** How hard this is to fix: 'quick' (<15 min), 'medium', 'project'. */
  effort: 'quick' | 'medium' | 'project';
  /** True when the site owner cannot fix this on the Squarespace platform. */
  platformLocked?: boolean;
  /**
   * Written interpretation: why it matters, what to change, what changes when
   * you do. Always populated by the deterministic narrative layer, and
   * overwritten by the AI layer only when a key is present and the model
   * returned narrative for this exact finding id.
   */
  narrative?: {
    why: string;
    action: string;
    impact: string;
    source: 'engine' | 'ai';
  };
}

/** Result of running one check: either a pass or one/more findings. */
export interface CheckResult {
  id: string;
  category: CategoryId;
  severity: Severity;
  /** Number of units that failed. */
  affected: number;
  /** Number of units the check applied to. 0 => check not applicable. */
  applicable: number;
  /** Prevalence exponent. 0.5 punishes small defect counts appropriately. */
  gamma?: number;
  findings: Finding[];
  /** Positive signal to surface in "what's working". */
  strength?: string;
  /** Exclude from scoring but still report (platform-locked / info-only). */
  unscored?: boolean;
}

export interface PageData {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  depth: number;
  redirectChain: string[];
  headers: Record<string, string>;
  html: string;
  bytes: number;
  ttfbMs: number;
  contentType: string;
  error?: string;
}

export interface ImageRef {
  url: string;
  pageUrl: string;
  hasAlt: boolean;
  altText: string;
  hasDimensions: boolean;
  loading?: string;
  index: number;
}

export interface AssetProbe {
  url: string;
  status: number;
  bytes: number;
  contentType: string;
  cacheControl: string;
  contentEncoding: string;
  error?: string;
}

export interface RobotsInfo {
  found: boolean;
  status: number;
  raw: string;
  sitemaps: string[];
  /** userAgent (lowercased) -> rules */
  groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }>;
  isSquarespaceDefault: boolean;
}

export interface SitemapInfo {
  found: boolean;
  source: 'robots' | 'guess' | 'none';
  url: string;
  urls: Array<{ loc: string; lastmod?: string }>;
  totalUrls: number;
  parseError?: string;
  isIndex: boolean;
}

export interface SquarespaceDetection {
  isSquarespace: boolean;
  confidence: number;
  version: '7.0' | '7.1' | 'unknown';
  versionConfidence: number;
  signals: string[];
  siteStatus: 'live' | 'private' | 'expired' | 'missing' | 'unknown';
  context: SquarespaceContext | null;
  editor: { fluid: number; classic: number; ratio: number | null };
  features: {
    commerce: boolean;
    scheduling: boolean;
    memberAreas: boolean;
    forms: boolean;
    popupOverlay: boolean;
    announcementBar: boolean;
    cookieBanner: boolean;
    badge: boolean;
    devMode: boolean;
  };
  templateFamily?: string;
}

export interface SquarespaceContext {
  templateVersion?: string;
  templateId?: string;
  website?: Record<string, any>;
  websiteSettings?: Record<string, any>;
  collection?: Record<string, any>;
  betaFeatureFlags?: string[];
  [k: string]: any;
}

export interface CrawlResult {
  pages: PageData[];
  discovered: number;
  crawled: number;
  budgetHit: boolean;
  internalLinks: Map<string, Set<string>>;
  brokenInternal: Array<{ from: string; to: string; status: number }>;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  score: number;
  weight: number;
  applicableChecks: number;
  criticalFailures: number;
  findingCount: number;
}

export interface AuditScore {
  overall: number;
  grade: string;
  categories: CategoryScore[];
  gated: boolean;
  gateReason?: string;
}

export interface AuditCoverage {
  pagesCrawled: number;
  pagesDiscovered: number;
  checksRun: number;
  checksApplicable: number;
  sitemapUrls: number;
  imagesProbed: number;
  assetsProbed: number;
  durationMs: number;
  aiUsed: boolean;
  aiError?: string;
}

/**
 * Optional context a user can supply alongside the URL, once the URL-only
 * audit has already delivered value (see understanding.ts / opportunity.ts
 * module comments for the same principle). Nothing here is required, nothing
 * here is fetched or acted on yet, only accepted and stored — see the
 * comment on `businessContext` below.
 *
 * `goal` is a closed set for the common cases so the Opportunity Engine can
 * eventually branch on it without string-matching free text, but `customGoal`
 * exists so a goal outside the set is still captured verbatim rather than
 * forced into the nearest bucket or dropped — a new goal can be added to the
 * union later without losing what users already typed under 'not_sure'.
 */
export type UserGoal =
  | 'get_more_customers'
  | 'get_more_leads'
  | 'get_more_sales'
  | 'get_more_bookings'
  | 'get_more_traffic'
  | 'improve_website'
  | 'look_more_professional'
  | 'beat_competitors'
  | 'improve_ai_visibility'
  | 'improve_performance'
  | 'not_sure';

export interface BusinessContext {
  businessDescription?: string;
  targetAudience?: string;
  goal?: UserGoal;
  customGoal?: string;
  competitorUrls?: string[];
}

export interface AuditReport {
  id: string;
  inputUrl: string;
  finalUrl: string;
  host: string;
  siteName: string;
  createdAt: string;
  squarespace: SquarespaceDetection;
  score: AuditScore;
  findings: Finding[];
  strengths: string[];
  quickWins: Finding[];
  coverage: AuditCoverage;
  pageSummaries: Array<{
    url: string;
    title: string;
    status: number;
    issues: number;
    criticalIssues: number;
    words: number;
  }>;
  summary?: {
    headline: string;
    narrative: string;
    priorities: string[];
    source: 'ai' | 'deterministic';
  };
  /** Previous audits of the same site, newest first, excluding this one. */
  history?: Array<{ score: number; at: string; token: string }>;
  /** Competitor benchmark, run on request after the report renders. */
  comparison?: import('./compare').Comparison;
  /** Google's own field and lab measurement, fetched after the report renders. */
  perf?: import('./perf/psi').PsiResult;
  /** Questions a customer would ask, and whether the site answers them. */
  faq?: import('./aeo/gaps').FaqAnalysis;
  /** What the site appears to be and how it converts, with confidence per field. */
  understanding?: import('./understanding').WebsiteUnderstanding;
  /** Findings grouped, prioritised and framed as business opportunities. See opportunity.ts. */
  opportunities?: import('./opportunity').OpportunityReport;
  /** Same opportunities, re-framed as diagnosis/cause/prescription. See doctor.ts. */
  doctor?: import('./doctor').Diagnosis[];
  /** Optional user-supplied business context, accepted and stored, not yet used by any engine. */
  businessContext?: BusinessContext;
  /** What changed since the most recent previous audit of this host, when one exists. See diff.ts. */
  diff?: import('./diff').ReportDiff;
  /** Non-PII service-opportunity classification for lead qualification. */
  opportunity: {
    tier: 'high' | 'medium' | 'low';
    signals: string[];
    services: string[];
  };
}

export type ProgressEvent =
  | { type: 'stage'; stage: string; label: string; pct: number }
  | { type: 'detail'; message: string }
  | { type: 'error'; message: string; code: string }
  | { type: 'done'; report: AuditReport };
