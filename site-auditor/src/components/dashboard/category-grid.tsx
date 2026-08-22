import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent } from '@/components/ui/card';
import { scoreColorClass, scoreBarClass } from './dashboard-helpers';

export function CategoryGrid({ report }: { report: AuditReport }) {
  const categories = [...report.score.categories].sort((a, b) => b.weight - a.weight);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{c.label}</span>
              <span className={`text-lg font-semibold tabular-nums ${scoreColorClass(c.score)}`}>{c.score}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${scoreBarClass(c.score)}`} style={{ width: `${c.score}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">
              {c.findingCount === 0 ? 'Clear' : `${c.findingCount} finding${c.findingCount === 1 ? '' : 's'}`}
              {c.criticalFailures > 0 && ` · ${c.criticalFailures} critical`}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
