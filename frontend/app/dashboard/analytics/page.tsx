'use client';

/**
 * /dashboard/analytics — Roll-up analytics across every quiz the user owns.
 *
 * Reuses the existing per-quiz endpoint (/api/analytics/:quizId) by fanning
 * out one request per quiz and summing the results. Also shows a per-quiz
 * table so users can click through to a specific quiz's dashboard.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  PrimaryButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  status: 'live' | 'draft';
  view_count: number;
  lead_count: number;
};

type Analytics = {
  views: number;
  completions: number;
  leads: number;
  completion_rate: number;
  lead_rate: number;
};

type Row = Quiz & { analytics: Analytics | null };

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function pct(n: number): string {
  if (!isFinite(n)) return '0%';
  return `${Math.round(n)}%`;
}

export default function AnalyticsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load quizzes');
        const quizzes: Quiz[] = await res.json();
        if (cancelled) return;

        const results: Row[] = await Promise.all(
          quizzes.map(async (q) => {
            try {
              const ar = await fetch(`${API}/api/analytics/${q.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (ar.ok) {
                const analytics: Analytics = await ar.json();
                return { ...q, analytics };
              }
            } catch {}
            return { ...q, analytics: null };
          }),
        );

        if (!cancelled) setRows(results);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const totals = useMemo(() => {
    let views = 0;
    let completions = 0;
    let leads = 0;
    for (const r of rows) {
      if (!r.analytics) continue;
      views += r.analytics.views;
      completions += r.analytics.completions;
      leads += r.analytics.leads;
    }
    return {
      views,
      completions,
      leads,
      completion_rate: views > 0 ? (completions / views) * 100 : 0,
      lead_rate: views > 0 ? (leads / views) * 100 : 0,
    };
  }, [rows]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Analytics">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Analytics">
      <PageHeader
        title="Analytics"
        subtitle="Performance across every quiz you've published"
      />

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
          title="No analytics yet"
          body="Once you publish a quiz and start getting visitors, you'll see views, completions, and lead capture rates here."
          action={<PrimaryButton href="/try">+ Create your first quiz</PrimaryButton>}
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard label="Total views" value={fmt(totals.views)} />
            <StatCard label="Completions" value={fmt(totals.completions)} />
            <StatCard label="Leads captured" value={fmt(totals.leads)} accent />
            <StatCard label="Completion rate" value={pct(totals.completion_rate)} />
            <StatCard label="Lead rate" value={pct(totals.lead_rate)} />
          </div>

          <Card padding={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Quiz', 'Status', 'Views', 'Completions', 'Leads', 'Completion rate', ''].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '14px 18px',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: C.TEXT_MUTED,
                          borderBottom: `1px solid ${C.BORDER}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = r.analytics;
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                        <td style={{ padding: '14px 18px', color: C.TEXT, fontWeight: 600 }}>{r.title || 'Untitled'}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <Pill variant={r.status === 'live' ? 'live' : 'draft'}>{r.status}</Pill>
                        </td>
                        <td style={{ padding: '14px 18px', color: C.TEXT }}>{fmt(a?.views ?? 0)}</td>
                        <td style={{ padding: '14px 18px', color: C.TEXT }}>{fmt(a?.completions ?? 0)}</td>
                        <td style={{ padding: '14px 18px', color: C.ACCENT, fontWeight: 700 }}>{fmt(a?.leads ?? 0)}</td>
                        <td style={{ padding: '14px 18px', color: C.TEXT_MUTED }}>{pct(a?.completion_rate ?? 0)}</td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <Link
                            href={`/dashboard/${r.id}`}
                            style={{
                              color: C.ACCENT,
                              fontSize: 12.5,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            View details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
