/**
 * Audit-in-progress screen — presentation-only rebuild of the old
 * `.progress`/`.step` block in Auditor.tsx's `running` phase, now wrapped
 * in the report's own card idiom (.spec) for a more premium look. Same
 * ten stages (STAGES, moved here verbatim) and the same live-region detail
 * line; the actual progress (`pct`/`stage`/`detail`) is still driven
 * entirely by Auditor's streaming `onmessage` handler — this component
 * only renders what it's given.
 */

export const STAGES = [
  { key: 'validate', label: 'Checking the address' },
  { key: 'detect', label: 'Detecting Squarespace' },
  { key: 'discover', label: 'Reading robots.txt and sitemap' },
  { key: 'crawl', label: 'Crawling your pages' },
  { key: 'extract', label: 'Extracting page data' },
  { key: 'assets', label: 'Measuring images and scripts' },
  { key: 'checks', label: 'Running the audit checks' },
  { key: 'score', label: 'Calculating your score' },
  { key: 'ai', label: 'Writing your recommendations' },
  { key: 'save', label: 'Finishing your report' },
];

export function ProgressSection({
  host,
  pct,
  stage,
  detail,
}: {
  host: string;
  pct: number;
  stage: string;
  detail: string;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="frame progress">
      <div className="spec">
        <h1>Auditing {host}</h1>
        <div className="progress-sub">{pct}% complete</div>
        <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        {STAGES.map((s, i) => (
          <div key={s.key} className={`step${i === currentIndex ? ' on' : ''}${i < currentIndex ? ' past' : ''}`}>
            <span className="step-n num">{String(i + 1).padStart(2, '0')}</span>
            <span>{s.label}</span>
            <span className="step-tick">{i < currentIndex ? '✓' : ''}</span>
          </div>
        ))}
        <div className="progress-log" aria-live="polite">
          {detail}
        </div>
      </div>
    </div>
  );
}
