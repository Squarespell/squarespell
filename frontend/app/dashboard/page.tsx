'use client';

/**
 * /dashboard - Overview (Untitled UI-inspired)
 *
 * Responsibilities:
 *  1. Claim flow for users arriving from /try (?claim=... or localStorage
 *     preview payload). This page is still the landing destination after
 *     sign-in so the claim must happen here. After a successful claim we
 *     redirect to the quiz editor.
 *  2. Plan + trial state for the trial banner.
 *  3. Overview analytics surface: stat strip + bar chart + dual panels
 *     (top performing quizzes + recent leads).
 *
 * Full quiz management (card grid with edit/view/embed/delete) lives at
 * /dashboard/quizzes.
 */

import { useEffect, useRef, useState, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';
import { useDashboardAuth } from './_components/useDashboardAuth';
import { Card, PageLoading, PrimaryButton } from './_components/PageShell';
import { NewQuizModal } from './quizzes/_components/NewQuizModal';
import { LiveLeadFeed } from './_components/LiveLeadFeed';
import { SmartRecommendations } from './_components/SmartRecommendations';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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
  plan: 'free' | 'trial' | 'starter' | 'growth' | 'pro' | 'agency';
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
  var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=;path=/;max-age=0';
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatRelative(dateStr: string): string {
  var d = new Date(dateStr);
  var now = new Date();
  var diffMs = now.getTime() - d.getTime();
  var mins = Math.floor(diffMs / 60000);
  var hrs = Math.floor(diffMs / 3600000);
  var days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFromLead(lead: Lead): string {
  var source = lead.name || lead.email || '';
  var parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SQ';
}

// ============================ CHART ============================
function HeroChart({
  dates,
  viewSeries,
  leadSeries,
}: {
  dates: string[];
  viewSeries: number[];
  leadSeries: number[];
}) {
  var [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  var days = dates.length;

  if (days === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.GRAY_400, fontSize: 14, fontFamily: C.FONT }}>
        No data for this period yet
      </div>
    );
  }

  var chartWidth = 960;
  var chartHeight = 200;
  var groupGap = days > 60 ? 1 : days > 14 ? 2 : 4;
  var barGap = days > 60 ? 1 : 2;
  var groupWidth = (chartWidth - groupGap * days) / days;
  var barWidth = (groupWidth - barGap) / 2;

  var allValues = viewSeries.concat(leadSeries);
  var max = Math.max.apply(null, allValues.concat([1]));

  function formatDate(d: string): string {
    var parts = d.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={'0 0 ' + chartWidth + ' ' + (chartHeight + 4)} width="100%" height={chartHeight + 4} style={{ display: 'block' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(function(p) {
          return (
            <line
              key={p}
              x1={0}
              x2={chartWidth}
              y1={chartHeight - p * (chartHeight - 16)}
              y2={chartHeight - p * (chartHeight - 16)}
              stroke={C.GRAY_200}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Grouped bars: views (teal) + leads (gray) */}
        {viewSeries.map(function(viewVal, idx) {
          var leadVal = leadSeries[idx] || 0;
          var gx = idx * (groupWidth + groupGap);
          var viewH = max > 0 ? Math.max(viewVal > 0 ? 2 : 0, (viewVal / max) * (chartHeight - 16)) : 0;
          var leadH = max > 0 ? Math.max(leadVal > 0 ? 2 : 0, (leadVal / max) * (chartHeight - 16)) : 0;
          var isHovered = hoveredIdx === idx;

          return (
            <g key={idx}>
              {/* Invisible hover target for the full group width */}
              <rect
                x={gx}
                y={0}
                width={groupWidth}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={function() { setHoveredIdx(idx); }}
                onMouseLeave={function() { setHoveredIdx(null); }}
                style={{ cursor: 'pointer' }}
              />
              <rect
                x={gx}
                y={chartHeight - viewH}
                width={barWidth}
                height={viewH}
                rx={Math.min(3, barWidth / 2)}
                fill={C.ACCENT}
                opacity={isHovered ? 1 : 0.8}
              />
              {leadVal > 0 && (
                <rect
                  x={gx + barWidth + barGap}
                  y={chartHeight - leadH}
                  width={barWidth}
                  height={leadH}
                  rx={Math.min(3, barWidth / 2)}
                  fill={C.GRAY_400}
                  opacity={isHovered ? 0.8 : 0.5}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredIdx !== null && dates[hoveredIdx] && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: Math.min(
            hoveredIdx * (groupWidth + groupGap) * (100 / chartWidth),
            85
          ) + '%',
          background: C.GRAY_900,
          color: '#FFFFFF',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontFamily: C.FONT,
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
          boxShadow: C.SHADOW_MD,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatDate(dates[hoveredIdx])}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />
            Views: {viewSeries[hoveredIdx]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.GRAY_400, display: 'inline-block' }} />
            Leads: {leadSeries[hoveredIdx]}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ STAT CARD ============================
function OverviewStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        background: C.SURFACE,
        border: '1px solid ' + C.GRAY_200,
        borderRadius: 12,
        padding: '20px 20px 20px',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_500, fontFamily: C.FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: C.ACCENT_LIGHT,
          border: '1px solid rgba(13,115,119,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.ACCENT, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: C.GRAY_900,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: C.FONT,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================ TRIAL BANNER ============================
function TrialBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  var urgent = daysLeft <= 3;
  return (
    <div
      style={{
        background: urgent ? C.ACCENT_LIGHT : C.SURFACE,
        border: '1px solid ' + (urgent ? 'rgba(13,115,119,0.25)' : C.GRAY_200),
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 14, color: C.GRAY_600, fontFamily: C.FONT }}>
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
            You&apos;re on a free trial. <strong style={{ color: C.GRAY_900 }}>{daysLeft} days</strong> remaining.
          </>
        )}
      </div>
      <button
        onClick={onUpgrade}
        style={{
          background: urgent ? C.ACCENT : C.SURFACE,
          color: urgent ? '#FFFFFF' : C.GRAY_700,
          border: urgent ? 'none' : '1px solid ' + C.GRAY_300,
          borderRadius: 8,
          padding: '9px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: C.FONT,
          boxShadow: C.SHADOW_XS,
        }}
      >
        {urgent ? 'Upgrade now' : 'View plans'}
      </button>
    </div>
  );
}

// ============================ ONBOARDING CHECKLIST ============================
interface ChecklistStep {
  label: string;
  done: boolean;
  href: string;
}

function OnboardingChecklist({
  steps,
  onDismiss,
}: {
  steps: ChecklistStep[];
  onDismiss: () => void;
}) {
  var completed = steps.filter(function(s) { return s.done; }).length;
  var total = steps.length;
  var pct = Math.round((completed / total) * 100);

  if (completed === total) return null;

  return (
    <div
      style={{
        background: C.SURFACE,
        border: '1px solid ' + C.GRAY_200,
        borderRadius: 12,
        padding: '20px 24px 18px',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>
            Get started with Squarespell
          </div>
          <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 2, fontFamily: C.FONT }}>
            {completed} of {total} steps complete
          </div>
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss checklist"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: C.GRAY_400, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, background: C.GRAY_100, borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          width: pct + '%',
          height: '100%',
          background: C.ACCENT,
          borderRadius: 8,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, borderTop: '1px solid ' + C.GRAY_200 }}>
        {steps.map(function(step, i) {
          return (
            <Link
              key={i}
              href={step.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px 24px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.1s ease',
                borderRight: i % 2 === 0 ? '1px solid ' + C.GRAY_200 : 'none',
                borderBottom: i < steps.length - 2 ? '1px solid ' + C.GRAY_200 : 'none',
              }}
              onMouseEnter={function(e: any) { e.currentTarget.style.background = C.GRAY_25; }}
              onMouseLeave={function(e: any) { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: step.done ? C.SUCCESS_LIGHT : C.GRAY_100,
                border: '1px solid ' + (step.done ? 'rgba(18,183,106,0.15)' : C.GRAY_200),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step.done ? C.SUCCESS_700 : C.GRAY_600,
                flexShrink: 0,
              }}>
                {step.done ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12h8"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: step.done ? C.GRAY_500 : C.GRAY_700, fontFamily: C.FONT }}>
                  {step.label}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
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
        fontFamily: C.FONT,
      }}
    >
      <div style={{ maxWidth: 440, width: '100%', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #0D7377 0%, #0fa3a8 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.02em' }}>Squarespell</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Your free trial has ended
        </h1>
        <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, marginBottom: 32 }}>
          Upgrade to keep access to your quizzes, leads, and analytics. Your data is safe.
        </p>
        <Link
          href="/pricing"
          style={{
            display: 'block',
            padding: '12px 24px',
            background: C.ACCENT,
            borderRadius: 8,
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: C.FONT,
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
  var router = useRouter();
  var searchParams = useSearchParams();
  var { token, status: authStatus } = useDashboardAuth();

  var [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  var [daysLeft, setDaysLeft] = useState(0);
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [leads, setLeads] = useState<Lead[]>([]);
  var [loadingData, setLoadingData] = useState(false);
  var [analytics, setAnalytics] = useState<Analytics>({
    views: 0,
    completions: 0,
    leads: 0,
    completion_rate: 0,
    lead_rate: 0,
  });
  var [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  var [timeseries, setTimeseries] = useState<{ dates: string[]; views: number[]; leads: number[] }>({ dates: [], views: [], leads: [] });
  var [newQuizOpen, setNewQuizOpen] = useState(false);
  var [claimError, setClaimError] = useState<string | null>(null);
  var [checklistDismissed, setChecklistDismissed] = useState(false);
  var [hasEmbedded, setHasEmbedded] = useState(false);
  var [hasBrandKit, setHasBrandKit] = useState(false);
  var [hasCampaign, setHasCampaign] = useState(false);
  var initRef = useRef(false);

  // Claim flow + plan fetch - runs once when token becomes available
  useEffect(function() {
    if (!token || initRef.current) return;
    initRef.current = true;
    var cancelled = false;

    (async function() {
      var quizClaimed = false;
      var claimedQuizId = '';
      try {
        var claimToken = searchParams?.get('claim') || '';
        if (!claimToken) claimToken = getCookie('sq_claim');
        if (!claimToken) claimToken = sessionStorage.getItem('sq_claim_token') || '';

        var previewPayload: any = null;
        try {
          var raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed?.quiz && parsed?.url && Date.now() - (parsed.createdAt || 0) < 14400000) {
              previewPayload = parsed;
              if (!claimToken) claimToken = parsed.claim_token || '';
            }
          }
        } catch {}

        if (claimToken || previewPayload) {
          var claimRes = await fetch(API + '/api/claim-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          var claimData = await claimRes.json().catch(function() { return {}; });
          var claimFailureReason: string | null = null;
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else {
            claimFailureReason = claimData?.error || 'claim-quiz ' + claimRes.status;
            if (previewPayload) {
              var saveRes = await fetch(API + '/api/save-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
              });
              var saveData = await saveRes.json().catch(function() { return {}; });
              if (saveRes.ok && saveData.saved) {
                quizClaimed = true;
                claimedQuizId = saveData.quiz_id || '';
                claimFailureReason = null;
              } else {
                claimFailureReason = saveData?.error || 'save-preview ' + saveRes.status;
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
        router.replace('/dashboard/' + claimedQuizId + '?justClaimed=1');
        return;
      }

      for (var i = 0; i < 3 && !cancelled; i++) {
        try {
          var ctrl = new AbortController();
          var timeout = setTimeout(function() { ctrl.abort(); }, 15000);
          var res = await fetch(API + '/api/user/plan', {
            headers: { Authorization: 'Bearer ' + token },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error('' + res.status);
          var data: UserPlan = await res.json();
          if (cancelled) return;

          var trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
          var now = new Date();
          var isPaid = ['growth', 'pro', 'agency'].includes(data.plan);
          if (isPaid) {
            setStatus('active');
          } else if (data.plan === 'trial' && trialEnds && now < trialEnds) {
            var daysRemaining = Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000);
            setDaysLeft(Math.max(daysRemaining, 0));
            setStatus('trial');
          } else {
            setStatus('active');
          }
          return;
        } catch {
          if (i < 2) await new Promise(function(r) { setTimeout(r, 2500); });
        }
      }

      if (!cancelled) {
        setStatus('trial');
        setDaysLeft(7);
      }
    })();

    return function() {
      cancelled = true;
    };
  }, [token, router, searchParams]);

  // Fetch quizzes + rollup analytics + recent leads
  useEffect(function() {
    if (!token || status === 'loading' || status === 'expired') return;
    var cancelled = false;
    setLoadingData(true);

    (async function() {
      try {
        var results = await Promise.all([
          fetch(API + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } }),
          fetch(API + '/api/leads', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
        ]);
        var quizRes = results[0];
        var leadRes = results[1];

        if (quizRes.ok) {
          var quizData: Quiz[] = await quizRes.json();
          if (!cancelled) setQuizzes(quizData);

          if (quizData.length > 0) {
            var totalViews = 0;
            var totalLeads = 0;
            var totalCompletions = 0;
            for (var qi = 0; qi < quizData.length; qi++) {
              try {
                var ar = await fetch(API + '/api/analytics/' + quizData[qi].id, {
                  headers: { Authorization: 'Bearer ' + token },
                });
                if (ar.ok) {
                  var ad: Analytics = await ar.json();
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
          var leadData: Lead[] = await leadRes.json();
          if (!cancelled) setLeads(leadData.slice(0, 7));
        }

        try {
          var campRes = await fetch(API + '/api/emails/campaigns', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; });
          if (campRes && campRes.ok) {
            var camps = await campRes.json().catch(function() { return []; });
            if (!cancelled) setHasCampaign(camps.some(function(c: any) { return c.status === 'sent'; }));
          }
        } catch {}

        try {
          if (localStorage.getItem('sq_checklist_dismissed') === '1') {
            if (!cancelled) setChecklistDismissed(true);
          }
        } catch {}
      } catch (e) {
        console.error('Error fetching overview data:', e);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return function() {
      cancelled = true;
    };
  }, [token, status]);

  // Fetch real timeseries data for the bar chart
  useEffect(function() {
    if (!token || quizzes.length === 0) return;
    var cancelled = false;

    (async function() {
      var allDates: Record<string, { views: number; leads: number }> = {};

      for (var qi = 0; qi < quizzes.length; qi++) {
        try {
          var tsRes = await fetch(API + '/api/analytics/' + quizzes[qi].id + '/timeseries?period=' + range, {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (tsRes.ok) {
            var tsData = await tsRes.json();
            if (tsData.dates && Array.isArray(tsData.dates)) {
              for (var di = 0; di < tsData.dates.length; di++) {
                var dateKey = tsData.dates[di];
                if (!allDates[dateKey]) allDates[dateKey] = { views: 0, leads: 0 };
                allDates[dateKey].views += (tsData.views[di] || 0);
                allDates[dateKey].leads += (tsData.leads[di] || 0);
              }
            }
          }
        } catch {}
      }

      var sortedDates = Object.keys(allDates).sort();
      var viewsArr = sortedDates.map(function(d) { return allDates[d].views; });
      var leadsArr = sortedDates.map(function(d) { return allDates[d].leads; });

      if (!cancelled) {
        setTimeseries({ dates: sortedDates, views: viewsArr, leads: leadsArr });
      }
    })();

    return function() { cancelled = true; };
  }, [token, quizzes, range]);

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

  var topQuizzes = quizzes.slice().sort(function(a, b) { return b.view_count - a.view_count; }).slice(0, 5);
  var activeQuizzes = quizzes.filter(function(q) { return q.status === 'live'; }).length;
  var maxViews = Math.max.apply(null, topQuizzes.map(function(q) { return q.view_count; }).concat([1]));
  var isEmptyDashboard = quizzes.length === 0 && leads.length === 0 && !loadingData;

  return (
    <DashboardShell
      title="Dashboard"
      topbarRight={
        <button
          onClick={function() { setNewQuizOpen(true); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: C.ACCENT,
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid ' + C.ACCENT,
            cursor: 'pointer',
            fontFamily: C.FONT,
            boxShadow: C.SHADOW_XS,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New quiz
        </button>
      }
    >
      <NewQuizModal open={newQuizOpen} onClose={function() { setNewQuizOpen(false); }} />
      {status === 'trial' && <TrialBanner daysLeft={daysLeft} onUpgrade={function() { router.push('/pricing'); }} />}

      {!checklistDismissed && !loadingData && (
        <OnboardingChecklist
          steps={[
            { label: 'Create your first quiz', done: quizzes.length > 0, href: '/dashboard/quizzes' },
            { label: 'Publish a quiz (set to live)', done: quizzes.some(function(q) { return q.status === 'live'; }), href: '/dashboard/quizzes' },
            { label: 'Get your first lead', done: leads.length > 0, href: '/dashboard/leads' },
            { label: 'Embed a quiz on your site', done: quizzes.some(function(q) { return q.view_count > 0; }), href: quizzes[0] ? '/dashboard/quiz/' + quizzes[0].id + '/embed' : '/dashboard/quizzes' },
            { label: 'Send your first email campaign', done: hasCampaign, href: '/dashboard/emails' },
          ]}
          onDismiss={function() {
            setChecklistDismissed(true);
            try { localStorage.setItem('sq_checklist_dismissed', '1'); } catch {}
          }}
        />
      )}

      <SmartRecommendations />

      {claimError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.WARNING_LIGHT, border: '1px solid rgba(247,144,9,0.2)',
          borderRadius: 12, padding: '12px 18px', marginBottom: 16,
        }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={C.WARNING_500} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>
          <span style={{ fontSize: 14, color: C.WARNING, fontWeight: 500, flex: 1, fontFamily: C.FONT }}>
            We could not import your preview quiz. Refresh the page to try again.
          </span>
          <button
            onClick={function() { setClaimError(null); window.location.reload(); }}
            style={{
              background: 'rgba(247,144,9,0.1)', border: '1px solid rgba(247,144,9,0.2)',
              borderRadius: 8, padding: '6px 16px', color: C.WARNING, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* First-run hero for empty dashboards */}
      {isEmptyDashboard && (
        <div
          style={{
            background: C.SURFACE,
            border: '1px solid ' + C.GRAY_200,
            borderRadius: 12,
            padding: '48px 36px',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: C.GRAY_100,
              border: '1px solid ' + C.GRAY_200,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_600} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.02em', fontFamily: C.FONT }}>
            Welcome to Squarespell
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: C.GRAY_500, lineHeight: 1.5, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', fontFamily: C.FONT }}>
            Create a branded quiz from your Squarespace site in under 60 seconds. Capture leads, send follow-up emails, and grow your business.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <PrimaryButton onClick={function() { setNewQuizOpen(true); }}>
              Create your first quiz
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Page header */}
      {!isEmptyDashboard && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                color: C.GRAY_900,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                fontFamily: C.FONT,
              }}
            >
              Welcome back, {(function() { var u = typeof window !== 'undefined' ? document.querySelector('[data-clerk-user-firstname]')?.textContent : null; return u || 'there'; })()}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
              Track and manage your quiz performance and leads.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 0, border: '1px solid ' + C.GRAY_300, borderRadius: 8, overflow: 'hidden' }}>
            {(['7d', '30d', '90d'] as const).map(function(r) {
              return (
                <button
                  key={r}
                  onClick={function() { setRange(r); }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    borderRight: r !== '90d' ? '1px solid ' + C.GRAY_300 : 'none',
                    cursor: 'pointer',
                    background: range === r ? C.GRAY_50 : C.SURFACE,
                    color: range === r ? C.GRAY_900 : C.GRAY_500,
                    fontFamily: C.FONT,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stat strip - all 5 cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <OverviewStatCard
          label="Total views"
          value={formatNumber(analytics.views)}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Leads captured"
          value={formatNumber(analytics.leads)}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Completion rate"
          value={analytics.completion_rate.toFixed(1) + '%'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Lead rate"
          value={analytics.lead_rate.toFixed(1) + '%'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <OverviewStatCard
          label="Active quizzes"
          value={<>{activeQuizzes}<span style={{ fontSize: 16, color: C.GRAY_400, fontWeight: 500 }}> / {quizzes.length}</span></>}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
        />
      </div>

      {/* Views & leads chart */}
      <Card padding={24} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>
              Views &amp; leads
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
              Daily performance across all quizzes
            </p>
          </div>
          <div style={{ display: 'flex', gap: 0, border: '1px solid ' + C.GRAY_300, borderRadius: 8, overflow: 'hidden' }}>
            {(['7d', '30d', '90d'] as const).map(function(r) {
              return (
                <button
                  key={r}
                  onClick={function() { setRange(r); }}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    border: 'none',
                    borderRight: r !== '90d' ? '1px solid ' + C.GRAY_300 : 'none',
                    cursor: 'pointer',
                    background: range === r ? C.GRAY_50 : C.SURFACE,
                    color: range === r ? C.GRAY_900 : C.GRAY_500,
                    fontFamily: C.FONT,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.GRAY_500, fontWeight: 500, fontFamily: C.FONT }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.ACCENT }} />
            Views
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.GRAY_500, fontWeight: 500, fontFamily: C.FONT }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.GRAY_500 }} />
            Leads
          </div>
        </div>
        <HeroChart dates={timeseries.dates} viewSeries={timeseries.views} leadSeries={timeseries.leads} />
      </Card>

      {/* Dual panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        {/* Top performing quizzes */}
        <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>
              Top quizzes
            </span>
            <Link href="/dashboard/quizzes" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>
              View all
            </Link>
          </div>

          {loadingData ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.GRAY_500, fontSize: 14, fontFamily: C.FONT }}>Loading...</div>
          ) : topQuizzes.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: C.GRAY_500,
                fontSize: 14,
                fontFamily: C.FONT,
              }}
            >
              No quizzes yet -{' '}
              <Link href="/tools/quiz-funnel/build" style={{ color: C.ACCENT, textDecoration: 'none', fontWeight: 600 }}>
                create your first quiz
              </Link>
            </div>
          ) : (
            topQuizzes.map(function(quiz, idx) {
              var cvr = quiz.view_count > 0 ? (quiz.lead_count / quiz.view_count) * 100 : 0;
              return (
                <Link
                  key={quiz.id}
                  href={'/dashboard/' + quiz.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 24px',
                    borderTop: '1px solid ' + C.GRAY_100,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.1s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={function(e: any) { e.currentTarget.style.background = C.GRAY_25; }}
                  onMouseLeave={function(e: any) { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: C.GRAY_100, color: C.GRAY_700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0, fontFamily: C.FONT,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500, color: C.GRAY_900,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: C.FONT,
                    }}>
                      {quiz.title}
                    </div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 2, fontFamily: C.FONT }}>
                      {formatNumber(quiz.view_count)} views / {formatNumber(quiz.lead_count)} leads
                    </div>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: C.SUCCESS_700,
                    background: C.SUCCESS_LIGHT, padding: '2px 10px', borderRadius: 16,
                    whiteSpace: 'nowrap', border: '1px solid rgba(18,183,106,0.15)',
                    fontFamily: C.FONT,
                  }}>
                    {cvr.toFixed(1)}%
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {/* Live lead feed */}
        <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden', padding: 24 }}>
          <LiveLeadFeed />
        </div>
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
