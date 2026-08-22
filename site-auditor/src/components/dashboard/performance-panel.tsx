'use client';

import { useEffect, useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import type { PsiResult } from '@/lib/audit/perf/psi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function PerformancePanel({ report }: { report: AuditReport }) {
  const [perf, setPerf] = useState<PsiResult | null>(report.perf ?? null);
  const [loading, setLoading] = useState(!report.perf);

  useEffect(() => {
    if (report.perf) return;
    let cancelled = false;
    fetch('/api/perf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: report.finalUrl, token: report.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setPerf(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [report.finalUrl, report.id, report.perf]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real speed, measured by Google</CardTitle>
        <CardDescription>Chrome UX Report field data and Lighthouse lab data for this URL.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div className="py-8 text-center text-sm text-muted-foreground">Fetching PageSpeed Insights…</div>}
        {!loading && (!perf || perf.status !== 'ok') && (
          <div className="py-8 text-center text-sm text-muted-foreground">{perf?.note ?? 'Field data is not available for this URL yet.'}</div>
        )}
        {!loading && perf && perf.status === 'ok' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Badge variant={perf.fieldVerdict === 'pass' ? 'success' : 'destructive'}>
                Core Web Vitals: {perf.fieldVerdict === 'pass' ? 'Pass' : 'Fail'}
              </Badge>
              {perf.fieldIsOrigin && <span className="text-xs text-muted-foreground">Origin-wide data (not page-specific)</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {perf.field.map((m) => (
                <div key={m.metric} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">
                    {m.metric} {m.core && <span className="text-primary">·core</span>}
                  </div>
                  <div
                    className={`text-lg font-semibold ${m.category === 'good' ? 'text-success' : m.category === 'needs-improvement' ? 'text-warning' : 'text-destructive'}`}
                  >
                    {m.display}
                  </div>
                </div>
              ))}
            </div>
            {perf.labScore !== null && (
              <div>
                <div className="mb-2 text-sm font-medium">Lab score: {perf.labScore}/100</div>
                {perf.opportunities.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {perf.opportunities.map((o, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>{o.title}</span>
                        <span className="text-muted-foreground">{(o.savingsMs / 1000).toFixed(1)}s potential savings</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
