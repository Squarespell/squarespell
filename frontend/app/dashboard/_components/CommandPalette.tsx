'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD_COLORS as C } from './dashboardColors';
import { api } from '../../../lib/api';
import { listCampaigns, type Campaign } from '../../../lib/emails';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SearchResult = {
  id: string;
  type: 'quiz' | 'campaign' | 'page';
  title: string;
  subtitle?: string;
  href: string;
};

type Quiz = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
};

/* ------------------------------------------------------------------ */
/*  Static page entries (always shown when query is empty)             */
/* ------------------------------------------------------------------ */

const PAGES: SearchResult[] = [
  { id: 'p-overview', type: 'page', title: 'Overview', href: '/dashboard' },
  { id: 'p-quizzes', type: 'page', title: 'Quizzes', href: '/dashboard/quizzes' },
  { id: 'p-editor', type: 'page', title: 'Quiz editor', href: '/dashboard/editor' },
  { id: 'p-leads', type: 'page', title: 'Leads', href: '/dashboard/leads' },
  { id: 'p-emails', type: 'page', title: 'Emails', href: '/dashboard/emails' },
  { id: 'p-templates', type: 'page', title: 'Templates', href: '/dashboard/emails/templates' },
  { id: 'p-analytics', type: 'page', title: 'Analytics', href: '/dashboard/analytics' },
  { id: 'p-embed', type: 'page', title: 'Embed & install', href: '/dashboard/embed' },
  { id: 'p-integrations', type: 'page', title: 'Integrations', href: '/dashboard/integrations' },
  { id: 'p-brand', type: 'page', title: 'Brand kit', href: '/dashboard/brand-kit' },
  { id: 'p-billing', type: 'page', title: 'Billing & plan', href: '/dashboard/billing' },
  { id: 'p-trash', type: 'page', title: 'Trash', href: '/dashboard/trash' },
  { id: 'p-settings', type: 'page', title: 'Settings', href: '/dashboard/settings' },
  { id: 'p-deliverability', type: 'page', title: 'Deliverability', href: '/dashboard/emails/deliverability' },
  { id: 'p-suppressions', type: 'page', title: 'Suppression list', href: '/dashboard/emails/suppressions' },
];

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG - no emoji)                                      */
/* ------------------------------------------------------------------ */

function IconSearch() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconQuiz() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconCampaign() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconPage() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ---- keyboard shortcut: Cmd+K / Ctrl+K ---- */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(function (v) { return !v; });
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return function () { window.removeEventListener('keydown', onKeyDown); };
  }, []);

  /* ---- fetch data on first open ---- */
  useEffect(() => {
    if (!open || loaded) return;
    var cancelled = false;
    (async function () {
      try {
        var results = await Promise.allSettled([
          api.getQuizzes(),
          listCampaigns(),
        ]);
        if (cancelled) return;
        if (results[0].status === 'fulfilled') {
          setQuizzes(Array.isArray(results[0].value) ? results[0].value : []);
        }
        if (results[1].status === 'fulfilled') {
          setCampaigns(Array.isArray(results[1].value) ? results[1].value : []);
        }
        setLoaded(true);
      } catch (_e) {
        setLoaded(true);
      }
    })();
    return function () { cancelled = true; };
  }, [open, loaded]);

  /* ---- focus input on open ---- */
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(function () {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [open]);

  /* ---- build search results ---- */
  var results: SearchResult[] = [];
  var q = query.toLowerCase().trim();

  if (q.length > 0) {
    // quizzes
    quizzes.forEach(function (quiz) {
      if ((quiz.title || '').toLowerCase().indexOf(q) !== -1 || (quiz.slug || '').toLowerCase().indexOf(q) !== -1) {
        results.push({
          id: 'q-' + quiz.id,
          type: 'quiz',
          title: quiz.title || 'Untitled quiz',
          subtitle: quiz.status || 'draft',
          href: '/dashboard/' + quiz.id,
        });
      }
    });
    // campaigns
    campaigns.forEach(function (c) {
      if ((c.name || '').toLowerCase().indexOf(q) !== -1 || (c.subject || '').toLowerCase().indexOf(q) !== -1) {
        results.push({
          id: 'c-' + c.id,
          type: 'campaign',
          title: c.name || c.subject || 'Untitled campaign',
          subtitle: c.status,
          href: '/dashboard/emails/' + c.id,
        });
      }
    });
    // pages
    PAGES.forEach(function (p) {
      if (p.title.toLowerCase().indexOf(q) !== -1) {
        results.push(p);
      }
    });
  } else {
    // no query: show pages as quick nav
    results = PAGES.slice(0, 8);
  }

  // cap results
  if (results.length > 20) results = results.slice(0, 20);

  /* ---- navigate to result ---- */
  var navigate = useCallback(function (r: SearchResult) {
    setOpen(false);
    router.push(r.href);
  }, [router]);

  /* ---- keyboard nav ---- */
  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(function (i) { return Math.min(i + 1, results.length - 1); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(function (i) { return Math.max(i - 1, 0); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIdx]) navigate(results[activeIdx]);
    }
  }

  /* ---- keep active item visible ---- */
  useEffect(() => {
    if (!listRef.current) return;
    var active = listRef.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  /* ---- reset active when query changes ---- */
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  if (!open) return null;

  function typeIcon(type: string) {
    if (type === 'quiz') return <IconQuiz />;
    if (type === 'campaign') return <IconCampaign />;
    return <IconPage />;
  }

  return (
    <div
      onClick={function () { setOpen(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '18vh',
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation(); }}
        style={{
          width: '100%',
          maxWidth: 560,
          background: C.SURFACE,
          border: '1px solid ' + C.BORDER,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid ' + C.BORDER,
        }}>
          <span style={{ color: C.TEXT_SUBTLE, display: 'flex' }}><IconSearch /></span>
          <input
            ref={inputRef}
            value={query}
            onChange={function (e) { setQuery(e.target.value); }}
            onKeyDown={onInputKeyDown}
            placeholder="Search quizzes, campaigns, pages..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: C.TEXT,
              fontSize: 15,
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 11,
            color: C.TEXT_SUBTLE,
            background: C.ELEVATED,
            border: '1px solid ' + C.BORDER,
            borderRadius: 5,
            padding: '2px 6px',
            fontFamily: 'ui-monospace,monospace',
          }}>esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 6px' }}>
          {results.length === 0 && q.length > 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: C.TEXT_SUBTLE, fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
          {results.map(function (r, idx) {
            var isActive = idx === activeIdx;
            return (
              <button
                key={r.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={function () { navigate(r); }}
                onMouseEnter={function () { setActiveIdx(idx); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  background: isActive ? C.ACCENT_LIGHT : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s ease',
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: C.ELEVATED,
                  border: '1px solid ' + C.BORDER,
                  color: isActive ? C.ACCENT : C.TEXT_MUTED,
                  flexShrink: 0,
                }}>
                  {typeIcon(r.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? C.TEXT : C.TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  {r.subtitle ? (
                    <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 1 }}>{r.subtitle}</div>
                  ) : null}
                </div>
                <span style={{ fontSize: 10, color: C.TEXT_SUBTLE, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
                  {r.type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid ' + C.BORDER,
          display: 'flex',
          gap: 14,
          fontSize: 11,
          color: C.TEXT_SUBTLE,
        }}>
          <span>
            <kbd style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 4, padding: '1px 5px' }}>
              ↑↓
            </kbd>
            {' '}navigate
          </span>
          <span>
            <kbd style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 4, padding: '1px 5px' }}>
              ↵
            </kbd>
            {' '}open
          </span>
          <span>
            <kbd style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 4, padding: '1px 5px' }}>
              esc
            </kbd>
            {' '}close
          </span>
        </div>
      </div>
    </div>
  );
}
