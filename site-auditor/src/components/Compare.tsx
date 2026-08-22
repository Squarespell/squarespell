'use client';

import { useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import type { Comparison, CompetitiveDimension } from '@/lib/audit/compare';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { scoreColorClass } from '@/components/dashboard/dashboard-helpers';

// Mirrors `MAX_COMPETITORS` in lib/audit/compare.ts as a plain number rather
// than importing it: that module also exports `runComparison`, which pulls
// in the crawler and safeFetch (Node's http/https/dns/net/tls), and this is
// a client component, so a value import here would try to bundle all of
// that for the browser. `import type` above is erased at compile time and
// carries no such risk.
const MAX_COMPETITORS = 2;

/**
 * Competitor benchmarking, asked for rather than assumed. Logic unchanged
 * from the previous version -- only the JSX/styling was rebuilt on
 * shadcn/Tailwind for the new dashboard.
 */
export function Compare({ report }: { report: AuditReport }) {
  const suppliedCompetitors = report.businessContext?.competitorUrls;
  const [urls, setUrls] = useState<string[]>(
    suppliedCompetitors && suppliedCompetitors.length > 0 ? suppliedCompetitors.slice(0, MAX_COMPETITORS) : ['', '']
  );
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>(report.comparison ? 'done' : 'idle');
  const [result, setResult] = useState<Comparison | null>(report.comparison ?? null);
  const [error, setError] = useState('');
  const [showAllDimensions, setShowAllDimensions] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>How you compare</CardTitle>
        <CardDescription>{result ? 'Same checks, same method' : 'Optional — name up to two competitors'}</CardDescription>
      </CardHeader>
      <CardContent>
        {!result && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Name up to two competitors and we will run the same audit against them, then compare what each site
              does well. Squarespace specific checks are left out, so a competitor on another platform is judged on
              the things that compare fairly. It takes about half a minute.
            </p>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={run}>
              {urls.map((u, i) => (
                <input
                  key={i}
                  type="text"
                  value={u}
                  onChange={(e) => setUrls(urls.map((v, j) => (j === i ? e.target.value : v)))}
                  placeholder={i === 0 ? 'competitor.com' : 'another-competitor.com (optional)'}
                  aria-label={`Competitor ${i + 1}`}
                  disabled={state === 'running'}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ))}
              {urls.length < MAX_COMPETITORS && (
                <Button type="button" variant="outline" onClick={() => setUrls([...urls, ''])} disabled={state === 'running'}>
                  Add another
                </Button>
              )}
              <Button type="submit" disabled={!canRun || state === 'running'}>
                {state === 'running' ? 'Reading their sites…' : 'Compare'}
              </Button>
            </form>
            {!report.id && <p className="text-sm text-muted-foreground">This needs a saved report. Run the audit again if this one did not save.</p>}
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium">{result.verdict}</p>

            {result.intelligence ? (
              (() => {
                const intel = result.intelligence;
                const source = showAllDimensions ? intel.all : intel.top;
                const strengths = source.filter((d) => d.verdict === 'ahead');
                const gaps = source.filter((d) => d.verdict === 'behind' || d.verdict === 'competitor_advantage');
                const opportunities = source.filter((d) => d.verdict === 'open_opportunity');
                const buckets: Array<{ key: string; title: string; items: CompetitiveDimension[] }> = [
                  { key: 'strengths', title: 'You are stronger in', items: strengths },
                  { key: 'gaps', title: 'They appear stronger in', items: gaps },
                  { key: 'opportunities', title: 'Open opportunities', items: opportunities },
                ].filter((b) => b.items.length > 0);

                return (
                  <div className="flex flex-col gap-3 rounded-lg border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Your competitive position</div>
                    {buckets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nothing separates you from {intel.comparedAgainst.join(' and ')} by a margin worth acting on.
                      </p>
                    ) : (
                      buckets.map((b) => (
                        <div key={b.key} className="flex flex-col gap-1">
                          <div className="text-xs font-medium text-muted-foreground">{b.title}</div>
                          <ul className="flex flex-col gap-1">
                            {b.items.map((d) => (
                              <li key={d.key} className="flex items-start gap-2 text-sm">
                                <Badge
                                  variant={d.verdict === 'ahead' ? 'success' : d.verdict === 'open_opportunity' ? 'secondary' : 'warning'}
                                  className="mt-0.5"
                                >
                                  {d.verdict === 'ahead' ? 'Ahead' : d.verdict === 'open_opportunity' ? 'Open' : 'Behind'}
                                </Badge>
                                <span>{d.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                    {intel.all.length > intel.top.length && (
                      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setShowAllDimensions((v) => !v)}>
                        {showAllDimensions ? 'Show top comparisons only' : `View all ${intel.all.length} comparisons`}
                      </Button>
                    )}
                    {intel.coverageNote && <p className="text-xs text-muted-foreground">{intel.coverageNote}</p>}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">
                Competitor analysis could not be completed in enough detail to compare, though the score below is
                still based on what was read. See the table for why.
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Where they differ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{result.you.host}</TableCell>
                  <TableCell className="text-muted-foreground">you</TableCell>
                  <TableCell className={`font-semibold tabular-nums ${scoreColorClass(result.you.overall)}`}>{result.you.overall}</TableCell>
                  <TableCell />
                </TableRow>
                {result.competitors.map((c) => (
                  <TableRow key={c.url}>
                    <TableCell className="font-medium">{c.host}</TableCell>
                    <TableCell className="text-muted-foreground">{c.ok ? c.platform : 'not read'}</TableCell>
                    <TableCell className={`font-semibold tabular-nums ${c.ok ? scoreColorClass(c.overall) : 'text-muted-foreground'}`}>
                      {c.ok ? c.overall : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-sm">
                      {c.ok ? (
                        <>
                          {c.aheadOn.length > 0 && <span className="text-success">ahead on {c.aheadOn.join(', ')}</span>}
                          {c.aheadOn.length > 0 && c.behindOn.length > 0 && <span> · </span>}
                          {c.behindOn.length > 0 && <span className="text-destructive">behind on {c.behindOn.join(', ')}</span>}
                          {c.aheadOn.length === 0 && c.behindOn.length === 0 && <span className="text-muted-foreground">nothing separates you</span>}
                        </>
                      ) : (
                        <span className="text-destructive">{c.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Scored on the categories that mean the same thing on any platform, so this number is not the one at
              the top of your report. Their sites were read at{' '}
              {result.competitors.filter((c) => c.ok).map((c) => c.pagesRead).join(', ') || 'no'} pages each against
              your {report.coverage.pagesCrawled}, which is enough for a fair score and not enough for a full audit
              of them.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
