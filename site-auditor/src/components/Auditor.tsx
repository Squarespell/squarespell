'use client';

import { useCallback, useRef, useState, type ReactElement } from 'react';
import type { AuditReport, BusinessContext, ProgressEvent, UserGoal } from '@/lib/audit/types';
import { Report } from './Report';
import {
  IconSeo,
  IconPerformance,
  IconAccessibility,
  IconBestPractices,
  IconContentReview,
  IconActionableInsights,
  IconPersonAvatar,
  MarkSquarespace,
  MarkCircle,
  MarkStudiopress,
  MarkBigcartel,
  MarkFrahm,
} from './Icons';

type Phase = 'idle' | 'running' | 'done' | 'error';

/* Same UserGoal values the backend already accepts (types.ts) and the
   report already renders (GOAL_LABELS, opportunity.ts) — this is a display
   label set for the dropdown only, not a second source of truth. */
const GOAL_OPTIONS: Array<{ value: UserGoal; label: string }> = [
  { value: 'get_more_customers', label: 'Get more customers' },
  { value: 'get_more_leads', label: 'Get more leads' },
  { value: 'get_more_sales', label: 'Get more sales' },
  { value: 'get_more_bookings', label: 'Get more bookings' },
  { value: 'get_more_traffic', label: 'Get more traffic' },
  { value: 'improve_website', label: 'Improve the website overall' },
  { value: 'look_more_professional', label: 'Look more professional' },
  { value: 'beat_competitors', label: 'Beat competitors' },
  { value: 'improve_ai_visibility', label: 'Improve AI search visibility' },
  { value: 'improve_performance', label: 'Improve performance' },
  { value: 'not_sure', label: 'Not sure yet' },
];

const STAGES = [
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

/**
 * The exact mark from the reference design, reused inside the report-card
 * and the mini specimen at report size (17px / smaller still at 12px).
 */
function BrandMarkSmall() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 21 7.8v8.4L12 21.5 3 16.2V7.8L12 2.5Z" stroke="white" strokeWidth={2} />
      <path d="m7 12 5-3 5 3-5 3-5-3Z" stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

/** Reference copy verbatim: score 78, the five-metric row, the critical-issues
 * banner and the four checkmarks. Explicitly dated and hostnamed as an
 * example, exactly as the reference itself labels it. */
function Specimen() {
  return (
    <div className="report-card" aria-label="An example of a finished report">
      <div className="report-head">
        <div>
          <div className="report-brand">
            <BrandMarkSmall />
            SQUARESPELL
          </div>
          <div className="report-url">example-site.squarespace.com</div>
          <div className="report-date">May 20, 2025</div>
        </div>
        <div>
          <div
            className="score-ring"
            style={{ background: 'conic-gradient(var(--rd-lime) 0 78deg, #3b3d3e 78deg 360deg)' }}
          >
            <div className="score-num">
              <strong>78</strong>
              <small>/100</small>
            </div>
            <span className="score-good">Good</span>
          </div>
          <div className="overall">Overall Score</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="m-title">SEO</div>
          <strong>
            65<span>/100</span>
          </strong>
          <em className="bad">Needs Work</em>
        </div>
        <div className="metric">
          <div className="m-title">Performance</div>
          <strong>
            82<span>/100</span>
          </strong>
          <em className="good">Good</em>
        </div>
        <div className="metric">
          <div className="m-title">Accessibility</div>
          <strong>
            91<span>/100</span>
          </strong>
          <em className="good">Excellent</em>
        </div>
        <div className="metric">
          <div className="m-title">Best Practices</div>
          <strong>
            76<span>/100</span>
          </strong>
          <em className="good">Good</em>
        </div>
        <div className="metric">
          <div className="m-title">Content</div>
          <strong>
            70<span>/100</span>
          </strong>
          <em className="bad">Needs Work</em>
        </div>
      </div>

      <div className="issue">
        <div className="warn">!</div>
        <div>
          <b>2 Critical Issues Found</b>
          <p>These issues are hurting your rankings, user experience, and conversions.</p>
        </div>
      </div>

      <div className="report-bullets">
        <div>
          <i />
          Actionable recommendations
        </div>
        <div>
          <i />
          Prioritized by impact
        </div>
        <div>
          <i />
          Easy to understand
        </div>
        <div>
          <i />
          Designed to help you grow
        </div>
      </div>
    </div>
  );
}

const TRUST_LOGOS: Array<{ name: string; Mark: null | ((p: { className?: string }) => ReactElement) }> = [
  { name: 'SQUARESPACE', Mark: MarkSquarespace },
  { name: 'CIRCLE', Mark: MarkCircle },
  { name: 'STUDIOPRESS', Mark: MarkStudiopress },
  { name: 'bigcartel', Mark: MarkBigcartel },
  { name: 'Typeform', Mark: null },
  { name: 'FRAHM', Mark: MarkFrahm },
];

const STEPS = [
  {
    title: 'Enter Your URL',
    body: (
      <>
        Add your Squarespace
        <br />
        website URL above.
      </>
    ),
  },
  {
    title: 'We Audit Your Site',
    body: (
      <>
        Our tool runs 60+ checks on SEO,
        <br />
        performance, accessibility and more.
      </>
    ),
  },
  {
    title: 'Get Your Free Report',
    body: (
      <>
        You&rsquo;ll receive a detailed PDF
        <br />
        report with clear insights and
        <br />
        actionable recommendations.
      </>
    ),
  },
];

const REFERENCE_CHECKS = [
  {
    Icon: IconSeo,
    title: 'SEO Analysis',
    body: (
      <>
        On-page SEO, meta tags,
        <br />
        headings, sitemap, speed
        <br />
        &amp; indexing.
      </>
    ),
  },
  {
    Icon: IconPerformance,
    title: 'Performance',
    body: (
      <>
        Core Web Vitals, image
        <br />
        optimization &amp; more
        <br />
        performance.
      </>
    ),
  },
  {
    Icon: IconAccessibility,
    title: 'Accessibility',
    body: (
      <>
        WCAG checks, contrast,
        <br />
        alt text, keyboard navigation
        <br />
        &amp; usability.
      </>
    ),
  },
  {
    Icon: IconBestPractices,
    title: 'Best Practices',
    body: (
      <>
        Security, HTTPS, third-party
        <br />
        scripts, HTML validation
        <br />
        &amp; site health.
      </>
    ),
  },
  {
    Icon: IconContentReview,
    title: 'Content Review',
    body: (
      <>
        Duplicate content, thin
        <br />
        pages, content linking
        <br />
        &amp; content quality.
      </>
    ),
  },
  {
    Icon: IconActionableInsights,
    title: 'Actionable Insights',
    body: (
      <>
        Prioritized recommendations
        <br />
        you can implement to fix
        <br />
        what holds you back.
      </>
    ),
  },
];

const WHY_STATS = [
  { n: '53%', body: 'of mobile users leave sites that take longer than 3 seconds to load.', src: 'Google' },
  { n: '72%', body: 'of websites have critical SEO issues that hurt their rankings.', src: 'SEMrush' },
  { n: '90%', body: 'of users won’t return to a site after a poor experience.', src: 'Forrester' },
  { n: '2.5x', body: 'faster growth for sites that fix 20+ SEO best practices.', src: 'Backlinko' },
];

function track(name: string, props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.('/api/event', new Blob([JSON.stringify({ name, props })], { type: 'application/json' }));
  } catch {
    /* analytics is never load bearing */
  }
}

function hostFrom(input: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return input;
  }
}

export function Auditor({
  initialReport,
  children,
}: {
  initialReport?: AuditReport;
  /** The written part of the landing page, rendered on the server, shown while idle. */
  children?: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>(initialReport ? 'done' : 'idle');
  const [url, setUrl] = useState('');
  const [report, setReport] = useState<AuditReport | null>(initialReport ?? null);
  const [stage, setStage] = useState('validate');
  const [pct, setPct] = useState(0);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<{ message: string; hint?: string; code?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Optional pre-audit context (Part 3 of the personalization brief). Every
     one of these stays empty unless the visitor deliberately opens the panel
     and types into it, so the request body sent below is byte-identical to
     the URL-only path when they don't. */
  const [showContext, setShowContext] = useState(false);
  const [bizDescription, setBizDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState<UserGoal | ''>('');
  const [competitor1, setCompetitor1] = useState('');
  const [competitor2, setCompetitor2] = useState('');

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setReport(null);
    setError(null);
    setPct(0);
    setDetail('');
    setUrl('');
    setShowContext(false);
    setBizDescription('');
    setAudience('');
    setGoal('');
    setCompetitor1('');
    setCompetitor2('');
    window.history.replaceState(null, '', '/');
  }, []);

  const start = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = url.trim();
      if (!value) {
        setError({ message: 'Enter the address of the Squarespace site you want to audit.' });
        setPhase('idle');
        return;
      }

      setPhase('running');
      setError(null);
      setPct(0);
      setStage('validate');
      setDetail('');

      const controller = new AbortController();
      abortRef.current = controller;

      const utm: Record<string, string> = {};
      const params = new URLSearchParams(window.location.search);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const v = params.get(k);
        if (v) utm[k] = v;
      }

      let sawTerminal = false;

      // Only present in the request body when the visitor actually opened
      // the panel and typed something. An untouched panel, or one that was
      // never opened, sends undefined here, so the request is unchanged from
      // the URL-only path — the server already treats a missing
      // businessContext as "no context supplied" throughout the pipeline.
      const businessContext: BusinessContext | undefined = (() => {
        const ctx: BusinessContext = {};
        if (bizDescription.trim()) ctx.businessDescription = bizDescription.trim();
        if (audience.trim()) ctx.targetAudience = audience.trim();
        if (goal) ctx.goal = goal;
        const competitorUrls = [competitor1, competitor2].map((u) => u.trim()).filter(Boolean);
        if (competitorUrls.length) ctx.competitorUrls = competitorUrls;
        return Object.keys(ctx).length ? ctx : undefined;
      })();

      if (businessContext) {
        track('context_provided', {
          hasDescription: Boolean(businessContext.businessDescription),
          hasAudience: Boolean(businessContext.targetAudience),
          hasGoal: Boolean(businessContext.goal),
          competitorCount: businessContext.competitorUrls?.length ?? 0,
        });
      }

      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            url: value,
            utm,
            referrer: document.referrer || undefined,
            businessContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setError({ message: data.error, code: data.code });
          setPhase('error');
          return;
        }
        if (!res.body) throw new Error('No response from the server.');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: ProgressEvent & { hint?: string };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.type === 'stage') {
              setStage(event.stage);
              setPct(event.pct);
            } else if (event.type === 'detail') {
              setDetail(event.message);
            } else if (event.type === 'error') {
              sawTerminal = true;
              setError({ message: event.message, hint: (event as any).hint, code: event.code });
              setPhase('error');
              return;
            } else if (event.type === 'done') {
              sawTerminal = true;
              setReport(event.report);
              setPct(100);
              setPhase('done');
              if (event.report.id) {
                window.history.replaceState(null, '', `/r/${event.report.id}`);
              }
              return;
            }
          }
        }

        // The stream closed without a done/error event.
        if (!sawTerminal) {
          setError({ message: 'The audit stopped unexpectedly. Please try again.' });
          setPhase('error');
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError({ message: 'We lost the connection while auditing. Please try again.' });
        setPhase('error');
      }
    },
    [url, bizDescription, audience, goal, competitor1, competitor2]
  );

  /* ---------------------------------------------------------- report */
  if (phase === 'done' && report) {
    return (
      <div className="shell">
        <Report report={report} onReset={reset} />
      </div>
    );
  }

  /* -------------------------------------------------------- progress */
  if (phase === 'running') {
    const currentIndex = STAGES.findIndex((s) => s.key === stage);
    return (
      <div className="frame">
        <div className="progress">
          <h1>Auditing {hostFrom(url)}</h1>
          <div className="progress-sub">{pct}% complete</div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className={`step${i === currentIndex ? ' on' : ''}${i < currentIndex ? ' past' : ''}`}
            >
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

  /* ----------------------------------------------------------- entry */
  return (
    <>
    <div className="rd">
      <div className="page">
        <div className="wrap">
          <section className="hero" id="audit-form">
            <div className="hero-copy">
              <div className="eyebrow">100% Free Squarespace Website Audit</div>
              <h1>
                Professional
                <br />
                Squarespace
                <br />
                Audit. <span className="lime">100% Free.</span>
              </h1>
              <p className="lead">
                We analyze your Squarespace site across 60+ critical checks &mdash; SEO,
                performance, accessibility, content and more &mdash; and send you a detailed PDF
                report with actionable insights.
              </p>

              <form className="hero-form" onSubmit={start}>
                <div className="url-label">
                  <span aria-hidden="true" />
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter your Squarespace site URL"
                    aria-label="Your Squarespace website address"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'transparent',
                      border: 0,
                      outline: 0,
                      color: 'inherit',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <button className="btn" type="submit">
                  Audit My Site &mdash; It&rsquo;s Free
                </button>
              </form>

              <button
                type="button"
                className="context-toggle"
                onClick={() => {
                  const next = !showContext;
                  setShowContext(next);
                  if (next) track('context_panel_opened', {});
                }}
                aria-expanded={showContext}
              >
                {showContext ? 'Hide personalization' : 'Want a more personalized report? (optional)'}
              </button>

              {showContext && (
                <div className="context-panel">
                  <p className="context-lead">
                    Tell us a little about the site and the report will focus on what matters most
                    for it. Skip anything you would rather not answer, none of this is required to
                    run the free audit.
                  </p>
                  <div className="context-field">
                    <label htmlFor="ctx-desc">What does your business do?</label>
                    <textarea
                      id="ctx-desc"
                      value={bizDescription}
                      onChange={(e) => setBizDescription(e.target.value.slice(0, 500))}
                      placeholder="e.g. We run a small pottery studio and sell handmade ceramics."
                      maxLength={500}
                    />
                  </div>
                  <div className="context-field">
                    <label htmlFor="ctx-audience">Who are you trying to reach?</label>
                    <input
                      id="ctx-audience"
                      type="text"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value.slice(0, 300))}
                      placeholder="e.g. Local customers looking for gifts"
                      maxLength={300}
                    />
                  </div>
                  <div className="context-field">
                    <label htmlFor="ctx-goal">What is your main website goal?</label>
                    <select
                      id="ctx-goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as UserGoal | '')}
                    >
                      <option value="">Select a goal (optional)</option>
                      {GOAL_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="context-field">
                    <label>Competitor websites (optional)</label>
                    <div className="context-competitors">
                      <input
                        type="text"
                        value={competitor1}
                        onChange={(e) => setCompetitor1(e.target.value)}
                        placeholder="competitor.com"
                        aria-label="Competitor website 1"
                      />
                      <input
                        type="text"
                        value={competitor2}
                        onChange={(e) => setCompetitor2(e.target.value)}
                        placeholder="another-competitor.com"
                        aria-label="Competitor website 2"
                      />
                    </div>
                  </div>
                  <p className="context-note">
                    We never fetch these competitor sites at this stage. This only shapes how your
                    own report is written.
                  </p>
                </div>
              )}

              {error && (
                <p style={{ fontSize: 10, lineHeight: 1.5, color: 'var(--rd-red)', margin: '-12px 0 20px', maxWidth: 347 }} role="alert">
                  <strong>{error.message}</strong>
                  {error.hint ? ` ${error.hint}` : ''}
                  {error.code === 'NOT_SQUARESPACE' &&
                    ' If you believe this is a Squarespace site, it may sit behind a proxy such as Cloudflare that hides the platform.'}
                </p>
              )}

              <div className="perks">
                <div className="perk">
                  <b>✓</b>No Sign Up
                </div>
                <div className="perk">
                  <b>✓</b>No Credit Card
                </div>
                <div className="perk">
                  <b>✓</b>Instant Results
                </div>
              </div>

              <div className="rating">
                <div className="faces">
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                </div>
                <div>
                  <div>
                    <span className="stars">★★★★★</span> <span className="rating-text">4.9/5</span>
                  </div>
                  <div className="trusted">
                    Trusted by 4,000+ Squarespace owners,
                    <br />
                    designers &amp; marketing teams worldwide.
                  </div>
                </div>
              </div>
            </div>

            <Specimen />
          </section>

          <div className="trust-wrap">
            <div className="rule" />
            <div className="trust-title">Trusted by Squarespace professionals &amp; businesses</div>
            <div className="trust">
              {TRUST_LOGOS.map((l) => (
                <div className="logo" key={l.name}>
                  {l.Mark && <l.Mark className="logo-mark" />}
                  {l.name}
                </div>
              ))}
            </div>
            <div className="rule" />
          </div>

          <section id="how" className="section center">
            <div className="eyebrow">How It Works</div>
            <h2>3 Simple Steps to Your Free Audit</h2>
            <div className="steps">
              {STEPS.map((s, i) => (
                <div className="step" key={s.title}>
                  <div className="step-no">{String(i + 1).padStart(2, '0')}</div>
                  <div className="step-ill">
                    {i === 0 && (
                      <>
                        <div className="browser" />
                        <div className="chain">↗</div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <div className="browser" />
                        <div className="magnify">
                          <div className="checks">
                            ✓
                            <br />✓
                          </div>
                        </div>
                      </>
                    )}
                    {i === 2 && (
                      <div className="pdf">
                        <span className="pdf-label">PDF</span>
                      </div>
                    )}
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {i < STEPS.length - 1 && <div className="arrow" />}
                </div>
              ))}
            </div>
          </section>

          <section id="features" className="checks-section section center">
            <div className="eyebrow">What&rsquo;s Included in Your Free Audit</div>
            <h2>60+ Checks. Everything That Matters.</h2>
            <div className="checks-grid">
              {REFERENCE_CHECKS.map((c) => (
                <div className="check-col" key={c.title}>
                  <div className="check-icon">
                    <c.Icon />
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="report" className="sample">
            <div className="sample-copy">
              <div className="eyebrow">Detailed. Professional. Actionable.</div>
              <h2>See Exactly What You&rsquo;ll Get</h2>
              <p>
                Our PDF reports are clear, comprehensive and designed to help you improve your site
                with confidence.
              </p>
              <div className="ticks">
                <div className="tick">
                  <i>✓</i>Prioritized issues &amp; opportunities
                </div>
                <div className="tick">
                  <i>✓</i>Clear explanations in plain English
                </div>
                <div className="tick">
                  <i>✓</i>Impact score &amp; difficulty rating
                </div>
                <div className="tick">
                  <i>✓</i>Actionable steps you can take
                </div>
              </div>
              <a className="outline" href="#audit-form">
                View Full Sample Report&nbsp;&nbsp;&rarr;
              </a>
            </div>

            <div className="mini-reports" aria-hidden="true">
              <div className="mini-page">
                <div className="tiny-brand">⬡ SQUARESPELL</div>
                <div style={{ fontSize: 8, marginTop: 12 }}>
                  Squarespace
                  <br />
                  Website Audit Report
                </div>
                <div
                  className="tiny-ring"
                  style={{ background: 'conic-gradient(var(--rd-lime) 0 78deg, #3d3f40 78deg)' }}
                />
                <div className="tiny-score">Overall Score</div>
              </div>
              <div className="mini-issues">
                <div className="mini-title">Top Issues</div>
                <div className="issue-row">
                  <i />
                  <b>
                    Eliminate Render
                    <br />
                    Blocking Resources
                  </b>
                  <span className="badge">High</span>
                </div>
                <div className="issue-row">
                  <i />
                  <b>
                    Image Optimization
                    <br />
                    Opportunities
                  </b>
                  <span className="badge">High</span>
                </div>
                <div className="issue-row">
                  <i style={{ background: '#ffc800' }} />
                  <b>
                    Missing Meta
                    <br />
                    Descriptions
                  </b>
                  <span className="badge" style={{ borderColor: '#6d6100', color: '#d6c000' }}>
                    Medium
                  </span>
                </div>
                <div className="issue-row">
                  <i style={{ background: '#ffc800' }} />
                  <b>
                    Low Content
                    <br />
                    Page Ratio
                  </b>
                  <span className="badge" style={{ borderColor: '#6d6100', color: '#d6c000' }}>
                    Medium
                  </span>
                </div>
                <div className="issue-row">
                  <i style={{ background: '#ffc800' }} />
                  <b>
                    Multiple H1 Headings
                    <br />
                    Detected
                  </b>
                  <span className="badge" style={{ borderColor: '#6d6100', color: '#d6c000' }}>
                    Low
                  </span>
                </div>
              </div>
              <div className="mini-performance">
                <div className="mini-title">Performance Overview</div>
                <div className="big-score">
                  82<span style={{ fontSize: 7, color: '#999' }}>/100</span>
                </div>
                <div className="good" style={{ fontSize: 6, marginTop: 2 }}>
                  Good
                </div>
                <div className="graph">
                  <svg viewBox="0 0 180 60" preserveAspectRatio="none">
                    <polyline
                      points="0,45 15,38 28,43 42,35 56,39 69,31 82,34 95,27 108,33 122,23 135,29 150,20 164,24 180,13"
                      fill="none"
                      stroke="#5fe0ed"
                      strokeWidth={1.4}
                    />
                  </svg>
                </div>
                <div className="core">
                  <span>
                    Core Web Vitals <strong>Good</strong>
                  </span>
                  <span>
                    Largest Contentful Paint <b style={{ fontWeight: 400, color: '#ddd' }}>1.2s</b>
                  </span>
                  <span>
                    First Input Delay <b style={{ fontWeight: 400, color: '#ddd' }}>26ms</b>
                  </span>
                  <span>
                    Cumulative Layout Shift <b style={{ fontWeight: 400, color: '#ddd' }}>0.04</b>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="why">
            <div className="why-intro">
              <div className="eyebrow">Why It Matters</div>
              <h2>
                A Better Site Means
                <br />
                More Traffic, Leads &amp; Sales
              </h2>
              <p>
                Technical issues and poor content can silently cost you growth. Our audit uncovers
                what&rsquo;s holding you back so you can fix it and grow faster.
              </p>
            </div>
            {WHY_STATS.map((s) => (
              <div className="stat" key={s.n}>
                <strong>{s.n}</strong>
                <p>{s.body}</p>
                <small>Source: {s.src}</small>
              </div>
            ))}
          </section>

          <section className="help">
            <div className="help-copy">
              <div className="eyebrow">Found Issues You Don&rsquo;t Want to Fix Yourself?</div>
              <h2>We Can Help You Fix It</h2>
              <p>
                Squarespell specializes in Squarespace design, SEO and performance.
                <br />
                We&rsquo;ll fix the issues, optimize your site and help you grow.
              </p>
              <div className="help-tags">
                <span className="tag">◉ Squarespace SEO</span>
                <span className="tag">◉ Site Speed Optimization</span>
                <span className="tag">◉ Technical Fixes</span>
                <span className="tag">◉ Ongoing Support</span>
              </div>
            </div>
            <div className="help-right">
              <a className="btn" href="https://squarespell.com" target="_blank" rel="noopener noreferrer">
                Get Help Fixing These Issues&nbsp;&nbsp;&rarr;
              </a>
              <div className="help-proof">
                <div className="help-faces">
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                  <div className="face">
                    <IconPersonAvatar />
                  </div>
                </div>
                <div className="proof-text">4,000+ projects completed</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div className="frame">{children}</div>
    </>
  );
}
