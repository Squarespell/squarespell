/**
 * The site-level verdict.
 *
 * A report used to open with the title of its own top finding, which meant the
 * most valuable line on the page read like a machine-written footnote
 * ("4 pages have no H1 heading"). A verdict is a different thing: it says what
 * kind of site this is, what is holding it back, and what to do first, in that
 * order, before the reader has scrolled anywhere.
 *
 * It is assembled from the scored result rather than from the top finding, so
 * it stays true when the finding list changes.
 */

import type { AuditReport, CategoryId, Finding, Severity } from './types';
import { count, verb } from './context';

/** How each category reads when it is the thing dragging the site down. */
const WEAKNESS: Record<CategoryId, string> = {
  tech: 'search engines cannot crawl and index it reliably',
  onpage: 'the pages do not tell search engines what they are about',
  perf: 'the pages are heavier and slower to appear than they need to be',
  aeo: 'AI assistants have very little to work with when someone asks about you',
  conv: 'visitors who are ready to act are not being given a way to',
  schema: 'nothing in the markup states who you are, so the parts of search that read structured data cannot see you',
  a11y: 'parts of it are unusable for anyone browsing with a screen reader',
  sec: 'there are trust and privacy gaps a careful visitor would notice',
  mobile: 'the experience on a phone is compromised',
  social: 'your links look broken or blank wherever they are shared',
  sqs: 'the Squarespace setup itself is working against it',
};

/** How each category reads when it is the one thing clearly done well. */
const STRENGTH: Record<CategoryId, string> = {
  tech: 'the technical foundations are sound',
  onpage: 'the pages are well described',
  perf: 'it loads well',
  aeo: 'it reads well for AI search',
  conv: 'the path to contacting you is clear',
  schema: 'your structured data is in place',
  a11y: 'the markup is accessible',
  sec: 'the security and privacy basics are covered',
  mobile: 'it behaves properly on a phone',
  social: 'shared links present well',
  sqs: 'the Squarespace setup is clean',
};

function bandPhrase(score: number): string {
  if (score >= 90) return 'This is one of the stronger Squarespace sites we measure';
  if (score >= 80) return 'The fundamentals here are in good shape';
  if (score >= 65) return 'This site works, but it is leaving results on the table';
  if (score >= 50) return 'This site has real problems that are costing it visibility and enquiries';
  if (score >= 35) return 'This site is underperforming badly enough to be worth a focused fix';
  return 'This site is not currently working as a way of winning business';
}

/**
 * The category doing the most damage: weight multiplied by how far below 100 it
 * scored. Restricted to categories that actually hold a serious finding when
 * any exist, so a site whose worst problem is a handful of medium items is not
 * described as though something were broken.
 */
function worstCategory(report: AuditReport) {
  const serious = new Set(
    report.findings.filter((f) => f.severity === 'critical' || f.severity === 'high').map((f) => f.category)
  );
  const pool = report.score.categories.filter(
    (c) => c.findingCount > 0 && (serious.size === 0 || serious.has(c.id))
  );
  if (!pool.length) return null;
  return pool
    .map((c) => ({ c, deficit: (c.weight * (100 - c.score)) / 100 }))
    .sort((a, b) => b.deficit - a.deficit)[0].c;
}

/**
 * How interesting it is that a category came out clean.
 *
 * Squarespace does the technical and mobile basics for you, so "the technical
 * foundations are sound" is true on almost every site we measure and therefore
 * tells the owner very little. Categories the owner had to get right
 * themselves are worth far more as a compliment, so they outrank the defaults
 * when both are clean.
 */
const NOTABILITY: Record<CategoryId, number> = {
  aeo: 1.3,
  conv: 1.3,
  onpage: 1.1,
  schema: 1.1,
  a11y: 1.0,
  perf: 0.9,
  sec: 0.8,
  sqs: 0.7,
  tech: 0.6,
  social: 0.5,
  mobile: 0.4,
};

function bestCategory(report: AuditReport, exclude?: CategoryId | null) {
  // A category cannot be both the compliment and the criticism. Excluding the
  // worst one avoids "the pages are well described, but the pages do not tell
  // search engines what they are about".
  const clean = report.score.categories.filter(
    (c) => c.score >= 90 && c.weight >= 5 && c.id !== exclude
  );
  if (!clean.length) return null;
  return clean.sort((a, b) => b.weight * NOTABILITY[b.id] - a.weight * NOTABILITY[a.id])[0];
}

/**
 * Findings that stop the site being found at all. These outrank everything
 * else in the report, because no other fix can pay off while one is live.
 */
const BLOCKING_IDS = new Set(['TECH-030', 'TECH-010', 'AEO-005', 'SEC-001', 'SEC-002', 'SQS-010']);

function blockingFinding(report: AuditReport): Finding | null {
  return (
    report.findings.find((f) => f.severity === 'critical' && BLOCKING_IDS.has(f.id)) ||
    report.findings.find((f) => f.severity === 'critical') ||
    null
  );
}

function headlineFor(report: AuditReport): string {
  const score = report.score.overall;

  if (report.findings.length === 0) {
    return `${report.host} passed every check we were able to apply.`;
  }

  const blocking = blockingFinding(report);
  if (blocking) {
    const others = report.findings.filter((f) => f.severity === 'critical').length - 1;
    const tail = others > 0 ? ` and ${count(others, 'other critical fault')}` : '';
    return `One fault is undermining everything else on this site${tail}: ${lower(blocking.title)}.`;
  }

  const worst = worstCategory(report);
  const best = bestCategory(report, worst?.id);

  if (!worst) return `${bandPhrase(score)}.`;

  // Nothing serious left. Saying "visitors are not being given a way to act"
  // about a site whose worst conversion issue is a medium would be alarmism.
  const serious = report.findings.some((f) => f.severity === 'critical' || f.severity === 'high');
  if (!serious) {
    return best
      ? `${cap(STRENGTH[best.id])}, and what is left here is refinement rather than repair.`
      : `Nothing on this site is broken, and what is left is refinement rather than repair.`;
  }

  // A site that is strong somewhere and weak somewhere else reads best as a
  // contrast, because that is the actual finding.
  if (best && score >= 60) {
    return `${cap(STRENGTH[best.id])}, but ${WEAKNESS[worst.id]}.`;
  }

  return `${bandPhrase(score)}, and ${WEAKNESS[worst.id]}.`;
}

function narrativeFor(report: AuditReport): string {
  const parts: string[] = [];
  const critical = report.findings.filter((f) => f.severity === 'critical');
  const high = report.findings.filter((f) => f.severity === 'high');
  const worst = worstCategory(report);

  parts.push(
    `We read ${count(report.coverage.pagesCrawled, 'page')} on ${report.host} and applied ${count(
      report.coverage.checksApplicable,
      'check'
    )}, which scored ${report.score.overall} out of 100.`
  );

  if (critical.length) {
    // The headline already names the first critical fault, so repeating it here
    // reads like a template filling itself in. Name the others, or move on.
    const named = blockingFinding(report);
    const rest = critical.filter((f) => f.id !== named?.id);
    if (rest.length) {
      parts.push(
        `${cap(count(rest.length, 'other fault'))} ${verb(rest.length, 'is', 'are')} also serious enough to come before the rest of this list: ${rest
          .slice(0, 2)
          .map((f) => lower(f.title))
          .join(', and ')}.`
      );
    } else {
      parts.push(
        'Everything else here is worth doing, but none of it will pay off until that one is fixed.'
      );
    }
  } else if (high.length) {
    parts.push(
      `Nothing is broken outright, but ${count(high.length, 'high-priority issue')} ${verb(
        high.length,
        'is',
        'are'
      )} holding the site back from what it could do.`
    );
  } else {
    parts.push(
      'Nothing here is broken. What remains is refinement rather than repair, so treat it as a list to work through rather than a problem to solve.'
    );
  }

  if (worst) {
    parts.push(
      `${worst.label} is the weakest area at ${worst.score} out of 100, carrying ${count(
        worst.findingCount,
        'issue'
      )}.`
    );
  }

  if (report.coverage.pagesDiscovered > report.coverage.pagesCrawled) {
    parts.push(
      `Of the ${count(report.coverage.pagesDiscovered, 'page')} we found, we read the ${
        report.coverage.pagesCrawled
      } most likely to carry the answer, so the counts below describe those.`
    );
  }

  return parts.join(' ');
}

/**
 * The three things to do first. Ordered by severity, then by how cheap the fix
 * is, so the list is genuinely startable rather than aspirational.
 */
const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const EFFORT_RANK: Record<Finding['effort'], number> = { quick: 0, medium: 1, project: 2 };

export function nextSteps(report: AuditReport): Finding[] {
  return [...report.findings]
    .filter((f) => !f.platformLocked && f.severity !== 'info')
    .sort(
      (a, b) =>
        SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
        EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] ||
        b.affectedCount - a.affectedCount
    )
    .slice(0, 3);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Lower-cases a title so it can be spliced mid-sentence. Acronyms and proper
 * nouns keep their capital, everything else does not.
 */
const KEEP_CAPITAL = /^(Google|Squarespace|Fluid|Classic|Developer|HTTPS?|SSL|AI|X)\b/;
function lower(s: string): string {
  if (/^[A-Z]{2,}/.test(s) || KEEP_CAPITAL.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function buildVerdict(report: AuditReport): void {
  report.summary = {
    headline: headlineFor(report),
    narrative: narrativeFor(report),
    priorities: nextSteps(report).map((f) => f.title),
    source: 'deterministic',
  };
}
