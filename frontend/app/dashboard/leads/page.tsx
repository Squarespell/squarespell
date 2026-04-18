'use client';

/**
 * /dashboard/leads - Unified leads inbox across every quiz the user owns.
 * Queries the backend's new GET /api/leads endpoint, which joins through to
 * quiz title + slug so we can show "Lead X captured on Quiz Y" in one list.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  PageLoading,
  Pill,
} from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Lead = {
  id: string;
  name: string | null;
  email: string;
  answers: Record<string, any>;
  outcome_id: string | null;
  score?: number | null;
  score_label?: string;
  created_at: string;
  quiz_id: string;
  quizzes?: { id: string; title: string; slug: string } | null;
};

function formatDate(s: string) {
  const d = new Date(s);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function downloadCsv(leads: Lead[]) {
  const header = ['captured_at', 'name', 'email', 'quiz', 'score', 'score_label', 'outcome', 'answers'];
  const rows = leads.map((l) => [
    new Date(l.created_at).toISOString(),
    l.name ?? '',
    l.email,
    l.quizzes?.title ?? '',
    l.score ?? '',
    l.score_label ?? '',
    l.outcome_id ?? '',
    JSON.stringify(l.answers ?? {}),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `squarespell-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const router = useRouter();
  const { token, status: authStatus } = useDashboardAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizFilter, setQuizFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/api/leads?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load leads');
        const data = await res.json();
        if (!cancelled) setLeads(Array.isArray(data) ? data : []);
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

  const quizzes = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) {
      if (l.quizzes?.id) map.set(l.quizzes.id, l.quizzes.title || 'Untitled');
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (quizFilter !== 'all' && l.quizzes?.id !== quizFilter) return false;

      // Apply score filter
      if (scoreFilter !== 'all') {
        if (scoreFilter === 'hot' && l.score_label !== 'Hot') return false;
        if (scoreFilter === 'warm' && l.score_label !== 'Warm') return false;
        if (scoreFilter === 'cold' && l.score_label !== 'Cold') return false;
      }

      if (!q) return true;
      return (
        (l.name || '').toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.quizzes?.title || '').toLowerCase().includes(q)
      );
    });
  }, [leads, quizFilter, scoreFilter, query]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Leads">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Leads"
      topbarRight={
        leads.length > 0 ? (
          <GhostButton onClick={() => downloadCsv(filtered)}>Export CSV</GhostButton>
        ) : null
      }
    >
      <PageHeader
        title="Leads"
        subtitle="Everyone who completed one of your quizzes"
      />

      {loading ? (
        <PageLoading />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          title="No leads yet"
          body="As soon as someone completes one of your quizzes, they'll show up here. Install your quiz on your Squarespace site to start capturing leads."
          action={<PrimaryButton href="/dashboard/embed">Get the embed code</PrimaryButton>}
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <input
              type="search"
              placeholder="Search by name, email, or quiz…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: '1 1 280px',
                padding: '11px 16px',
                background: C.SURFACE,
                border: `1px solid ${C.BORDER}`,
                borderRadius: 10,
                fontSize: 13.5,
                color: C.TEXT,
                fontFamily: '"DM Sans",system-ui,sans-serif',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.ACCENT)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.BORDER)}
            />
            <select
              value={quizFilter}
              onChange={(e) => setQuizFilter(e.target.value)}
              style={{
                padding: '11px 16px',
                background: C.SURFACE,
                border: `1px solid ${C.BORDER}`,
                borderRadius: 10,
                fontSize: 13.5,
                color: C.TEXT,
                fontFamily: '"DM Sans",system-ui,sans-serif',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All quizzes ({leads.length})</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              style={{
                padding: '11px 16px',
                background: C.SURFACE,
                border: `1px solid ${C.BORDER}`,
                borderRadius: 10,
                fontSize: 13.5,
                color: C.TEXT,
                fontFamily: '"DM Sans",system-ui,sans-serif',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All scores</option>
              <option value="hot">Hot (80+)</option>
              <option value="warm">Warm (50-79)</option>
              <option value="cold">Cold (0-49)</option>
            </select>
          </div>

          <Card padding={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: C.SIDEBAR }}>
                    {['Name', 'Email', 'Quiz', 'Score', 'Captured'].map((h) => (
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
                  {filtered.map((l) => {
                    // Determine score badge color based on label
                    const scoreColor =
                      l.score_label === 'Hot'
                        ? '#22c55e'
                        : l.score_label === 'Warm'
                          ? '#f59e0b'
                          : l.score_label === 'Cold'
                            ? '#9ca3af'
                            : '#6b7280';
                    const scoreBg =
                      l.score_label === 'Hot'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : l.score_label === 'Warm'
                          ? 'rgba(245, 158, 11, 0.1)'
                          : l.score_label === 'Cold'
                            ? 'rgba(156, 163, 175, 0.1)'
                            : 'rgba(107, 114, 128, 0.1)';

                    return (
                      <tr
                        key={l.id}
                        style={{
                          borderBottom: `1px solid ${C.BORDER}`,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onClick={() => router.push(`/dashboard/leads/${l.id}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.SIDEBAR)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 18px', color: C.TEXT, fontWeight: 600 }}>{l.name || '-'}</td>
                        <td style={{ padding: '14px 18px', color: C.TEXT }}>{l.email}</td>
                        <td style={{ padding: '14px 18px' }}>
                          {l.quizzes ? (
                            <Pill variant="accent">{l.quizzes.title}</Pill>
                          ) : (
                            <span style={{ color: C.TEXT_MUTED }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {l.score !== null && l.score !== undefined ? (
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: scoreColor,
                                background: scoreBg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {l.score_label || 'Unknown'} ({l.score})
                            </div>
                          ) : (
                            <span style={{ color: C.TEXT_MUTED, fontSize: 12 }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', color: C.TEXT_MUTED }}>{formatDate(l.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 14 }}>
                  No leads match your filters.
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
