/**
 * Competitor benchmarking.
 *
 * The same engine, the same checks, the same evidence, pointed at two or three
 * other sites and lined up against yours. Nothing here is a new measurement: a
 * comparison that used a different method for the competitor than for you would
 * be worthless, and worse, it would be the kind of worthless that looks
 * convincing.
 *
 * Three rules keep it honest:
 *
 *  1. Squarespace-specific findings are excluded. Penalising a competitor on
 *     WordPress for not using Fluid Engine would be nonsense, and flattering
 *     you for it would be dishonest.
 *  2. Competitor crawls are smaller than yours. They exist to produce a
 *     comparable score, not a report we are not going to show anybody, and the
 *     whole comparison has to finish inside one request.
 *  3. A competitor we could not read is reported as unread, never as zero. An
 *     unreachable site is not a site that scored badly.
 */

import { runAudit, AuditError, type AuditConfig } from './pipeline';
import { prettyHost, normaliseInput } from './url';
import { CATEGORIES, type AuditReport, type CategoryId, type UserGoal } from './types';
import type { PageType } from './pagetype';

/** Categories that mean the same thing on any platform. */
const COMPARABLE: CategoryId[] = ['tech', 'onpage', 'perf', 'aeo', 'conv', 'schema', 'a11y', 'sec', 'mobile', 'social'];

/** Deliberately small: enough pages for a fair score, few enough to finish. */
export const COMPETITOR_CONFIG: AuditConfig = {
  maxPages: 6,
  concurrency: 3,
  perRequestTimeoutMs: 9_000,
  totalBudgetMs: 24_000,
  maxImageProbes: 8,
  maxAssetProbes: 4,
  allowNonSquarespace: true,
};

export interface CompetitorScore {
  url: string;
  host: string;
  ok: boolean;
  /** Present when we could not audit them, phrased for the reader. */
  error?: string;
  platform: string;
  overall: number;
  categories: Partial<Record<CategoryId, number>>;
  pagesRead: number;
  /** Categories where they are meaningfully ahead of you. */
  aheadOn: string[];
  /** Categories where you are meaningfully ahead of them. */
  behindOn: string[];
}

export interface Comparison {
  ranAt: string;
  you: {
    host: string;
    overall: number;
    categories: Partial<Record<CategoryId, number>>;
  };
  competitors: CompetitorScore[];
  /** One sentence on where this leaves you. */
  verdict: string;
  /**
   * Competitive Intelligence Engine output (see `buildCompetitiveIntelligence`
   * below). Optional because a comparison saved before this shipped, or one
   * where every competitor was unreadable, has nothing to build it from.
   */
  intelligence?: CompetitiveIntelligence;
}

/* ------------------------------------------------------------------ *
 * Competitive Intelligence Engine
 *
 * Deliberately not a second crawl, not a second extractor, not a second AI
 * call. `runComparison` above already runs the full `runAudit` pipeline
 * against each competitor (through the same hardened `safeFetch`/crawler
 * every primary audit uses, just with a smaller page budget), which already
 * produces `understanding`, `findings` and `faq` for them. This section only
 * reads what that pipeline already computed and lines it up against yours.
 *
 * Every dimension here is evidence based, in the sense Part 14 of the brief
 * means it: presence or absence of something actually crawled, never a
 * claim about traffic, rankings, conversions or revenue, which this tool has
 * no data to support.
 * ------------------------------------------------------------------ */

export type CompetitiveVerdict =
  | 'ahead'
  | 'behind'
  | 'competitor_advantage'
  | 'open_opportunity'
  | 'no_clear_difference';

export interface CompetitiveDimension {
  /** Stable id, e.g. `trust-testimonials`, `pages-service`. Not shown to the reader. */
  key: string;
  label: string;
  verdict: CompetitiveVerdict;
  /** Plain-English, evidence-only sentence. Never a number invented for effect. */
  detail: string;
  /** Whether `businessContext.goal` makes this dimension more relevant right now. */
  goalRelevant: boolean;
  /**
   * Ranking weight only, never rendered. Bigger differences and open ground
   * rank higher; a fully tied dimension ranks lowest so `top` is never
   * padded with "no clear difference" filler.
   */
  weight: number;
}

export interface CompetitiveIntelligence {
  /** Hosts that had enough crawled pages to be compared at all. */
  comparedAgainst: string[];
  /** Every computed dimension, most relevant first. */
  all: CompetitiveDimension[];
  /** The top 5 of `all` (Part 16 of the brief): default view, before "view all". */
  top: CompetitiveDimension[];
  strengths: CompetitiveDimension[];
  gaps: CompetitiveDimension[];
  opportunities: CompetitiveDimension[];
  /** States crawl coverage on both sides plainly, so the comparison is never presented as more complete than it is. */
  coverageNote: string;
}

/** Same goal-relevance principle as `opportunity.ts` (`GOAL_RELEVANT_CATEGORIES`), applied to dimension keys instead of finding categories. Ranking only, never changes a verdict. */
const GOAL_RELEVANT_DIMENSIONS: Record<UserGoal, string[]> = {
  get_more_customers: ['trust-phone', 'trust-testimonials', 'trust-credentials', 'pages-contact'],
  get_more_leads: ['trust-phone', 'trust-testimonials', 'pages-contact', 'category-conv'],
  get_more_sales: ['services', 'pages-product', 'trust-testimonials', 'category-conv'],
  get_more_bookings: ['trust-phone', 'trust-testimonials', 'pages-service', 'category-conv'],
  get_more_traffic: ['category-aeo', 'category-onpage', 'faq-coverage'],
  improve_website: ['category-tech', 'category-perf', 'category-a11y'],
  look_more_professional: ['trust-credentials', 'trust-testimonials', 'category-onpage'],
  beat_competitors: ['category-aeo', 'faq-coverage', 'services'],
  improve_ai_visibility: ['faq-coverage', 'category-aeo', 'category-schema'],
  improve_performance: ['category-perf'],
  not_sure: [],
};

/** Checks (Finding ids) used as binary trust signals. A finding with this id means the signal is ABSENT: the check exists specifically to flag its absence (see checks/conv.ts). */
const TRUST_CHECKS: Array<{ key: string; id: string; label: string }> = [
  { key: 'trust-phone', id: 'CONV-001', label: 'a visible phone number' },
  { key: 'trust-testimonials', id: 'CONV-040', label: 'testimonials, reviews or client proof' },
  { key: 'trust-credentials', id: 'CONV-042', label: 'credentials, guarantees or trust markers' },
];

const IMPORTANT_PAGE_TYPES: Array<{ key: string; type: PageType; label: string }> = [
  { key: 'pages-service', type: 'service', label: 'a dedicated service page' },
  { key: 'pages-product', type: 'product', label: 'dedicated product pages' },
  { key: 'pages-contact', type: 'contact', label: 'a dedicated contact page' },
  { key: 'pages-about', type: 'about', label: 'a dedicated about page' },
];

function hasFinding(report: AuditReport, checkId: string): boolean {
  return report.findings.some((f) => f.id === checkId);
}

function binaryDimension(
  key: string,
  label: string,
  yourHas: boolean,
  theirHas: boolean,
  goal: UserGoal | undefined
): CompetitiveDimension {
  const goalRelevant = Boolean(goal && GOAL_RELEVANT_DIMENSIONS[goal]?.includes(key));
  if (yourHas === theirHas) {
    return yourHas
      ? {
          key,
          label,
          verdict: 'no_clear_difference',
          detail: `Both your site and this competitor have ${label}.`,
          goalRelevant,
          weight: 1,
        }
      : {
          key,
          label,
          verdict: 'open_opportunity',
          detail: `Neither your site nor this competitor appears to have ${label}. Adding it first could be an advantage nobody else has claimed.`,
          goalRelevant,
          weight: 3,
        };
  }
  return yourHas
    ? {
        key,
        label,
        verdict: 'ahead',
        detail: `Your site has ${label}; this competitor does not appear to.`,
        goalRelevant,
        weight: 4,
      }
    : {
        key,
        label,
        verdict: 'competitor_advantage',
        detail: `This competitor has ${label}; your site does not appear to.`,
        goalRelevant,
        weight: 4,
      };
}

const COUNT_GAP_FLOOR = 2;

function countDimension(
  key: string,
  label: string,
  yourCount: number,
  theirCount: number,
  noun: string,
  goal: UserGoal | undefined
): CompetitiveDimension {
  const goalRelevant = Boolean(goal && GOAL_RELEVANT_DIMENSIONS[goal]?.includes(key));
  const gap = yourCount - theirCount;
  if (Math.abs(gap) < COUNT_GAP_FLOOR) {
    return {
      key,
      label,
      verdict: 'no_clear_difference',
      detail: `You have ${yourCount} ${noun}, close to this competitor's ${theirCount}.`,
      goalRelevant,
      weight: 1,
    };
  }
  return gap > 0
    ? {
        key,
        label,
        verdict: 'ahead',
        detail: `You have ${yourCount} ${noun}, against ${theirCount} for this competitor.`,
        goalRelevant,
        weight: Math.min(5, 2 + gap),
      }
    : {
        key,
        label,
        verdict: 'behind',
        detail: `This competitor has ${theirCount} ${noun}, against ${yourCount} for you.`,
        goalRelevant,
        weight: Math.min(5, 2 - gap),
      };
}

/**
 * Builds the competitive intelligence for one already-audited competitor.
 * `theirs` is a full `AuditReport`, the direct result of `runAudit` inside
 * `runComparison`, so nothing here re-crawls or re-extracts anything.
 */
function dimensionsFor(
  youCategories: Partial<Record<CategoryId, number>>,
  report: AuditReport,
  theirs: AuditReport,
  scored: CompetitorScore,
  goal: UserGoal | undefined
): CompetitiveDimension[] {
  const dims: CompetitiveDimension[] = [];

  /* ---- reuse the comparable category scores compare.ts already computed,
     keyed by CategoryId (not the display label `aheadOn`/`behindOn` already
     collapsed to) so goal relevance can actually match against it. ---- */
  for (const id of COMPARABLE) {
    const mine = youCategories[id];
    const theirScore = scored.categories[id];
    if (mine === undefined || theirScore === undefined) continue;
    const label = CATEGORIES[id].label;
    const key = `category-${id}`;
    const goalRelevant = Boolean(goal && GOAL_RELEVANT_DIMENSIONS[goal]?.includes(key));
    if (theirScore - mine >= MEANINGFUL_GAP) {
      dims.push({
        key,
        label,
        verdict: 'behind',
        detail: `This competitor scores meaningfully higher than you on ${label.toLowerCase()}.`,
        goalRelevant,
        weight: 4,
      });
    } else if (mine - theirScore >= MEANINGFUL_GAP) {
      dims.push({
        key,
        label,
        verdict: 'ahead',
        detail: `You score meaningfully higher than this competitor on ${label.toLowerCase()}.`,
        goalRelevant,
        weight: 4,
      });
    }
  }

  /* ---- trust signals (conv.ts checks, already comparable across platforms) ---- */
  for (const t of TRUST_CHECKS) {
    dims.push(binaryDimension(t.key, t.label, !hasFinding(report, t.id), !hasFinding(theirs, t.id), goal));
  }

  /* ---- important page coverage (understanding.ts) ---- */
  if (report.understanding && theirs.understanding) {
    for (const p of IMPORTANT_PAGE_TYPES) {
      const yourHas = (report.understanding.pages.byType[p.type] ?? 0) > 0;
      const theirHas = (theirs.understanding.pages.byType[p.type] ?? 0) > 0;
      dims.push(binaryDimension(p.key, p.label, yourHas, theirHas, goal));
    }

    /* ---- named services, a coverage count rather than a presence check ---- */
    dims.push(
      countDimension(
        'services',
        'Named services',
        report.understanding.services.length,
        theirs.understanding.services.length,
        'named services',
        goal
      )
    );
  }

  /* ---- customer-question coverage (aeo/gaps.ts), only when both sides ran it ---- */
  if (report.faq?.ran && theirs.faq?.ran) {
    dims.push(
      countDimension(
        'faq-coverage',
        'Customer questions answered',
        report.faq.answered.length,
        theirs.faq.answered.length,
        'customer questions answered on the site',
        goal
      )
    );
  }

  return dims;
}

/**
 * Combines dimensions across every competitor that could actually be read,
 * ranks them, and splits strengths / gaps / opportunities the way Part 21 of
 * the brief wants the report section to read. Returns `undefined` when no
 * competitor produced a usable audit, so the caller never attaches an empty
 * or misleading intelligence block.
 */
export function buildCompetitiveIntelligence(
  report: AuditReport,
  audited: Array<{ scored: CompetitorScore; theirs: AuditReport }>,
  goal: UserGoal | undefined
): CompetitiveIntelligence | undefined {
  // A competitor read for only a page or two is not enough to compare
  // understanding or trust signals against confidently, even though its
  // category scores (already coverage-aware in comparableScore) are still
  // meaningful. Below this floor, skip it entirely rather than presenting a
  // thin read as equivalent to a real one (Part 9 of the brief).
  const usable = audited.filter((a) => a.theirs.coverage.pagesCrawled >= 2);
  if (!usable.length) return undefined;

  const youCategories = comparableScore(report).categories;
  const all = usable.flatMap((a) => dimensionsFor(youCategories, report, a.theirs, a.scored, goal));
  if (!all.length) return undefined;

  const ranked = [...all].sort((a, b) => {
    const goalBoost = (b.goalRelevant ? 1 : 0) - (a.goalRelevant ? 1 : 0);
    if (goalBoost !== 0) return goalBoost;
    return b.weight - a.weight;
  });

  const yourPages = report.coverage.pagesCrawled;
  const coverageNote = usable
    .map((a) => `${a.theirs.host}: ${a.theirs.coverage.pagesCrawled} pages read, against ${yourPages} of yours`)
    .join('. ');

  return {
    comparedAgainst: usable.map((a) => a.theirs.host),
    all: ranked,
    top: ranked.slice(0, 5),
    strengths: ranked.filter((d) => d.verdict === 'ahead'),
    gaps: ranked.filter((d) => d.verdict === 'behind' || d.verdict === 'competitor_advantage'),
    opportunities: ranked.filter((d) => d.verdict === 'open_opportunity'),
    coverageNote: coverageNote ? `${coverageNote}.` : '',
  };
}

/**
 * Rescores a report using only the categories that compare across platforms.
 *
 * The headline score in a normal report includes Squarespace setup, which is
 * both weighted and irrelevant to a competitor on another platform. Rebuilding
 * the score from the comparable categories only means both sides are measured
 * the same way.
 */
function comparableScore(report: AuditReport): {
  overall: number;
  categories: Partial<Record<CategoryId, number>>;
} {
  const cats = report.score.categories.filter((c) => COMPARABLE.includes(c.id));
  const categories: Partial<Record<CategoryId, number>> = {};
  for (const c of cats) categories[c.id] = c.score;

  // Weighted harmonic mean, the same shape the main score uses: one very weak
  // area should drag the total down rather than be averaged away.
  let weightSum = 0;
  let recipSum = 0;
  for (const c of cats) {
    const w = CATEGORIES[c.id].weight;
    weightSum += w;
    recipSum += w / Math.max(1, c.score);
  }
  const overall = weightSum > 0 ? Math.round(weightSum / recipSum) : 0;
  return { overall, categories };
}

const MEANINGFUL_GAP = 8;

/**
 * Hard cap on how many competitors any single comparison ever crawls
 * (Part 26 of the competitor-intelligence brief: "no crawl explosion").
 * Applies to both the score table below and the intelligence engine built
 * from the same crawl, there is deliberately only ever one crawl per
 * competitor no matter how many things read its result.
 */
export const MAX_COMPETITORS = 2;

export async function runComparison(
  report: AuditReport,
  competitorUrls: string[],
  deadline: number,
  goal?: UserGoal
): Promise<Comparison> {
  const you = comparableScore(report);

  const results = await Promise.all(
    competitorUrls.slice(0, MAX_COMPETITORS).map(async (raw): Promise<{ scored: CompetitorScore; theirs: AuditReport | null }> => {
      const url = normaliseInput(raw) || raw;
      const host = prettyHost(url);
      const base: CompetitorScore = {
        url,
        host,
        ok: false,
        platform: 'unknown',
        overall: 0,
        categories: {},
        pagesRead: 0,
        aheadOn: [],
        behindOn: [],
      };

      const remaining = deadline - Date.now();
      if (remaining < 8_000) {
        return { scored: { ...base, error: 'We ran out of time before we could read this one.' }, theirs: null };
      }

      try {
        // The one and only crawl of this competitor. Goes through
        // `runAudit`, the exact same pipeline (and therefore the exact same
        // `safeFetch` SSRF/redirect/DNS-rebinding protections) the primary
        // audit uses, just budgeted smaller (COMPETITOR_CONFIG). Its full
        // result, understanding, findings and all, feeds both the score
        // table below and `buildCompetitiveIntelligence` (Part 6/26 of the
        // brief: reuse the extraction, never crawl twice).
        const theirs = await runAudit(url, () => {}, {
          ...COMPETITOR_CONFIG,
          totalBudgetMs: Math.min(COMPETITOR_CONFIG.totalBudgetMs, remaining - 3_000),
        });
        const scored = comparableScore(theirs);

        const aheadOn: string[] = [];
        const behindOn: string[] = [];
        for (const id of COMPARABLE) {
          const mine = you.categories[id];
          const theirScore = scored.categories[id];
          if (mine === undefined || theirScore === undefined) continue;
          if (theirScore - mine >= MEANINGFUL_GAP) aheadOn.push(CATEGORIES[id].label);
          else if (mine - theirScore >= MEANINGFUL_GAP) behindOn.push(CATEGORIES[id].label);
        }

        return {
          scored: {
            ...base,
            ok: true,
            platform: theirs.squarespace.isSquarespace
              ? `Squarespace ${theirs.squarespace.version}`
              : 'Another platform',
            overall: scored.overall,
            categories: scored.categories,
            pagesRead: theirs.coverage.pagesCrawled,
            aheadOn,
            behindOn,
          },
          theirs,
        };
      } catch (e: any) {
        const message =
          e instanceof AuditError
            ? e.code === 'BOT_BLOCKED'
              ? 'Their site refuses automated requests, which also blocks search and AI crawlers.'
              : e.message
            : 'We could not read this site.';
        return { scored: { ...base, error: message }, theirs: null };
      }
    })
  );

  const scoredResults = results.map((r) => r.scored);
  // Part 5 of the brief: a competitor that failed must degrade gracefully,
  // never take the primary report down with it. Every failure above is
  // already caught inside the per-competitor promise, so this line can only
  // ever filter, never throw.
  const audited = results.filter(
    (r): r is { scored: CompetitorScore; theirs: AuditReport } => r.theirs !== null
  );

  return {
    ranAt: new Date().toISOString(),
    you: { host: report.host, ...you },
    competitors: scoredResults,
    verdict: comparisonVerdict(you.overall, scoredResults),
    intelligence: buildCompetitiveIntelligence(report, audited, goal),
  };
}

/** Exported so the wording is covered by the offline tests. */
export function comparisonVerdict(yourScore: number, competitors: CompetitorScore[]): string {
  const read = competitors.filter((c) => c.ok);
  if (!read.length) {
    return 'We could not read any of the sites you listed, so there is nothing to compare against yet.';
  }

  const better = read.filter((c) => c.overall > yourScore + 2);
  const average = Math.round(read.reduce((a, c) => a + c.overall, 0) / read.length);

  const themes = new Map<string, number>();
  for (const c of read) for (const label of c.aheadOn) themes.set(label, (themes.get(label) || 0) + 1);
  const commonTheme = Array.from(themes.entries()).sort((a, b) => b[1] - a[1])[0];

  const field = read.length === 1 ? 'the site you listed' : `the ${read.length} sites you listed`;

  // "You are ahead of the field" while the average sits above your score is the
  // kind of sentence that costs a report its credibility, so the claim is
  // checked against the average rather than only against the clear winners.
  if (!better.length && yourScore >= average) {
    return `You score ${yourScore} against an average of ${average} across ${field}, so you are ahead of the field on the measures that compare across platforms.`;
  }
  if (!better.length) {
    return `You score ${yourScore} against an average of ${average} across ${field}. Nothing separates you by a margin worth acting on.`;
  }

  const lead =
    better.length === read.length
      ? `All ${read.length === 1 ? 'of them' : read.length} outscore you`
      : `${better.length} of ${read.length} outscore you`;

  return commonTheme
    ? `${lead}: you are on ${yourScore} against an average of ${average}. The gap shows up most often in ${commonTheme[0]}, where ${
        commonTheme[1] === 1 ? 'one of them' : `${commonTheme[1]} of them`
      } ${commonTheme[1] === 1 ? 'is' : 'are'} clearly ahead.`
    : `${lead}: you are on ${yourScore} against an average of ${average}.`;
}
