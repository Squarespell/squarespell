import { bandColour, bandWord } from './band';

const TICKS = [
  'Prioritized issues & opportunities',
  'Clear explanations in plain English',
  'Impact score & difficulty rating',
  'Actionable steps you can take',
];

const MOCK_ISSUES: Array<{ title: string; severity: 'critical' | 'high' | 'medium' }> = [
  { title: 'Eliminate render-blocking resources', severity: 'critical' },
  { title: 'Image optimization opportunities', severity: 'high' },
  { title: 'Missing meta descriptions', severity: 'medium' },
  { title: 'Multiple H1 headings detected', severity: 'medium' },
];

export function SampleReportSection() {
  const perfScore = 82;
  return (
    <section id="report" className="frame home-section">
      <div className="hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Detailed. Professional. Actionable.</p>
          <h2 style={{ fontSize: 'var(--fs-34)', letterSpacing: 'var(--ls-md)', marginTop: 'var(--s3)' }}>
            See Exactly What You&rsquo;ll Get
          </h2>
          <p className="entry-lede" style={{ marginTop: 'var(--s4)' }}>
            Our reports are clear, comprehensive and designed to help you improve your site with
            confidence.
          </p>
          <div className="home-sample-ticks">
            {TICKS.map((t) => (
              <div key={t}>
                <span>✓</span>
                {t}
              </div>
            ))}
          </div>
          <a className="btn btn-ghost" href="#audit-form" style={{ marginTop: 'var(--s6)' }}>
            View Full Sample Report →
          </a>
        </div>

        <div className="spec" aria-hidden="true">
          <div className="spec-head">
            <div className="spec-host" style={{ fontSize: 'var(--fs-14)' }}>
              Top Issues
            </div>
            <div className="spec-tag">4 found</div>
          </div>
          {MOCK_ISSUES.map((issue) => (
            <div className="spec-row" key={issue.title}>
              {issue.title}
              <span className={`chip chip-${issue.severity}`}>
                {issue.severity === 'critical' ? 'Critical' : issue.severity === 'high' ? 'High' : 'Medium'}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 'var(--s5)', paddingTop: 'var(--s4)', borderTop: 'var(--hairline) solid var(--line-2)' }}>
            <div className="spec-tag">Performance Overview</div>
            <div className="score-value" style={{ color: bandColour(perfScore), marginTop: 'var(--s1)' }}>
              {perfScore}
            </div>
            <div className="score-out">out of 100, {bandWord(perfScore)}</div>
            <div className="band">
              <div className="band-track">
                <div className="band-fill" style={{ width: `${perfScore}%`, background: bandColour(perfScore) }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
