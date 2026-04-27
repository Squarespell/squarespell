'use client';

/**
 * /templates - Public template gallery page (OpinionStage-inspired).
 *
 * Image-rich template cards with hover preview overlay, category sidebar,
 * search bar, and template count. Each card shows a hero image, category
 * badge, name, description, question count, and a "Preview" hover button.
 *
 * Clicking a card goes to /templates/[id] (detail page with desktop/mobile toggle).
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  QUIZ_TEMPLATE_CATALOG,
  getTemplateCategories,
  getTemplateThumbnail,
  getTemplateQuestionCount,
} from '../../lib/quiz/templates';

var COLORS = {
  bg: '#F9FAFB',
  card: '#FFFFFF',
  accent: '#0D7377',
  accentHover: '#0B6163',
  accentLight: '#E8F4F4',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E7EB',
  sidebarBg: '#FFFFFF',
  sidebarActive: '#F0FAFA',
};

/* Category icons — simple SVG paths */
var CATEGORY_ICONS: Record<string, string> = {
  'All': 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'Ecommerce': 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  'Lead Generation': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  'Feedback': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  'Research': 'M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35',
  'Engagement': 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Beauty': 'M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z',
  'Operations': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'HR': 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M10 7a4 4 0 100 8 4 4 0 000-8zM22 21v-2a4 4 0 00-3-3.87',
};

function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat] || CATEGORY_ICONS['All'];
}

export default function TemplatesGalleryPage() {
  var categories = useMemo(function() { return getTemplateCategories(); }, []);
  var [activeFilter, setActiveFilter] = useState('All');
  var [searchQuery, setSearchQuery] = useState('');
  var [hoveredCard, setHoveredCard] = useState<string | null>(null);

  var filtered = useMemo(function() {
    var result = QUIZ_TEMPLATE_CATALOG;
    if (activeFilter !== 'All') {
      result = result.filter(function(t) { return t.category === activeFilter; });
    }
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function(t) {
        return t.name.toLowerCase().indexOf(q) !== -1 ||
          t.description.toLowerCase().indexOf(q) !== -1 ||
          t.tags.some(function(tag) { return tag.toLowerCase().indexOf(q) !== -1; });
      });
    }
    return result;
  }, [activeFilter, searchQuery]);

  /* Precompute thumbnails + question counts so we don't call blocks() on hover */
  var templateMeta = useMemo(function() {
    var meta: Record<string, { thumb: string; qCount: number }> = {};
    QUIZ_TEMPLATE_CATALOG.forEach(function(t) {
      meta[t.id] = {
        thumb: getTemplateThumbnail(t.id),
        qCount: getTemplateQuestionCount(t.id),
      };
    });
    return meta;
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid ' + COLORS.border, background: '#fff', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill={COLORS.accent} />
            <path d="M7 8h10M7 12h6M7 16h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Squarespell</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/sign-in" style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, textDecoration: 'none', padding: '8px 12px' }}>
            Sign in
          </Link>
          <Link href="/sign-up" style={{
            fontSize: 13, fontWeight: 600, color: '#fff', background: COLORS.accent,
            borderRadius: 8, padding: '8px 16px', textDecoration: 'none',
          }}>
            Get started free
          </Link>
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: 1280, margin: '0 auto' }}>

        {/* Sidebar — category filters */}
        <aside style={{
          width: 240, flexShrink: 0, background: COLORS.sidebarBg,
          borderRight: '1px solid ' + COLORS.border, padding: '24px 0',
          position: 'sticky', top: 49, height: 'calc(100vh - 49px)', overflowY: 'auto',
        }}>
          <div style={{ padding: '0 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Categories
            </p>
          </div>
          {['All'].concat(categories).map(function(cat) {
            var isActive = cat === activeFilter;
            var count = cat === 'All' ? QUIZ_TEMPLATE_CATALOG.length : QUIZ_TEMPLATE_CATALOG.filter(function(t) { return t.category === cat; }).length;
            return (
              <button
                key={cat}
                onClick={function() { setActiveFilter(cat); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 16px', border: 'none', cursor: 'pointer',
                  background: isActive ? COLORS.sidebarActive : 'transparent',
                  borderLeft: isActive ? '3px solid ' + COLORS.accent : '3px solid transparent',
                  color: isActive ? COLORS.accent : COLORS.text,
                  fontSize: 13, fontWeight: isActive ? 600 : 500, fontFamily: 'inherit',
                  transition: 'all 0.15s ease', textAlign: 'left',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? COLORS.accent : COLORS.muted} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d={getCategoryIcon(cat)} />
                </svg>
                <span style={{ flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 400 }}>{count}</span>
              </button>
            );
          })}

          <div style={{ padding: '20px 16px 0', borderTop: '1px solid ' + COLORS.border, marginTop: 16 }}>
            <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5, margin: 0 }}>
              Missing a template?{' '}
              <a href="mailto:info@squarespell.com" style={{ color: COLORS.accent, textDecoration: 'none', fontWeight: 500 }}>
                Let us know
              </a>
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px 32px 64px' }}>

          {/* Search + count bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>
                {activeFilter === 'All' ? 'All Templates' : activeFilter + ' Templates'}
              </h1>
              <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>
                {filtered.length} template{filtered.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                style={{
                  width: 240, padding: '9px 12px 9px 36px', borderRadius: 8,
                  border: '1px solid ' + COLORS.border, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', background: '#fff', color: COLORS.text,
                }}
              />
            </div>
          </div>

          {/* Template grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {filtered.map(function(tpl) {
              var meta = templateMeta[tpl.id] || { thumb: '', qCount: 0 };
              var isHovered = hoveredCard === tpl.id;
              return (
                <Link
                  key={tpl.id}
                  href={'/templates/' + tpl.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    onMouseEnter={function() { setHoveredCard(tpl.id); }}
                    onMouseLeave={function() { setHoveredCard(null); }}
                    style={{
                      background: '#fff', borderRadius: 12, overflow: 'hidden',
                      border: '1px solid ' + (isHovered ? COLORS.accent : COLORS.border),
                      transition: 'all 0.2s ease',
                      boxShadow: isHovered ? '0 8px 24px rgba(13,115,119,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                      transform: isHovered ? 'translateY(-2px)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Hero image */}
                    <div style={{
                      position: 'relative', height: 180, overflow: 'hidden',
                      background: COLORS.accentLight,
                    }}>
                      {meta.thumb && (
                        <img
                          src={meta.thumb.replace('w=1200', 'w=600')}
                          alt={tpl.name}
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                          }}
                          loading="lazy"
                        />
                      )}
                      {/* Hover overlay with Preview button */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: isHovered ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s ease',
                      }}>
                        {isHovered && (
                          <span style={{
                            padding: '10px 20px', borderRadius: 8,
                            background: '#fff', color: COLORS.text,
                            fontSize: 13, fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Preview
                          </span>
                        )}
                      </div>
                      {/* Category badge */}
                      <span style={{
                        position: 'absolute', top: 10, left: 10,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                        fontSize: 11, fontWeight: 600, color: COLORS.accent,
                        letterSpacing: '0.02em',
                      }}>
                        {tpl.category}
                      </span>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '16px 18px 18px' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: '0 0 6px', lineHeight: 1.3 }}>
                        {tpl.name}
                      </h3>
                      <p style={{
                        fontSize: 13, color: COLORS.muted, margin: '0 0 14px', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden',
                      }}>
                        {tpl.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: COLORS.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                          </svg>
                          {meta.qCount} questions
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                          Use template
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 6px' }}>No templates found</h3>
              <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>
                Try a different search or{' '}
                <button onClick={function() { setSearchQuery(''); setActiveFilter('All'); }} style={{ color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' }}>
                  clear filters
                </button>
              </p>
            </div>
          )}

          {/* Bottom CTA */}
          <section style={{ textAlign: 'center', padding: '56px 24px 0', marginTop: 40 }}>
            <div style={{ background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: 16, padding: '40px 32px', maxWidth: 560, margin: '0 auto' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>
                Need something custom?
              </h2>
              <p style={{ fontSize: 14, color: COLORS.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
                Paste your Squarespace URL and our AI builds a branded quiz in 60 seconds.
              </p>
              <Link
                href="/tools/quiz-funnel"
                style={{
                  display: 'inline-block', padding: '12px 24px', borderRadius: 10,
                  background: COLORS.accent, color: '#fff', textDecoration: 'none',
                  fontSize: 14, fontWeight: 600,
                }}
              >
                Generate a custom quiz
              </Link>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
