'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PageLoading, StatCard } from '../../_components/PageShell';
import { api } from '@/lib/api';

interface DeliverabilityData {
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    failed: number;
  };
  rates: {
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
    complaint_rate: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    opened: number;
    bounce_rate: number;
    complaint_rate: number;
    open_rate: number;
  }>;
}

function RateBar({ label, value, max, color, warn }: {
  label: string; value: number; max?: number; color: string; warn?: boolean;
}) {
  const pct = Math.min(value, max || 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.TEXT_MUTED, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: warn ? '#ff5c5c' : C.TEXT }}>
          {value}%
        </span>
      </div>
      <div style={{
        height: 8, borderRadius: 4, background: C.ELEVATED, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 4, background: color,
          width: `${pct}%`, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function HealthIndicator({ rate, label, threshold, invert }: {
  rate: number; label: string; threshold: number; invert?: boolean;
}) {
  const isGood = invert ? rate < threshold : rate >= threshold;
  const dotColor = isGood ? '#34d399' : '#ff5c5c';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', background: C.ELEVATED,
      borderRadius: 6, border: `1px solid ${C.BORDER}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: dotColor,
        boxShadow: `0 0 6px ${dotColor}`,
      }} />
      <span style={{ fontSize: 12, color: C.TEXT_MUTED }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.TEXT, marginLeft: 'auto' }}>
        {rate}%
      </span>
    </div>
  );
}

export default function DeliverabilityPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [data, setData] = useState<DeliverabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== 'ready' || !token) return;
    (async () => {
      try {
        setLoading(true);
        const result = await api.getDeliverability();
        setData(result);
      } catch (err: any) {
        setError(err?.message || 'Failed to load deliverability data');
      } finally {
        setLoading(false);
      }
    })();
  }, [authStatus, token]);

  if (authStatus === 'loading' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  return (
    <DashboardShell>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
        <PageHeader
          title="Email Deliverability"
          subtitle="Monitor your sending reputation and email health metrics"
        />

        {error && (
          <Card style={{ marginBottom: 24 }}>
            <p style={{ color: '#ff5c5c', margin: 0 }}>{error}</p>
          </Card>
        )}

        {data && data.totals.sent === 0 ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            }
            title="No email data yet"
            body="Send your first campaign to start tracking deliverability metrics."
          />
        ) : data && (
          <>
            {/* Health Status Row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12, marginBottom: 24,
            }}>
              <HealthIndicator rate={data.rates.delivery_rate} label="Delivery rate" threshold={95} />
              <HealthIndicator rate={data.rates.bounce_rate} label="Bounce rate" threshold={5} invert />
              <HealthIndicator rate={data.rates.complaint_rate} label="Complaint rate" threshold={0.1} invert />
              <HealthIndicator rate={data.rates.open_rate} label="Open rate" threshold={20} />
            </div>

            {/* KPI Cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16, marginBottom: 32,
            }}>
              <StatCard label="Total sent" value={data.totals.sent.toLocaleString()} />
              <StatCard label="Delivered" value={data.totals.delivered.toLocaleString()} accent />
              <StatCard label="Opened" value={data.totals.opened.toLocaleString()} />
              <StatCard label="Clicked" value={data.totals.clicked.toLocaleString()} />
              <StatCard label="Bounced" value={data.totals.bounced.toLocaleString()} />
              <StatCard label="Complaints" value={data.totals.complained.toLocaleString()} />
            </div>

            {/* Rate Bars */}
            <Card style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, margin: '0 0 16px' }}>
                Rates
              </h3>
              <RateBar label="Delivery rate" value={data.rates.delivery_rate} color="#34d399" />
              <RateBar label="Open rate" value={data.rates.open_rate} color={C.ACCENT} />
              <RateBar label="Click rate" value={data.rates.click_rate} color="#60a5fa" />
              <RateBar
                label="Bounce rate"
                value={data.rates.bounce_rate}
                color="#ff5c5c"
                warn={data.rates.bounce_rate > 5}
              />
              <RateBar
                label="Complaint rate"
                value={data.rates.complaint_rate}
                max={1}
                color="#ff5c5c"
                warn={data.rates.complaint_rate > 0.1}
              />
            </Card>

            {/* Per-Campaign Breakdown */}
            {data.campaigns.length > 0 && (
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, margin: '0 0 16px' }}>
                  Campaign Breakdown
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                        {['Campaign', 'Sent', 'Delivered', 'Opened', 'Bounced', 'Complaints', 'Bounce %', 'Spam %'].map(h => (
                          <th key={h} style={{
                            padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                            color: C.TEXT_MUTED, whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                          <td style={{ padding: '10px', color: C.TEXT, maxWidth: 200 }}>
                            <Link href={`/dashboard/emails/${c.id}`} style={{ color: C.ACCENT, textDecoration: 'none' }}>
                              {c.name || 'Untitled'}
                            </Link>
                          </td>
                          <td style={{ padding: '10px', color: C.TEXT }}>{c.sent}</td>
                          <td style={{ padding: '10px', color: C.TEXT }}>{c.delivered}</td>
                          <td style={{ padding: '10px', color: C.TEXT }}>{c.opened}</td>
                          <td style={{ padding: '10px', color: c.bounced > 0 ? '#ff5c5c' : C.TEXT }}>{c.bounced}</td>
                          <td style={{ padding: '10px', color: c.complained > 0 ? '#ff5c5c' : C.TEXT }}>{c.complained}</td>
                          <td style={{ padding: '10px', color: c.bounce_rate > 5 ? '#ff5c5c' : C.TEXT, fontWeight: c.bounce_rate > 5 ? 700 : 400 }}>
                            {c.bounce_rate}%
                          </td>
                          <td style={{ padding: '10px', color: c.complaint_rate > 0.1 ? '#ff5c5c' : C.TEXT, fontWeight: c.complaint_rate > 0.1 ? 700 : 400 }}>
                            {c.complaint_rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Guidance Card */}
            <Card style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, margin: '0 0 8px' }}>
                Deliverability Tips
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: C.TEXT_MUTED, fontSize: 13, lineHeight: 1.8 }}>
                <li>Keep bounce rate below 5% - remove invalid addresses promptly</li>
                <li>Keep spam complaint rate below 0.1% - respect unsubscribe requests</li>
                <li>A delivery rate above 95% indicates healthy sending reputation</li>
                <li>Open rates above 20% suggest your subject lines are performing well</li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
