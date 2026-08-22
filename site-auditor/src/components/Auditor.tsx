'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AuditReport, BusinessContext, ProgressEvent, UserGoal } from '@/lib/audit/types';
import { Report } from './Report';
import { HeroSection } from '@/components/landing/hero-section';
import { TrustLogos } from '@/components/landing/trust-logos';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { SampleReportSection } from '@/components/landing/sample-report-section';
import { StatsSection } from '@/components/landing/stats-section';
import { CtaSection } from '@/components/landing/cta-section';

/**
 * Same dynamic-import boundary as Report.tsx: the in-progress screen is
 * also part of the shadcn/Tailwind dashboard now (per explicit request --
 * "one consistent premium SaaS dashboard design system" across the whole
 * post-audit experience), so it's lazy-loaded the same way, keeping
 * dashboard.css and shadcn out of the homepage's own bundle.
 */
const ProgressPanel = dynamic(() => import('@/components/dashboard/progress-panel').then((m) => m.ProgressPanel), {
  ssr: false,
  loading: () => <div className="frame" style={{ padding: 'var(--s20) 0', textAlign: 'center', color: 'var(--ink-3)' }}>Starting your audit…</div>,
});

type Phase = 'idle' | 'running' | 'done' | 'error';

export function track(name: string, props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.('/api/event', new Blob([JSON.stringify({ name, props })], { type: 'application/json' }));
  } catch {
    /* analytics is never load bearing */
  }
}

function hostFrom(input: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return input;
  }
}

export function Auditor({
  initialReport,
  children,
}: {
  initialReport?: AuditReport;
  /** The written part of the landing page, rendered on the server, shown while idle. */
  children?: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>(initialReport ? 'done' : 'idle');
  const [url, setUrl] = useState('');
  const [report, setReport] = useState<AuditReport | null>(initialReport ?? null);
  const [stage, setStage] = useState('validate');
  const [pct, setPct] = useState(0);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<{ message: string; hint?: string; code?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Optional pre-audit context (Part 3 of the personalization brief). Every
     one of these stays empty unless the visitor deliberately opens the panel
     and types into it, so the request body sent below is byte-identical to
     the URL-only path when they don't. */
  const [showContext, setShowContext] = useState(false);
  const [bizDescription, setBizDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState<UserGoal | ''>('');
  const [competitor1, setCompetitor1] = useState('');
  const [competitor2, setCompetitor2] = useState('');

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setReport(null);
    setError(null);
    setPct(0);
    setDetail('');
    setUrl('');
    setShowContext(false);
    setBizDescription('');
    setAudience('');
    setGoal('');
    setCompetitor1('');
    setCompetitor2('');
    window.history.replaceState(null, '', '/');
  }, []);

  const start = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = url.trim();
      if (!value) {
        setError({ message: 'Enter the address of the Squarespace site you want to audit.' });
        setPhase('idle');
        return;
      }

      setPhase('running');
      setError(null);
      setPct(0);
      setStage('validate');
      setDetail('');

      const controller = new AbortController();
      abortRef.current = controller;

      const utm: Record<string, string> = {};
      const params = new URLSearchParams(window.location.search);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const v = params.get(k);
        if (v) utm[k] = v;
      }

      let sawTerminal = false;

      // Only present in the request body when the visitor actually opened
      // the panel and typed something. An untouched panel, or one that was
      // never opened, sends undefined here, so the request is unchanged from
      // the URL-only path — the server already treats a missing
      // businessContext as "no context supplied" throughout the pipeline.
      const businessContext: BusinessContext | undefined = (() => {
        const ctx: BusinessContext = {};
        if (bizDescription.trim()) ctx.businessDescription = bizDescription.trim();
        if (audience.trim()) ctx.targetAudience = audience.trim();
        if (goal) ctx.goal = goal;
        const competitorUrls = [competitor1, competitor2].map((u) => u.trim()).filter(Boolean);
        if (competitorUrls.length) ctx.competitorUrls = competitorUrls;
        return Object.keys(ctx).length ? ctx : undefined;
      })();

      if (businessContext) {
        track('context_provided', {
          hasDescription: Boolean(businessContext.businessDescription),
          hasAudience: Boolean(businessContext.targetAudience),
          hasGoal: Boolean(businessContext.goal),
          competitorCount: businessContext.competitorUrls?.length ?? 0,
        });
      }

      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            url: value,
            utm,
            referrer: document.referrer || undefined,
            businessContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setError({ message: data.error, code: data.code });
          setPhase('error');
          return;
        }
        if (!res.body) throw new Error('No response from the server.');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: ProgressEvent & { hint?: string };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.type === 'stage') {
              setStage(event.stage);
              setPct(event.pct);
            } else if (event.type === 'detail') {
              setDetail(event.message);
            } else if (event.type === 'error') {
              sawTerminal = true;
              setError({ message: event.message, hint: (event as any).hint, code: event.code });
              setPhase('error');
              return;
            } else if (event.type === 'done') {
              sawTerminal = true;
              setReport(event.report);
              setPct(100);
              setPhase('done');
              if (event.report.id) {
                window.history.replaceState(null, '', `/r/${event.report.id}`);
              }
              return;
            }
          }
        }

        // The stream closed without a done/error event.
        if (!sawTerminal) {
          setError({ message: 'The audit stopped unexpectedly. Please try again.' });
          setPhase('error');
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError({ message: 'We lost the connection while auditing. Please try again.' });
        setPhase('error');
      }
    },
    [url, bizDescription, audience, goal, competitor1, competitor2]
  );

  /* ---------------------------------------------------------- report */
  if (phase === 'done' && report) {
    return <Report report={report} onReset={reset} />;
  }

  /* -------------------------------------------------------- progress */
  if (phase === 'running') {
    return <ProgressPanel host={hostFrom(url)} pct={pct} stage={stage} detail={detail} />;
  }

  /* ----------------------------------------------------------- entry */
  return (
    <>
      <HeroSection
        url={url}
        onUrlChange={setUrl}
        onSubmit={start}
        error={error}
        showContext={showContext}
        onToggleContext={() => {
          const next = !showContext;
          setShowContext(next);
          if (next) track('context_panel_opened', {});
        }}
        bizDescription={bizDescription}
        onBizDescriptionChange={setBizDescription}
        audience={audience}
        onAudienceChange={setAudience}
        goal={goal}
        onGoalChange={setGoal}
        competitor1={competitor1}
        onCompetitor1Change={setCompetitor1}
        competitor2={competitor2}
        onCompetitor2Change={setCompetitor2}
      />
      <TrustLogos />
      <HowItWorksSection />
      <FeaturesSection />
      <SampleReportSection />
      <StatsSection />
      <CtaSection />
      {children}
    </>
  );
}
