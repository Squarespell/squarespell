import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreCard } from './score-card';
import { CategoryGrid } from './category-grid';
import { computeSeoScore, countBySeverity, scoreColorClass } from './dashboard-helpers';
import { AlertTriangleIcon, AlertOctagonIcon, LightbulbIcon, FileSearchIcon, SearchIcon, GaugeIcon } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`text-2xl font-semibold tabular-nums ${valueClassName ?? ''}`}>{value}</span>
        </div>
        <div className="rounded-md border p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function Overview({ report }: { report: AuditReport }) {
  const counts = countBySeverity(report.findings);
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const seoScore = computeSeoScore(report.score.categories);
  const perfCategory = report.score.categories.find((c) => c.id === 'perf');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Critical issues" value={counts.critical} icon={AlertOctagonIcon} valueClassName={counts.critical > 0 ? 'text-destructive' : ''} />
        <StatCard label="Warnings" value={counts.high} icon={AlertTriangleIcon} valueClassName={counts.high > 0 ? 'text-warning' : ''} />
        <StatCard label="Opportunities" value={oppReport?.all.length ?? 0} icon={LightbulbIcon} />
        <StatCard label="Pages analyzed" value={report.coverage.pagesCrawled} icon={FileSearchIcon} />
        <StatCard label="SEO score" value={seoScore} icon={SearchIcon} valueClassName={scoreColorClass(seoScore)} />
        <StatCard label="Performance score" value={perfCategory?.score ?? '—'} icon={GaugeIcon} valueClassName={perfCategory ? scoreColorClass(perfCategory.score) : ''} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ScoreCard report={report} />
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col justify-center gap-2 pt-2">
              <div className="text-sm font-medium text-muted-foreground">Summary</div>
              <div className="text-lg font-semibold">{report.summary?.headline ?? `${report.host} scored ${report.score.overall} out of 100`}</div>
              {report.summary?.narrative && <p className="text-sm text-muted-foreground">{report.summary.narrative}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Category breakdown</h3>
        <CategoryGrid report={report} />
      </div>
    </div>
  );
}
