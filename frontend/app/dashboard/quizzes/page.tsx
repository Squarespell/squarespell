'use client';

/**
 * /dashboard/quizzes - full management view of every quiz the user owns (2026 redesign, "Your quizzes.").
 *
 * The /dashboard overview shows the top-performing subset; this page owns CRUD on the full set: edit, preview,
 * A/B test, share/publish, pause, duplicate, move to Trash (the API archives, so it is restorable) and restore.
 * Grid view shows art-directed project cards; list view is a compact table for scanning.
 */

import { useEffect, useState } from 'react';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  DisplayTitle,
  InlineMetrics,
  SegmentedFilter,
  EmptyState,
  PrimaryButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';
import { ConfirmDialog, PublishModal } from '../_components/Modals';
import { QuizCover } from '../_components/QuizCover';
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

var VIEW_KEY = 'sq_quizzes_view';
var GRID_PAGE_SIZE = 6;
var LIST_PAGE_SIZE = 10;

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/** Inline metric values are shown two-digit ("09 quizzes") as in the design; larger numbers are shown as-is. */
function pad2(n: number): string {
  return n < 10 ? '0' + n : formatNumber(n);
}

function plural(n: number, one: string, many: string): string {
  return formatNumber(n) + ' ' + (n === 1 ? one : many);
}

function formatDate(dateStr: string): string {
  var date = new Date(dateStr);
  var diffMs = Date.now() - date.getTime();
  var diffDays = Math.floor(diffMs / 86400000);
  var diffHours = Math.floor(diffMs / 3600000);
  var diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
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

var ICON = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </svg>
  ),
  list: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <line x1="4.5" y1="6" x2="4.51" y2="6" /><line x1="4.5" y1="12" x2="4.51" y2="12" /><line x1="4.5" y1="18" x2="4.51" y2="18" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

var PAGE_CSS = `
  .sq-qcard { position: relative; background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; transition: border-color .15s, box-shadow .15s; }
  .sq-qcard:hover { border-color: ${C.GRAY_300}; box-shadow: ${C.SHADOW_MD}; }
  .sq-qcard.is-selected { border-color: ${C.ACCENT}; box-shadow: 0 0 0 1px ${C.ACCENT}; }
  .sq-qcard-cover { display: block; border-radius: 7px 7px 0 0; overflow: hidden; }
  .sq-chip-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 13px ${C.FONT}; cursor: pointer; white-space: nowrap; text-decoration: none; }
  .sq-chip-btn:hover { border-color: ${C.GRAY_300}; background: ${C.GRAY_25}; }
  .sq-icon-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; cursor: pointer; font-size: 16px; line-height: 1; }
  .sq-icon-btn:hover { border-color: ${C.GRAY_300}; }
  .sq-check { width: 20px; height: 20px; margin: 0; border-radius: 4px; accent-color: ${C.ACCENT}; cursor: pointer; }
  .sq-qmenu-item { display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; border-radius: 6px; font: 400 14px ${C.FONT}; color: ${C.INK}; cursor: pointer; }
  .sq-qmenu-item:hover { background: ${C.GRAY_50}; }
  .sq-qmenu-item.is-danger { color: ${C.DANGER}; }
  .sq-qrow:hover { background: ${C.GRAY_25}; }
  .sq-qgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  @media (max-width: 1100px) { .sq-qgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 700px) { .sq-qgrid { grid-template-columns: 1fr; } .sq-qtoolbar-right { width: 100%; } .sq-qsearch { flex: 1 1 100%; width: auto !important; } }
`;

export default function QuizzesPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [archived, setArchived] = useState<Quiz[] | null>(null);
  var [archivedLoading, setArchivedLoading] = useState(false);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);
  var [publishQuiz, setPublishQuiz] = useState<Quiz | null>(null);
  var [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null);
  var [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  var [deleting, setDeleting] = useState(false);
  var [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  var [restoringId, setRestoringId] = useState<string | null>(null);
  var [newQuizOpen, setNewQuizOpen] = useState(false);

  var [activeFilter, setActiveFilter] = useState('all');
  var [sortBy, setSortBy] = useState('recently_updated');
  var [searchText, setSearchText] = useState('');
  var [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  var [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  var [currentPage, setCurrentPage] = useState(1);
  var [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Remember the viewer's grid/list choice (a per-browser convenience only).
  useEffect(function() {
    try {
      var saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'list' || saved === 'grid') setViewMode(saved);
    } catch (e) {}
  }, []);
  function changeView(mode: 'list' | 'grid') {
    setViewMode(mode);
    setCurrentPage(1);
    try { localStorage.setItem(VIEW_KEY, mode); } catch (e) {}
  }

  // Close any open overflow menu on an outside click or Escape.
  useEffect(function() {
    if (!openMenuId) return;
    function onDown(e: MouseEvent) {
      var t = e.target as HTMLElement;
      if (!t.closest || !t.closest('[data-qmenu]')) setOpenMenuId(null);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpenMenuId(null); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return function() {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  function authHeaders() {
    return { Authorization: 'Bearer ' + token };
  }

  function confirmDelete() {
    if (!token || !deleteQuiz) return;
    var target = deleteQuiz;
    setDeleting(true);
    fetch(API + '/api/quizzes/' + target.id, { method: 'DELETE', headers: authHeaders() })
      .then(function(res) {
        if (res.ok) {
          setQuizzes(function(prev) { return prev.filter(function(q) { return q.id !== target.id; }); });
          setArchived(null); // refetch the Archived tab next time it is opened
          setSelectedIds(function(prev) { var n = new Set(prev); n.delete(target.id); return n; });
        }
      })
      .catch(function(e) { console.error('Delete failed:', e); })
      .finally(function() {
        setDeleting(false);
        setDeleteQuiz(null);
      });
  }

  function handleDuplicate(quiz: Quiz) {
    if (!token || duplicatingId) return;
    setDuplicatingId(quiz.id);
    fetch(API + '/api/quizzes/' + quiz.id + '/duplicate', { method: 'POST', headers: authHeaders() })
      .then(function(res) {
        if (!res.ok) return res.json().catch(function() { return {}; }).then(function(body: any) { throw new Error(body?.error || 'Duplicate failed'); });
        return res.json();
      })
      .then(function(created: Quiz) {
        if (created && created.id) setQuizzes(function(prev) { return [created, ...prev]; });
      })
      .catch(function(e) { console.error('Duplicate failed:', e); })
      .finally(function() { setDuplicatingId(null); });
  }

  function setStatusFrom(path: string, quiz: Quiz) {
    if (!token) return;
    fetch(API + '/api/quizzes/' + quiz.id + path, { method: 'POST', headers: authHeaders() })
      .then(function(res) { return res.json(); })
      .then(function(updated: any) {
        if (updated && updated.id) {
          setQuizzes(function(prev) { return prev.map(function(q) { return q.id === updated.id ? Object.assign({}, q, { status: updated.status }) : q; }); });
        }
      })
      .catch(function(e) { console.error('Status change failed:', e); });
  }

  function handleRestore(quiz: Quiz) {
    if (!token || restoringId) return;
    setRestoringId(quiz.id);
    fetch(API + '/api/quizzes/' + quiz.id + '/restore', { method: 'POST', headers: authHeaders() })
      .then(function(res) {
        if (!res.ok) throw new Error('Restore failed');
        return res.json();
      })
      .then(function(restored: Quiz) {
        setArchived(function(prev) { return (prev || []).filter(function(q) { return q.id !== quiz.id; }); });
        setQuizzes(function(prev) { return [Object.assign({}, quiz, restored && restored.id ? restored : {}, { status: 'draft' }), ...prev]; });
      })
      .catch(function(e) { console.error('Restore failed:', e); })
      .finally(function() { setRestoringId(null); });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0 || !token) return;
    var toDelete = Array.from(selectedIds);
    setDeleting(true);
    Promise.all(toDelete.map(function(id) {
      return fetch(API + '/api/quizzes/' + id, { method: 'DELETE', headers: authHeaders() }).then(function(res) { return res.ok ? id : null; });
    }))
      .then(function(done) {
        var removed = new Set(done.filter(Boolean) as string[]);
        setQuizzes(function(prev) { return prev.filter(function(q) { return !removed.has(q.id); }); });
        setArchived(null);
        setSelectedIds(new Set());
      })
      .catch(function(e) { console.error('Bulk delete failed:', e); })
      .finally(function() {
        setDeleting(false);
        setBulkDeleteOpen(false);
      });
  }

  function handleBulkDuplicate() {
    if (selectedIds.size === 0 || !token || duplicatingId) return;
    var toDuplicate = Array.from(selectedIds);
    setDuplicatingId('bulk');
    Promise.all(toDuplicate.map(function(id) {
      return fetch(API + '/api/quizzes/' + id + '/duplicate', { method: 'POST', headers: authHeaders() })
        .then(function(res) { return res.ok ? res.json() : null; });
    }))
      .then(function(created) {
        var ok = created.filter(function(q: any) { return q && q.id; });
        setQuizzes(function(prev) { return ok.concat(prev); });
        setSelectedIds(new Set());
      })
      .catch(function(e) { console.error('Bulk duplicate failed:', e); })
      .finally(function() { setDuplicatingId(null); });
  }

  function toggleSelectId(id: string) {
    var next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function fetchQuizzes() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/quizzes', { headers: authHeaders() })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to fetch quizzes');
        return res.json();
      })
      .then(function(data: Quiz[]) {
        setQuizzes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(function(e) {
        console.error('Error fetching quizzes:', e);
        setError(true);
        setLoading(false);
      });
  }

  useEffect(function() { fetchQuizzes(); }, [token]);

  // The Archived filter reads the archived list (quizzes moved to Trash) on demand.
  useEffect(function() {
    if (activeFilter !== 'archived' || archived !== null || !token) return;
    setArchivedLoading(true);
    fetch(API + '/api/quizzes/archived/list', { headers: authHeaders() })
      .then(function(res) { return res.ok ? res.json() : []; })
      .then(function(data: Quiz[]) { setArchived(Array.isArray(data) ? data : []); })
      .catch(function() { setArchived([]); })
      .finally(function() { setArchivedLoading(false); });
  }, [activeFilter, archived, token]);

  function changeFilter(f: string) {
    setActiveFilter(f);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  var isArchivedView = activeFilter === 'archived';
  var source = isArchivedView ? (archived || []) : quizzes;
  var filteredQuizzes = source.filter(function(quiz) {
    var matchesFilter = activeFilter === 'all' || activeFilter === 'archived' || quiz.status === activeFilter;
    var matchesSearch = (quiz.title || '').toLowerCase().indexOf(searchText.trim().toLowerCase()) > -1;
    return matchesFilter && matchesSearch;
  });
  var sortedQuizzes = sortQuizzes(filteredQuizzes, sortBy);
  var pageSize = viewMode === 'grid' ? GRID_PAGE_SIZE : LIST_PAGE_SIZE;
  var totalPages = Math.max(1, Math.ceil(sortedQuizzes.length / pageSize));
  var safePage = Math.min(currentPage, totalPages);
  var paginatedQuizzes = sortedQuizzes.slice((safePage - 1) * pageSize, safePage * pageSize);

  var totalQuizzes = quizzes.length;
  var liveQuizzes = quizzes.filter(function(q) { return q.status === 'live'; }).length;
  var draftQuizzes = quizzes.filter(function(q) { return q.status === 'draft'; }).length;
  var totalViews = quizzes.reduce(function(sum, q) { return sum + (q.view_count || 0); }, 0);

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
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', color: C.INK, marginBottom: 8 }}>
            Could not load your quizzes
          </div>
          <div style={{ fontSize: 15, color: C.GRAY_600, marginBottom: 20 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { fetchQuizzes(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  function menuItems(quiz: Quiz) {
    var items: { label: string; action: () => void; danger?: boolean }[] = [
      { label: 'Edit quiz', action: function() { window.location.href = '/dashboard/' + quiz.id; } },
      { label: 'Preview', action: function() { window.open('/quiz/' + quiz.slug, '_blank', 'noopener'); } },
      { label: 'A/B test', action: function() { window.location.href = '/dashboard/quiz/' + quiz.id + '/ab-testing'; } },
      { label: quiz.status === 'live' ? 'Share' : 'Publish & share', action: function() { setPublishQuiz(quiz); } },
    ];
    if (quiz.status === 'live') items.push({ label: 'Pause', action: function() { setStatusFrom('/pause', quiz); } });
    if (quiz.status === 'draft') items.push({ label: 'Publish now', action: function() { setStatusFrom('/publish', quiz); } });
    items.push({ label: duplicatingId === quiz.id ? 'Duplicating...' : 'Duplicate', action: function() { handleDuplicate(quiz); } });
    items.push({ label: 'Move to Trash', action: function() { setDeleteQuiz(quiz); }, danger: true });
    return items;
  }

  function OverflowMenu({ quiz, onCover }: { quiz: Quiz; onCover?: boolean }) {
    var open = openMenuId === quiz.id;
    return (
      <div data-qmenu style={{ position: 'relative' }}>
        <button
          type="button"
          className="sq-icon-btn"
          aria-label={'More actions for ' + quiz.title}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={function(e) { e.stopPropagation(); setOpenMenuId(open ? null : quiz.id); }}
          style={onCover ? { borderColor: 'transparent' } : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
        </button>
        {open && (
          <div role="menu" style={{ position: 'absolute', top: 38, right: 0, zIndex: 50, minWidth: 190, padding: 6, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, boxShadow: C.SHADOW_LG }}>
            {menuItems(quiz).map(function(item, idx) {
              return (
                <button
                  key={idx}
                  type="button"
                  role="menuitem"
                  className={'sq-qmenu-item' + (item.danger ? ' is-danger' : '')}
                  style={item.danger ? { borderTop: '1px solid ' + C.BORDER_LIGHT, borderRadius: 0, marginTop: 4, paddingTop: 10 } : undefined}
                  onClick={function() { setOpenMenuId(null); item.action(); }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function Meta({ quiz }: { quiz: Quiz }) {
    return (
      <span style={{ fontSize: 13, color: C.GRAY_500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {plural(quiz.view_count || 0, 'view', 'views')}
        <span style={{ margin: '0 7px', color: C.GRAY_300 }}>·</span>
        {plural(quiz.lead_count || 0, 'lead', 'leads')}
        <span style={{ margin: '0 7px', color: C.GRAY_300 }}>·</span>
        Updated {formatDate(quiz.updated_at)}
      </span>
    );
  }

  function StatusPill({ quiz }: { quiz: Quiz }) {
    if (quiz.status === 'archived') return <Pill variant="neutral">In Trash</Pill>;
    return <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>{quiz.status === 'live' ? 'Live' : 'Draft'}</Pill>;
  }

  function PrimaryCardAction({ quiz }: { quiz: Quiz }) {
    if (quiz.status === 'archived') {
      return (
        <button type="button" className="sq-chip-btn" onClick={function() { handleRestore(quiz); }} disabled={restoringId === quiz.id}>
          {restoringId === quiz.id ? 'Restoring...' : 'Restore'}
        </button>
      );
    }
    return (
      <a className="sq-chip-btn" href={'/dashboard/' + quiz.id} aria-label={'Edit ' + quiz.title}>
        Edit quiz
      </a>
    );
  }

  var filterOptions = [
    { value: 'all', label: 'All', count: totalQuizzes },
    { value: 'live', label: 'Live', count: liveQuizzes },
    { value: 'draft', label: 'Drafts', count: draftQuizzes },
    { value: 'archived', label: 'Archived', count: archived ? archived.length : undefined },
  ];

  // Cover art follows creation order so neighbouring cards get different compositions and never reshuffle on sort.
  var coverIndex: Record<string, number> = {};
  quizzes.concat(archived || []).slice().sort(function(a, b) { return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); })
    .forEach(function(q, i) { coverIndex[q.id] = i; });

  var allOnPageSelected = paginatedQuizzes.length > 0 && paginatedQuizzes.every(function(q) { return selectedIds.has(q.id); });

  return (
    <DashboardShell title="Quizzes">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <NewQuizModal open={newQuizOpen} onClose={function() { setNewQuizOpen(false); }} />
      <PublishModal
        open={Boolean(publishQuiz)}
        quizTitle={publishQuiz?.title || ''}
        slug={publishQuiz?.slug || ''}
        onClose={function() { setPublishQuiz(null); }}
      />
      <ConfirmDialog
        open={Boolean(deleteQuiz)}
        title="Move this quiz to Trash?"
        description={'"' + (deleteQuiz?.title || 'Untitled quiz') + '" will stop accepting visitors and move to Trash. Its leads and settings are kept, and you can restore it from the Archived filter or Trash.'}
        confirmLabel="Move to Trash"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={function() { return deleting ? null : setDeleteQuiz(null); }}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={'Move ' + selectedIds.size + ' ' + (selectedIds.size === 1 ? 'quiz' : 'quizzes') + ' to Trash?'}
        description="They stop accepting visitors and move to Trash. Leads and settings are kept, and you can restore them at any time."
        confirmLabel="Move to Trash"
        destructive
        loading={deleting}
        onConfirm={handleBulkDelete}
        onClose={function() { return deleting ? null : setBulkDeleteOpen(false); }}
      />

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">Your quizzes.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600, lineHeight: 1.4 }}>
            Build experiences that turn curiosity into connection.
          </p>
        </div>
        <div style={{ paddingTop: 10 }}>
          <PrimaryButton size="lg" onClick={function() { setNewQuizOpen(true); }}>
            {ICON.plus} Create quiz
          </PrimaryButton>
        </div>
      </div>

      {totalQuizzes === 0 && !isArchivedView ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
          title="Your first quiz starts here."
          body="Create a quiz from your website or a template, then publish it to start capturing leads."
          action={<PrimaryButton onClick={function() { setNewQuizOpen(true); }}>+ Create quiz</PrimaryButton>}
        />
      ) : (
        <>
          <InlineMetrics
            style={{ marginBottom: 40 }}
            items={[
              { value: pad2(totalQuizzes), label: totalQuizzes === 1 ? 'quiz' : 'quizzes' },
              { value: pad2(liveQuizzes), label: 'live' },
              { value: pad2(draftQuizzes), label: draftQuizzes === 1 ? 'draft' : 'drafts' },
              { value: pad2(totalViews), label: totalViews === 1 ? 'view' : 'views', hint: 'Total views across all quizzes' },
            ]}
          />

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <SegmentedFilter options={filterOptions} value={activeFilter} onChange={changeFilter} />
            <div className="sq-qtoolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label className="sq-qsearch" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 400, maxWidth: '100%' }}>
                <span style={{ position: 'absolute', left: 14, color: C.GRAY_500, display: 'flex' }}>{ICON.search}</span>
                <input
                  type="search"
                  aria-label="Search quizzes"
                  placeholder="Search quizzes..."
                  value={searchText}
                  onChange={function(e) { setSearchText(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', height: 42, padding: '0 14px 0 42px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, fontFamily: C.FONT, outline: 'none' }}
                />
              </label>
              <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sort quizzes</span>
                <select
                  value={sortBy}
                  onChange={function(e) { setSortBy(e.target.value); setCurrentPage(1); }}
                  style={{ appearance: 'none', WebkitAppearance: 'none', height: 42, padding: '0 40px 0 16px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer', minWidth: 190 }}
                >
                  <option value="recently_updated">Recently updated</option>
                  <option value="newest">Newest first</option>
                  <option value="most_views">Most views</option>
                  <option value="most_leads">Most leads</option>
                  <option value="conversion">Highest conversion</option>
                </select>
                <span style={{ position: 'absolute', right: 14, pointerEvents: 'none', color: C.INK, display: 'flex' }}>{ICON.chevron}</span>
              </label>
              <div role="group" aria-label="View" style={{ display: 'flex', border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
                {(['grid', 'list'] as const).map(function(mode) {
                  var active = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
                      onClick={function() { changeView(mode); }}
                      style={{ width: 52, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, cursor: 'pointer' }}
                    >
                      {mode === 'grid' ? ICON.grid : ICON.list}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px 10px 18px', background: C.INK, color: '#fff', borderRadius: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedIds.size} selected</span>
              <button type="button" onClick={function() {
                var n = new Set(selectedIds);
                paginatedQuizzes.forEach(function(q) { if (allOnPageSelected) n.delete(q.id); else n.add(q.id); });
                setSelectedIds(n);
              }} style={{ background: 'none', border: 'none', color: C.BRAND_300, fontSize: 14, cursor: 'pointer', fontFamily: C.FONT }}>
                {allOnPageSelected ? 'Clear this page' : 'Select this page'}
              </button>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                {!isArchivedView && (
                  <>
                    <button type="button" className="sq-chip-btn" onClick={handleBulkDuplicate} disabled={duplicatingId === 'bulk'}>
                      {duplicatingId === 'bulk' ? 'Duplicating...' : 'Duplicate'}
                    </button>
                    <button type="button" className="sq-chip-btn" style={{ color: C.DANGER }} onClick={function() { setBulkDeleteOpen(true); }}>
                      Move to Trash
                    </button>
                  </>
                )}
                <button type="button" onClick={function() { setSelectedIds(new Set()); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', padding: '0 10px', fontFamily: C.FONT }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isArchivedView && archivedLoading ? (
            <PageLoading />
          ) : paginatedQuizzes.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
              <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: C.INK, marginBottom: 6 }}>
                {isArchivedView && !searchText ? 'Nothing archived.' : 'No quizzes match.'}
              </div>
              <div style={{ fontSize: 15, color: C.GRAY_600 }}>
                {isArchivedView && !searchText ? 'Quizzes you move to Trash appear here, ready to restore.' : 'Try a different search or filter.'}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="sq-qgrid">
              {paginatedQuizzes.map(function(quiz) {
                var selected = selectedIds.has(quiz.id);
                return (
                  <article key={quiz.id} className={'sq-qcard' + (selected ? ' is-selected' : '')}>
                    <a className="sq-qcard-cover" href={quiz.status === 'archived' ? undefined : '/dashboard/' + quiz.id} tabIndex={-1} aria-hidden="true">
                      <QuizCover id={quiz.id} title={quiz.title} variant={coverIndex[quiz.id]} />
                    </a>
                    <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 5, padding: 3, display: 'flex' }}>
                      <input
                        type="checkbox"
                        className="sq-check"
                        style={{ width: 16, height: 16 }}
                        aria-label={'Select ' + quiz.title}
                        checked={selected}
                        onChange={function() { toggleSelectId(quiz.id); }}
                      />
                    </div>
                    {quiz.status !== 'archived' && (
                      <div style={{ position: 'absolute', top: 10, right: 10 }}>
                        <OverflowMenu quiz={quiz} onCover />
                      </div>
                    )}
                    <div style={{ padding: '16px 16px 18px', borderTop: '1px solid ' + C.BORDER }}>
                      <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: C.INK, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={quiz.title}>
                        {quiz.title || 'Untitled quiz'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <StatusPill quiz={quiz} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}><Meta quiz={quiz} /></div>
                        <PrimaryCardAction quiz={quiz} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 72px minmax(0,1fr) 90px 80px 80px 110px 150px', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid ' + C.BORDER, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.GRAY_500 }}>
                <input
                  type="checkbox"
                  className="sq-check"
                  aria-label="Select all on this page"
                  checked={allOnPageSelected}
                  onChange={function() {
                    var n = new Set(selectedIds);
                    paginatedQuizzes.forEach(function(q) { if (allOnPageSelected) n.delete(q.id); else n.add(q.id); });
                    setSelectedIds(n);
                  }}
                />
                <span />
                <span>Quiz</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Views</span>
                <span style={{ textAlign: 'right' }}>Leads</span>
                <span>Updated</span>
                <span />
              </div>
              {paginatedQuizzes.map(function(quiz, i) {
                return (
                  <div key={quiz.id} className="sq-qrow" style={{ display: 'grid', gridTemplateColumns: '36px 72px minmax(0,1fr) 90px 80px 80px 110px 150px', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT }}>
                    <input type="checkbox" className="sq-check" aria-label={'Select ' + quiz.title} checked={selectedIds.has(quiz.id)} onChange={function() { toggleSelectId(quiz.id); }} />
                    <div style={{ width: 64, height: 44, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + C.BORDER_LIGHT }}>
                      <QuizCover id={quiz.id} title={quiz.title} height={44} compact variant={coverIndex[quiz.id]} />
                    </div>
                    <a href={quiz.status === 'archived' ? undefined : '/dashboard/' + quiz.id} style={{ fontSize: 15, fontWeight: 600, color: C.INK, textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={quiz.title}>
                      {quiz.title || 'Untitled quiz'}
                    </a>
                    <span><StatusPill quiz={quiz} /></span>
                    <span style={{ textAlign: 'right', fontSize: 14, color: C.INK, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(quiz.view_count || 0)}</span>
                    <span style={{ textAlign: 'right', fontSize: 14, color: C.INK, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(quiz.lead_count || 0)}</span>
                    <span style={{ fontSize: 13, color: C.GRAY_500 }}>{formatDate(quiz.updated_at)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <PrimaryCardAction quiz={quiz} />
                      {quiz.status !== 'archived' && <OverflowMenu quiz={quiz} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: count and pagination */}
          {paginatedQuizzes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, color: C.GRAY_600 }}>
                Showing {paginatedQuizzes.length} of {sortedQuizzes.length} {sortedQuizzes.length === 1 ? 'quiz' : 'quizzes'}
              </div>
              {totalPages > 1 && (
                <nav aria-label="Pagination" style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="sq-icon-btn" style={{ width: 36, height: 36, opacity: safePage === 1 ? 0.45 : 1 }} disabled={safePage === 1} aria-label="Previous page" onClick={function() { setCurrentPage(Math.max(1, safePage - 1)); }}>
                    {ICON.arrowLeft}
                  </button>
                  {Array.from({ length: totalPages }).map(function(_, idx) {
                    var n = idx + 1;
                    var active = n === safePage;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={function() { setCurrentPage(n); }}
                        className="sq-icon-btn"
                        style={{ width: 36, height: 36, fontSize: 14, fontWeight: 500, fontFamily: C.FONT, background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, borderColor: active ? C.ACCENT : C.BORDER }}
                      >
                        {n}
                      </button>
                    );
                  })}
                  <button type="button" className="sq-icon-btn" style={{ width: 36, height: 36, opacity: safePage === totalPages ? 0.45 : 1 }} disabled={safePage === totalPages} aria-label="Next page" onClick={function() { setCurrentPage(Math.min(totalPages, safePage + 1)); }}>
                    {ICON.arrow}
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
