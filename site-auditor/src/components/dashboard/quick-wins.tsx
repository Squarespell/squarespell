import type { AuditReport } from '@/lib/audit/types';

export function QuickWins({ report }: { report: AuditReport }) {
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const quickWins = oppReport?.quickWins ?? [];

  if (quickWins.length === 0) {
    return <p className="text-sm text-muted-foreground">No quick wins identified — remaining opportunities need more effort.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {quickWins.map((qw) => (
        <div key={qw.id} className="rounded-lg border p-3">
          <div className="text-sm font-medium">{qw.title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{qw.recommendedAction}</p>
        </div>
      ))}
    </div>
  );
}
