'use client';

import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { formatDate } from './dashboard-helpers';

const scoreChartConfig: ChartConfig = { score: { label: 'Score', color: 'var(--color-chart-1)' } };
const categoryChartConfig: ChartConfig = { delta: { label: 'Change', color: 'var(--color-chart-2)' } };

export function HistoryChart({ report }: { report: AuditReport }) {
  const history = report.history ?? [];
  const points = [...history].reverse().map((h) => ({ date: formatDate(h.at), score: h.score }));
  points.push({ date: 'Now', score: report.score.overall });

  const categoryChanges = report.diff?.categoryChanges ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Score history</CardTitle>
          <CardDescription>
            {history.length > 0 ? `${history.length} previous audit${history.length === 1 ? '' : 's'} of this site` : 'This is the first audit of this site — nothing to trend yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {points.length > 1 ? (
            <ChartContainer config={scoreChartConfig} className="h-[220px] w-full">
              <LineChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Run another audit later to see a trend line here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category movement</CardTitle>
          <CardDescription>
            {categoryChanges.length > 0
              ? `Change since your last audit, ${report.diff?.daysSincePrevious ?? '?'} day${report.diff?.daysSincePrevious === 1 ? '' : 's'} ago`
              : 'No previous audit to compare categories against yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryChanges.length > 0 ? (
            <ChartContainer config={categoryChartConfig} className="h-[220px] w-full">
              <BarChart data={categoryChanges} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={11} width={110} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="delta" radius={4}>
                  {categoryChanges.map((c) => (
                    <Cell key={c.id} fill={c.delta >= 0 ? 'var(--color-success)' : 'var(--color-destructive)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Category-by-category movement will appear once this site has been audited more than once.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ChangesSummary({ report }: { report: AuditReport }) {
  const diff = report.diff;
  if (!diff?.hasPrevious) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What changed since your last audit</CardTitle>
        <CardDescription>{diff.daysSincePrevious} day{diff.daysSincePrevious === 1 ? '' : 's'} since the previous audit</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {diff.resolvedIssues.length > 0 && <Badge variant="success">{diff.resolvedIssues.length} resolved</Badge>}
          {diff.newIssues.length > 0 && <Badge variant="destructive">{diff.newIssues.length} new</Badge>}
          {diff.worsened.length > 0 && <Badge variant="warning">{diff.worsened.length} worsened</Badge>}
          {diff.improved.length > 0 && <Badge variant="secondary">{diff.improved.length} improved</Badge>}
        </div>
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {diff.summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
