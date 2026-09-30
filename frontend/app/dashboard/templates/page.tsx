'use client';

/**
 * /dashboard/templates — Template gallery (2026 redesign, screen 13: "Start with a great question.").
 *
 * Photographic cards with real per-template facts (question count, whether a lead gate is included, outcome count,
 * all computed from the template's blocks), search, the four largest categories as pills plus a "More" menu for the
 * rest, and Preview / Use template actions.
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QUIZ_TEMPLATE_CATALOG, getTemplateCategories, getTemplateThumbnail } from '../../../lib/quiz/templates';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { DisplayTitle } from '../_components/PageShell';

var CATEGORY_ICONS: Record<string, string> = {
  'Photography':           'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z',
  'Food & Dining':         'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  'Fitness & Wellness':    'M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11',
  'Online Store':          'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
};

function catLabel(cat: string): string {
  if (cat === 'Fitness & Wellness') return 'Fitness';
  if (cat === 'Online Store') return 'Store';
  return cat;
}

type Meta = { thumb: string | null; questions: number; outcomes: number; leadGate: boolean };

var PAGE_CSS = `
  .sq-tgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .sq-tcard { background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; transition: border-color .15s, box-shadow .15s; }
  .sq-tcard:hover { border-color: ${C.GRAY_300}; box-shadow: ${C.SHADOW_MD}; }
  .sq-tcard:hover .sq-timg { transform: scale(1.03); }
  .sq-timg { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; display: block; }
  .sq-tpill { display: inline-flex; align-items: center; gap: 10px; height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; white-space: nowrap; }
  .sq-tpill[aria-pressed="true"] { background: ${C.INK}; border-color: ${C.INK}; color: #fff; }
  .sq-tbtn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 42px; border-radius: 6px; font: 600 15px ${C.FONT}; text-decoration: none; cursor: pointer; }
  @media (max-width: 1100px) { .sq-tgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sq-t-art { display: none; } }
  @media (max-width: 700px) { .sq-tgrid { grid-template-columns: 1fr; } }
`;

export default function DashboardTemplatesPage() {
  var router = useRouter();
  var categories = useMemo(function() { return getTemplateCategories(); }, []);
  var [activeFilter, setActiveFilter] = useState('All');
  var [searchQuery, setSearchQuery] = useState('');
  var [moreOpen, setMoreOpen] = useState(false);

  // Largest four categories become pills; the rest live under "More".
  var counts = useMemo(function() {
    var c: Record<string, number> = {};
    QUIZ_TEMPLATE_CATALOG.forEach(function(t) { c[t.category] = (c[t.category] || 0) + 1; });
    return c;
  }, []);
  var primaryCats = useMemo(function() {
    return categories.slice().sort(function(a, b) { return (counts[b] || 0) - (counts[a] || 0) || categories.indexOf(a) - categories.indexOf(b); }).slice(0, 4)
      .sort(function(a, b) { return categories.indexOf(a) - categories.indexOf(b); });
  }, [categories, counts]);
  var moreCats = categories.filter(function(c) { return primaryCats.indexOf(c) < 0; });

  useEffect(function() {
    if (!moreOpen) return;
    function close(e: MouseEvent) { var t = e.target as HTMLElement; if (!t.closest || !t.closest('[data-more]')) setMoreOpen(false); }
    document.addEventListener('mousedown', close);
    return function() { document.removeEventListener('mousedown', close); };
  }, [moreOpen]);

  var meta = useMemo(function() {
    var m: Record<string, Meta> = {};
    QUIZ_TEMPLATE_CATALOG.forEach(function(t) {
      var blocks = t.blocks();
      m[t.id] = {
        thumb: getTemplateThumbnail(t.id),
        questions: blocks.filter(function(b) { return b.type === 'question'; }).length,
        outcomes: blocks.filter(function(b) { return b.type === 'outcome'; }).length,
        leadGate: blocks.some(function(b) { return b.type === 'leadGate'; }),
      };
    });
    return m;
  }, []);

  var filtered = useMemo(function() {
    var result = QUIZ_TEMPLATE_CATALOG;
    if (activeFilter !== 'All') result = result.filter(function(t) { return t.category === activeFilter; });
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function(t) {
        return t.name.toLowerCase().indexOf(q) !== -1 || t.description.toLowerCase().indexOf(q) !== -1 ||
          t.tags.some(function(tag) { return tag.toLowerCase().indexOf(q) !== -1; });
      });
    }
    return result;
  }, [activeFilter, searchQuery]);

  var total = QUIZ_TEMPLATE_CATALOG.length;
  var activeIsMore = moreCats.indexOf(activeFilter) > -1;

  return (
    <DashboardShell title="Templates">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">Start with a great question.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.6vw, 22px)', color: C.GRAY_600 }}>{total} templates, ready for your brand.</p>
        </div>
        <svg className="sq-t-art" width="300" height="140" viewBox="0 0 300 140" aria-hidden="true" style={{ flexShrink: 0, marginTop: -8 }}>
          <rect x="140" y="0" width="60" height="40" fill={C.ACID} />
          <path d="M150 140 C 150 80, 190 30, 260 20" fill="none" stroke={C.INK} strokeWidth="1.2" />
          <rect x="220" y="14" width="80" height="120" fill={C.PERIWINKLE} />
          <line x1="12" y1="24" x2="12" y2="120" stroke={C.GRAY_300} />
          <text x="28" y="44" fontSize="10" letterSpacing="2.6" fill={C.INK} fontFamily="Inter">TURN</text>
          <text x="28" y="60" fontSize="10" letterSpacing="2.6" fill={C.INK} fontFamily="Inter">CURIOSITY</text>
          <text x="28" y="76" fontSize="10" letterSpacing="2.6" fill={C.INK} fontFamily="Inter">INTO</text>
          <text x="28" y="92" fontSize="10" letterSpacing="2.6" fill={C.INK} fontFamily="Inter">CONNECTION.</text>
        </svg>
      </div>

      {/* Search + categories */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 320px', maxWidth: 620 }}>
          <span style={{ position: 'absolute', left: 16, color: C.GRAY_600, display: 'flex' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </span>
          <input type="search" aria-label="Search templates" placeholder="Search templates..." value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
            style={{ width: '100%', height: 46, padding: '0 16px 0 46px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 16, fontFamily: C.FONT }} />
        </label>
        <div role="group" aria-label="Template categories" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="sq-tpill" aria-pressed={activeFilter === 'All'} onClick={function() { setActiveFilter('All'); }} style={{ minWidth: 80, justifyContent: 'center' }}>All</button>
          {primaryCats.map(function(cat) {
            return (
              <button key={cat} type="button" className="sq-tpill" aria-pressed={activeFilter === cat} onClick={function() { setActiveFilter(cat); }}>
                {CATEGORY_ICONS[cat] && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CATEGORY_ICONS[cat]} /></svg>
                )}
                {catLabel(cat)}
              </button>
            );
          })}
          {moreCats.length > 0 && (
            <div data-more style={{ position: 'relative' }}>
              <button type="button" className="sq-tpill" aria-haspopup="menu" aria-expanded={moreOpen} aria-pressed={activeIsMore} onClick={function() { setMoreOpen(!moreOpen); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                {activeIsMore ? activeFilter : 'More'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {moreOpen && (
                <div role="menu" style={{ position: 'absolute', top: 50, right: 0, zIndex: 40, minWidth: 240, padding: 6, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, boxShadow: C.SHADOW_LG }}>
                  {moreCats.map(function(cat) {
                    return (
                      <button key={cat} type="button" role="menuitem" onClick={function() { setActiveFilter(cat); setMoreOpen(false); }}
                        style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '9px 12px', border: 'none', borderRadius: 6, background: activeFilter === cat ? C.GRAY_50 : 'transparent', color: C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer', textAlign: 'left' }}>
                        {cat}<span style={{ color: C.GRAY_500 }}>{counts[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 24, fontWeight: 500, color: C.INK }}>No templates found.</div>
          <p style={{ fontSize: 15, color: C.GRAY_600, margin: '6px 0 18px' }}>Try a different search or category.</p>
          <button type="button" onClick={function() { setActiveFilter('All'); setSearchQuery(''); }} className="sq-tbtn" style={{ flex: 'none', padding: '0 20px', background: C.ACCENT, color: '#fff', border: 'none' }}>Show all templates</button>
        </div>
      ) : (
        <div className="sq-tgrid">
          {filtered.map(function(t) {
            var m = meta[t.id] || { thumb: null, questions: 0, outcomes: 0, leadGate: false };
            return (
              <article key={t.id} className="sq-tcard">
                <Link href={'/dashboard/templates/' + t.id} tabIndex={-1} aria-hidden="true" style={{ position: 'relative', display: 'block', height: 170, overflow: 'hidden', background: C.PERIWINKLE_SOFT }}>
                  {m.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="sq-timg" src={m.thumb} alt="" loading="lazy" onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11, 18, 51,0.55) 0%, rgba(11, 18, 51,0) 55%)' }} />
                  <span style={{ position: 'absolute', left: 20, bottom: 18, maxWidth: '45%', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff', lineHeight: 1.5 }}>{t.category}</span>
                </Link>
                <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.INK, letterSpacing: '-0.01em' }}>{t.name}</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', margin: '14px 0 16px', fontSize: 14, color: C.GRAY_600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
                      {m.questions} {m.questions === 1 ? 'question' : 'questions'}
                    </span>
                    {m.leadGate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.5 3.1-6 7-6 1.6 0 3 .4 4.2 1.1M16 18l2 2 4-4" /></svg>
                        Lead gate
                      </span>
                    )}
                    {m.outcomes > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
                        {m.outcomes} {m.outcomes === 1 ? 'outcome' : 'outcomes'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                    <Link href={'/dashboard/templates/' + t.id} className="sq-tbtn" style={{ border: '1px solid ' + C.BORDER, color: C.INK, background: '#fff' }}>Preview</Link>
                    <button type="button" className="sq-tbtn" onClick={function() { router.push('/dashboard/editor?template=' + t.id); }}
                      style={{ border: 'none', background: C.ACCENT, color: '#fff' }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_HOVER; }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = C.ACCENT; }}>
                      Use template
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
