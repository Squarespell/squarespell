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
  status: 'live' | 'draft' | 'archived';
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

var AVATAR_COLORS = ['#0D7377', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function formatNumber(n: number): string {
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K';
  }
  return n.toString();
}

function formatDate(dateStr: string): string {
  var date = new Date(dateStr);
  var now = new Date();
  var diffMs = now.getTime() - date.getTime();
  var diffDays = Math.floor(diffMs / 86400000);
  var diffHours = Math.floor(diffMs / 3600000);
  var diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  if (diffDays < 30) return Math.floor(diffDays / 7) + 'w ago';
  if (diffDays < 365) return Math.floor(diffDays / 30) + 'mo ago';
  return Math.floor(diffDays / 365) + 'y ago';
}

function sortQuizzes(quizzes: Quiz[], sortBy: string): Quiz[] {
  var sorted = quizzes.slice();
  if (sortBy === 'newest') {
    sorted.sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
  } else if (sortBy === 'most_views') {
    sorted.sort(function(a, b) { return b.view_count - a.view_count; });
  } else if (sortBy === 'most_leads') {
    sorted.sort(function(a, b) { return b.lead_count - a.lead_count; });
  } else if (sortBy === 'conversion') {
    sorted.sort(function(a, b) {
      var aConv = a.view_count > 0 ? a.lead_count / a.view_count : 0;
      var bConv = b.view_count > 0 ? b.lead_count / b.view_count : 0;
      return bConv - aConv;
    });
  } else {
    sorted.sort(function(a, b) { return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(); });
  }
  return sorted;
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

  // New feature states
  var [activeFilter, setActiveFilter] = useState('all');
  var [sortBy, setSortBy] = useState('recently_updated');
  var [searchText, setSearchText] = useState('');
  var [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  var [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  var [selectMode, setSelectMode] = useState(false);
  var [currentPage, setCurrentPage] = useState(1);
  var [openMenuId, setOpenMenuId] = useState<string | null>(null);
  var [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  var pageSize = 8;

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

  function handlePause(quiz: Quiz) {
    if (!token) return;
    fetch(API + '/api/quizzes/' + quiz.id + '/pause', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(updated: any) {
        if (updated && updated.id) {
          setQuizzes(function(prev) { return prev.map(function(q) { return q.id === updated.id ? Object.assign({}, q, { status: updated.status }) : q; }); });
        }
      })
      .catch(function(e) { console.error('Pause failed:', e); });
  }

  function handleResume(quiz: Quiz) {
    if (!token) return;
    fetch(API + '/api/quizzes/' + quiz.id + '/publish', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(updated: any) {
        if (updated && updated.id) {
          setQuizzes(function(prev) { return prev.map(function(q) { return q.id === updated.id ? Object.assign({}, q, { status: updated.status }) : q; }); });
        }
      })
      .catch(function(e) { console.error('Resume failed:', e); });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0 || !token) return;
    var toDelete = Array.from(selectedIds);
    setDeleting(true);
    var deletePromises = toDelete.map(function(id) {
      return fetch(API + '/api/quizzes/' + id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
    });
    Promise.all(deletePromises)
      .then(function() {
        setQuizzes(function(prev) { return prev.filter(function(q) { return !selectedIds.has(q.id); }); });
        setSelectedIds(new Set());
        setSelectMode(false);
      })
      .catch(function(e) {
        console.error('Bulk delete failed:', e);
      })
      .finally(function() {
        setDeleting(false);
      });
  }

  function handleBulkDuplicate() {
    if (selectedIds.size === 0 || !token || duplicatingId) return;
    var toDuplicate = Array.from(selectedIds);
    setDuplicatingId('bulk');
    var duplicatePromises = toDuplicate.map(function(id) {
      return fetch(API + '/api/quizzes/' + id + '/duplicate', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      }).then(function(res) { return res.json(); });
    });
    Promise.all(duplicatePromises)
      .then(function(created) {
        setQuizzes(function(prev) { return created.concat(prev); });
        setSelectedIds(new Set());
        setSelectMode(false);
      })
      .catch(function(e) {
        console.error('Bulk duplicate failed:', e);
      })
      .finally(function() {
        setDuplicatingId(null);
      });
  }

  function toggleSelectId(id: string) {
    var newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0) {
      setSelectMode(true);
    } else {
      setSelectMode(false);
    }
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

  // Filter quizzes
  var filteredQuizzes = quizzes.filter(function(quiz) {
    var matchesFilter = activeFilter === 'all' || quiz.status === activeFilter;
    var matchesSearch = quiz.title.toLowerCase().indexOf(searchText.toLowerCase()) > -1;
    return matchesFilter && matchesSearch;
  });

  // Sort quizzes
  var sortedQuizzes = sortQuizzes(filteredQuizzes, sortBy);

  // Pagination
  var totalPages = Math.ceil(sortedQuizzes.length / pageSize);
  var paginatedQuizzes = sortedQuizzes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats
  var totalQuizzes = quizzes.length;
  var liveQuizzes = quizzes.filter(function(q) { return q.status === 'live'; }).length;
  var draftQuizzes = quizzes.filter(function(q) { return q.status === 'draft'; }).length;
  var totalViews = quizzes.reduce(function(sum, q) { return sum + q.view_count; }, 0);

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
      topbarRight={<PrimaryButton onClick={function() { setNewQuizOpen(true); }}>+ New quiz</PrimaryButton>}
    >
      <NewQuizModal open={newQuizOpen} onClose={function() { setNewQuizOpen(false); }} />
      <PublishModal
        open={Boolean(publishQuiz)}
        quizTitle={publishQuiz?.title || ''}
        slug={publishQuiz?.slug || ''}
        onClose={function() { setPublishQuiz(null); }}
      />
      <ConfirmDialog
        open={Boolean(deleteQuiz)}
        title="Delete this quiz?"
        description={'"' + (deleteQuiz?.title || 'Untitled quiz') + '" and all its leads, events, and settings will be permanently removed. This cannot be undone.'}
        confirmLabel="Delete quiz"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={function() { return deleting ? null : setDeleteQuiz(null); }}
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
          title="No quizzes yet"
          body="Create your first quiz to start capturing leads and engaging your audience."
          action={<PrimaryButton onClick={function() { setNewQuizOpen(true); }}>+ Create Quiz</PrimaryButton>}
        />
      ) : (
        <div>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: C.BG, border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Quizzes</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.TEXT, marginTop: 4 }}>{totalQuizzes}</div>
              <div style={{ fontSize: 10, color: C.TEXT_MUTED, marginTop: 4 }}>↑ 12% vs last month</div>
            </div>
            <div style={{ background: C.BG, border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Quizzes</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.ACCENT, marginTop: 4 }}>{liveQuizzes}</div>
              <div style={{ fontSize: 10, color: C.TEXT_MUTED, marginTop: 4 }}>↑ 8% vs last month</div>
            </div>
            <div style={{ background: C.BG, border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Drafts</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.TEXT, marginTop: 4 }}>{draftQuizzes}</div>
              <div style={{ fontSize: 10, color: C.TEXT_MUTED, marginTop: 4 }}>↑ 5% vs last month</div>
            </div>
            <div style={{ background: C.BG, border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Views</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.TEXT, marginTop: 4 }}>{formatNumber(totalViews)}</div>
              <div style={{ fontSize: 10, color: C.TEXT_MUTED, marginTop: 4 }}>↑ 23% vs last month</div>
            </div>
          </div>

          {/* Filter tabs and sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'live', 'draft', 'archived'].map(function(filter) {
                return (
                  <button
                    key={filter}
                    onClick={function() { setActiveFilter(filter); setCurrentPage(1); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: activeFilter === filter ? C.ACCENT : 'transparent',
                      color: activeFilter === filter ? '#fff' : C.TEXT_MUTED,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                    }}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={sortBy}
                onChange={function(e) { setSortBy(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid ' + C.BORDER,
                  background: C.BG,
                  color: C.TEXT,
                  fontSize: 12,
                  fontFamily: '"DM Sans",system-ui,sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="recently_updated">Recently updated</option>
                <option value="newest">Newest first</option>
                <option value="most_views">Most views</option>
                <option value="most_leads">Most leads</option>
                <option value="conversion">Highest conversion</option>
              </select>
            </div>
          </div>

          {/* Search and view toggle */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchText}
                  onChange={function(e) { setSearchText(e.target.value); setCurrentPage(1); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: 6,
                    border: '1px solid ' + C.BORDER,
                    background: C.BG,
                    color: C.TEXT,
                    fontSize: 12,
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                  }}
                />
                {searchText && (
                  <button
                    onClick={function() { setSearchText(''); setCurrentPage(1); }}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      color: C.TEXT_MUTED,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={function() { setViewMode('list'); }}
                title="List view"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid ' + (viewMode === 'list' ? C.ACCENT : C.BORDER),
                  background: viewMode === 'list' ? C.ACCENT + '15' : 'transparent',
                  color: viewMode === 'list' ? C.ACCENT : C.TEXT_MUTED,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                onClick={function() { setViewMode('grid'); }}
                title="Grid view"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid ' + (viewMode === 'grid' ? C.ACCENT : C.BORDER),
                  background: viewMode === 'grid' ? C.ACCENT + '15' : 'transparent',
                  color: viewMode === 'grid' ? C.ACCENT : C.TEXT_MUTED,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.ACCENT + '10', border: '1px solid ' + C.ACCENT, borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.TEXT, fontWeight: 600 }}>{selectedIds.size} selected</span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button
                  onClick={handleBulkDuplicate}
                  disabled={duplicatingId === 'bulk'}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid ' + C.BORDER,
                    background: C.BG,
                    color: C.TEXT,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                  }}
                >
                  {duplicatingId === 'bulk' ? 'Duplicating...' : 'Duplicate'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid ' + C.DANGER,
                    background: C.DANGER_LIGHT,
                    color: C.DANGER,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={function() { setSelectedIds(new Set()); setSelectMode(false); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: C.TEXT_MUTED,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* View mode switcher */}
          {viewMode === 'list' ? (
            <div>
              {paginatedQuizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: C.TEXT_MUTED }}>
                  No quizzes found matching your filters.
                </div>
              ) : (
                <div>
                  {paginatedQuizzes.map(function(quiz, index) {
                    var conversion = quiz.view_count > 0 ? Math.round((quiz.lead_count / quiz.view_count) * 100) : 0;
                    var isSelected = selectedIds.has(quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        onMouseEnter={function() { setHoveredRowId(quiz.id); }}
                        onMouseLeave={function() { setHoveredRowId(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderBottom: '1px solid ' + C.BORDER,
                          background: hoveredRowId === quiz.id ? C.BG : 'transparent',
                          transition: 'background 0.2s ease',
                          position: 'relative',
                        }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={function() { toggleSelectId(quiz.id); }}
                          style={{
                            width: 18,
                            height: 18,
                            marginRight: 12,
                            cursor: 'pointer',
                          }}
                        />

                        {/* Avatar */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: getAvatarColor(index),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginRight: 12,
                          }}
                        >
                          {quiz.title.charAt(0).toUpperCase()}
                        </div>

                        {/* Title and subtitle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 2 }}>
                            {quiz.title}
                          </div>
                          <div style={{ fontSize: 11, color: C.TEXT_MUTED }}>
                            {quiz.view_count} views · {quiz.lead_count} leads · {conversion}% conversion
                          </div>
                        </div>

                        {/* Status */}
                        <div style={{ marginRight: 16 }}>
                          <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>
                            {quiz.status}
                          </Pill>
                        </div>

                        {/* Date */}
                        <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginRight: 16, minWidth: 60 }}>
                          {formatDate(quiz.updated_at)}
                        </div>

                        {/* Hover actions */}
                        {hoveredRowId === quiz.id && (
                          <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
                            <button
                              title="Edit"
                              onClick={function() { window.location.href = '/dashboard/' + quiz.id; }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid ' + C.BORDER,
                                background: C.BG,
                                color: C.TEXT_MUTED,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              title="Preview"
                              onClick={function() { window.open('/quiz/' + quiz.slug, '_blank'); }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid ' + C.BORDER,
                                background: C.BG,
                                color: C.TEXT_MUTED,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              title="Share"
                              onClick={function() { setPublishQuiz(quiz); }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid ' + C.BORDER,
                                background: C.BG,
                                color: C.TEXT_MUTED,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                            </button>
                            <button
                              title="Duplicate"
                              onClick={function() { handleDuplicate(quiz); }}
                              disabled={duplicatingId === quiz.id}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid ' + C.BORDER,
                                background: C.BG,
                                color: C.TEXT_MUTED,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 7h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4" />
                                <path d="M20 7h-1a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" />
                                <path d="M4 9l2 2" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Three-dot menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={function() { setOpenMenuId(openMenuId === quiz.id ? null : quiz.id); }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid ' + C.BORDER,
                              background: C.BG,
                              color: C.TEXT_MUTED,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ⋯
                          </button>
                          {openMenuId === quiz.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 32,
                                right: 0,
                                background: '#FFFFFF',
                                border: '1px solid ' + C.BORDER,
                                borderRadius: 8,
                                zIndex: 1000,
                                minWidth: 140,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              }}
                            >
                              {[
                                { label: 'Edit', action: function() { window.location.href = '/dashboard/' + quiz.id; } },
                                { label: 'Preview', action: function() { window.open('/quiz/' + quiz.slug, '_blank'); } },
                                { label: 'Share', action: function() { setPublishQuiz(quiz); setOpenMenuId(null); } },
                                quiz.status === 'live' ? { label: 'Pause', action: function() { handlePause(quiz); setOpenMenuId(null); } } : quiz.status === 'draft' ? { label: 'Resume / Publish', action: function() { handleResume(quiz); setOpenMenuId(null); } } : null,
                                { label: 'Duplicate', action: function() { handleDuplicate(quiz); setOpenMenuId(null); } },
                                { label: 'Archive', action: function() { console.log('Archive:', quiz.id); setOpenMenuId(null); } },
                                { label: 'Delete', action: function() { setDeleteQuiz(quiz); setOpenMenuId(null); }, danger: true },
                              ].filter(Boolean).map(function(item, idx) {
                                return (
                                  <button
                                    key={idx}
                                    onClick={item.action}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: 'none',
                                      color: item.danger ? C.DANGER : C.TEXT,
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      textAlign: 'left',
                                      fontFamily: '"DM Sans",system-ui,sans-serif',
                                      borderBottom: idx < 5 ? '1px solid ' + C.BORDER : 'none',
                                    }}
                                    onMouseEnter={function(e) {
                                      e.currentTarget.style.background = C.BG;
                                    }}
                                    onMouseLeave={function(e) {
                                      e.currentTarget.style.background = 'none';
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid ' + C.BORDER, marginTop: 16 }}>
                      <div style={{ fontSize: 11, color: C.TEXT_MUTED }}>
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedQuizzes.length)} of {sortedQuizzes.length} results
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={function() { setCurrentPage(Math.max(1, currentPage - 1)); }}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 4,
                            border: '1px solid ' + C.BORDER,
                            background: 'transparent',
                            color: currentPage === 1 ? C.TEXT_MUTED : C.TEXT,
                            cursor: currentPage === 1 ? 'default' : 'pointer',
                            fontSize: 12,
                            fontFamily: '"DM Sans",system-ui,sans-serif',
                          }}
                        >
                          «
                        </button>
                        {Array.from({ length: totalPages }).map(function(_, idx) {
                          var pageNum = idx + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={function() { setCurrentPage(pageNum); }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: '1px solid ' + (currentPage === pageNum ? C.ACCENT : C.BORDER),
                                background: currentPage === pageNum ? C.ACCENT : 'transparent',
                                color: currentPage === pageNum ? '#fff' : C.TEXT,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontFamily: '"DM Sans",system-ui,sans-serif',
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={function() { setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 4,
                            border: '1px solid ' + C.BORDER,
                            background: 'transparent',
                            color: currentPage === totalPages ? C.TEXT_MUTED : C.TEXT,
                            cursor: currentPage === totalPages ? 'default' : 'pointer',
                            fontSize: 12,
                            fontFamily: '"DM Sans",system-ui,sans-serif',
                          }}
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Grid view */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {paginatedQuizzes.map(function(quiz, index) {
                var conversion = quiz.view_count > 0 ? Math.round((quiz.lead_count / quiz.view_count) * 100) : 0;
                return (
                  <Card key={quiz.id} padding={16}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: getAvatarColor(index),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {quiz.title.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: C.TEXT, lineHeight: 1.3 }}>
                            {quiz.title}
                          </h3>
                          <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>
                            {quiz.status}
                          </Pill>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: '1px solid ' + C.BORDER, borderBottom: '1px solid ' + C.BORDER }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase' }}>Views</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, marginTop: 2 }}>{formatNumber(quiz.view_count)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase' }}>Leads</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, marginTop: 2 }}>{formatNumber(quiz.lead_count)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase' }}>Conv.</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.ACCENT, marginTop: 2 }}>{conversion}%</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.TEXT_MUTED }}>
                        {formatDate(quiz.updated_at)}
                      </div>
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
