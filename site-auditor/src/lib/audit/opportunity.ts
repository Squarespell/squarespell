/**
 * Opportunity Engine.
 *
 * Turns the flat list of findings into a short, ranked list of things that
 * actually matter. This is deliberately a *presentation/reasoning* layer, not
 * a new source of facts: every opportunity is built entirely from `Finding`
 * objects the check modules already produced, plus the `WebsiteUnderstanding`
 * object built in understanding.ts. No new crawling, no new AI call, nothing
 * fabricated.
 *
 * `classifyOpportunity` (pipeline.ts) still exists and is untouched — it
 * answers a narrower, different question ("which Squarespell service tier is
 * this lead") and several places already read `report.opportunity` for that.
 * This module answers the product question instead: "of everything we found,
 * what should this person actually look at, and in what order?" It lives on
 * `report.opportunities` (plural), a new field alongside the old one.
 *
 * Three deliberate design choices, each answering a requirement from the
 * brief:
 *
 *  1. Grouping is a fixed table of rules (`GROUPS` below), not a clustering
 *     algorithm. A deterministic table is auditable — you can read exactly
 *     why CONV-040 and CONV-042 became one "trust" opportunity — and it never
 *     produces a surprising grouping on a site the author didn't test against.
 *  2. `priority` (critical/high/medium/low) is *floored* by the highest
 *     severity among the opportunity's source findings, full stop — never
 *     softened by confidence or by the ranking score. `priorityScore` (0-100)
 *     exists only to order opportunities *within* and *across* tiers; it is
 *     never displayed as if it were a measured business number. This is the
 *     direct implementation of "a low-confidence inference must never
 *     outrank a high-confidence critical problem": the score is confidence-
 *     weighted, but the label never is.
 *  3. Not every finding becomes an opportunity. A finding only surfaces here
 *     if it is itself severe (critical/high) or if it corroborates at least
 *     one other finding in the same group. A single low-severity, ungrouped
 *     finding stays exactly what it is — a line in `report.findings` — rather
 *     than being renamed into a bullet point titled "opportunity."
 */

import type { BusinessContext, CheckResult, Evidence, Finding, Severity, UserGoal } from './types';
import { CATEGORIES } from './types';
import type { WebsiteUnderstanding } from './understanding';

export type OpportunityCategory =
  | 'performance'
  | 'trust'
  | 'conversion'
  | 'content'
  | 'technical'
  | 'search-visibility'
  | 'squarespace-setup'
  | 'accessibility'
  | 'security';

/** Deliberately not a time estimate — see AGENTS/brief: "LOW EFFORT" not "15 minutes." */
export type EffortLevel = 'low' | 'medium' | 'high';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type OpportunityConfidence = 'high' | 'medium' | 'low';
export type OpportunityOwner = 'you' | 'designer' | 'developer' | 'marketer' | 'seo' | 'squarespell';

export interface Opportunity {
  /** Deterministic: `${category}:${sorted source finding ids}`. Stable across two runs of the same site. */
  id: string;
  title: string;
  /** The business-framed statement — what this means, not a restatement of the finding. */
  summary: string;
  category: OpportunityCategory;
  findingIds: string[];
  affectedPages: string[];
  evidence: Evidence[];
  /** Why this matters for *this* website specifically, using `understanding` when it has something to say. */
  businessRelevance: string;
  /** Floored by the highest severity among source findings. Never softened by confidence. */
  priority: PriorityLevel;
  /** 0-100, for ordering only. Not a fabricated impact metric — never render as "X% impact." */
  priorityScore: number;
  effort: EffortLevel;
  confidence: OpportunityConfidence;
  recommendedAction: string;
  owner: OpportunityOwner;
  squarespellService?: string;
  isQuickWin: boolean;
  isCriticalIssue: boolean;
}

export interface OpportunityReport {
  all: Opportunity[];
  /** Every opportunity whose priority is 'critical' — always shown in full, never trimmed by "top N". */
  criticalIssues: Opportunity[];
  quickWins: Opportunity[];
  /** `all`, ranked by priorityScore. Slice this yourself for top-3/5/10 — see `topOpportunities`. */
  ranked: Opportunity[];
  /** Convenience: ranked.slice(0, 5). */
  top: Opportunity[];
}

/** Slice any priority-ranked opportunity list to a caller-chosen size (3 / 5 / 10 / ...). */
export function topOpportunities(report: OpportunityReport, n: number): Opportunity[] {
  return report.ranked.slice(0, Math.max(0, n));
}

/**
 * `Opportunity` plus the goal-aware layer: BASE PRIORITY (the severity/
 * evidence-driven score every user gets, goal or no goal), GOAL RELEVANCE
 * (how directly this opportunity's category serves the user's stated goal),
 * and FINAL PRIORITY (the two combined). Everything on `Opportunity` itself —
 * `priority`, `priorityScore`, `findingIds`, evidence — is untouched; this is
 * strictly additive re-ranking, never a rewrite of the underlying facts.
 */
export interface GoalAwareOpportunity extends Opportunity {
  /** Identical to `priorityScore` — kept as its own field so the goal layer is auditable: you can see exactly what moved and by how much. */
  basePriorityScore: number;
  /** 0-100. 50 is neutral (no goal, or a goal this category has no particular bearing on). */
  goalRelevanceScore: number;
  goalRelevanceReason: string;
  /** `basePriorityScore` nudged within its own priority tier's band by goal relevance. Never crosses a tier boundary — see PRIORITY_BANDS. */
  finalPriorityScore: number;
}

export interface GoalAwareOpportunityReport {
  all: GoalAwareOpportunity[];
  criticalIssues: GoalAwareOpportunity[];
  quickWins: GoalAwareOpportunity[];
  /** `all`, ranked by `finalPriorityScore`. */
  ranked: GoalAwareOpportunity[];
  top: GoalAwareOpportunity[];
  /** The goal this ranking was computed for, or null when no goal was supplied (in which case ranking is identical to the base report). */
  goal: UserGoal | null;
}

/* ------------------------------------------------------------------ *
 * Grouping rules
 * ------------------------------------------------------------------ */

interface GroupDef {
  key: string;
  category: OpportunityCategory;
  match: (f: Finding) => boolean;
  /** Findings matched must reach this count OR include a critical/high one, to become an opportunity at all. */
  minSize: number;
  title: (fs: Finding[]) => string;
  summary: (fs: Finding[], u: WebsiteUnderstanding) => string;
  businessRelevance: (fs: Finding[], u: WebsiteUnderstanding) => string;
  recommendedAction: (fs: Finding[]) => string;
  squarespellService?: string;
  owner: OpportunityOwner;
}

const byId = (ids: string[]) => (f: Finding) => ids.includes(f.id);
const byIdPrefix = (prefix: string) => (f: Finding) => f.id.startsWith(prefix);

const conversionLabel = (u: WebsiteUnderstanding) => {
  const v = u.primaryConversion.value;
  if (v === 'purchase') return 'a purchase';
  if (v === 'booking') return 'a booking';
  if (v === 'contact-form') return 'an enquiry';
  return 'a conversion';
};

const GROUPS: GroupDef[] = [
  {
    key: 'trust-gap',
    category: 'trust',
    match: byId(['CONV-040', 'CONV-042']),
    minSize: 1,
    title: () => 'Nothing on the site reassures a new visitor',
    summary: (fs) =>
      fs.length > 1
        ? 'The site shows no testimonials, reviews or stated credentials anywhere a visitor would look for them.'
        : fs[0].title,
    businessRelevance: (_fs, u) =>
      u.confident && u.businessType.value
        ? `For a ${u.businessType.value}, a first-time visitor deciding whether to trust the business usually looks for exactly this kind of evidence before taking ${conversionLabel(u)}.`
        : 'A visitor with no prior relationship to the business typically looks for this kind of evidence before acting.',
    recommendedAction: () => 'Add specific, named social proof (client quotes, review counts, credentials) somewhere visible before the point of conversion.',
    owner: 'marketer',
    squarespellService: 'Conversion optimisation',
  },
  {
    key: 'conversion-friction',
    category: 'conversion',
    match: byId(['CONV-020', 'CONV-021', 'CONV-022', 'CONV-011']),
    minSize: 1,
    title: () => 'The path from interest to action has friction',
    summary: (fs) =>
      fs.length > 1
        ? 'Several small obstacles compound: a call to action that is missing, buried, weakly worded, or a form that asks for more than it needs.'
        : fs[0].title,
    businessRelevance: (_fs, u) =>
      `Every one of these findings sits directly on the path to ${conversionLabel(u)}, which is the step the rest of the site exists to support.`,
    recommendedAction: () => 'Put one clear, benefit-led call to action near the top of the page, and keep any form to the minimum fields needed to follow up.',
    owner: 'marketer',
    squarespellService: 'Conversion optimisation',
  },
  {
    key: 'information-gap',
    category: 'content',
    match: byId(['AEO-030', 'AEO-032', 'ONPAGE-030', 'AEO-034']),
    minSize: 2,
    title: (fs) => `${fs.length} pages leave a visitor's real questions unanswered`,
    summary: () =>
      'Customer questions go unanswered, named services have no page behind them, or pages are too thin to say anything specific.',
    businessRelevance: (_fs, u) =>
      u.services.length
        ? `The site names ${u.services.length} service${u.services.length === 1 ? '' : 's'}; the gap is between naming something and actually explaining it to someone deciding whether to buy it.`
        : 'A visitor who cannot find the answer to an obvious question usually leaves rather than asking it directly.',
    recommendedAction: () => 'Pick the two or three most-asked questions and answer them directly, in the first sentence under a heading that states the question.',
    owner: 'seo',
    squarespellService: 'SEO & AI search visibility',
  },
  {
    key: 'performance-health',
    category: 'performance',
    match: (f) => f.category === 'perf' && f.severity !== 'low' && f.severity !== 'info',
    minSize: 2,
    title: (fs) => `${fs.length} separate performance problems compound on the same pages`,
    summary: () => 'Page weight, compression, render-blocking scripts and oversized images are stacking on top of each other rather than being one isolated issue.',
    businessRelevance: (_fs, u) =>
      u.pages.important.some((p) => p.type === 'home')
        ? 'Slow load time costs the most on the pages a visitor lands on first, before they have any reason to wait for the site.'
        : 'Slow load time compounds visitor drop-off before they see the content that would have convinced them.',
    recommendedAction: () => 'Start with the largest images (compress or resize to their display dimensions) and any third-party scripts loading before the page content.',
    owner: 'developer',
    squarespellService: 'Performance optimisation',
  },
  {
    key: 'technical-health',
    category: 'technical',
    match: (f) => f.category === 'tech' && (f.severity === 'critical' || f.severity === 'high'),
    minSize: 2,
    title: (fs) => `${fs.length} technical problems put pages at risk of not being indexed`,
    summary: () => 'More than one crawlability or indexing signal is broken at once, the kind of combination that tends to share a root cause.',
    businessRelevance: () => 'A page that is not indexed cannot appear in search results at all, regardless of how good the content on it is.',
    recommendedAction: () => 'Work through these in the order listed. Several technical issues on the same site often trace back to one setting.',
    owner: 'developer',
    squarespellService: 'SEO & AI search visibility',
  },
  {
    key: 'search-visibility',
    category: 'search-visibility',
    match: byId(['AEO-001', 'AEO-002', 'AEO-005']),
    minSize: 1,
    title: () => 'AI assistants and search engines are being blocked from your site',
    summary: (fs) => (fs.length > 1 ? 'More than one AI or search crawler is disallowed, at either the robots.txt or the server level.' : fs[0].title),
    businessRelevance: () => 'A crawler that cannot read the site cannot cite it, recommend it, or rank it. This affects every other finding on the site equally, since none of it can be seen.',
    recommendedAction: () => 'Allow the listed crawler user agents in robots.txt, and check with your host or firewall provider if a server-level block persists.',
    owner: 'developer',
    squarespellService: 'SEO & AI search visibility',
  },
  {
    key: 'squarespace-setup',
    category: 'squarespace-setup',
    match: byIdPrefix('SQS-'),
    minSize: 2,
    title: (fs) => `${fs.length} Squarespace-specific settings are misconfigured`,
    summary: () => 'These are configuration choices specific to the Squarespace platform, not content or design problems.',
    businessRelevance: () => 'Each of these is normally a settings change inside Squarespace itself, not a rebuild.',
    recommendedAction: () => 'Work through the Squarespace settings paths listed on each finding, most take under a few minutes each.',
    owner: 'you',
  },
  {
    key: 'accessibility-gaps',
    category: 'accessibility',
    match: (f) => f.category === 'a11y',
    minSize: 2,
    title: (fs) => `${fs.length} accessibility issues affect the same pages`,
    summary: () => 'Multiple machine-checkable accessibility issues appear together, which usually means a template or component pattern rather than one-off content.',
    businessRelevance: () => 'These are also legal accessibility requirements in most markets, not only a usability concern.',
    recommendedAction: () => 'Fix the pattern once (in the template or block used across pages) rather than page by page.',
    owner: 'developer',
    squarespellService: 'Accessibility',
  },
  {
    key: 'security-privacy',
    category: 'security',
    match: (f) => f.category === 'sec' && f.severity !== 'low' && f.severity !== 'info',
    minSize: 1,
    title: (fs) => (fs.length > 1 ? `${fs.length} security or privacy issues need attention` : fs[0].title),
    summary: (fs) => (fs.length > 1 ? 'More than one security or privacy control is missing or misconfigured.' : fs[0].detail),
    businessRelevance: () => 'These affect visitor trust and, in some cases, legal compliance, not just a technical score.',
    recommendedAction: () => 'Address these before anything else in this report; they are foundational rather than optimisations.',
    owner: 'developer',
  },
];

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

const SEVERITY_PRIORITY: Record<Severity, PriorityLevel> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'low',
};
const CONFIDENCE_MULTIPLIER: Record<OpportunityConfidence, number> = { high: 1.0, medium: 0.85, low: 0.65 };

/**
 * Strict, non-overlapping score bands per priority tier. This is what makes
 * "critical always outranks everything else" a structural guarantee rather
 * than a coincidence of an additive formula: every bonus below (group size,
 * page importance, conversion relevance, and — in `applyGoalAwareness` — goal
 * relevance) can only move a score *within* its own tier's band. A maxed-out
 * 'high' opportunity can reach 84, never 85; a minimally-scored 'critical'
 * can never fall below 85. Sorting by score can therefore never let a lower
 * tier beat a higher one, by construction, not by luck.
 */
const PRIORITY_BANDS: Record<PriorityLevel, [number, number]> = {
  critical: [85, 100],
  high: [55, 84],
  medium: [25, 54],
  low: [0, 24],
};

/** Which opportunity categories are on the path to this site's stated primary conversion. */
const CONVERSION_RELEVANCE: Record<string, OpportunityCategory[]> = {
  purchase: ['conversion', 'trust', 'content'],
  booking: ['conversion', 'trust', 'squarespace-setup'],
  'contact-form': ['conversion', 'trust'],
  none: [],
};

function maxSeverity(findings: Finding[]): Severity {
  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const s of order) if (findings.some((f) => f.severity === s)) return s;
  return 'info';
}

/**
 * `verified` findings with a critical/high severity are the strongest signal
 * this engine has. `heuristic`/`sampled`/`unrendered` findings, or ones drawn
 * from checks the scoring model itself already decided not to trust with a
 * score (`unscoredIds`), are downgraded — the same caution the deterministic
 * engine already applies is inherited here rather than re-litigated.
 */
function computeConfidence(findings: Finding[], unscoredIds: Set<string>): OpportunityConfidence {
  const anyUnscored = findings.some((f) => unscoredIds.has(f.id));
  const allVerified = findings.every((f) => f.confidence === 'verified');
  if (anyUnscored) return 'low';
  if (allVerified) return findings.some((f) => f.severity === 'critical' || f.severity === 'high') ? 'high' : 'medium';
  const anySoft = findings.some((f) => f.confidence === 'heuristic' || f.confidence === 'sampled' || f.confidence === 'unrendered');
  if (anySoft) return findings.length >= 2 ? 'medium' : 'low';
  return 'medium';
}

function mapEffort(findings: Finding[]): EffortLevel {
  // Worst case across the group: presenting several findings as one to-do
  // takes at least as long as the hardest one in it.
  const rank: Record<Finding['effort'], number> = { quick: 0, medium: 1, project: 2 };
  const worst = findings.reduce((w, f) => (rank[f.effort] > rank[w] ? f.effort : w), 'quick' as Finding['effort']);
  return worst === 'quick' ? 'low' : worst === 'medium' ? 'medium' : 'high';
}

/** Sum of every bonus component at its maximum, used to normalise the raw bonus into a 0-1 "strength" before mapping into the tier's band. */
const MAX_BONUS = 15 /* group */ + 12 /* page */ + 10 /* conversion */;

function priorityScore(
  category: OpportunityCategory,
  findings: Finding[],
  priority: PriorityLevel,
  confidence: OpportunityConfidence,
  affectedPages: string[],
  understanding: WebsiteUnderstanding
): number {
  const groupBonus = Math.min(15, (findings.length - 1) * 5);
  const importantUrls = new Set(understanding.pages.important.map((p) => p.url));
  const touchesImportantPage = affectedPages.some((u) => importantUrls.has(u));
  const touchesHome = affectedPages.length === 0 && findings.some((f) => f.affectedUrls.length === 0); // site-wide findings implicitly touch every page, home included
  const pageBoost = touchesImportantPage || touchesHome ? 12 : 0;
  const relevantCategories = CONVERSION_RELEVANCE[understanding.primaryConversion.value ?? 'none'] ?? [];
  const conversionBoost = relevantCategories.includes(category) ? 10 : 0;

  // 0-1: how strong the evidence for this opportunity is, independent of
  // severity (severity already picked the tier via `priority`). Confidence
  // scales this down further — a low-confidence group lands near the bottom
  // of its own tier, never outside it (see PRIORITY_BANDS comment).
  const strength = (Math.min(MAX_BONUS, groupBonus + pageBoost + conversionBoost) / MAX_BONUS) * CONFIDENCE_MULTIPLIER[confidence];

  const [lo, hi] = PRIORITY_BANDS[priority];
  const score = lo + strength * (hi - lo);
  return Math.round(Math.max(lo, Math.min(hi, score)));
}

function inferOwner(group: GroupDef | null, effort: EffortLevel): OpportunityOwner {
  if (effort === 'high') return 'squarespell';
  return group?.owner ?? 'you';
}

function idFor(category: OpportunityCategory, findingIds: string[]): string {
  return `${category}:${[...findingIds].sort().join('+')}`;
}

function toOpportunity(
  group: GroupDef | null,
  category: OpportunityCategory,
  findings: Finding[],
  understanding: WebsiteUnderstanding,
  unscoredIds: Set<string>
): Opportunity {
  const findingIds = findings.map((f) => f.id);
  const affectedPages = Array.from(new Set(findings.flatMap((f) => f.affectedUrls))).slice(0, 8);
  const evidence = findings.flatMap((f) => f.evidence).slice(0, 6);
  const confidence = computeConfidence(findings, unscoredIds);
  const priority = SEVERITY_PRIORITY[maxSeverity(findings)];
  const effort = mapEffort(findings);
  const score = priorityScore(category, findings, priority, confidence, affectedPages, understanding);
  const owner = inferOwner(group, effort);

  const title = group ? group.title(findings) : findings[0].title;
  const summary = group ? group.summary(findings, understanding) : findings[0].detail;
  const businessRelevance = group
    ? group.businessRelevance(findings, understanding)
    : 'This finding stands on its own severity and did not need another finding to justify surfacing it.';
  const recommendedAction = group ? group.recommendedAction(findings) : findings[0].detail;

  return {
    id: idFor(category, findingIds),
    title,
    summary,
    category,
    findingIds,
    affectedPages,
    evidence,
    businessRelevance,
    priority,
    priorityScore: score,
    effort,
    confidence,
    recommendedAction,
    owner,
    squarespellService: group?.squarespellService,
    isQuickWin: effort === 'low' && confidence === 'high' && priority !== 'low',
    isCriticalIssue: priority === 'critical',
  };
}

/**
 * The individual-finding fallback: a critical or high finding that no group
 * above claimed still has to surface, even alone. `severity` here comes
 * straight off the finding — there is no grouping to infer a category label
 * from, so `technical`/`content`/etc. is picked from the finding's own
 * `CategoryId` via a small direct map.
 */
const CATEGORY_TO_OPPORTUNITY: Partial<Record<string, OpportunityCategory>> = {
  tech: 'technical',
  onpage: 'content',
  perf: 'performance',
  aeo: 'search-visibility',
  conv: 'conversion',
  sqs: 'squarespace-setup',
  schema: 'search-visibility',
  a11y: 'accessibility',
  sec: 'security',
  mobile: 'technical',
  social: 'content',
};

export function buildOpportunities(results: CheckResult[], understanding: WebsiteUnderstanding): OpportunityReport {
  const findings = results.flatMap((r) => r.findings);
  const unscoredIds = new Set(results.filter((r) => r.unscored).flatMap((r) => r.findings.map((f) => f.id)));

  const pool = new Map(findings.map((f) => [f.id, f] as const));
  const opportunities: Opportunity[] = [];

  for (const group of GROUPS) {
    const matched = Array.from(pool.values()).filter(group.match);
    if (!matched.length) continue;
    const qualifies = matched.length >= group.minSize || matched.some((f) => f.severity === 'critical' || f.severity === 'high');
    if (!qualifies) continue;
    opportunities.push(toOpportunity(group, group.category, matched, understanding, unscoredIds));
    for (const f of matched) pool.delete(f.id);
  }

  // Fallback: anything severe left over that no group claimed still surfaces
  // on its own, so a critical technical problem can never simply disappear
  // for lack of an "exciting" grouping (see module comment, point 3).
  for (const f of pool.values()) {
    if (f.severity !== 'critical' && f.severity !== 'high') continue;
    const category = CATEGORY_TO_OPPORTUNITY[f.category] ?? 'technical';
    opportunities.push(toOpportunity(null, category, [f], understanding, unscoredIds));
  }

  const ranked = [...opportunities].sort((a, b) => b.priorityScore - a.priorityScore);
  const criticalIssues = ranked.filter((o) => o.isCriticalIssue);
  const quickWins = ranked.filter((o) => o.isQuickWin);

  return {
    all: opportunities,
    criticalIssues,
    quickWins,
    ranked,
    top: ranked.slice(0, 5),
  };
}

/* ------------------------------------------------------------------ *
 * Goal-aware prioritisation
 *
 * A transparent top-up layer over the report `buildOpportunities` already
 * produced — see FINDINGS → UNDERSTANDING → OPPORTUNITIES → GOAL-AWARE
 * PRIORITISATION in the brief. It never re-computes `priority` or the
 * underlying findings, and it structurally cannot let goal relevance
 * outrank severity: see the PRIORITY_BANDS comment above. Each opportunity's
 * `finalPriorityScore` is only ever nudged within its own severity tier.
 * ------------------------------------------------------------------ */

/**
 * Which opportunity categories directly serve each stated goal. Reuses the
 * existing `UserGoal` enum (types.ts) rather than inventing a parallel one —
 * a fixed, auditable table, same design choice as `GROUPS` above: you can
 * read exactly why "get more bookings" favours squarespace-setup findings
 * (booking embeds are usually a Squarespace scheduling configuration issue).
 */
const GOAL_RELEVANT_CATEGORIES: Record<UserGoal, OpportunityCategory[]> = {
  get_more_customers: ['conversion', 'trust', 'content'],
  get_more_leads: ['conversion', 'trust', 'content'],
  get_more_sales: ['conversion', 'trust', 'performance'],
  get_more_bookings: ['conversion', 'trust', 'squarespace-setup'],
  get_more_traffic: ['search-visibility', 'content', 'technical'],
  improve_website: ['performance', 'accessibility', 'technical'],
  look_more_professional: ['trust', 'content', 'accessibility'],
  beat_competitors: ['search-visibility', 'content', 'conversion'],
  improve_ai_visibility: ['search-visibility', 'content'],
  improve_performance: ['performance', 'technical'],
  not_sure: [],
};

/** Plain-English label for a goal, used in both `goalRelevanceReason` and the AI interpretation layer. */
export const GOAL_LABELS: Record<UserGoal, string> = {
  get_more_customers: 'getting more customers',
  get_more_leads: 'getting more leads',
  get_more_sales: 'getting more sales',
  get_more_bookings: 'getting more bookings',
  get_more_traffic: 'getting more traffic',
  improve_website: 'improving the website overall',
  look_more_professional: 'looking more professional',
  beat_competitors: 'beating competitors',
  improve_ai_visibility: 'improving AI search visibility',
  improve_performance: 'improving performance',
  not_sure: 'your stated goal',
};

function goalRelevance(category: OpportunityCategory, goal: UserGoal): { score: number; reason: string } {
  const relevant = GOAL_RELEVANT_CATEGORIES[goal] ?? [];
  const label = GOAL_LABELS[goal] ?? 'your stated goal';
  if (relevant.includes(category)) {
    return { score: 85, reason: `Directly relevant to ${label}.` };
  }
  // Security/privacy is foundational regardless of what the user says they
  // want, so it is never treated as "irrelevant" the way an unrelated
  // category is — it gets a higher neutral floor than the generic case.
  if (category === 'security') {
    return { score: 60, reason: 'Security and privacy issues matter regardless of your stated goal.' };
  }
  return { score: 35, reason: `Not directly tied to ${label}, but still worth addressing.` };
}

/** How much of a tier's own band width goal relevance is allowed to move a score. Deliberately small: goal relevance orders *within* a tier, it does not restructure it. */
const GOAL_BONUS_WEIGHT = 0.18;

/**
 * Layers the user's stated goal on top of the deterministic opportunity
 * ranking. With no goal (or a `businessContext` that never set one), every
 * opportunity gets a neutral `goalRelevanceScore` of 50 and `finalPriorityScore`
 * equal to `basePriorityScore` — the ranking is byte-identical to `report.ranked`,
 * so this is safe to call unconditionally and a missing/old `businessContext`
 * never produces a different order than before this feature existed.
 */
export function applyGoalAwareness(
  report: OpportunityReport,
  businessContext: BusinessContext | undefined,
  _understanding: WebsiteUnderstanding
): GoalAwareOpportunityReport {
  const goal = businessContext?.goal ?? null;

  const all: GoalAwareOpportunity[] = report.all.map((o) => {
    const basePriorityScore = o.priorityScore;

    if (!goal) {
      return {
        ...o,
        basePriorityScore,
        goalRelevanceScore: 50,
        goalRelevanceReason: 'No goal was supplied, so ranking is based on severity and evidence alone.',
        finalPriorityScore: basePriorityScore,
      };
    }

    const { score: goalRelevanceScore, reason: goalRelevanceReason } = goalRelevance(o.category, goal);

    const [lo, hi] = PRIORITY_BANDS[o.priority];
    const width = hi - lo;
    const position = width > 0 ? (basePriorityScore - lo) / width : 0;
    // The nudge is centred on 0 at a neutral (50) relevance score, so a goal
    // that has nothing to do with this opportunity's category can lower its
    // position within the tier but, like every other bonus in this file,
    // never move it into a different tier.
    const nudge = ((goalRelevanceScore - 50) / 50) * GOAL_BONUS_WEIGHT;
    const newPosition = Math.max(0, Math.min(1, position + nudge));
    const finalPriorityScore = Math.round(lo + newPosition * width);

    return { ...o, basePriorityScore, goalRelevanceScore, goalRelevanceReason, finalPriorityScore };
  });

  const ranked = [...all].sort((a, b) => b.finalPriorityScore - a.finalPriorityScore);
  const criticalIssues = ranked.filter((o) => o.isCriticalIssue);
  const quickWins = ranked.filter((o) => o.isQuickWin);

  return { all, criticalIssues, quickWins, ranked, top: ranked.slice(0, 5), goal };
}
