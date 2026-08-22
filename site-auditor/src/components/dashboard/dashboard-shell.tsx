'use client';

import '@/app/dashboard.css';
import { useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection } from './sidebar';
import { DashboardHeader } from './header';
import { Overview } from './overview';
import { FindingsTable } from './findings-table';
import { GrowthPanel } from './growth-panel';
import { PerformancePanel } from './performance-panel';
import { HistoryChart, ChangesSummary } from './history-chart';
import { PagesTable } from './pages-table';
import { QuestionsPanel } from './questions-panel';
import { Compare } from '@/components/Compare';
import { LeadCapture } from '@/components/LeadCapture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DashboardShell({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const [section, setSection] = useState<DashboardSection>('overview');
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  // Deduped: multiple top opportunities commonly point at the same
  // Squarespell service (e.g. three performance findings all recommending
  // "Site Speed Optimization"), and without deduping, LeadCapture's copy
  // repeated the same service name back-to-back.
  const relevantServices = oppReport
    ? Array.from(new Set(oppReport.top.map((o) => o.squarespellService).filter((s): s is string => Boolean(s))))
    : report.opportunity.services;

  return (
    <div className="dashboard-root">
    <SidebarProvider>
      <DashboardSidebar report={report} active={section} onSelect={setSection} />
      <SidebarInset>
        <DashboardHeader report={report} onReset={onReset} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {section === 'overview' && (
            <>
              <Overview report={report} />
              {(report.strengths.length > 0 || oppReport) && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {oppReport && oppReport.top.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Your biggest opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="flex flex-col gap-2">
                          {oppReport.top.slice(0, 3).map((o, i) => (
                            <li key={o.id} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground">{i + 1}.</span>
                              <span>{o.title}</span>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}
                  {report.strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>What&rsquo;s already working</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="flex flex-col gap-2">
                          {report.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Badge variant="success" className="mt-0.5 shrink-0">
                                OK
                              </Badge>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              <SquarespaceFacts report={report} />
            </>
          )}

          {section === 'findings' && <FindingsTable report={report} />}
          {section === 'growth' && <GrowthPanel report={report} />}
          {section === 'performance' && <PerformancePanel report={report} />}
          {section === 'competitors' && <Compare report={report} />}
          {section === 'history' && (
            <div className="flex flex-col gap-4">
              <HistoryChart report={report} />
              <ChangesSummary report={report} />
              <PagesTable report={report} />
            </div>
          )}
          {section === 'questions' && <QuestionsPanel report={report} />}
          {section === 'help' && <LeadCapture report={report} services={relevantServices} />}
        </div>
        <footer className="border-t px-4 py-4 text-xs text-muted-foreground md:px-6">
          Method: crawled {report.coverage.pagesCrawled} of {report.coverage.pagesDiscovered} discovered pages, applied{' '}
          {report.coverage.checksApplicable} of {report.coverage.checksRun} checks, probed {report.coverage.imagesProbed} images and{' '}
          {report.coverage.sitemapUrls} sitemap entries.{' '}
          {report.coverage.aiUsed
            ? 'Written explanations were generated from measured findings only.'
            : 'Written explanations were generated directly from findings, without an AI layer.'}
        </footer>
      </SidebarInset>
    </SidebarProvider>
    </div>
  );
}

function SquarespaceFacts({ report }: { report: AuditReport }) {
  const sq = report.squarespace;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Squarespace configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label="Version" value={sq.version} />
        <Fact label="Editor" value={sq.editor.ratio !== null ? `${Math.round(sq.editor.ratio * 100)}% Fluid` : 'Unknown'} />
        {sq.templateFamily && <Fact label="Template" value={sq.templateFamily} />}
        <Fact label="Detection confidence" value={`${Math.round(sq.confidence * 100)}% (${sq.signals.length} signals)`} />
        {sq.features.commerce && <Fact label="Commerce" value="Enabled" />}
        {sq.features.scheduling && <Fact label="Scheduling" value="Enabled" />}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
