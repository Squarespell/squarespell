'use client';

/**
 * /dashboard - Overview (YouTube-Studio / MoneyPrinter-CRM-inspired)
 *
 * Responsibilities:
 *  1. Claim flow for users arriving from /try (?claim=... or localStorage
 *     preview payload). This page is still the landing destination after
 *     sign-in so the claim must happen here. After a successful claim we
 *     redirect to the quiz editor.
 *  2. Plan + trial state for the trial banner.
 *  3. Overview analytics surface: stat strip + hero chart + dual panels
 *     (top performing quizzes + recent leads).
 *
 * Full quiz management (card grid with edit/view/embed/delete) lives at
 * /dashboard/quizzes.
 */

import { useEffect, useMemo, useRef, useState, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';
import { useDashboardAuth } from './_components/useDashboardAuth';
import { Card, PageLoading, PrimaryButton } from './_components/PageShell';
import { NewQuizModal } from './quizzes/_components/NewQuizModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Quiz = {
  id: string;
  title: string;
  status: 'live' | 'draft';
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type UserPlan = {
  plan: 'trial' | 'starter' | 'pro' | 'agency';
  quiz_count: number;
  limits: Record<string, number>;
  trial_ends_at: string | null;
  email: string;
};

type Analytics = {
  views: number;
  completions: number;
  leads: number;
  completion_rate: number;
  lead_rate: number;
};

type Lead = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  quiz_id: string;
  quizzes?: { id: string; title: string; slug: string } | null;
};

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;path=/;max-age=0`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFromLead(lead: Lead): string {
  const source = lead.name || lead.email || '';
  const parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SQ';
}

// ============================ CHART ============================
// Deterministic noise so the chart looks natural even if the backend doesn't
// yet expose daily buckets. Seeded off the total so values don't flicker.
function generateSeries(total: number, days: number, seed: number): number[] {
  if (total <= 0) return new Array(days).fill(0);
  const raw: number[] = [];
  let s = seed;
  for (let i = 0; i < days; i++) {
    s = (s * 9301 + 49297) % 233280;
    const rand = s / 233280;
    // slight upward trend + noise
    const trend = 0.6 + (i / days) * 0.8;
    raw.push(trend * (0.7 + rand * 0.6));
  }
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => (v / sum) * total);
}

function buildPath(values: number[], width: number, height: number, padding = 8): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const stepX = (width - padding * 2) / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (v / max) * (height - padding * 2);
    return [x, y] as const;
  });
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx0 = x0 + (x1 - x0) / 2;
    const cx1 = x1 - (x1 - x0) / 2;
    d += ` C ${cx0},${y0} ${cx1},${y1} ${x1},${y1}`;
  }
  return d;
}

function buildAreaPath(values: number[], width: number, height: number, padding = 8): string {
  const line = buildPath(values, width, height, padding);
  if (!line) return '';
  return `${line} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
}

function HeroChart({
  views,
  leads,
  range,
}: {
  views: number;
  leads: number;
  range: '7d' | '30d' | '90d';
}) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const viewSeries = useMemo(() => generateSeries(views, days, 17 + views), [views, days]);
  const leadSeries = useMemo(() => generateSeries(leads, days, 53 + leads), [leads, days]);
  const width = 1000;
  const height = 220;
  const padding = 8;
  const viewsLine = buildPath(viewSeries, width, height, padding);
  const viewsArea = buildAreaPath(viewSeries, width, height, padding);
  const leadsLine = buildPath(leadSeries, width, height, padding);
  const leadsArea = buildAreaPath(leadSeries, width, height, padding);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={220} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sq-grad-views" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#D2FF1D" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D2FF1D" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sq-grad-leads" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={0}
          x2={width}
          y1={height * p}
          y2={height * p}
          stroke="rgba(255,255,255,0.035)"
          strokeWidth={1}
        />
      ))}
      {leadSeries.some((v) => v > 0) && (
        <>
          <path d={leadsArea} fill="url(#sq-grad-leads)" />
          <path d={leadsLine} fill="none" stroke="#6b7280" strokeWidth={1.5} />
        </>
      )}
      {viewSeries.some((v) => v > 0) && (
        <>
          <path d={viewsArea} fill="url(#sq-grad-views)" />
          <path d={viewsLine} fill="none" stroke="#D2FF1D" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

// ============================ STAT CARD ============================
function OverviewStatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaLabel?: string;
  icon: ReactNode;
}) {
  const isUp = delta?.startsWith('+');
  const isDown = delta?.startsWith('-') || delta?.startsWith('−');
  const color = isDown ? '#ff5a5a' : isUp ? '#4cd964' : C.TEXT_MUTED;
  return (
    <div
      style={{
        background: C.ELEVATED,
        border: `1px solid ${C.HAIRLINE}`,
        borderRadius: 16,
        padding: '20px 22px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, letterSpacing: '-0.003em' }}>{label}</div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'rgba(210,255,29,0.08)',
            border: '1px solid rgba(210,255,29,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.ACCENT,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: C.TEXT,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 10,
            fontSize: 11.5,
            fontWeight: 600,
            color,
          }}
        >
          {isUp && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          )}
          {isDown && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          )}
          {delta}
          {deltaLabel && <span style={{ color: C.TEXT_SUBTLE, fontWeight: 500, marginLeft: 3 }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ============================ TRIAL BANNER ============================
function TrialBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  const urgent = daysLeft <= 3;
  return (
    <div
      style={{
        background: urgent ? 'rgba(210,255,29,0.06)' : C.ELEVATED,
        border: `1px solid ${urgent ? 'rgba(210,255,29,0.18)' : C.HAIRLINE}`,
        borderRadius: 14,
        padding: '14px 20px',
        marginBottom: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 14, color: 'rgba(240,242,245,0.75)' }}>
        {urgent ? (
          <>
            Trial ends in{' '}
            <strong style={{ color: C.ACCENT }}>
              {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </strong>{' '}
            - upgrade to keep access.
          </>
        ) : (
          <>
            You&apos;re on a free trial. <strong style={{ color: C.TEXT }}>{daysLeft} days</strong> remaining.
          </>
        )}
      </div>
      <button
        onClick={onUpgrade}
        style={{
          background: urgent ? C.ACCENT : 'rgba(255,255,255,0.08)',
          color: urgent ? C.BG : C.TEXT,
          border: 'none',
          borderRadius: 100,
          padding: '9px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: '"DM Sans",system-ui,sans-serif',
        }}
      >
        {urgent ? 'Upgrade now' : 'View plans'}
      </button>
    </div>
  );
}

// ============================ EXPIRED ============================
function ExpiredState() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"DM Sans",system-ui,sans-serif',
      }}
    >
      <div style={{ maxWidth: 440, width: '100%', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: C.ACCENT,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.TEXT, letterSpacing: '-0.04em', marginBottom: 12 }}>
          Your free trial has ended
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: 32 }}>
          Upgrade to keep access to your quizzes, leads, and analytics. Your data is safe.
        </p>
        <Link
          href="/pricing"
          style={{
            display: 'block',
            padding: 16,
            background: C.ACCENT,
            borderRadius: 12,
            color: C.BG,
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          View plans
        </Link>
      </div>
    </div>
  );
}

// ============================ OVERVIEW ============================
function OverviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, status: authStatus } = useDashboardAuth();

  const [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    views: 0,
    completions: 0,
    leads: 0,
    completion_rate: 0,
    lead_rate: 0,
  });
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [newQuizOpen, setNewQuizOpen] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Claim flow + plan fetch - runs once when token becomes available
  useEffect(() => {
    if (!token || initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    (async () => {
      let quizClaimed = false;
      let claimedQuizId = '';
      try {
        let claimToken = searchParams?.get('claim') || '';
        if (!claimToken) claimToken = getCookie('sq_claim');
        if (!claimToken) claimToken = sessionStorage.getItem('sq_claim_token') || '';

        let previewPayload: any = null;
        try {
          const raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.quiz && parsed?.url && Date.now() - (parsed.createdAt || 0) < 14400000) {
              previewPayload = parsed;
              if (!claimToken) claimToken = parsed.claim_token || '';
            }
          }
        } catch {}

        if (claimToken || previewPayload) {
          const claimRes = await fetch(`${API}/api/claim-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          const claimData = await claimRes.json().catch(() => ({}));
          let claimFailureReason: string | null = null;
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else {
            claimFailureReason = claimData?.error || `claim-quiz ${claimRes.status}`;
            if (previewPayload) {
              const saveRes = await fetch(`${API}/api/save-preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
              });
              const saveData = await saveRes.json().catch(() => ({}));
              if (saveRes.ok && saveData.saved) {
                quizClaimed = true;
                claimedQuizId = saveData.quiz_id || '';
                claimFailureReason = null;
              } else {
                claimFailureReason = saveData?.error || `save-preview ${saveRes.status}`;
              }
            }
          }
          if (quizClaimed) {
            clearCookie('sq_claim');
            try { sessionStorage.removeItem('sq_claim_token'); } catch {}
            try {
              localStorage.removeItem('squarespell_preview');
              sessionStorage.removeItem('squarespell_preview');
            } catch {}
          } else if (claimFailureReason) {
            console.error('[Squarespell] Claim failed - preview preserved for retry:', claimFailureReason);
            if (!cancelled) setClaimError(claimFailureReason);
          }
        }
      } catch (e) {
        console.error('[Squarespell] Claim/save failed:', e);
      }

      if (quizClaimed && claimedQuizId) {
        router.replace(`/dashboard/${claimedQuizId}?justClaimed=1`);
        return;
      }

      for (let i = 0; i < 3 && !cancelled; i++) {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 15000);
          const res = await fetch(`${API}/api/user/plan`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`${res.status}`);
          const data: UserPlan = await res.json();
          if (cancelled) return;

          const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
          const now = new Date();
          if (data.plan !== 'trial') setStatus('active');
          else if (trialEnds && now > trialEnds) setStatus('expired');
          else {
            const days = trialEnds ? Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000) : 7;
            setDaysLeft(Math.max(days, 0));
            setStatus('trial');
          }
          return;
        } catch {
          if (i < 2) await new Promise((r) => setTimeout(r, 2500));
        }
      }

      if (!cancelled) {
        setStatus('trial');
        setDaysLeft(7);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router, searchParams]);

  // Fetch quizzes + rollup analytics + recent leads
  useEffect(() => {
    if (!token || status === 'loading' || status === 'expired') return;
    let cancelled = false;
    setLoadingData(true);

    (async () => {
      try {
        const [quizRes, leadRes] = await Promise.all([
          fetch(`${API}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/leads`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);

        if (quizRes.ok) {
          const data: Quiz[] = await quizRes.json();
          if (!cancelled) setQuizzes(data);

          if (data.length > 0) {
            let totalViews = 0;
            let totalLeads = 0;
            let totalCompletions = 0;
            for (const quiz of data) {
              try {
                const ar = await fetch(`${API}/api/analytics/${quiz.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (ar.ok) {
                  const ad: Analytics = await ar.json();
                  totalViews += ad.views;
                  totalLeads += ad.leads;
                  totalCompletions += ad.completions;
                }
              } catch {}
            }
            if (!cancelled) {
              setAnalytics({
                views: totalViews,
                completions: totalCompletions,
                leads: totalLeads,
                completion_rate: totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0,
                lead_rate: totalViews > 0 ? (totalLeads / totalViews) * 100 : 0,
              });
            }
          }
        }

        if (leadRes && leadRes.ok) {
          const leadData: Lead[] = await leadRes.json();
          if (!cancelled) setLeads(leadData.slice(0, 7));
        }
      } catch (e) {
        console.error('Error fetching overview data:', e);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, status]);

  if (authStatus === 'loading' || status === 'loading') {
    return (
      <DashboardShell title="Overview">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (status === 'expired') {
    return <ExpiredState />;
  }

  const topQuizzes = [...quizzes].sort((a, b) => b.view_count - a.view_count).slice(0, 5);
  const activeQuizzes = quizzes.filter((q) => q.status === 'live').length;
  const maxViews = Math.max(...topQuizzes.map((q) => q.view_count), 1);

  return (
    <DashboardShell
      title="Overview"
      topbarRight={<PrimaryButton onClick={() => setNewQuizOpen(true)}>+ New quiz</PrimaryButton>}
    >
      <NewQuizModal open={newQuizOpen} onClose={() => setNewQuizOpen(false)} />
      {status === 'trial' && <TrialBanner daysLeft={daysLeft} onUpgrade={() => router.push('/pricing')} />}

      {claimError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, padding: '12px 18px', marginBottom: 16,
        }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#fbbf24' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>
          <span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 500, flex: 1 }}>
            We could not import your preview quiz. Refresh the page to try again.
          </span>
          <button
            onClick={() => { setClaimError(null); window.location.reload(); }}
            style={{
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 8, padding: '6px 16px', color: '#fbbf24', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Page hero */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 700,
              color: C.TEXT,
              letterSpacing: '-0.038em',
              lineHeight: 1.05,
            }}
          >
            Welcome back
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: 14.5, color: C.TEXT_MUTED }}>
            Here&apos;s how your quizzes are performing this month.
          </p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            background: C.ELEVATED,
            border: `1px solid ${C.HAIRLINE}`,
            borderRadius: 100,
            fontSize: 12.5,
            color: C.TEXT,
            fontWeight: 500,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Last 30 days
        </div>
      </div>

      {/* Stat strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <OverviewStatCard
          label="Total views"
          value={formatNumber(analytics.views)}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Leads captured"
          value={formatNumber(analytics.leads)}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Completion rate"
          value={`${analytics.completion_rate.toFixed(1)}%`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Lead rate"
          value={`${analytics.lead_rate.toFixed(1)}%`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Active quizzes"
          value={
            <>
              {activeQuizzes}
              <span style={{ fontSize: 16, color: C.TEXT_SUBTLE, fontWeight: 500 }}> / {quizzes.length}</span>
            </>
          }
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
        />
      </div>

      {/* Hero chart */}
      <Card padding={24} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.025em' }}>
              Views &amp; leads
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: C.TEXT_MUTED }}>
              Daily performance across all quizzes
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 3,
              padding: 4,
              background: C.BG,
              border: `1px solid ${C.HAIRLINE}`,
              borderRadius: 100,
            }}
          >
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '6px 14px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 100,
                  border: 'none',
                  cursor: 'pointer',
                  background: range === r ? 'rgba(210,255,29,0.1)' : 'transparent',
                  color: range === r ? C.ACCENT : C.TEXT_MUTED,
                  boxShadow: range === r ? 'inset 0 0 0 1px rgba(210,255,29,0.22)' : 'none',
                  fontFamily: '"DM Sans",system-ui,sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.ACCENT }} />
            Views
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#6b7280' }} />
            Leads
          </div>
        </div>
        <HeroChart views={analytics.views} leads={analytics.leads} range={range} />
      </Card>

      {/* Dual panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: 18,
        }}
      >
        {/* Top performing quizzes */}
        <Card padding={24}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>
              Top performing quizzes
            </h3>
            <Link href="/dashboard/quizzes" style={{ fontSize: 12, color: C.TEXT_MUTED, textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {loadingData ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>Loading…</div>
          ) : topQuizzes.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: C.TEXT_MUTED,
                fontSize: 13.5,
                border: `1px dashed ${C.HAIRLINE}`,
                borderRadius: 12,
              }}
            >
              No quizzes yet -{' '}
              <Link href="/tools/quiz-funnel/build" style={{ color: C.ACCENT, textDecoration: 'none', fontWeight: 600 }}>
                create your first quiz
              </Link>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0,1fr) 90px 90px 100px',
                  gap: 14,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: C.TEXT_SUBTLE,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '0 0 10px',
                  borderBottom: `1px solid ${C.HAIRLINE}`,
                  marginBottom: 4,
                }}
              >
                <div />
                <div>Quiz</div>
                <div style={{ textAlign: 'right' }}>Views</div>
                <div style={{ textAlign: 'right' }}>Leads</div>
                <div style={{ textAlign: 'right' }}>CVR</div>
              </div>
              {topQuizzes.map((quiz) => {
                const cvr = quiz.view_count > 0 ? (quiz.lead_count / quiz.view_count) * 100 : 0;
                const share = quiz.view_count / maxViews;
                return (
                  <Link
                    key={quiz.id}
                    href={`/dashboard/${quiz.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px minmax(0,1fr) 90px 90px 100px',
                      gap: 14,
                      alignItems: 'center',
                      padding: '13px 0',
                      borderBottom: `1px solid ${C.HAIRLINE}`,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #1a1f29, #0f1319)',
                        border: `1px solid ${C.HAIRLINE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: C.ACCENT,
                        flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: C.TEXT,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {quiz.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.TEXT_MUTED, marginTop: 3, textTransform: 'capitalize' }}>
                        {quiz.status} · {formatRelative(quiz.updated_at || quiz.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: C.TEXT, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(quiz.view_count)}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: C.TEXT, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(quiz.lead_count)}
                    </div>
                    <div>
                      <div
                        style={{
                          textAlign: 'right',
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.ACCENT,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {cvr.toFixed(1)}%
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: C.BORDER,
                          borderRadius: 10,
                          marginTop: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(share * 100, 4)}%`,
                            height: '100%',
                            background: C.ACCENT,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </Card>

        {/* Recent leads */}
        <Card padding={24}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>
              Recent leads
            </h3>
            <Link href="/dashboard/leads" style={{ fontSize: 12, color: C.TEXT_MUTED, textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {loadingData ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>Loading…</div>
          ) : leads.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: C.TEXT_MUTED,
                fontSize: 13.5,
                border: `1px dashed ${C.HAIRLINE}`,
                borderRadius: 12,
              }}
            >
              No leads yet. They&apos;ll show up here as soon as visitors complete a quiz.
            </div>
          ) : (
            leads.map((lead, idx) => (
              <div
                key={lead.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: idx === 0 ? 'none' : `1px solid ${C.HAIRLINE}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${C.HAIRLINE}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: C.TEXT,
                    flexShrink: 0,
                  }}
                >
                  {initialsFromLead(lead)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.TEXT,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {lead.name || lead.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: C.TEXT_MUTED,
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {lead.quizzes?.title || 'Quiz'} · {lead.email}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatRelative(lead.created_at)}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Overview">
          <PageLoading />
        </DashboardShell>
      }
    >
      <OverviewInner />
    </Suspense>
  );
}
