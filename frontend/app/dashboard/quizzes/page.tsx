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
  var { token, status: authStatus } = useDashboardAuth();
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);
  var [publishQuiz, setPublishQuiz] = useState<Quiz | null>(null);
  var [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null);
  var [deleting, setDeleting] = useState(false);
  var [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  var [newQuizOpen, setNewQuizOpen] = useState(false);

  function confirmDelete() {
    if (!token || !deleteQuiz) return;
    setDeleting(true);
    fetch(API + '/api/quizzes/' + deleteQuiz.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (res.ok) {
          setQuizzes(function(prev) { return prev.filter(function(q) { return q.id !== deleteQuiz.id; }); });
        }
      })
      .catch(function(e) {
        console.error('Delete failed:', e);
      })
      .finally(function() {
        setDeleting(false);
        setDeleteQuiz(null);
      });
  }

  function handleDuplicate(quiz: Quiz) {
    if (!token || duplicatingId) return;
    setDuplicatingId(quiz.id);
    fetch(API + '/api/quizzes/' + quiz.id + '/duplicate', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (!res.ok) return res.json().catch(function() { return {}; }).then(function(body: any) { throw new Error(body?.error || 'Duplicate failed'); });
        return res.json();
      })
      .then(function(created: Quiz) {
        setQuizzes(function(prev) { return [created, ...prev]; });
      })
      .catch(function(e) {
        console.error('Duplicate failed:', e);
      })
      .finally(function() {
        setDuplicatingId(null);
      });
  }

  function fetchQuizzes() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to fetch quizzes');
        return res.json();
      })
      .then(function(data: Quiz[]) {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(function(e) {
        console.error('Error fetching quizzes:', e);
        setError(true);
        setLoading(false);
      });
  }

  useEffect(function() { fetchQuizzes(); }, [token]);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Quizzes">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Quizzes">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
            Could not load quizzes
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { fetchQuizzes(); }}>Retry</PrimaryButton>
        </div>
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

      {quizzes.length === 0 ? (
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
            <Card key={quiz.id} padding={16}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Title + status row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: 15,
                        fontWeight: 700,
                        color: C.TEXT,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={quiz.title}
                    >
                      {quiz.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>{quiz.status}</Pill>
                      <span style={{ fontSize: 12, color: C.TEXT_MUTED }}>{formatDate(quiz.created_at)}</span>
                    </div>
                  </div>
                  {/* Delete icon button - top right */}
                  <button
                    type="button"
                    onClick={function(e) { e.stopPropagation(); setDeleteQuiz(quiz); }}
                    title="Delete quiz"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      background: 'transparent',
                      border: '1px solid ' + C.BORDER,
                      color: C.TEXT_MUTED,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                    }}
                    onMouseEnter={function(e) {
                      e.currentTarget.style.background = C.DANGER_LIGHT;
                      e.currentTarget.style.borderColor = C.DANGER;
                      e.currentTarget.style.color = C.DANGER;
                    }}
                    onMouseLeave={function(e) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = C.BORDER;
                      e.currentTarget.style.color = C.TEXT_MUTED;
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>

                {/* Inline stats row */}
                <div style={{ display: 'flex', gap: 16, padding: '8px 0', borderTop: '1px solid ' + C.BORDER, borderBottom: '1px solid ' + C.BORDER }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Views</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginTop: 2 }}>{formatNumber(quiz.view_count)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginTop: 2 }}>{formatNumber(quiz.lead_count)}</div>
                  </div>
                  {quiz.view_count > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conv.</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.ACCENT, marginTop: 2 }}>{quiz.view_count > 0 ? Math.round((quiz.lead_count / quiz.view_count) * 100) : 0}%</div>
                    </div>
                  )}
                </div>

                {/* Compact action row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <GhostButton href={'/dashboard/' + quiz.id}>Edit</GhostButton>
                  <GhostButton href={'/quiz/' + quiz.slug} target="_blank">View live</GhostButton>
                  <GhostButton onClick={function() { setPublishQuiz(quiz); }}>
                    {quiz.status === 'live' ? 'Share' : 'Publish'}
                  </GhostButton>
                  <GhostButton
                    onClick={function() { handleDuplicate(quiz); }}
                    disabled={duplicatingId === quiz.id}
                  >
                    {duplicatingId === quiz.id ? 'Duplicating...' : 'Duplicate'}
                  </GhostButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
