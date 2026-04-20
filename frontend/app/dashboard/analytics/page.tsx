'use client';

/**
 * /dashboard/analytics - Roll-up analytics across every quiz the user owns.
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

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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
  var { token, status: authStatus } = useDashboardAuth();
  var [rows, setRows] = useState<Row[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);

  function fetchData() {
    if (!token) return;
    setLoading(true);
    setError(false);

    fetch(API + '/api/quizzes', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load quizzes');
        return res.json();
      })
      .then(function(quizzes: Quiz[]) {
        return Promise.all(
          quizzes.map(function(q) {
            return fetch(API + '/api/analytics/' + q.id, {
              headers: { Authorization: 'Bearer ' + token },
            })
              .then(function(ar) {
                if (ar.ok) return ar.json().then(function(analytics: Analytics) { return { ...q, analytics: analytics }; });
                return { ...q, analytics: null };
              })
              .catch(function() { return { ...q, analytics: null }; });
          }),
        );
      })
      .then(function(results: Row[]) {
        setRows(results);
        setLoading(false);
      })
      .catch(function(e) {
        console.error(e);
        setError(true);
        setLoading(false);
      });
  }

  useEffect(function() { fetchData(); }, [token]);

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

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Analytics">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Analytics">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
            Could not load analytics
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { fetchData(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Analytics">
      <PageHeader
        title="Analytics"
        subtitle="Performance across every quiz you've published"
        actions={
          <Link
            href="/dashboard/analytics/attribution"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 20px', background: 'transparent',
              color: C.TEXT, border: '1px solid ' + C.BORDER,
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', fontFamily: '"DM Sans",system-ui,sans-serif',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
            Attribution
          </Link>
        }
      />

      {rows.length === 0 ? (
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
          action={<PrimaryButton href="/tools/quiz-funnel/build">+ Create your first quiz</PrimaryButton>}
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
                  <tr style={{ background: C.BG }}>
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
