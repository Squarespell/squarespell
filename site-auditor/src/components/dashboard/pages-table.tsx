import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function PagesTable({ report }: { report: AuditReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pages analyzed</CardTitle>
        <CardDescription>
          {report.coverage.pagesCrawled} of {report.coverage.pagesDiscovered} discovered pages crawled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Words</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.pageSummaries.map((p) => (
              <TableRow key={p.url}>
                <TableCell className="max-w-md whitespace-normal">
                  <div className="font-medium">{p.title || '(untitled)'}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.url}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status >= 200 && p.status < 300 ? 'success' : 'destructive'}>{p.status}</Badge>
                </TableCell>
                <TableCell>
                  {p.issues}
                  {p.criticalIssues > 0 && <span className="ml-1 text-xs text-destructive">({p.criticalIssues} critical)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.words}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
