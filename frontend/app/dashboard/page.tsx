'use client';

/**
 * /dashboard — Quizzes list (primary landing page after sign-in).
 *
 * Responsibilities:
 *  1. Quiz claim flow for users arriving from /try (?claim=... or localStorage
 *     preview payload). Preserves all retry + fallback logic from the original
 *     single-file dashboard — this is the ONLY page that runs that logic, and
 *     all other dashboard pages assume the claim has already happened.
 *  2. Fetches the user plan + trial state for the banner.
 *  3. Shows the quiz list + rollup stats.
 *
 * Visual chrome is delegated to DashboardShell so the sidebar + topbar stay
 * consistent with every other dashboard page.
 */

import { useEffect, useRef, useState, Suspense } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';
import { useDashboardAuth } from './_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from './_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function TrialBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  const urgent = daysLeft <= 3;
  return (
    <div
      style={{
        background: urgent ? 'rgba(210,255,29,0.06)' : C.ELEVATED,
        border: `1px solid ${urgent ? 'rgba(210,255,29,0.18)' : C.BORDER}`,
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
            — upgrade to keep access.
          </>
        ) : (
          <>
            You're on a free trial. <strong style={{ color: C.TEXT }}>{daysLeft} days</strong> remaining.
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 36,
          }}
        >
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
        <p
          style={{
            fontSize: 15,
            color: 'rgba(240,242,245,0.5)',
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
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

function EmbedModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="https://app.squarespell.com/embed.js" data-quiz="${slug}"></script>`;
  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        fontFamily: '"DM Sans",system-ui,sans-serif',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.ELEVATED,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 16,
          padding: 32,
          maxWidth: 520,
          width: '90%',
        }}
      >
        <h2 style={{ margin: '0 0 10px 0', fontSize: 20, fontWeight: 700, color: C.TEXT }}>Embed this quiz</h2>
        <p style={{ fontSize: 14, color: C.TEXT_MUTED, marginBottom: 18 }}>
          Paste this snippet into any page on your Squarespace site.
        </p>
        <div
          style={{
            background: C.SURFACE,
            border: `1px solid ${C.BORDER}`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            fontFamily: 'monospace',
            fontSize: 12.5,
            color: C.TEXT_MUTED,
            overflowX: 'auto',
            wordBreak: 'break-all',
          }}
        >
          {embedCode}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <PrimaryButton onClick={handleCopy}>{copied ? 'Copied!' : 'Copy code'}</PrimaryButton>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}

function QuizzesInner() {
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, status: authStatus } = useDashboardAuth();

  const [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    views: 0,
    completions: 0,
    leads: 0,
    completion_rate: 0,
    lead_rate: 0,
  });
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const initRef = useRef(false);

  // Claim flow + plan fetch — runs once when token becomes available
  useEffect(() => {
    if (!token || initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    (async () => {
      // --- 1) Claim flow ---
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
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          const claimData = await claimRes.json().catch(() => ({}));
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else if (previewPayload) {
            const saveRes = await fetch(`${API}/api/save-preview`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
            });
            const saveData = await saveRes.json().catch(() => ({}));
            if (saveRes.ok && saveData.saved) {
              quizClaimed = true;
              claimedQuizId = saveData.quiz_id || '';
            }
          }

          clearCookie('sq_claim');
          try {
            sessionStorage.removeItem('sq_claim_token');
          } catch {}
          try {
            localStorage.removeItem('squarespell_preview');
            sessionStorage.removeItem('squarespell_preview');
          } catch {}
        }
      } catch (e) {
        console.error('[Squarespell] Claim/save failed:', e);
      }

      if (quizClaimed && claimedQuizId) {
        router.replace(`/dashboard/${claimedQuizId}?justClaimed=1`);
        return;
      }

      // --- 2) Plan / trial state ---
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

  // Fetch quizzes + rollup analytics
  useEffect(() => {
    if (!token || status === 'loading' || status === 'expired') return;
    let cancelled = false;
    setLoadingQuizzes(true);

    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch quizzes');
        const data: Quiz[] = await res.json();
        if (cancelled) return;
        setQuizzes(data);

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
      } catch (e) {
        console.error('Error fetching quizzes:', e);
      } finally {
        if (!cancelled) setLoadingQuizzes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, status]);

  if (authStatus === 'loading' || status === 'loading') {
    return (
      <DashboardShell title="Quizzes">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (status === 'expired') {
    return <ExpiredState />;
  }

  return (
    <DashboardShell
      title="Quizzes"
      topbarRight={<PrimaryButton href="/try">+ New quiz</PrimaryButton>}
    >
      {embedSlug && <EmbedModal slug={embedSlug} onClose={() => setEmbedSlug(null)} />}

      {status === 'trial' && <TrialBanner daysLeft={daysLeft} onUpgrade={() => router.push('/pricing')} />}

      <PageHeader
        title="Your quizzes"
        subtitle="Create and manage your AI-powered quiz funnels"
      />

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard label="Total views" value={formatNumber(analytics.views)} />
        <StatCard label="Total leads" value={formatNumber(analytics.leads)} />
        <StatCard label="Completion rate" value={`${analytics.completion_rate.toFixed(1)}%`} accent />
      </div>

      {loadingQuizzes ? (
        <PageLoading />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
          title="Create your first quiz"
          body="Get started with an AI-built quiz funnel that captures qualified leads in minutes."
          action={<PrimaryButton href="/try">Build your first quiz</PrimaryButton>}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {quizzes.map((quiz) => (
            <Card key={quiz.id} padding={20}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.TEXT,
                      lineHeight: 1.25,
                    }}
                  >
                    {quiz.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>{quiz.status}</Pill>
                    <span style={{ fontSize: 12, color: C.TEXT_MUTED }}>{formatDate(quiz.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div
                    style={{
                      padding: 12,
                      background: C.SURFACE,
                      borderRadius: 10,
                      border: `1px solid ${C.BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      Views
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>{formatNumber(quiz.view_count)}</div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: C.SURFACE,
                      borderRadius: 10,
                      border: `1px solid ${C.BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      Leads
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>{formatNumber(quiz.lead_count)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <GhostButton href={`/dashboard/${quiz.id}`}>Edit</GhostButton>
                  <GhostButton href={`/quiz/${quiz.slug}`} target="_blank">
                    View live
                  </GhostButton>
                  <GhostButton onClick={() => setEmbedSlug(quiz.slug)}>Embed</GhostButton>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token || !confirm('Delete this quiz? This action cannot be undone.')) return;
                      try {
                        const res = await fetch(`${API}/api/quizzes/${quiz.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) setQuizzes(quizzes.filter((q) => q.id !== quiz.id));
                      } catch (e) {
                        console.error('Delete failed:', e);
                      }
                    }}
                    style={{
                      padding: '11px 20px',
                      background: 'transparent',
                      color: '#ef4444',
                      border: `1px solid ${C.BORDER}`,
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = C.BORDER;
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Quizzes">
          <PageLoading />
        </DashboardShell>
      }
    >
      <QuizzesInner />
    </Suspense>
  );
}
