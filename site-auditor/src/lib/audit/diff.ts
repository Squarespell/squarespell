/**
 * Report diff: "what changed since your last audit?"
 *
 * A pure function over two already-computed `AuditReport` objects — no
 * crawling, no re-scoring, no AI. Every comparison uses the stable check ID
 * (`Finding.id`, e.g. `TECH-030`) rather than matching on title text, so a
 * copy change to a finding's wording between versions of this tool never
 * reads as "resolved, then a new issue appeared."
 *
 * Backward compatibility (Part 28 of the brief) is structural, not a special
 * case: `understanding`, `opportunities` and `businessContext` are all
 * optional fields added after this tool had already been auditing sites for
 * a while, so a `previous` report loaded from an old row genuinely may not
 * have them. Every section below that reads one of those fields checks for
 * its presence on *both* reports and silently omits that section rather than
 * guessing — see `businessSignalChanges`, `opportunityChange`,
 * `topOpportunityCategoryChange`, `goalChange` and `importantPageChanges`.
 */

import type { AuditReport, Finding, Severity, CategoryId, UserGoal } from './types';

const SEVERITY_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export interface FindingRef {
  id: string;
  title: string;
  severity: Severity;
  category: CategoryId;
  affectedPages: string[];
}

export interface SeverityChange extends FindingRef {
  from: Severity;
  to: Severity;
}

export interface CategoryScoreChange {
  id: CategoryId;
  label: string;
  from: number;
  to: number;
  delta: number;
}

export interface ReportDiff {
  hasPrevious: boolean;
  previousCreatedAt?: string;
  daysSincePrevious?: number;

  scoreChange: { from: number; to: number; delta: number } | null;
  categoryChanges: CategoryScoreChange[];

  newIssues: FindingRef[];
  resolvedIssues: FindingRef[];
  worsened: SeverityChange[];
  improved: SeverityChange[];
  unchangedCount: number;

  newPages: string[];
  removedPages: string[];

  /** Only populated when both reports carry `understanding` — see module comment. */
  businessSignalChanges: string[];
  /** Only populated when both reports carry `opportunities` — see module comment. */
  opportunityChange: { from: string; to: string } | null;
  /**
   * Structured version of `opportunityChange`: compares the #1-ranked
   * opportunity's stable `category`, not just its rendered title. A title
   * can coincidentally match across two audits, and can also change wording
   * for the same underlying category (a copy edit to this tool, not a
   * change on the audited site) — comparing `category` is what makes "top
   * opportunity moved from Performance to Conversion friction" a meaningful
   * structured change rather than a prose diff. Only populated when both
   * reports carry `opportunities` and the top category differs.
   */
  topOpportunityCategoryChange: {
    from: { id: string; title: string; category: string };
    to: { id: string; title: string; category: string };
  } | null;
  /** Only populated when both reports carry a `businessContext.goal` and the goal differs. */
  goalChange: { from: UserGoal; to: UserGoal } | null;
  /**
   * Structured page-importance changes — URLs `understanding.pages.important`
   * gained or dropped between audits. Only populated when both reports carry
   * `understanding`.
   */
  importantPageChanges: { added: string[]; removed: string[] };

  /** Plain-English lines, built only from fields above — nothing here states more than the data supports. */
  summary: string[];
}

function findingRef(f: Finding): FindingRef {
  return { id: f.id, title: f.title, severity: f.severity, category: f.category, affectedPages: f.affectedUrls };
}

const EMPTY_DIFF: ReportDiff = {
  hasPrevious: false,
  scoreChange: null,
  categoryChanges: [],
  newIssues: [],
  resolvedIssues: [],
  worsened: [],
  improved: [],
  unchangedCount: 0,
  newPages: [],
  removedPages: [],
  businessSignalChanges: [],
  opportunityChange: null,
  topOpportunityCategoryChange: null,
  goalChange: null,
  importantPageChanges: { added: [], removed: [] },
  summary: ['This is the first audit of this site, so there is nothing to compare it against yet.'],
};

export function diffReports(current: AuditReport, previous: AuditReport | null | undefined): ReportDiff {
  if (!previous) return EMPTY_DIFF;

  const curById = new Map(current.findings.map((f) => [f.id, f]));
  const prevById = new Map(previous.findings.map((f) => [f.id, f]));

  const newIssues: FindingRef[] = [];
  const worsened: SeverityChange[] = [];
  const improved: SeverityChange[] = [];
  let unchangedCount = 0;

  for (const [id, cur] of curById) {
    const prev = prevById.get(id);
    if (!prev) {
      newIssues.push(findingRef(cur));
    } else if (SEVERITY_RANK[cur.severity] > SEVERITY_RANK[prev.severity]) {
      worsened.push({ ...findingRef(cur), from: prev.severity, to: cur.severity });
    } else if (SEVERITY_RANK[cur.severity] < SEVERITY_RANK[prev.severity]) {
      improved.push({ ...findingRef(cur), from: prev.severity, to: cur.severity });
    } else {
      unchangedCount++;
    }
  }

  const resolvedIssues: FindingRef[] = [];
  for (const [id, prev] of prevById) {
    if (!curById.has(id)) resolvedIssues.push(findingRef(prev));
  }

  const scoreChange = { from: previous.score.overall, to: current.score.overall, delta: current.score.overall - previous.score.overall };

  const prevCatById = new Map(previous.score.categories.map((c) => [c.id, c]));
  const categoryChanges: CategoryScoreChange[] = current.score.categories
    .map((c) => {
      const prevCat = prevCatById.get(c.id);
      if (!prevCat) return null;
      return { id: c.id, label: c.label, from: prevCat.score, to: c.score, delta: c.score - prevCat.score };
    })
    .filter((c): c is CategoryScoreChange => c !== null && c.delta !== 0);

  const curPages = new Set(current.pageSummaries.map((p) => p.url));
  const prevPages = new Set(previous.pageSummaries.map((p) => p.url));
  const newPages = Array.from(curPages).filter((u) => !prevPages.has(u));
  const removedPages = Array.from(prevPages).filter((u) => !curPages.has(u));

  /* ---------------- business-signal changes (both reports must have `understanding`) ---------------- */
  const businessSignalChanges: string[] = [];
  if (current.understanding && previous.understanding) {
    const cu = current.understanding;
    const pu = previous.understanding;
    if (cu.businessType.value !== pu.businessType.value && (cu.businessType.value || pu.businessType.value)) {
      businessSignalChanges.push(
        `The site now reads as ${cu.businessType.value ? `a ${cu.businessType.value}` : 'unclear about what the business is'}, previously ${pu.businessType.value ? `a ${pu.businessType.value}` : 'unclear'}.`
      );
    }
    if (cu.primaryConversion.value !== pu.primaryConversion.value) {
      businessSignalChanges.push(`The primary conversion path changed from "${pu.primaryConversion.value}" to "${cu.primaryConversion.value}".`);
    }
    if (cu.services.length !== pu.services.length) {
      businessSignalChanges.push(`${cu.services.length} services are now named on the site, versus ${pu.services.length} before.`);
    }
  }

  /* ---------------- opportunity change (both reports must have `opportunities`) ---------------- */
  let opportunityChange: ReportDiff['opportunityChange'] = null;
  let topOpportunityCategoryChange: ReportDiff['topOpportunityCategoryChange'] = null;
  if (current.opportunities && previous.opportunities) {
    const curTop = current.opportunities.top[0];
    const prevTop = previous.opportunities.top[0];
    if (curTop && prevTop && curTop.id !== prevTop.id) {
      opportunityChange = { from: prevTop.title, to: curTop.title };
    }
    if (curTop && prevTop && curTop.category !== prevTop.category) {
      topOpportunityCategoryChange = {
        from: { id: prevTop.id, title: prevTop.title, category: prevTop.category },
        to: { id: curTop.id, title: curTop.title, category: curTop.category },
      };
    }
  }

  /* ---------------- goal change (both reports must have businessContext.goal) ---------------- */
  let goalChange: ReportDiff['goalChange'] = null;
  const curGoal = current.businessContext?.goal;
  const prevGoal = previous.businessContext?.goal;
  if (curGoal && prevGoal && curGoal !== prevGoal) {
    goalChange = { from: prevGoal, to: curGoal };
  }

  /* ---------------- important-page changes (both reports must have `understanding`) ---------------- */
  let importantPageChanges: ReportDiff['importantPageChanges'] = { added: [], removed: [] };
  if (current.understanding && previous.understanding) {
    const curImportant = new Set(current.understanding.pages.important.map((p) => p.url));
    const prevImportant = new Set(previous.understanding.pages.important.map((p) => p.url));
    importantPageChanges = {
      added: Array.from(curImportant).filter((u) => !prevImportant.has(u)),
      removed: Array.from(prevImportant).filter((u) => !curImportant.has(u)),
    };
  }

  const daysSincePrevious = Math.max(0, Math.round((Date.parse(current.createdAt) - Date.parse(previous.createdAt)) / 86_400_000));

  /* ---------------- business-relevant summary lines ---------------- */
  const summary: string[] = [];
  if (resolvedIssues.length) summary.push(`${resolvedIssues.length} ${resolvedIssues.length === 1 ? 'issue was' : 'issues were'} resolved.`);
  if (newIssues.length) summary.push(`${newIssues.length} new ${newIssues.length === 1 ? 'issue' : 'issues'} appeared.`);
  if (worsened.length) summary.push(`${worsened.length} ${worsened.length === 1 ? 'issue' : 'issues'} got worse.`);
  if (improved.length) summary.push(`${improved.length} ${improved.length === 1 ? 'issue' : 'issues'} improved without being fully resolved.`);
  if (newPages.length) summary.push(`${newPages.length} new ${newPages.length === 1 ? 'page was' : 'pages were'} found.`);
  if (removedPages.length) summary.push(`${removedPages.length} previously-crawled ${removedPages.length === 1 ? 'page is' : 'pages are'} no longer found.`);
  if (opportunityChange) summary.push(`Your top opportunity changed from "${opportunityChange.from}" to "${opportunityChange.to}".`);
  if (topOpportunityCategoryChange) {
    summary.push(`Your top opportunity shifted from a ${topOpportunityCategoryChange.from.category} issue to a ${topOpportunityCategoryChange.to.category} issue.`);
  }
  if (goalChange) summary.push(`Your stated goal changed from "${goalChange.from}" to "${goalChange.to}".`);
  if (importantPageChanges.added.length || importantPageChanges.removed.length) {
    summary.push(
      `${importantPageChanges.added.length} page${importantPageChanges.added.length === 1 ? '' : 's'} newly stand out as important, ${importantPageChanges.removed.length} no longer do.`
    );
  }
  summary.push(...businessSignalChanges);
  if (scoreChange.delta !== 0) {
    summary.push(`Overall score ${scoreChange.delta > 0 ? 'rose' : 'fell'} from ${scoreChange.from} to ${scoreChange.to}.`);
  }
  if (!summary.length) summary.push('Nothing measurable changed since the previous audit.');

  return {
    hasPrevious: true,
    previousCreatedAt: previous.createdAt,
    daysSincePrevious,
    scoreChange,
    categoryChanges,
    newIssues,
    resolvedIssues,
    worsened,
    improved,
    unchangedCount,
    newPages,
    removedPages,
    businessSignalChanges,
    opportunityChange,
    topOpportunityCategoryChange,
    goalChange,
    importantPageChanges,
    summary,
  };
}
