'use client';

import '@/app/dashboard.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckIcon, LoaderCircleIcon } from 'lucide-react';

/**
 * Same ten stages as before, same host/pct/stage/detail props driven
 * entirely by Auditor.tsx's streaming fetch handler -- only the
 * presentation changed, from the plain-CSS .progress/.step markup to
 * shadcn Card + Progress.
 */
export const STAGES = [
  { key: 'validate', label: 'Checking the address' },
  { key: 'detect', label: 'Detecting Squarespace' },
  { key: 'discover', label: 'Reading robots.txt and sitemap' },
  { key: 'crawl', label: 'Crawling your pages' },
  { key: 'extract', label: 'Extracting page data' },
  { key: 'assets', label: 'Measuring images and scripts' },
  { key: 'checks', label: 'Running the audit checks' },
  { key: 'score', label: 'Calculating your score' },
  { key: 'ai', label: 'Writing your recommendations' },
  { key: 'save', label: 'Finishing your report' },
];

export function ProgressPanel({
  host,
  pct,
  stage,
  detail,
}: {
  host: string;
  pct: number;
  stage: string;
  detail: string;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="dashboard-root flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Auditing {host}</CardTitle>
          <div className="text-sm text-muted-foreground">{pct}% complete</div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={pct} />
          <ul className="flex flex-col gap-0.5">
            {STAGES.map((s, i) => {
              const isPast = i < currentIndex;
              const isOn = i === currentIndex;
              return (
                <li
                  key={s.key}
                  className={cnRow(isOn)}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums text-muted-foreground data-[state=past]:border-primary data-[state=past]:bg-primary data-[state=past]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:text-primary"
                    data-state={isPast ? 'past' : isOn ? 'on' : 'pending'}
                  >
                    {isPast ? <CheckIcon className="size-3" /> : isOn ? <LoaderCircleIcon className="size-3 animate-spin" /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={isOn ? 'font-medium text-foreground' : isPast ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
            {detail}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cnRow(isOn: boolean) {
  return `flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${isOn ? 'bg-accent' : ''}`;
}
