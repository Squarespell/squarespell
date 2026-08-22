import type { AuditReport } from '@/lib/audit/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { GOAL_LABELS } from '@/lib/audit/opportunity';
import { QuickWins } from './quick-wins';

const TIER_LABEL: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'Fix first',
  high: 'Next',
  medium: 'Later',
  low: 'Later',
};

const TIER_BADGE: Record<'critical' | 'high' | 'medium' | 'low', 'destructive' | 'warning' | 'secondary'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'secondary',
};

export function GrowthPanel({ report }: { report: AuditReport }) {
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const growth = report.growthIntelligence;

  if (!oppReport && !growth) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Growth analysis is not available for this report.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {growth && (
        <Card>
          <CardHeader>
            <CardTitle>Growth summary</CardTitle>
            {report.businessContext?.goal && (
              <CardDescription>Prioritized for your goal: {GOAL_LABELS[report.businessContext.goal]}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{growth.growthSummary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick wins</CardTitle>
          <CardDescription>Low effort, high confidence — the fastest real gains available.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuickWins report={report} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority actions</CardTitle>
          <CardDescription>Ranked recommendations, each with the evidence behind it and the expected impact.</CardDescription>
        </CardHeader>
        <CardContent>
          {oppReport && oppReport.ranked.length > 0 ? (
            <Accordion type="multiple" defaultValue={[oppReport.ranked[0]?.id, oppReport.ranked[1]?.id].filter(Boolean) as string[]}>
              {oppReport.ranked.map((opp) => (
                <AccordionItem key={opp.id} value={opp.id}>
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 pr-4">
                      <Badge variant={TIER_BADGE[opp.priority]}>{TIER_LABEL[opp.priority]}</Badge>
                      {opp.isQuickWin && <Badge variant="outline">Quick win</Badge>}
                      <span className="text-left">{opp.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3 text-sm">
                      <p>{opp.summary}</p>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Expected impact</div>
                        <p className="text-sm">{opp.businessRelevance}</p>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Recommended action</div>
                        <p className="text-sm">
                          {opp.recommendedAction} <span className="text-muted-foreground">· {opp.effort} effort · {opp.owner}</span>
                        </p>
                      </div>
                      {opp.evidence.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Evidence</div>
                          <dl className="mt-1 flex flex-col gap-1">
                            {opp.evidence.map((e, i) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <dt className="shrink-0 text-muted-foreground">{e.label}:</dt>
                                <dd className="font-mono">{e.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">No structured opportunities for this report.</p>
          )}
        </CardContent>
      </Card>

      {report.doctor && report.doctor.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Website Doctor</CardTitle>
            <CardDescription>Diagnosis, cause and prescription for every opportunity above.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple">
              {report.doctor.map((d) => (
                <AccordionItem key={d.id} value={d.id}>
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 pr-4">
                      <Badge variant={TIER_BADGE[d.priority]}>{TIER_LABEL[d.priority]}</Badge>
                      <span className="text-left">{d.diagnosis}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2 text-sm">
                      <p>
                        <span className="font-medium">Impact: </span>
                        {d.impact}
                      </p>
                      <p>
                        <span className="font-medium">Prescription: </span>
                        {d.prescription}
                      </p>
                      {d.likelyContributingFactors.length > 0 && (
                        <p className="text-xs text-muted-foreground">Contributing: {d.likelyContributingFactors.join(', ')}</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
