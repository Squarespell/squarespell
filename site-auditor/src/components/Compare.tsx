'use client';

import { useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import type { Comparison } from '@/lib/audit/compare';

/**
 * Competitor benchmarking, asked for rather than assumed.
 *
 * Nobody's competitors can be guessed from their website, and a comparison
 * against the wrong three businesses is worse than none. So this is an empty
 * form until the reader fills it in, and it says plainly what it is about to do
 * before it does it.
 */
export function Compare({ report }: { report: AuditReport }) {
  // If competitors were named up front (Auditor.tsx's optional context
  // panel), start from those instead of a blank form. Still nothing is run
  // automatically: this only saves retyping what the visitor already told
  // us, the comparison itself still needs its own Compare click.
  const suppliedCompetitors = report.businessContext?.competitorUrls;
  const [urls, setUrls] = useState<string[]>(
    suppliedCompetitors && suppliedCompetitors.length > 0
      ? suppliedCompetitors.slice(0, 3)
      : ['', '']
  );
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>(
    report.comparison ? 'done' : 'idle'
  );
  const [result, setResult] = useState<Comparison | null>(report.comparison ?? null);
  const [error, setError] = useState('');

  const canRun = Boolean(report.id) && urls.some((u) => u.trim().length > 3);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setState('running');
    setError('');
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: report.id, competitors: urls.filter((u) => u.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'That did not work.');
      setResult(data);
      setState('done');
    } catch (err: any) {
      setError(err?.message || 'That did not work.');
      setState('error');
    }
  }

  const band = (n: number) =>
    n >= 80 ? 'var(--ok-700)' : n >= 60 ? 'var(--high-700)' : 'var(--crit-700)';

  return (
    <section id="compare" className="section">
      <div className="section-head">
        <h2>How you compare</h2>
        <span className="eyebrow">{result ? 'same checks, same method' : 'optional'}</span>
      </div>

      {!result && (
        <>
          <p className="section-note">
            Name up to three competitors and we will run the same audit against them. Squarespace
            specific checks are left out, so a competitor on another platform is judged on the
            things that compare fairly. It takes about half a minute.
          </p>
          <form className="cmp-form" onSubmit={run}>
            {urls.map((u, i) => (
              <input
                key={i}
                type="text"
                value={u}
                onChange={(e) => setUrls(urls.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={i === 0 ? 'competitor.com' : 'another-competitor.com (optional)'}
                aria-label={`Competitor ${i + 1}`}
                disabled={state === 'running'}
              />
            ))}
            {urls.length < 3 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setUrls([...urls, ''])}
                disabled={state === 'running'}
              >
                Add another
              </button>
            )}
            <button className="btn" type="submit" disabled={!canRun || state === 'running'}>
              {state === 'running' ? 'Reading their sites…' : 'Compare'}
            </button>
          </form>
          {!report.id && (
            <p className="section-note">
              This needs a saved report. Run the audit again if this one did not save.
            </p>
          )}
          {error && <div className="form-error">{error}</div>}
        </>
      )}

      {result && (
        <>
          <p className="cmp-verdict">{result.verdict}</p>
          <table className="cmp">
            <thead>
              <tr>
                <th>Site</th>
                <th>Platform</th>
                <th className="cmp-num">Score</th>
                <th>Where they differ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cmp-you">
                <td>{result.you.host}</td>
                <td>you</td>
                <td className="cmp-num num" style={{ color: band(result.you.overall) }}>
                  {result.you.overall}
                </td>
                <td />
              </tr>
              {result.competitors.map((c) => (
                <tr key={c.url}>
                  <td>{c.host}</td>
                  <td className="cmp-plat">{c.ok ? c.platform : 'not read'}</td>
                  <td className="cmp-num num" style={{ color: c.ok ? band(c.overall) : 'var(--ink-4)' }}>
                    {c.ok ? c.overall : '—'}
                  </td>
                  <td className="cmp-diff">
                    {c.ok ? (
                      <>
                        {c.aheadOn.length > 0 && (
                          <span className="cmp-ahead">ahead on {c.aheadOn.join(', ')}</span>
                        )}
                        {c.aheadOn.length > 0 && c.behindOn.length > 0 && <span> · </span>}
                        {c.behindOn.length > 0 && (
                          <span className="cmp-behind">behind on {c.behindOn.join(', ')}</span>
                        )}
                        {c.aheadOn.length === 0 && c.behindOn.length === 0 && (
                          <span className="cmp-behind">nothing separates you</span>
                        )}
                      </>
                    ) : (
                      <span className="cmp-behind">{c.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="section-note">
            Scored on the categories that mean the same thing on any platform, so this number is not
            the one at the top of your report. Their sites were read at{' '}
            {result.competitors.filter((c) => c.ok).map((c) => c.pagesRead).join(', ') || 'no'} pages
            each against your {report.coverage.pagesCrawled}, which is enough for a fair score and
            not enough for a full audit of them.
          </p>
        </>
      )}
    </section>
  );
}
