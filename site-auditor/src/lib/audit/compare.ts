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
import { CATEGORIES, type AuditReport, type CategoryId } from './types';

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

export async function runComparison(
  report: AuditReport,
  competitorUrls: string[],
  deadline: number
): Promise<Comparison> {
  const you = comparableScore(report);

  const results = await Promise.all(
    competitorUrls.slice(0, 3).map(async (raw): Promise<CompetitorScore> => {
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
        return { ...base, error: 'We ran out of time before we could read this one.' };
      }

      try {
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
        };
      } catch (e: any) {
        const message =
          e instanceof AuditError
            ? e.code === 'BOT_BLOCKED'
              ? 'Their site refuses automated requests, which also blocks search and AI crawlers.'
              : e.message
            : 'We could not read this site.';
        return { ...base, error: message };
      }
    })
  );

  return {
    ranAt: new Date().toISOString(),
    you: { host: report.host, ...you },
    competitors: results,
    verdict: comparisonVerdict(you.overall, results),
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
