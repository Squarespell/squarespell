import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function QuestionsPanel({ report }: { report: AuditReport }) {
  const faq = report.faq;
  if (!faq?.ran) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Not enough signal to analyze customer questions for this site.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions your site doesn&rsquo;t answer</CardTitle>
        <CardDescription>
          {faq.answered.length} of {faq.gaps.length} common questions answered on the site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {faq.opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notable gaps found — the site answers the questions we checked for.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {faq.opportunities.map((q, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Badge variant={q.status === 'missing' ? 'destructive' : 'warning'} className="mt-0.5 shrink-0">
                  {q.status === 'missing' ? 'Missing' : 'Partial'}
                </Badge>
                <div className="flex flex-col gap-0.5">
                  <span>{q.question}</span>
                  {q.pageUrl && <span className="truncate text-xs text-muted-foreground">{q.pageUrl}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
