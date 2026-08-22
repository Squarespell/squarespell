import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { scoreColorClass, bandWord } from './dashboard-helpers';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

export function ScoreCard({ report }: { report: AuditReport }) {
  const { overall, grade } = report.score;
  const prev = report.history?.[0];
  const delta = prev ? overall - prev.score : null;

  return (
    <Card>
      <CardContent className="flex items-center gap-6 pt-2">
        <div className="flex flex-col items-center justify-center rounded-full border-4 border-muted p-1">
          <div className={`flex size-24 flex-col items-center justify-center rounded-full border-2 ${scoreColorClass(overall)}`} style={{ borderColor: 'currentColor' }}>
            <span className="text-3xl font-semibold tabular-nums">{overall}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-medium text-muted-foreground">Overall audit score</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Grade {grade}</span>
            <Badge variant="outline" className="capitalize">
              {bandWord(overall)}
            </Badge>
          </div>
          {delta !== null && (
            <div className={`flex items-center gap-1 text-xs font-medium ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
              {delta >= 0 ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
              {delta >= 0 ? '+' : ''}
              {delta} vs last audit
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
