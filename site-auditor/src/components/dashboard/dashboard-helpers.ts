import type { CategoryId, Finding, Severity } from '@/lib/audit/types';

/** Score band -> Tailwind color token, shared by every card/table that shows a score. */
export function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function scoreBarClass(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-destructive';
}

export function bandWord(score: number): string {
  if (score >= 90) return 'strong';
  if (score >= 80) return 'good';
  if (score >= 60) return 'needs work';
  if (score >= 40) return 'weak';
  return 'poor';
}

export const SEVERITY_BADGE_VARIANT: Record<Severity, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'outline',
  info: 'outline',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

/**
 * Category groupings for the dashboard's named findings tables. `sqs`
 * (Squarespace Setup), `conv` (Conversion) and `social` (Social Sharing)
 * aren't in the brief's named list, so they surface in the "All findings"
 * tab instead of being silently dropped.
 */
export const FINDINGS_TABLE_GROUPS: Array<{ key: string; label: string; categories: CategoryId[] }> = [
  { key: 'seo', label: 'SEO', categories: ['tech', 'onpage', 'aeo', 'schema'] },
  { key: 'a11y', label: 'Accessibility', categories: ['a11y'] },
  { key: 'sec', label: 'Security', categories: ['sec'] },
  { key: 'perf', label: 'Performance', categories: ['perf'] },
  { key: 'schema', label: 'Structured Data', categories: ['schema'] },
  { key: 'mobile', label: 'Mobile', categories: ['mobile'] },
];

/** SEO score shown on the overview: a weighted blend of the search-relevant categories (real weights, real category scores -- not a fabricated number). */
export function computeSeoScore(categories: Array<{ id: CategoryId; score: number; weight: number }>): number {
  const seoCats = categories.filter((c) => (['tech', 'onpage', 'aeo', 'schema'] as CategoryId[]).includes(c.id));
  const totalWeight = seoCats.reduce((s, c) => s + c.weight, 0);
  if (!totalWeight) return 0;
  return Math.round(seoCats.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
