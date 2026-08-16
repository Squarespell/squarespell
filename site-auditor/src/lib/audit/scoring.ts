/**
 * Scoring model.
 *
 * Deliberate choices, each one guarding against a known failure mode in
 * commercial audit tools:
 *
 *  1. Sub-linear prevalence (γ = 0.5). Ahrefs-style "% of clean URLs" makes 50
 *     broken pages out of 5,000 look like 99% health. Here, a small number of
 *     defects still costs a visible fraction of the check.
 *  2. Applicability. A check that does not apply is removed from BOTH numerator
 *     and denominator. Awarding free points for surface area a site does not
 *     have is how a 3-page brochure site ends up scoring 96.
 *  3. Severity gates. A single critical failure caps the category, so a site
 *     with a noindexed homepage cannot score in the 80s on the strength of
 *     sixty passing low-severity checks.
 *  4. Harmonic mean across categories, so one collapsed category cannot be
 *     averaged away by nine healthy ones.
 *  5. Platform-locked checks are reported but never scored. Marking a
 *     Squarespace site down for a missing Content-Security-Policy header ,
 *     something the owner physically cannot change, destroys credibility.
 *
 * The model is fully deterministic: two runs an hour apart produce the same
 * score for the same site.
 *
 * Gamma (`c.gamma`), the prevalence exponent, defaults to 0.5 (sub-linear:
 * see point 1 above) but roughly a third of checks across the codebase
 * override it to 1.0 (linear). That split was made case-by-case while writing
 * each check rather than from a written rule (flagged in
 * AUDIT-OF-THE-AUDIT.md, Step 3), so writing the rule down here, made
 * explicit rather than left implicit in each check file:
 *
 *   - gamma: 1.0 (linear) when a check counts continuous inventory — images,
 *     links, form fields, scripts — where the exact ratio affected is itself
 *     the point (e.g. "40% of images have no alt text" should cost roughly
 *     40% of that check's score, not be amplified). Used by: title/
 *     description length, image alt coverage, third-party script count,
 *     sitemap lastmod coverage, oversized images, missing image dimensions,
 *     static-asset caching, generic link text, unlabelled form fields,
 *     nameless links/buttons/frames, gibberish slugs, archive-page bloat,
 *     unused Squarespace features, internal-linking opportunities, duplicate
 *     content pairs.
 *   - gamma: 0.5 (sub-linear, the default) when a single occurrence anywhere
 *     is disproportionately bad and prevalence itself understates the harm —
 *     indexability, canonical integrity, security, broken pages. One
 *     noindexed page is not "a small fraction of pages are broken", it is
 *     the whole site missing from search.
 *
 * When adding a new check: ask whether the *rate* is the finding (linear) or
 * whether *any* occurrence is close to as bad as many (sub-linear), and pick
 * accordingly rather than by feel.
 */

import { CATEGORIES } from './types';
import type { AuditScore, CategoryId, CategoryScore, CheckResult, Severity } from './types';

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  info: 0,
};

export function gradeFor(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 55) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

export function scoreAudit(results: CheckResult[]): AuditScore {
  const byCategory = new Map<CategoryId, CheckResult[]>();
  for (const r of results) {
    if (r.unscored) continue;
    if (r.applicable <= 0) continue;
    if (SEVERITY_WEIGHT[r.severity] === 0) continue;
    byCategory.set(r.category, [...(byCategory.get(r.category) || []), r]);
  }

  const categories: CategoryScore[] = [];

  for (const meta of Object.values(CATEGORIES)) {
    const checks = byCategory.get(meta.id) || [];
    if (checks.length === 0) continue;

    let numerator = 0;
    let denominator = 0;
    let criticalFailures = 0;
    let findingCount = 0;

    for (const c of checks) {
      const w = SEVERITY_WEIGHT[c.severity];
      const gamma = c.gamma ?? 0.5;
      const p = Math.min(1, c.affected / Math.max(1, c.applicable));
      const s = 1 - Math.pow(p, gamma);
      numerator += w * s;
      denominator += w;
      if (c.severity === 'critical' && c.affected > 0) criticalFailures++;
      findingCount += c.findings.length;
    }

    let score = denominator > 0 ? (100 * numerator) / denominator : 100;
    if (criticalFailures >= 2) score = Math.min(score, 40);
    else if (criticalFailures === 1) score = Math.min(score, 55);

    categories.push({
      id: meta.id,
      label: meta.label,
      score: Math.round(score),
      weight: meta.weight,
      applicableChecks: checks.length,
      criticalFailures,
      findingCount,
    });
  }

  // Weighted harmonic mean: one collapsed category drags the whole score.
  const totalWeight = categories.reduce((a, c) => a + c.weight, 0);
  const harmonicDenominator = categories.reduce(
    (a, c) => a + c.weight / Math.max(1, c.score),
    0
  );
  let overall = totalWeight > 0 && harmonicDenominator > 0 ? totalWeight / harmonicDenominator : 0;

  const anyCritical = categories.some((c) => c.criticalFailures > 0);
  let gated = false;
  let gateReason: string | undefined;
  if (anyCritical && overall > 65) {
    overall = 65;
    gated = true;
    gateReason =
      'Capped at 65 because at least one critical issue is blocking indexing, conversion or security.';
  }

  categories.sort((a, b) => a.score - b.score);

  return {
    overall: Math.round(overall),
    grade: gradeFor(Math.round(overall)),
    categories,
    gated,
    gateReason,
  };
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const EFFORT_RANK: Record<'quick' | 'medium' | 'project', number> = {
  quick: 0,
  medium: 1,
  project: 2,
};

/** Severity first, then cheapest fix first. Stable and explainable. */
export function prioritise<T extends { severity: Severity; effort: 'quick' | 'medium' | 'project'; affectedCount: number }>(
  findings: T[]
): T[] {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    const e = EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort];
    if (e !== 0) return e;
    return b.affectedCount - a.affectedCount;
  });
}

/** High-impact, low-effort findings, the "do these this afternoon" list. */
export function quickWins<
  T extends { severity: Severity; effort: 'quick' | 'medium' | 'project'; affectedCount: number },
>(findings: T[]): T[] {
  return prioritise(
    findings.filter(
      (f) => f.effort === 'quick' && ['critical', 'high', 'medium'].includes(f.severity)
    )
  ).slice(0, 6);
}
