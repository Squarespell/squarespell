'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AuditReport, Finding, Severity } from '@/lib/audit/types';
import type { PsiResult } from '@/lib/audit/perf/psi';
import type { Opportunity, GoalAwareOpportunity } from '@/lib/audit/opportunity';
import { GOAL_LABELS } from '@/lib/audit/opportunity';
import type { Diagnosis } from '@/lib/audit/doctor';
import type { WebsiteUnderstanding, ConversionType } from '@/lib/audit/understanding';
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

/* Opportunities/diagnoses use a coarser three-step effort scale — see
   opportunity.ts. Kept as time-free adjectives on purpose there, so this
   mirrors that rather than forcing a fake minute estimate onto a group of
   findings that individually take different amounts of time. */
const OPP_EFFORT_LABEL: Record<Opportunity['effort'], string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'Larger project',
};

const OWNER_LABEL: Record<Opportunity['owner'], string> = {
  you: 'You can do this yourself',
  designer: 'Best suited to a designer',
  developer: 'Best suited to a developer',
  marketer: 'Best suited to marketing or copy',
  seo: 'Best suited to SEO work',
  squarespell: 'We recommend expert help for this',
};

const CONVERSION_PHRASE: Record<ConversionType, string> = {
  purchase: 'a purchase',
  booking: 'a booking',
  'contact-form': 'an enquiry',
  none: 'a conversion',
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

/**
 * One plain-English sentence describing what the site appears to be, built
 * only from `understanding` and only when there is enough signal to trust it
 * (`confident`). Never states a business type below that bar rather than
 * guessing — see understanding.ts for what `confident` requires.
 */
function snapshotSentence(u: WebsiteUnderstanding | undefined): string | null {
  if (!u || !u.confident) return null;
  const subject = u.businessType.value ? `a ${u.businessType.value}` : 'a business';
  const location = u.location.value && u.location.confidence !== 'low' ? ` in ${u.location.value}` : '';
  const conv = CONVERSION_PHRASE[u.primaryConversion.value ?? 'none'];
  return `You appear to run ${subject}${location} on Squarespace, built around ${conv}.`;
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

/**
 * One opportunity, shown as a diagnosis-style disclosure row — the same
 * open/closed mechanics as `FindingRow`, but framed as "what this means"
 * rather than "what failed." The first two in a list default open so the
 * highest-value information is visible without a click; the rest match
 * `FindingRow`'s collapsed-by-default behaviour so a long list never forces
 * the browser to render every evidence table at once.
 */
function OpportunityRow({
  opp,
  index,
  goalNote,
  auditToken,
}: {
  opp: Opportunity;
  index: number;
  goalNote?: string;
  auditToken?: string;
}) {
  const [open, setOpen] = useState(index < 2);

  return (
    <article className={`opp${open ? ' open' : ''}`} id={opp.id}>
      <button
        className="opp-row"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) track('opportunity_expanded', { id: opp.id, priority: opp.priority }, auditToken);
        }}
      >
        <span className={`glyph glyph-${opp.priority}`} aria-hidden="true" />
        <span className="opp-title">{opp.title}</span>
        <span className="opp-side">
          {opp.isQuickWin && <span className="chip chip-ok">Quick win</span>}
          <span className={`chip chip-${opp.priority}`}>{SEV_LABEL[opp.priority]}</span>
        </span>
      </button>

      {open && (
        <div className="detail">
          <p className="detail-lead">{opp.summary}</p>

          <div className="detail-part">
            <div className="detail-k">Why it matters</div>
            <p>{opp.businessRelevance}</p>
          </div>

          {opp.evidence.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">Evidence</div>
              <div className="evidence">
                <table>
                  <tbody>
                    {opp.evidence.map((e, i) => (
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

          <div className="detail-part">
            <div className="detail-k">Recommended action</div>
            <p>{opp.recommendedAction}</p>
            <p className="detail-effort">
              {OPP_EFFORT_LABEL[opp.effort]} &middot; {OWNER_LABEL[opp.owner]}
            </p>
          </div>

          {opp.affectedPages.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">Affected pages</div>
              <div className="urls">
                {opp.affectedPages.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow">
                    {(() => {
                      try {
                        return new URL(u).pathname === '/' ? u.replace(/^https?:\/\//, '') : new URL(u).pathname;
                      } catch {
                        return u;
                      }
                    })()}
                  </a>
                ))}
              </div>
            </div>
          )}

          {goalNote && (
            <div className="detail-part">
              <p className="caveat goal-note">{goalNote}</p>
            </div>
          )}

          {opp.confidence !== 'high' && (
            <div className="detail-part">
              <p className="caveat">
                {opp.confidence === 'low'
                  ? 'Built partly from a signal we are less certain about. Worth confirming by eye before treating this as settled.'
                  : 'Reasonably confident, though not every signal behind this is a direct measurement.'}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * One Website Doctor diagnosis. Same disclosure mechanics as
 * `OpportunityRow` — this is a re-framing of the same data, not a second
 * source of findings, so it deliberately looks like the same kind of row.
 */
function DoctorRow({ d, index }: { d: Diagnosis; index: number }) {
  const [open, setOpen] = useState(index < 1);

  return (
    <article className={`opp${open ? ' open' : ''}`} id={`doc-${d.id}`}>
      <button className="opp-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`glyph glyph-${d.priority}`} aria-hidden="true" />
        <span className="opp-title">{d.diagnosis}</span>
        <span className="opp-side">
          <span className={`chip chip-${d.priority}`}>{SEV_LABEL[d.priority]}</span>
        </span>
      </button>

      {open && (
        <div className="detail">
          {d.evidence.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">Evidence</div>
              <div className="evidence">
                <table>
                  <tbody>
                    {d.evidence.map((e, i) => (
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

          {d.likelyContributingFactors.length > 0 && (
            <div className="detail-part">
              <div className="detail-k">Likely contributing factors</div>
              <ul className="factors">
                {d.likelyContributingFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="detail-part">
            <div className="detail-k">Why it matters</div>
            <p>{d.impact}</p>
          </div>

          <div className="detail-part">
            <div className="detail-k">Prescription</div>
            <p>{d.prescription}</p>
            <p className="detail-effort">
              {OPP_EFFORT_LABEL[d.effort]} &middot; {OWNER_LABEL[d.owner]}
            </p>
          </div>

          {d.goalNote && (
            <div className="detail-part">
              <p className="caveat goal-note">{d.goalNote}</p>
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

  /* ------------------------------------------------------------ *
   * Opportunities / Website Doctor / What Changed — all optional,
   * all built from data the backend already computed (opportunity.ts,
   * doctor.ts, diff.ts). Every one of these is undefined on a report
   * saved before that phase shipped, so every section below is gated
   * on presence rather than assumed to exist.
   * ------------------------------------------------------------ */
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const goal = report.businessContext?.goal;

  const goalNoteById = useMemo(() => {
    const map = new Map<string, string>();
    if (report.goalAwareOpportunities?.goal) {
      for (const o of report.goalAwareOpportunities.all as GoalAwareOpportunity[]) {
        if (o.goalRelevanceScore >= 85) map.set(o.id, o.goalRelevanceReason);
      }
    }
    return map;
  }, [report.goalAwareOpportunities]);

  const opportunityGroups = useMemo(() => {
    const list = oppReport?.ranked ?? [];
    const groups = [
      { key: 'fix-first', label: 'Fix first', note: 'Critical, affects how the site works or is found at all.', items: list.filter((o) => o.priority === 'critical') },
      { key: 'next', label: 'Next', note: 'High-value, worth doing once the fix-first list is clear.', items: list.filter((o) => o.priority === 'high') },
      { key: 'later', label: 'Later', note: 'Smaller improvements, worth doing when there is time.', items: list.filter((o) => o.priority === 'medium' || o.priority === 'low') },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [oppReport]);

  const healthBands = useMemo(() => {
    const cats = report.score.categories;
    return {
      healthy: cats.filter((c) => c.score >= 80).length,
      attention: cats.filter((c) => c.score >= 60 && c.score < 80).length,
      critical: cats.filter((c) => c.score < 60).length,
      total: cats.length,
    };
  }, [report.score.categories]);

  const snapshot = useMemo(() => snapshotSentence(report.understanding), [report.understanding]);
  const goalSentence = goal && goal !== 'not_sure' ? `Your stated goal: ${GOAL_LABELS[goal] ?? goal}.` : null;
  const strongestSignal = report.strengths[0];

  /* Sidebar reflects where you actually are in the document. */
  useEffect(() => {
    const ids = [
      'summary',
      'health',
      'opportunities',
      'doctor',
      'changed',
      'questions',
      'speed',
      'compare',
      'findings',
      'working',
      'next',
    ];
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
                ['summary', 'Overview'],
                ['health', 'Website health'],
                ...(oppReport && oppReport.all.length > 0 ? [['opportunities', 'Opportunities']] : []),
                ...(report.doctor && report.doctor.length > 0 ? [['doctor', 'Website Doctor']] : []),
                ...(report.diff?.hasPrevious ? [['changed', 'What changed']] : []),
                // Only listed when the section is actually on the page. A nav
                // item that scrolls nowhere is worse than a shorter nav.
                ...(faq?.ran && faq.opportunities.length > 0
                  ? [['questions', 'Questions']]
                  : []),
                ['speed', 'Real speed'],
                ['compare', 'Competitors'],
                ['findings', 'All findings'],
                ...(report.strengths.length > 0 ? [['working', 'What works']] : []),
                ['next', 'Get help'],
              ] as string[][]
            ).map(([id, label]) => (
              <a key={id} href={`#${id}`} className={`side-link${active === id ? ' on' : ''}`}>
                <span>{label}</span>
                {id === 'opportunities' && oppReport && <span className="side-count">{oppReport.all.length}</span>}
                {id === 'doctor' && report.doctor && <span className="side-count">{report.doctor.length}</span>}
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

          {/* ---------------------------------------------- executive summary */}
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

              {(snapshot || goalSentence) && (
                <div className="snapshot">
                  {snapshot && <p>{snapshot}</p>}
                  {goalSentence && <p>{goalSentence}</p>}
                </div>
              )}

              {oppReport && oppReport.top.length > 0 && (
                <div className="snapshot-top">
                  <div className="detail-k">Your biggest opportunities</div>
                  <ol className="snapshot-list">
                    {oppReport.top.slice(0, 3).map((o) => (
                      <li key={o.id}>
                        <a href={`#${o.id}`}>{o.title}</a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {strongestSignal && (
                <p className="snapshot-strength">
                  <span className="glyph glyph-ok" aria-hidden="true" />
                  <span>{strongestSignal}</span>
                </p>
              )}

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

          {/* ------------------------------------------- website health */}
          <section id="health" className="section">
            <div className="section-head">
              <h2>Website health</h2>
              <span className="eyebrow">Weighted by commercial impact</span>
            </div>
            <p className="section-note">
              {healthBands.healthy} of {healthBands.total} areas are healthy
              {healthBands.attention > 0 ? `, ${healthBands.attention} need attention` : ''}
              {healthBands.critical > 0 ? `, and ${healthBands.critical} are critical` : ''}.
            </p>
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

          {/* ------------------------------------------ opportunities */}
          {oppReport && opportunityGroups.length > 0 && (
            <section id="opportunities" className="section">
              <div className="section-head">
                <h2>Biggest opportunities</h2>
                <span className="eyebrow">
                  {goal && goal !== 'not_sure' ? `ranked for ${GOAL_LABELS[goal] ?? goal}` : 'ranked by severity and evidence'}
                </span>
              </div>
              <p className="section-note">
                Related findings grouped into what actually matters, not a list of failed checks.
                Ordered so the first thing you read is the thing most worth fixing first.
              </p>
              {opportunityGroups.map((g) => (
                <div key={g.key}>
                  <div className="group-head">
                    <span className="eyebrow">{g.label}</span>
                    <span className="group-count">{g.items.length}</span>
                    <span className="group-note">{g.note}</span>
                  </div>
                  {g.items.map((o, i) => (
                    <OpportunityRow key={o.id} opp={o} index={i} goalNote={goalNoteById.get(o.id)} auditToken={report.id} />
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* ----------------------------------------------- doctor */}
          {report.doctor && report.doctor.length > 0 && (
            <section id="doctor" className="section">
              <div className="section-head">
                <h2>Website Doctor</h2>
                <span className="eyebrow">Diagnosis, cause and prescription</span>
              </div>
              <p className="section-note">
                The same opportunities above, read the way a diagnosis is read: what appears to be
                wrong, what the evidence shows, what likely contributes to it, and what to do about
                it. Contributing factors are correlation, findings that occur together, not a
                confirmed cause.
              </p>
              {report.doctor.map((d, i) => (
                <DoctorRow key={d.id} d={d} index={i} />
              ))}
            </section>
          )}

          {/* ----------------------------------------------- changed */}
          {report.diff?.hasPrevious && (
            <section id="changed" className="section">
              <div className="section-head">
                <h2>What changed since your last audit</h2>
                <span className="eyebrow">
                  {report.diff.daysSincePrevious} {report.diff.daysSincePrevious === 1 ? 'day' : 'days'} ago
                </span>
              </div>
              <div className="tally">
                {report.diff.resolvedIssues.length > 0 && (
                  <span className="tally-item">
                    <span className="glyph glyph-ok" aria-hidden="true" />
                    <span className="tally-n">{report.diff.resolvedIssues.length}</span>
                    <span>Resolved</span>
                  </span>
                )}
                {report.diff.newIssues.length > 0 && (
                  <span className="tally-item">
                    <span className="glyph glyph-critical" aria-hidden="true" />
                    <span className="tally-n">{report.diff.newIssues.length}</span>
                    <span>New</span>
                  </span>
                )}
                {report.diff.worsened.length > 0 && (
                  <span className="tally-item">
                    <span className="glyph glyph-high" aria-hidden="true" />
                    <span className="tally-n">{report.diff.worsened.length}</span>
                    <span>Worsened</span>
                  </span>
                )}
                {report.diff.improved.length > 0 && (
                  <span className="tally-item">
                    <span className="glyph glyph-medium" aria-hidden="true" />
                    <span className="tally-n">{report.diff.improved.length}</span>
                    <span>Improved</span>
                  </span>
                )}
              </div>
              {report.diff.summary.length > 0 && (
                <ul className="changes">
                  {report.diff.summary.map((line, i) => (
                    <li key={i}>
                      <span className="glyph glyph-low" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
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

          {/* --------------------------------------------- findings */}
          <section id="findings" className="section">
            <div className="section-head">
              <h2>All findings</h2>
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
            <p className="section-note">
              Every check we ran, in full. The sections above already group these into what matters,
              this is the complete list underneath.
            </p>

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
