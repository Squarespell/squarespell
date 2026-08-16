'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AuditReport, Finding, Severity } from '@/lib/audit/types';
import type { PsiResult } from '@/lib/audit/perf/psi';
import { nextSteps } from '@/lib/audit/verdict';
import { Compare } from './Compare';
import { LeadCapture } from './LeadCapture';

/* Severity carries a shape as well as a colour, so the report stays
   readable in greyscale, in print and for colourblind readers. */
const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Note',
};

/* Effort is stated in time, not in adjectives. "Medium" tells nobody
   whether to do it this afternoon or put it in next quarter. */
const EFFORT_LABEL: Record<Finding['effort'], string> = {
  quick: 'About 15 minutes',
  medium: 'An hour or two',
  project: 'A planned piece of work',
};

function bandColour(score: number): string {
  if (score >= 80) return 'var(--ok-700)';
  if (score >= 60) return 'var(--high-700)';
  return 'var(--crit-700)';
}

function bandWord(score: number): string {
  if (score >= 90) return 'strong';
  if (score >= 80) return 'good';
  if (score >= 60) return 'needs work';
  if (score >= 40) return 'weak';
  return 'poor';
}

function track(name: string, props: Record<string, unknown>, auditToken?: string) {
  try {
    navigator.sendBeacon?.(
      '/api/event',
      new Blob([JSON.stringify({ name, props, auditToken })], { type: 'application/json' })
    );
  } catch {
    /* analytics is never load bearing */
  }
}

function FindingRow({
  finding,
  index,
  auditToken,
}: {
  finding: Finding;
  index: number;
  auditToken?: string;
}) {
  const [open, setOpen] = useState(false);
  const f = finding;

  return (
    <article className={`finding${open ? ' open' : ''}`} id={f.id}>
      <button
        className="finding-row"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) track('finding_expanded', { id: f.id, severity: f.severity }, auditToken);
        }}
      >
        <span className="finding-title">{f.title}</span>
        <span className="finding-side">
          {f.platformLocked && <span className="finding-note">set by Squarespace</span>}
          {f.applicableCount > 1 && (
            <span className="finding-scope">
              {f.affectedCount} of {f.applicableCount}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="detail">
          <p className="detail-lead">{f.detail}</p>

          {f.evidence.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">What we measured</div>
              <div className="evidence">
                <table>
                  <tbody>
                    {f.evidence.map((e, i) => (
                      <tr key={i}>
                        <td className="k">{e.label}</td>
                        <td>{e.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {f.narrative && (
            <>
              <div className="detail-part">
                <div className="detail-k">Why it matters</div>
                <p>{f.narrative.why}</p>
                <p className="detail-impact">{f.narrative.impact}</p>
              </div>
              <div className="detail-part">
                <div className="detail-k">What to do</div>
                <p>{f.narrative.action}</p>
                {f.squarespacePath && (
                  <p className="where">
                    <span className="where-k">In Squarespace</span>
                    {f.squarespacePath}
                  </p>
                )}
                <p className="detail-effort">
                  {EFFORT_LABEL[f.effort]}
                  {f.affectedUrls.length > 0
                    ? `, on ${f.affectedCount} ${f.affectedCount === 1 ? 'page' : 'pages'}`
                    : ''}
                </p>
              </div>
            </>
          )}

          {!f.narrative && f.squarespacePath && (
            <div className="detail-part">
              <div className="detail-k">Where to fix it in Squarespace</div>
              <p>{f.squarespacePath}</p>
            </div>
          )}

          {f.affectedUrls.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">Where</div>
              <div className="urls">
                {f.affectedUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow">
                    {new URL(u).pathname === '/' ? u.replace(/^https?:\/\//, '') : new URL(u).pathname}
                  </a>
                ))}
                {f.affectedCount > f.affectedUrls.length && (
                  <span className="urls-more">
                    and {f.affectedCount - f.affectedUrls.length} more
                  </span>
                )}
              </div>
            </div>
          )}

          {f.confidence !== 'verified' && (
            <div className="detail-part">
              <p className="caveat">
                {f.confidence === 'heuristic'
                  ? 'Heuristic signal rather than a direct measurement. Worth confirming by eye.'
                  : f.confidence === 'unrendered'
                    ? 'Measured from your page source without running JavaScript, so anything a script adds after load is not included. Most search and AI crawlers read pages the same way.'
                    : 'Measured on a sample of pages rather than every page on the site.'}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function Report({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [active, setActive] = useState<string>('summary');
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of report.findings) c[f.severity]++;
    return c;
  }, [report.findings]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of report.findings) map.set(f.category, [...(map.get(f.category) || []), f]);
    return map;
  }, [report.findings]);

  const visible = useMemo(
    () => (filter === 'all' ? report.findings : report.findings.filter((f) => f.severity === filter)),
    [report.findings, filter]
  );

  const grouped = useMemo(() => {
    return SEV_ORDER.map((sev) => ({
      sev,
      items: visible.filter((f) => f.severity === sev),
    })).filter((g) => g.items.length > 0);
  }, [visible]);

  /* Sidebar reflects where you actually are in the document. */
  useEffect(() => {
    const ids = ['summary', 'start', 'questions', 'speed', 'compare', 'categories', 'findings', 'working', 'next'];
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const steps = useMemo(() => nextSteps(report), [report]);
  const faq = report.faq;

  /* Google's own measurement. Deliberately fetched after the report is on
     screen: a Lighthouse run takes far longer than our entire crawl, and
     making the reader wait for it would be a worse trade than filling this
     section in a few seconds late. */
  const [perf, setPerf] = useState<PsiResult | null>(report.perf ?? null);
  const [perfState, setPerfState] = useState<'idle' | 'loading' | 'done'>(
    report.perf ? 'done' : 'idle'
  );

  // The guard is a ref rather than the state value on purpose. Depending on
  // perfState here meant that setting it to "loading" re-ran the effect, whose
  // cleanup then cancelled the very request it had just started, so the
  // section sat at "measuring" forever.
  const perfStarted = useRef(Boolean(report.perf));
  useEffect(() => {
    if (perfStarted.current) return;
    perfStarted.current = true;
    setPerfState('loading');
    fetch('/api/perf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: report.finalUrl, token: report.id || undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PsiResult | null) => {
        setPerf(data);
        setPerfState('done');
      })
      .catch(() => setPerfState('done'));
  }, [report.finalUrl, report.id, report.perf]);

  const shareUrl =
    typeof window !== 'undefined' && report.id ? `${window.location.origin}/r/${report.id}` : '';
  const created = new Date(report.createdAt);
  const score = report.score.overall;

  return (
    <div className="frame">
      <div className="report">
        <nav className="sidebar" aria-label="Report sections">
          <div className="side-group">
            <span className="eyebrow side-label">Report</span>
            {(
              [
                ['summary', 'Verdict'],
                ['start', 'Start here'],
                // Only listed when the section is actually on the page. A nav
                // item that scrolls nowhere is worse than a shorter nav.
                ...(faq?.ran && faq.opportunities.length > 0
                  ? [['questions', 'Questions']]
                  : []),
                ['speed', 'Real speed'],
                ['compare', 'Competitors'],
                ['categories', 'Categories'],
                ['findings', 'Findings'],
                ...(report.strengths.length > 0 ? [['working', 'What works']] : []),
                ['next', 'Get help'],
              ] as string[][]
            ).map(([id, label]) => (
              <a key={id} href={`#${id}`} className={`side-link${active === id ? ' on' : ''}`}>
                <span>{label}</span>
                {id === 'questions' && faq?.ran && (
                <span className="side-count">{faq.opportunities.length}</span>
              )}
              {id === 'findings' && <span className="side-count">{report.findings.length}</span>}
                {id === 'working' && <span className="side-count">{report.strengths.length}</span>}
              </a>
            ))}
          </div>

          <div className="side-meta">
            {report.coverage.pagesCrawled} pages crawled
            <br />
            {report.coverage.checksApplicable} checks applied
            <br />
            {(report.coverage.durationMs / 1000).toFixed(1)}s
          </div>
        </nav>

        {/* A section, not a main: this component renders inside the page's
            own main landmark, and two mains is one too many for a screen
            reader deciding where the content starts. */}
        <div className="rep-body">
          <header className="rep-head">
            <div>
              <h1 className="rep-host">{report.host}</h1>
              <div className="rep-sub">
                {report.siteName} · audited{' '}
                {created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                at {created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="rep-actions">
              {shareUrl && (
                <button
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      track('share_copied', {}, report.id);
                    } catch {
                      window.prompt('Copy this link:', shareUrl);
                    }
                  }}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              )}
              {report.id && (
                <a
                  className="btn btn-ghost"
                  href={`/api/report-pdf?token=${encodeURIComponent(report.id)}`}
                  onClick={() => track('pdf_clicked', {}, report.id)}
                >
                  Download PDF
                </a>
              )}
              <button className="btn btn-ghost" onClick={() => window.print()}>
                Print
              </button>
              <button className="btn btn-ghost" onClick={onReset}>
                New audit
              </button>
            </div>
          </header>

          {/* ---------------------------------------------- summary */}
          <section id="summary" className="verdict">
            <div>
              <div className="score-value" style={{ color: bandColour(score) }}>
                {score}
              </div>
              <div className="score-out">out of 100, {bandWord(score)}</div>
              <div className="band">
                <div className="band-track">
                  <div
                    className="band-fill"
                    style={{ width: `${score}%`, background: bandColour(score) }}
                  />
                </div>
                <div className="band-marks">
                  <span>0</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            <div className="verdict-copy">
              <h2>{report.summary?.headline}</h2>
              <p>{report.summary?.narrative}</p>
              {(() => {
                const prev = report.history?.[0];
                if (!prev) return null;
                const delta = score - prev.score;
                const when = new Date(prev.at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <p className="trend">
                    <span
                      className="trend-delta num"
                      style={{
                        color:
                          delta > 0 ? 'var(--ok-700)' : delta < 0 ? 'var(--crit-700)' : 'var(--ink-4)',
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta === 0 ? 'no change' : delta}
                    </span>
                    <span>
                      {delta === 0
                        ? `since this site was last audited on ${when}, when it also scored ${prev.score}.`
                        : `since ${when}, when this site scored ${prev.score}.`}
                    </span>
                  </p>
                );
              })()}

              <div className="tally">
                {SEV_ORDER.filter((s) => counts[s] > 0).map((s) => (
                  <span className="tally-item" key={s}>
                    <span className={`glyph glyph-${s}`} aria-hidden="true" />
                    <span className="tally-n">{counts[s]}</span>
                    <span>{SEV_LABEL[s]}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <dl className="facts">
            <div className="fact">
              <dt>Platform</dt>
              <dd>Squarespace {report.squarespace.version}</dd>
            </div>
            {report.squarespace.editor.ratio !== null && (
              <div className="fact">
                <dt>Editor</dt>
                <dd>
                  {report.squarespace.editor.ratio >= 0.99
                    ? 'Fluid Engine'
                    : report.squarespace.editor.ratio === 0
                      ? 'Classic'
                      : `${Math.round(report.squarespace.editor.ratio * 100)}% Fluid Engine`}
                </dd>
              </div>
            )}
            {report.squarespace.templateFamily && (
              <div className="fact">
                <dt>Template</dt>
                <dd>{report.squarespace.templateFamily}</dd>
              </div>
            )}
            <div className="fact">
              <dt>Detection</dt>
              <dd>{report.squarespace.confidence}% across {report.squarespace.signals.length} signals</dd>
            </div>
            {report.squarespace.features.commerce && (
              <div className="fact">
                <dt>Commerce</dt>
                <dd>Active</dd>
              </div>
            )}
            {report.squarespace.features.scheduling && (
              <div className="fact">
                <dt>Scheduling</dt>
                <dd>Active</dd>
              </div>
            )}
          </dl>

          {/* ------------------------------------------- start here */}
          {steps.length > 0 && (
            <section id="start" className="section">
              <div className="section-head">
                <h2>Start here</h2>
                <span className="eyebrow">
                  {steps.length === 1 ? 'The single highest-value move' : `${steps.length} highest-value moves, in order`}
                </span>
              </div>
              <ol className="plan">
                {steps.map((f, i) => (
                  <li className="plan-row" key={f.id}>
                    <span className="plan-n num">{String(i + 1).padStart(2, '0')}</span>
                    <div className="plan-body">
                      <a className="plan-title" href={`#${f.id}`}>
                        {f.title}
                      </a>
                      <p>{f.narrative?.action}</p>
                      <div className="plan-meta">
                        <span className={`glyph glyph-${f.severity}`} aria-hidden="true" />
                        <span>{SEV_LABEL[f.severity]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{EFFORT_LABEL[f.effort]}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* -------------------------------------------- questions */}
          {faq?.ran && faq.opportunities.length > 0 && (
            <section id="questions" className="section">
              <div className="section-head">
                <h2>Questions your site does not answer</h2>
                <span className="eyebrow">
                  {faq.answered.length} of {faq.gaps.length} answered
                </span>
              </div>
              <p className="section-note">
                Built from what your own pages say you do, then checked against every page we read.
                A question marked <b>asked</b> has a page on the subject that never gives the answer,
                which is the version an AI assistant finds hardest to use.
              </p>
              <ul className="qs">
                {faq.opportunities.map((g) => (
                  <li className="q" key={g.question}>
                    <span className={`q-tag q-${g.status}`}>
                      {g.status === 'partial' ? 'asked' : 'missing'}
                    </span>
                    <span className="q-text">{g.question}</span>
                    {g.pageUrl && (
                      <a
                        className="q-page"
                        href={g.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {new URL(g.pageUrl).pathname}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {faq.profile.services.length > 0 && (
                <p className="section-note" style={{ marginTop: 'var(--s4)' }}>
                  We read your site as{' '}
                  {faq.profile.category && faq.profile.categoryConfident
                    ? `a ${faq.profile.category}`
                    : 'a business'}
                  {faq.profile.location ? ` in ${faq.profile.location}` : ''}, offering{' '}
                  {faq.profile.services
                    .slice(0, 4)
                    .map((s) => s.name.toLowerCase())
                    .join(', ')}
                  . If that is wrong, the questions above are worth ignoring, and the fact that we
                  read it that way is itself the finding.
                </p>
              )}
            </section>
          )}

          {/* ------------------------------------------------ speed */}
          <section id="speed" className="section">
            <div className="section-head">
              <h2>Real speed, measured by Google</h2>
              <span className="eyebrow">
                {perfState === 'loading' ? 'measuring' : perf?.strategy === 'mobile' ? 'mobile' : ''}
              </span>
            </div>

            {perfState === 'loading' && (
              <p className="section-note">
                Asking Google to load your site on a mid-range phone. This takes up to half a minute,
                the rest of the report is finished and readable while it runs.
              </p>
            )}

            {perfState === 'done' && !perf && (
              <p className="section-note">
                Google&rsquo;s measurement service did not respond. Everything else in this report is
                measured by us and is unaffected.
              </p>
            )}

            {perf && perf.field.length > 0 && (
              <>
                <div className="cwv-verdict">
                  <span className={`cwv-badge ${perf.fieldVerdict === 'pass' ? 'cwv-pass' : 'cwv-fail'}`}>
                    {perf.fieldVerdict === 'pass' ? 'Passing' : 'Not passing'}
                  </span>
                  <span>
                    Core Web Vitals, from real Chrome visitors over the last 28 days
                    {perf.fieldIsOrigin ? ', measured across your whole site' : ''}.
                  </span>
                </div>
                <table className="cwv">
                  <tbody>
                    {perf.field.map((m) => (
                      <tr key={m.metric}>
                        <td className="cwv-name">
                          {m.metric}
                          {!m.core && <span className="cwv-sub">supporting</span>}
                        </td>
                        <td className={`cwv-value num cwv-${m.category}`}>{m.display}</td>
                        <td className="cwv-bar">
                          <div className="cwv-track">
                            <div className="cwv-good" style={{ width: `${m.distribution[0]}%` }} />
                            <div className="cwv-ni" style={{ width: `${m.distribution[1]}%` }} />
                            <div className="cwv-poor" style={{ width: `${m.distribution[2]}%` }} />
                          </div>
                        </td>
                        <td className="cwv-share num">{m.distribution[0]}% good</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {perf && perf.note && <p className="section-note">{perf.note}</p>}

            {perf && perf.labScore !== null && (
              <div className="lab">
                <div className="lab-head">
                  <span className="eyebrow">Lab test</span>
                  <span className="lab-score num" style={{ color: bandColour(perf.labScore) }}>
                    {perf.labScore}
                  </span>
                  <span className="lab-note">
                    One simulated load on a throttled phone. Useful for diagnosis, and not what
                    Google ranks on, that is the real-visitor data above.
                  </span>
                </div>
                {perf.opportunities.length > 0 && (
                  <ul className="lab-list">
                    {perf.opportunities.map((o) => (
                      <li key={o.title}>
                        <span className="lab-save num">{(o.savingsMs / 1000).toFixed(1)}s</span>
                        <span>{o.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ----------------------------------------- competitors */}
          <Compare report={report} />

          {/* ------------------------------------------- categories */}
          <section id="categories" className="section">
            <div className="section-head">
              <h2>Categories</h2>
              <span className="eyebrow">Weighted by commercial impact</span>
            </div>
            <table className="cats">
              <tbody>
                {report.score.categories.map((c) => (
                  <tr key={c.id}>
                    <td className="cat-name">{c.label}</td>
                    <td className="cat-issues">
                      {c.findingCount === 0 ? 'clear' : `${c.findingCount} issue${c.findingCount === 1 ? '' : 's'}`}
                    </td>
                    <td className="cat-bar">
                      <div className="cat-bar-track">
                        <div
                          className="cat-bar-fill"
                          style={{ width: `${c.score}%`, background: bandColour(c.score) }}
                        />
                      </div>
                    </td>
                    <td className="cat-score" style={{ color: bandColour(c.score) }}>
                      {c.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* --------------------------------------------- findings */}
          <section id="findings" className="section">
            <div className="section-head">
              <h2>Findings</h2>
              <div className="filters">
                {(['all', ...SEV_ORDER] as const)
                  .filter((s) => s === 'all' || counts[s] > 0)
                  .map((s) => (
                    <button
                      key={s}
                      className={`filter${filter === s ? ' on' : ''}`}
                      onClick={() => setFilter(s as any)}
                    >
                      {s === 'all' ? `All ${report.findings.length}` : `${SEV_LABEL[s as Severity]} ${counts[s]}`}
                    </button>
                  ))}
              </div>
            </div>

            {grouped.length === 0 ? (
              <p className="section-note">Nothing in this group.</p>
            ) : (
              grouped.map((g) => (
                <div key={g.sev}>
                  <div className="group-head">
                    <span className={`glyph glyph-${g.sev}`} aria-hidden="true" />
                    <span className="eyebrow">{SEV_LABEL[g.sev]}</span>
                    <span className="group-count">{g.items.length}</span>
                  </div>
                  {g.items.map((f, i) => (
                    <FindingRow key={f.id} finding={f} index={i} auditToken={report.id} />
                  ))}
                </div>
              ))
            )}
          </section>

          {/* ---------------------------------------------- working */}
          {report.strengths.length > 0 && (
            <section id="working" className="section">
              <div className="section-head">
                <h2>What is already working</h2>
                <span className="eyebrow">{report.strengths.length} checks passed cleanly</span>
              </div>
              <div className="passes">
                {report.strengths.map((s, i) => (
                  <div className="pass-row" key={i}>
                    <span className="glyph glyph-ok" aria-hidden="true" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------- next */}
          <div id="next">
            <LeadCapture report={report} />
          </div>

          <p className="method">
            <b>Method.</b> We crawled {report.coverage.pagesCrawled} of the{' '}
            {report.coverage.pagesDiscovered} pages we discovered, applied{' '}
            {report.coverage.checksApplicable} of {report.coverage.checksRun} checks, measured{' '}
            {report.coverage.imagesProbed} images and read {report.coverage.sitemapUrls} sitemap
            entries, in {(report.coverage.durationMs / 1000).toFixed(1)} seconds. Checks that did not
            apply to this site were excluded from the score rather than counted as passes. Checks
            marked <b>Platform</b> are controlled by Squarespace and are reported but not scored,
            because you cannot change them from your account. We do not run JavaScript, which is also
            true of most search and AI crawlers.{' '}
            {report.coverage.aiUsed
              ? 'The written explanations were generated from these measured findings only. Every number here comes from the crawl, not from a model.'
              : 'The written explanations are generated directly from the measured findings.'}
          </p>
        </div>
      </div>
    </div>
  );
}
