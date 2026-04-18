'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PageLoading, Pill } from '../_components/PageShell';
import { api } from '@/lib/api';

interface ArchivedQuiz {
  id: string;
  title: string;
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface ArchivedCampaign {
  id: string;
  name: string;
  subject: string;
  sent_count?: number;
  created_at: string;
  updated_at: string;
}

type Tab = 'all' | 'quizzes' | 'campaigns';

export default function TrashPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<ArchivedQuiz[]>([]);
  const [campaigns, setCampaigns] = useState<ArchivedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    if (authStatus !== 'ready' || !token) return;
    loadData();
  }, [authStatus, token]);

  async function loadData() {
    try {
      setLoading(true);
      const [q, c] = await Promise.all([
        api.getArchivedQuizzes().catch(() => []),
        api.getArchivedCampaigns().catch(() => []),
      ]);
      setQuizzes(q || []);
      setCampaigns(c || []);
    } finally {
      setLoading(false);
    }
  }

  async function restoreQuiz(id: string) {
    setRestoring(id);
    try {
      await api.restoreQuiz(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch {
    } finally {
      setRestoring(null);
    }
  }

  async function restoreCampaign(id: string) {
    setRestoring(id);
    try {
      await api.restoreCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch {
    } finally {
      setRestoring(null);
    }
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  const totalItems = quizzes.length + campaigns.length;
  const showQuizzes = tab === 'all' || tab === 'quizzes';
  const showCampaigns = tab === 'all' || tab === 'campaigns';

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    background: active ? 'rgba(210,255,29,0.1)' : C.ELEVATED,
    border: `1px solid ${active ? 'rgba(210,255,29,0.25)' : C.BORDER}`,
    color: active ? C.ACCENT : C.TEXT_MUTED,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  const restoreBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${C.ACCENT}`,
    color: C.ACCENT,
    padding: '5px 12px',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  };

  return (
    <DashboardShell>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
        <PageHeader
          title="Trash"
          subtitle="Deleted quizzes and campaigns. Restore items to bring them back as drafts."
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab('all')} style={tabStyle(tab === 'all')}>
            All ({totalItems})
          </button>
          <button onClick={() => setTab('quizzes')} style={tabStyle(tab === 'quizzes')}>
            Quizzes ({quizzes.length})
          </button>
          <button onClick={() => setTab('campaigns')} style={tabStyle(tab === 'campaigns')}>
            Campaigns ({campaigns.length})
          </button>
        </div>

        {totalItems === 0 ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            }
            title="Trash is empty"
            body="Deleted quizzes and campaigns will appear here. You can restore them at any time."
          />
        ) : (
          <>
            {/* Quizzes table */}
            {showQuizzes && quizzes.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <span style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>
                    Quizzes ({quizzes.length})
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Leads</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Views</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deleted</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizzes.map(q => (
                        <tr key={q.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                          <td style={{ padding: '12px 12px', color: C.TEXT, fontWeight: 500 }}>
                            {q.title || 'Untitled quiz'}
                          </td>
                          <td style={{ padding: '12px 12px', color: C.TEXT_MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {(q.lead_count || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 12px', color: C.TEXT_MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {(q.view_count || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 12px', color: C.TEXT_MUTED, fontSize: 12 }}>
                            {new Date(q.updated_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => restoreQuiz(q.id)}
                              disabled={restoring === q.id}
                              style={{
                                ...restoreBtnStyle,
                                opacity: restoring === q.id ? 0.5 : 1,
                              }}
                            >
                              {restoring === q.id ? 'Restoring...' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Campaigns table */}
            {showCampaigns && campaigns.length > 0 && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>
                    Campaigns ({campaigns.length})
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deleted</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                          <td style={{ padding: '12px 12px', color: C.TEXT, fontWeight: 500 }}>
                            {c.name || 'Untitled campaign'}
                          </td>
                          <td style={{ padding: '12px 12px', color: C.TEXT_MUTED, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.subject || 'No subject'}
                          </td>
                          <td style={{ padding: '12px 12px', color: C.TEXT_MUTED, fontSize: 12 }}>
                            {new Date(c.updated_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => restoreCampaign(c.id)}
                              disabled={restoring === c.id}
                              style={{
                                ...restoreBtnStyle,
                                opacity: restoring === c.id ? 0.5 : 1,
                              }}
                            >
                              {restoring === c.id ? 'Restoring...' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
