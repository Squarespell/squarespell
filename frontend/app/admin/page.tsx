'use client';

/**
 * /admin - Standalone owner analytics dashboard
 *
 * Lives at admin.squarespell.com, completely separate from the user-facing app.
 * Shows KPI cards, growth metrics, user breakdown, revenue summary.
 * Protected by Clerk auth + ADMIN_EMAILS check on the backend.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

// Inline color tokens (standalone - no dashboard dependency)
var C = {
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  BG: '#F9FAFB',
  SURFACE: '#FFFFFF',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F2F4F7',
  GRAY_300: '#D0D5DD',
  BORDER: '#EAECF0',
  TEXT: '#101828',
  TEXT_SECONDARY: '#344054',
  TEXT_SUBTLE: '#667085',
  ACCENT: '#0f7377',
  BRAND_500: '#0f7377',
  PURPLE_500: '#7F56D9',
  SUCCESS_500: '#12B76A',
  WARNING_500: '#F79009',
  ERROR_500: '#F04438',
  ERROR_700: '#B42318',
  DANGER_LIGHT: '#FEF3F2',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
};

type AdminMetrics = {
  timestamp: string;
  users: {
    total: number;
    newThisMonth: number;
    activeLastMonth: number;
    byPlan: Record<string, number>;
  };
  quizzes: {
    total: number;
    published: number;
    draft: number;
  };
  leads: {
    total: number;
    thisMonth: number;
    avgPerUser: number;
  };
  revenue: {
    mrr: number;
    totalRevenue: number;
    thisMonth: number;
    quizPaymentsCount: number;
  };
  metrics: {
    estimatedChurnRate: number;
    activationRate: number;
    leadsPerQuiz: number;
  };
};

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KPICard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div
      style={{
        padding: '24px',
        background: C.SURFACE,
        border: '1px solid ' + C.BORDER,
        borderRadius: 12,
        boxShadow: C.SHADOW_SM,
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.TEXT, marginBottom: 4 }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>{subtext}</div>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.SURFACE,
        border: '1px solid ' + C.BORDER,
        borderRadius: 12,
        boxShadow: C.SHADOW_SM,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: '1px solid ' + C.BORDER }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: C.FONT
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid ' + C.GRAY_100,
            borderTopColor: C.ACCENT,
            borderRadius: '50%',
            animation: 'admin-spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}
        />
        <div style={{ fontSize: 14, color: C.TEXT_SUBTLE }}>Loading admin dashboard...</div>
        <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// Same AbortController + retry-with-backoff pattern shipped for the public
// quiz/embed pages (commit 8adacb9): a single transient blip (brief 5xx from
// the backend, dropped connection, slow cold-start) should not permanently
// surface "Failed to fetch" with no recovery path. Only retries on likely-
// transient conditions (network error / 5xx); 401/403 fail fast since
// retrying won't change an auth/permission outcome.
async function fetchMetricsOnce(token: string | null): Promise<Response> {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    return await fetch(API + '/api/admin/metrics', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function AdminDashboard() {
  var router = useRouter();
  var { isLoaded, isSignedIn, getToken } = useAuth();
  var [data, setData] = useState<AdminMetrics | null>(null);
  var [error, setError] = useState<string>('');
  var [isLoadingData, setIsLoadingData] = useState(true);
  var [retryToken, setRetryToken] = useState(0);

  useEffect(function() {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    var cancelled = false;

    async function fetchMetrics() {
      setIsLoadingData(true);
      var token = await getToken();
      var maxAttempts = 3;

      for (var attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          var response = await fetchMetricsOnce(token);

          if (response.status === 403) {
            if (!cancelled) { setError('Access denied - admin access required'); setIsLoadingData(false); }
            return;
          }

          if (response.status === 401) {
            if (!cancelled) { setError('Not authenticated - please sign in'); setIsLoadingData(false); }
            return;
          }

          if (response.ok) {
            var metricsData = await response.json();
            if (!cancelled) { setData(metricsData); setError(''); setIsLoadingData(false); }
            return;
          }

          // Non-2xx, non-401/403: only worth retrying on likely-transient
          // server errors (5xx). Anything else, fail fast.
          if (response.status < 500 || attempt === maxAttempts) {
            if (!cancelled) { setError('Failed to fetch metrics'); setIsLoadingData(false); }
            return;
          }
        } catch (err: any) {
          if (attempt === maxAttempts) {
            if (!cancelled) { setError(err.message || 'Failed to load metrics'); setIsLoadingData(false); }
            return;
          }
        }
        await new Promise(function(resolve) { setTimeout(resolve, attempt === 1 ? 400 : 1000); });
      }
    }

    fetchMetrics();
    return function() { cancelled = true; };
  }, [isLoaded, isSignedIn, router, getToken, retryToken]);

  if (!isLoaded || isLoadingData) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: C.FONT,
          padding: 20
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: '32px',
            background: C.DANGER_LIGHT,
            border: '1px solid ' + C.ERROR_500,
            borderRadius: 12,
            color: C.ERROR_700,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dashboard Error</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>{error}</div>
          <button
            onClick={function() { setRetryToken(function(n) { return n + 1; }); }}
            style={{
              padding: '8px 20px',
              background: C.ERROR_700,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: C.FONT
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  var planData = [
    { name: 'Free', value: data.users.byPlan.free || 0, fill: C.GRAY_300 },
    { name: 'Core', value: (data.users.byPlan.core || 0) + (data.users.byPlan.starter || 0) + (data.users.byPlan.growth || 0), fill: C.BRAND_500 },
    { name: 'Pro', value: data.users.byPlan.pro || 0, fill: C.SUCCESS_500 },
    { name: 'Business', value: (data.users.byPlan.business || 0) + (data.users.byPlan.agency || 0), fill: '#FF6B6B' },
    { name: 'Trial', value: data.users.byPlan.trial || 0, fill: C.WARNING_500 }
  ].filter(function(p) { return p.value > 0; });

  return (
    <div style={{ minHeight: '100vh', background: C.BG, fontFamily: C.FONT }}>
      {/* Top bar */}
      <div
        style={{
          background: C.SURFACE,
          borderBottom: '1px solid ' + C.BORDER,
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 800
            }}
          >
            S
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.TEXT }}>Squarespell Quiz Admin</span>
        </div>
        <div style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>
          Last updated {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.TEXT, margin: '0 0 6px' }}>
            Business Overview
          </h1>
          <p style={{ fontSize: 14, color: C.TEXT_SUBTLE, margin: 0 }}>
            Real-time metrics for Squarespell Quiz
          </p>
        </div>

        {/* Primary KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 20,
            marginBottom: 24
          }}
        >
          <KPICard label="Total Users" value={fmt(data.users.total)} />
          <KPICard label="Monthly Recurring Revenue" value={formatCurrency(data.revenue.mrr)} />
          <KPICard label="Total Leads" value={fmt(data.leads.total)} />
          <KPICard label="Published Quizzes" value={fmt(data.quizzes.published)} />
        </div>

        {/* Growth This Month */}
        <SectionCard title="Growth This Month">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>New Users</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.ACCENT }}>+{fmt(data.users.newThisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.users.total > 0 ? Math.round((data.users.newThisMonth / data.users.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>New Leads</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.SUCCESS_500 }}>+{fmt(data.leads.thisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.leads.total > 0 ? Math.round((data.leads.thisMonth / data.leads.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>Revenue</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.WARNING_500 }}>{formatCurrency(data.revenue.thisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                from {data.revenue.quizPaymentsCount} quiz payments
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, margin: '24px 0' }}>
          <KPICard label="Estimated Churn Rate" value={data.metrics.estimatedChurnRate + '%'} subtext="Month-over-month" />
          <KPICard label="Activation Rate" value={data.metrics.activationRate + '%'} subtext="Published quizzes / users" />
          <KPICard label="Leads Per Quiz" value={data.metrics.leadsPerQuiz.toString()} subtext="Average engagement" />
          <KPICard label="Active Users (30d)" value={fmt(data.users.activeLastMonth)} subtext="From analytics events" />
        </div>

        {/* Two-column: Users by Plan + Revenue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <SectionCard title="Users by Plan">
            {planData.map(function(entry, idx) {
              var maxVal = Math.max.apply(null, planData.map(function(p) { return p.value; }));
              var pct = maxVal > 0 ? (entry.value / maxVal) * 100 : 0;
              return (
                <div key={idx} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>{entry.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>{fmt(entry.value)}</span>
                  </div>
                  <div style={{ height: 8, background: C.GRAY_100, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: entry.fill, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
            {planData.length === 0 && (
              <div style={{ fontSize: 13, color: C.TEXT_SUBTLE, textAlign: 'center', padding: 20 }}>No users yet</div>
            )}
          </SectionCard>

          <SectionCard title="Revenue Summary">
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                Monthly Recurring Revenue
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.ACCENT }}>
                {formatCurrency(data.revenue.mrr)}
              </div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                Total Revenue (All Time)
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.TEXT }}>
                {formatCurrency(data.revenue.totalRevenue)}
              </div>
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: C.GRAY_50,
                borderRadius: 8,
                fontSize: 13,
                color: C.TEXT_SUBTLE
              }}
            >
              Quiz Payments: {data.revenue.quizPaymentsCount} transactions
            </div>
          </SectionCard>
        </div>

        {/* Detailed Statistics */}
        <SectionCard title="Detailed Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                User Breakdown
              </div>
              {['free', 'trial', 'core', 'starter', 'growth', 'pro', 'business', 'agency'].map(function(plan) {
                return (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                    <span style={{ textTransform: 'capitalize' as any }}>{plan}</span>
                    <strong>{fmt(data!.users.byPlan[plan] || 0)}</strong>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                Quiz Statistics
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Total Quizzes</span>
                <strong>{fmt(data.quizzes.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Published</span>
                <strong style={{ color: C.SUCCESS_500 }}>{fmt(data.quizzes.published)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Draft</span>
                <strong style={{ color: C.TEXT_SUBTLE }}>{fmt(data.quizzes.draft)}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                Lead Statistics
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Total Leads</span>
                <strong>{fmt(data.leads.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>This Month</span>
                <strong style={{ color: C.ACCENT }}>{fmt(data.leads.thisMonth)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Avg Per User</span>
                <strong>{data.leads.avgPerUser.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: '14px 20px', background: C.GRAY_50, borderRadius: 8, fontSize: 12, color: C.TEXT_SUBTLE }}>
          MRR calculated from active subscriptions. Churn estimated from month-to-month user changes. All times in UTC.
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  );
}
