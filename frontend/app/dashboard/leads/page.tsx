'use client';

/**
 * /dashboard/leads — Unified leads inbox across every quiz the user owns.
 * Queries the backend's new GET /api/leads endpoint, which joins through to
 * quiz title + slug so we can show "Lead X captured on Quiz Y" in one list.
 */

import { useEffect, useMemo, useState } from 'react';

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

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type Lead = {
  id: string;
  name: string | null;
  email: string;
  answers: Record<string, any>;
  outcome_id: string | null;
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
  const header = ['captured_at', 'name', 'email', 'quiz', 'outcome', 'answers'];
  const rows = leads.map((l) => [
    new Date(l.created_at).toISOString(),
    l.name ?? '',
    l.email,
    l.quizzes?.title ?? '',
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
  const { token, status: authStatus } = useDashboardAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizFilter, setQuizFilter] = useState<string>('all');
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
      if (!q) return true;
      return (
        (l.name || '').toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.quizzes?.title || '').toLowerCase().includes(q)
      );
    });
  }, [leads, quizFilter, query]);

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
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(210,255,29,0.4)')}
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
          </div>

          <Card padding={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Name', 'Email', 'Quiz', 'Captured'].map((h) => (
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
                  {filtered.map((l) => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                      <td style={{ padding: '14px 18px', color: C.TEXT, fontWeight: 600 }}>{l.name || '—'}</td>
                      <td style={{ padding: '14px 18px', color: C.TEXT }}>{l.email}</td>
                      <td style={{ padding: '14px 18px' }}>
                        {l.quizzes ? (
                          <Pill variant="accent">{l.quizzes.title}</Pill>
                        ) : (
                          <span style={{ color: C.TEXT_MUTED }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', color: C.TEXT_MUTED }}>{formatDate(l.created_at)}</td>
                    </tr>
                  ))}
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
