'use client';

import { useState } from 'react';
import type { AuditReport, Finding } from '@/lib/audit/types';
import { CATEGORIES } from '@/lib/audit/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FINDINGS_TABLE_GROUPS, SEVERITY_BADGE_VARIANT, SEVERITY_LABEL } from './dashboard-helpers';

function FindingsTableBody({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No findings in this group — clean.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Finding</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Affected</TableHead>
          <TableHead>Effort</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="max-w-md whitespace-normal font-medium">{f.title}</TableCell>
            <TableCell className="text-muted-foreground">{CATEGORIES[f.category].label}</TableCell>
            <TableCell>
              <Badge variant={SEVERITY_BADGE_VARIANT[f.severity]}>{SEVERITY_LABEL[f.severity]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {f.affectedCount}/{f.applicableCount}
            </TableCell>
            <TableCell className="text-muted-foreground capitalize">{f.effort}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FindingsTable({ report }: { report: AuditReport }) {
  const [tab, setTab] = useState('critical');
  const groupedCategoryIds = new Set(FINDINGS_TABLE_GROUPS.flatMap((g) => g.categories));
  const otherFindings = report.findings.filter((f) => !groupedCategoryIds.has(f.category));
  const critical = report.findings.filter((f) => f.severity === 'critical');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="critical">Critical ({critical.length})</TabsTrigger>
            {FINDINGS_TABLE_GROUPS.map((g) => {
              const count = report.findings.filter((f) => g.categories.includes(f.category)).length;
              return (
                <TabsTrigger key={g.key} value={g.key}>
                  {g.label} ({count})
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="all">All findings ({report.findings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="critical">
            <FindingsTableBody findings={critical} />
          </TabsContent>
          {FINDINGS_TABLE_GROUPS.map((g) => (
            <TabsContent key={g.key} value={g.key}>
              <FindingsTableBody findings={report.findings.filter((f) => g.categories.includes(f.category))} />
            </TabsContent>
          ))}
          <TabsContent value="all">
            <FindingsTableBody findings={report.findings} />
          </TabsContent>
        </Tabs>
        {otherFindings.length > 0 && tab !== 'all' && tab !== 'critical' && (
          <p className="mt-3 text-xs text-muted-foreground">
            {otherFindings.length} additional finding{otherFindings.length === 1 ? '' : 's'} in Conversion, Squarespace Setup and Social
            Sharing — see &ldquo;All findings&rdquo;.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
