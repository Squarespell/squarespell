'use client';

/**
 * /templates - Public template gallery page.
 *
 * Lists all quiz templates with category filters. Each card links to
 * /templates/[id]/preview where visitors can take the quiz. No auth required.
 *
 * This page is linked from the landing page and drives organic discovery.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { QUIZ_TEMPLATE_CATALOG, getTemplateCategories } from '../../lib/quiz/templates';

var COLORS = {
  bg: '#F7F7F5',
  card: '#FFFFFF',
  accent: '#0D7377',
  accentLight: '#E8F4F4',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E7EB',
};

export default function TemplatesGalleryPage() {
  var categories = useMemo(function() { return getTemplateCategories(); }, []);
  var [activeFilter, setActiveFilter] = useState('All');

  var filtered = useMemo(function() {
    if (activeFilter === 'All') return QUIZ_TEMPLATE_CATALOG;
    return QUIZ_TEMPLATE_CATALOG.filter(function(t) { return t.category === activeFilter; });
  }, [activeFilter]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + COLORS.border, background: '#fff' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill={COLORS.accent} />
            <path d="M7 8h10M7 12h6M7 16h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Squarespell</span>
        </Link>
        <Link href="/sign-up" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: COLORS.accent, borderRadius: 8, padding: '8px 16px', textDecoration: 'none' }}>
          Get started free
        </Link>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '56px 24px 32px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Quiz Templates for Squarespace
        </h1>
        <p style={{ fontSize: 16, color: COLORS.muted, margin: '0 auto', maxWidth: 520, lineHeight: 1.5 }}>
          Pick a template, take it for a spin, then customize it for your brand. Every template is designed to capture leads and drive sales.
        </p>
      </section>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '0 24px 32px', flexWrap: 'wrap' }}>
        {['All'].concat(categories).map(function(cat) {
          var isActive = cat === activeFilter;
          return (
            <button
              key={cat}
              onClick={function() { setActiveFilter(cat); }}
              style={{
                padding: '8px 16px', borderRadius: 100, border: 'none',
                background: isActive ? COLORS.accent : '#fff',
                color: isActive ? '#fff' : COLORS.text,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: isActive ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                fontFamily: 'inherit',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {filtered.map(function(tpl) {
          return (
            <Link
              key={tpl.id}
              href={'/templates/' + tpl.id + '/preview'}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                background: '#fff', borderRadius: 16, padding: '24px',
                border: '1px solid ' + COLORS.border,
                transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={function(e) { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={function(e) { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: COLORS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d={tpl.iconPath} />
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.accent, background: COLORS.accentLight, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {tpl.category}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>{tpl.name}</h3>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: '0 0 14px', lineHeight: 1.5 }}>{tpl.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.accent }}>Try it</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '48px 24px 64px', background: '#fff', borderTop: '1px solid ' + COLORS.border }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 12px' }}>
          Do not see what you need?
        </h2>
        <p style={{ fontSize: 15, color: COLORS.muted, margin: '0 0 24px' }}>
          Paste your website URL and our AI builds a custom quiz in 60 seconds.
        </p>
        <Link
          href="/tools/quiz-funnel"
          style={{
            display: 'inline-block', padding: '14px 28px', borderRadius: 10,
            background: COLORS.accent, color: '#fff', textDecoration: 'none',
            fontSize: 15, fontWeight: 600,
          }}
        >
          Generate a custom quiz
        </Link>
      </section>
    </div>
  );
}
