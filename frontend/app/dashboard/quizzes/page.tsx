'use client';

/**
 * /dashboard/quizzes - full management grid of every quiz the user owns.
 *
 * The /dashboard overview shows the top-performing subset; this page owns
 * CRUD on the full set (edit, view live, embed, delete).
 */

import { useEffect, useState } from 'react';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';
import { ConfirmDialog, PublishModal } from '../_components/Modals';
import { NewQuizModal } from './_components/NewQuizModal';

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

export default function QuizzesPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishQuiz, setPublishQuiz] = useState<Quiz | null>(null);
  const [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [newQuizOpen, setNewQuizOpen] = useState(false);

  const confirmDelete = async () => {
    if (!token || !deleteQuiz) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/quizzes/${deleteQuiz.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== deleteQuiz.id));
      }
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
      setDeleteQuiz(null);
    }
  };

  const handleDuplicate = async (quiz: Quiz) => {
    if (!token || duplicatingId) return;
    setDuplicatingId(quiz.id);
    try {
      const res = await fetch(`${API}/api/quizzes/${quiz.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Duplicate failed');
      }
      const created: Quiz = await res.json();
      // Inject the new draft at the top of the list
      setQuizzes((prev) => [created, ...prev]);
    } catch (e) {
      console.error('Duplicate failed:', e);
    } finally {
      setDuplicatingId(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch quizzes');
        const data: Quiz[] = await res.json();
        if (!cancelled) setQuizzes(data);
      } catch (e) {
        console.error('Error fetching quizzes:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Quizzes">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Quizzes"
      topbarRight={<PrimaryButton onClick={() => setNewQuizOpen(true)}>+ New quiz</PrimaryButton>}
    >
      <NewQuizModal open={newQuizOpen} onClose={() => setNewQuizOpen(false)} />
      <PublishModal
        open={Boolean(publishQuiz)}
        quizTitle={publishQuiz?.title || ''}
        slug={publishQuiz?.slug || ''}
        onClose={() => setPublishQuiz(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteQuiz)}
        title="Delete this quiz?"
        description={`"${deleteQuiz?.title || 'Untitled quiz'}" and all its leads, events, and settings will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete quiz"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => (deleting ? null : setDeleteQuiz(null))}
      />

      <PageHeader title="All quizzes" subtitle="Create, edit, and publish your AI-powered quiz funnels." />

      {loading ? (
        <PageLoading />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
          title="Create your first quiz"
          body="Get started with an AI-built quiz funnel that captures qualified leads in minutes."
          action={<PrimaryButton onClick={() => setNewQuizOpen(true)}>Build your first quiz</PrimaryButton>}
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
                  <GhostButton onClick={() => setPublishQuiz(quiz)}>
                    {quiz.status === 'live' ? 'Share' : 'Publish'}
                  </GhostButton>
                  <GhostButton
                    onClick={() => handleDuplicate(quiz)}
                    disabled={duplicatingId === quiz.id}
                  >
                    {duplicatingId === quiz.id ? 'Duplicating…' : 'Duplicate'}
                  </GhostButton>
                  <button
                    type="button"
                    onClick={() => setDeleteQuiz(quiz)}
                    style={{
                      gridColumn: '1 / -1',
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
