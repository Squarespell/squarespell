/**
 * Score-band colour/word, mirrored from the private `bandColour`/`bandWord`
 * functions in Report.tsx (not exported there, and Report.tsx is out of
 * scope for this pass — so this is a small, deliberate duplication rather
 * than an import) so the illustrative report card in the hero and the
 * sample-report section render scores in exactly the same colours and
 * words a real report would.
 */
export function bandColour(score: number): string {
  if (score >= 80) return 'var(--ok-700)';
  if (score >= 60) return 'var(--high-700)';
  return 'var(--crit-700)';
}

export function bandWord(score: number): string {
  if (score >= 90) return 'strong';
  if (score >= 80) return 'good';
  if (score >= 60) return 'needs work';
  if (score >= 40) return 'weak';
  return 'poor';
}
