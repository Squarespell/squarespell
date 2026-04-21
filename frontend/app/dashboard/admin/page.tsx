'use client';

/**
 * /dashboard/admin - Admin-only analytics dashboard for investor reporting
 *
 * Responsibilities:
 * 1. Gate behind admin check (redirect to /dashboard if non-admin)
 * 2. Show KPI cards: Total Users, MRR, Total Leads, Active Quizzes
 * 3. Show growth metrics: New users this month, leads this month, revenue this month
 * 4. User signups chart (last 8 weeks)
 * 5. User breakdown by plan (Free, Starter, Growth, Pro, Agency)
 *
 * Data is fetched from /api/admin/metrics endpoint
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { Card, PageLoading } from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

// KPI Card component
function KPICard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div
      style={{
        padding: '20px',
        background: C.SURFACE,
        border: '1px solid ' + C.BORDER,
        borderRadius: 12,
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.TEXT, marginBottom: 4 }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>{subtext}</div>}
    </div>
  );
}

// Stat row for side-by-side display
function StatRow({ items }: { items: Array<{ label: string; value: string; subtext?: string }> }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: items.length === 2 ? '1fr 1fr' : items.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr',
        gap: 20,
        marginBottom: 24
      }}
    >
      {items.map(function(item, idx) {
        return <KPICard key={idx} label={item.label} value={item.value} subtext={item.subtext} />;
      })}
    </div>
  );
}

function AdminDashboard() {
  var router = useRouter();
  var { token, status: authStatus } = useDashboardAuth();
  var [data, setData] = useState<AdminMetrics | null>(null);
  var [error, setError] = useState<string>('');
  var [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(function() {
    if (authStatus === 'loading') return;
    if (authStatus !== 'ready') {
      router.push('/dashboard');
      return;
    }

    // Fetch admin metrics
    async function fetchMetrics() {
      try {
        setIsLoadingData(true);
        var response = await fetch(API + '/api/admin/metrics', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 403) {
          setError('Access denied - admin access required');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        var metricsData = await response.json();
        setData(metricsData);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load metrics');
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchMetrics();
  }, [authStatus, router]);

  if (authStatus === 'loading' || isLoadingData) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <DashboardShell>
        <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              padding: '20px',
              background: C.DANGER_LIGHT,
              border: '1px solid ' + C.ERROR_500,
              borderRadius: 12,
              color: C.ERROR_700
            }}
          >
            {error}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return <PageLoading />;
  }

  // Prepare chart data for user breakdown pie
  var planData = [
    { name: 'Free', value: data.users.byPlan.free || 0, fill: C.GRAY_300 },
    { name: 'Starter', value: data.users.byPlan.starter || 0, fill: C.BRAND_500 },
    { name: 'Growth', value: data.users.byPlan.growth || 0, fill: C.PURPLE_500 },
    { name: 'Pro', value: data.users.byPlan.pro || 0, fill: C.SUCCESS_500 },
    { name: 'Agency', value: data.users.byPlan.agency || 0, fill: '#FF6B6B' },
    { name: 'Trial', value: data.users.byPlan.trial || 0, fill: C.WARNING_500 }
  ].filter(function(p) { return p.value > 0; });

  return (
    <DashboardShell>
      <div style={{ padding: '32px 20px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.TEXT, marginBottom: 8 }}>
            Admin Analytics
          </h1>
          <p style={{ fontSize: 15, color: C.TEXT_SECONDARY }}>
            Investor reporting dashboard • Last updated {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Primary KPIs */}
        <StatRow
          items={[
            { label: 'Total Users', value: fmt(data.users.total) },
            { label: 'Monthly Recurring Revenue', value: formatCurrency(data.revenue.mrr) },
            { label: 'Total Leads', value: fmt(data.leads.total) },
            { label: 'Published Quizzes', value: fmt(data.quizzes.published) }
          ]}
        />

        {/* Growth This Month */}
        <Card>
          <div style={{ padding: '20px', borderBottom: '1px solid ' + C.BORDER }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>
              Growth This Month
            </h2>
          </div>
          <div
            style={{
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 20
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 4 }}>
                New Users
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.ACCENT }}>
                +{fmt(data.users.newThisMonth)}
              </div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.users.total > 0 ? Math.round((data.users.newThisMonth / data.users.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 4 }}>
                New Leads
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.SUCCESS_500 }}>
                +{fmt(data.leads.thisMonth)}
              </div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.leads.total > 0 ? Math.round((data.leads.thisMonth / data.leads.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 4 }}>
                Revenue
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.WARNING_500 }}>
                {formatCurrency(data.revenue.thisMonth)}
              </div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                from {data.revenue.quizPaymentsCount} quiz payments
              </div>
            </div>
          </div>
        </Card>

        {/* Key Metrics Row */}
        <StatRow
          items={[
            { label: 'Estimated Churn Rate', value: data.metrics.estimatedChurnRate + '%', subtext: 'Month-over-month' },
            { label: 'Activation Rate', value: data.metrics.activationRate + '%', subtext: 'Published quizzes / users' },
            { label: 'Leads Per Quiz', value: data.metrics.leadsPerQuiz.toString(), subtext: 'Average engagement' },
            { label: 'Active Users (30d)', value: fmt(data.users.activeLastMonth), subtext: 'From analytics events' }
          ]}
        />

        {/* Charts Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginBottom: 24
          }}
        >
          {/* User Breakdown */}
          <Card>
            <div style={{ padding: '20px', borderBottom: '1px solid ' + C.BORDER }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>
                Users by Plan
              </h2>
            </div>
            <div style={{ padding: '20px' }}>
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
                <div style={{ fontSize: 13, color: C.TEXT_SECONDARY, textAlign: 'center', padding: 20 }}>No users yet</div>
              )}
            </div>
          </Card>

          {/* Revenue Summary */}
          <Card>
            <div style={{ padding: '20px', borderBottom: '1px solid ' + C.BORDER }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>
                Revenue Summary
              </h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                  Monthly Recurring Revenue (Subscriptions)
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.ACCENT }}>
                  {formatCurrency(data.revenue.mrr)}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                  Total Revenue (All Time)
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.TEXT }}>
                  {formatCurrency(data.revenue.totalRevenue)}
                </div>
              </div>
              <div
                style={{
                  padding: '12px',
                  background: C.GRAY_50,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.TEXT_SECONDARY
                }}
              >
                Quiz Payments: {data.revenue.quizPaymentsCount} transactions
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <div style={{ padding: '20px', borderBottom: '1px solid ' + C.BORDER }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>
              Detailed Statistics
            </h2>
          </div>
          <div
            style={{
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 20
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SECONDARY, textTransform: 'uppercase', marginBottom: 12 }}>
                User Breakdown
              </div>
              <div style={{ fontSize: 13, color: C.TEXT, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Free</span>
                  <strong>{fmt(data.users.byPlan.free || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Starter</span>
                  <strong>{fmt(data.users.byPlan.starter || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Growth</span>
                  <strong>{fmt(data.users.byPlan.growth || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Pro</span>
                  <strong>{fmt(data.users.byPlan.pro || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Agency</span>
                  <strong>{fmt(data.users.byPlan.agency || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid ' + C.BORDER, paddingTop: 6, marginTop: 6 }}>
                  <span>Trial</span>
                  <strong>{fmt(data.users.byPlan.trial || 0)}</strong>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SECONDARY, textTransform: 'uppercase', marginBottom: 12 }}>
                Quiz Statistics
              </div>
              <div style={{ fontSize: 13, color: C.TEXT, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Total Quizzes</span>
                  <strong>{fmt(data.quizzes.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Published</span>
                  <strong style={{ color: C.SUCCESS_500 }}>{fmt(data.quizzes.published)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Draft</span>
                  <strong style={{ color: C.TEXT_SECONDARY }}>{fmt(data.quizzes.draft)}</strong>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SECONDARY, textTransform: 'uppercase', marginBottom: 12 }}>
                Lead Statistics
              </div>
              <div style={{ fontSize: 13, color: C.TEXT, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Total Leads</span>
                  <strong>{fmt(data.leads.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>This Month</span>
                  <strong style={{ color: C.ACCENT }}>{fmt(data.leads.thisMonth)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Avg Per User</span>
                  <strong>{data.leads.avgPerUser.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer note */}
        <div style={{ marginTop: 32, padding: 16, background: C.GRAY_50, borderRadius: 8, fontSize: 12, color: C.TEXT_SECONDARY }}>
          Dashboard displays aggregated company metrics. MRR calculated from active subscriptions. Churn estimated from month-to-month user changes. All times in UTC.
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}
