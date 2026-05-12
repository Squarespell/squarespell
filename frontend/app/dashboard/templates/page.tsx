'use client';

/**
 * /dashboard/templates — Template gallery inside the dashboard shell.
 *
 * Image-rich cards with category sidebar, search, hover preview,
 * and "Use this template" + "Preview" actions on each card.
 * Matches the dashboard's Untitled UI design language.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  QUIZ_TEMPLATE_CATALOG,
  getTemplateCategories,
  getTemplateThumbnail,
  getTemplateQuestionCount,
} from '../../../lib/quiz/templates';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';

var ACCENT = C.ACCENT || '#0F7377';
var ACCENT_LIGHT = C.ACCENT_LIGHT || '#E8F5F5';
/* Shorthand aliases for cleaner JSX */
var TEXT = C.TEXT;
var MUTED = C.TEXT_MUTED;
var BORDER = C.BORDER;

/* New category icons for the Squarespace-focused templates */
var CATEGORY_ICONS: Record<string, string> = {
  'All':                   'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'Photography':           'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z',
  'Food & Dining':         'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  'Fitness & Wellness':    'M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9',
  'Online Store':          'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  'Weddings & Events':     'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  'Coaches & Consultants': 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3.01',
  'Interior Design':       'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  'Beauty & Salons':       'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2',
  'Artists & Creatives':   'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586',
  'Podcasters & Creators': 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
  'Real Estate':           'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z',
  'Travel & Hospitality':  'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  'Nonprofits & Causes':   'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
};

function getCatIcon(cat: string): string {
  return CATEGORY_ICONS[cat] || CATEGORY_ICONS['All'];
}

export default function DashboardTemplatesPage() {
  var router = useRouter();
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

  /* Pre-compute thumbnail + question count */
  var templateMeta = useMemo(function() {
    var meta: Record<string, { thumb: string | null; qCount: number }> = {};
    QUIZ_TEMPLATE_CATALOG.forEach(function(t) {
      meta[t.id] = {
        thumb: getTemplateThumbnail(t.id),
        qCount: getTemplateQuestionCount(t.id),
      };
    });
    return meta;
  }, []);

  return (
    <DashboardShell title="Templates">
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Quiz Templates</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '6px 0 0', lineHeight: 1.5 }}>
          Start with a professionally designed template built for your Squarespace business. Preview any template, then customize it with your brand.
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
            style={{
              width: '100%', padding: '9px 12px 9px 36px', fontSize: 14, border: '1px solid ' + BORDER,
              borderRadius: 8, outline: 'none', background: '#fff', color: TEXT, boxSizing: 'border-box',
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: MUTED }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {['All'].concat(categories).map(function(cat) {
          var isActive = cat === activeFilter;
          return (
            <button
              key={cat}
              onClick={function() { setActiveFilter(cat); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                fontSize: 13, fontWeight: isActive ? 600 : 500, borderRadius: 20,
                border: isActive ? '1.5px solid ' + ACCENT : '1px solid ' + BORDER,
                background: isActive ? ACCENT_LIGHT : '#fff',
                color: isActive ? ACCENT : MUTED,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={getCatIcon(cat)} />
              </svg>
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>No templates found</p>
          <p style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>Try a different search or category.</p>
          <button onClick={function() { setActiveFilter('All'); setSearchQuery(''); }} style={{
            marginTop: 16, padding: '8px 20px', fontSize: 14, fontWeight: 600,
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}>Show all templates</button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {filtered.map(function(t) {
            var meta = templateMeta[t.id] || { thumb: null, qCount: 0 };
            var isHovered = hoveredCard === t.id;
            return (
              <div
                key={t.id}
                onMouseEnter={function() { setHoveredCard(t.id); }}
                onMouseLeave={function() { setHoveredCard(null); }}
                style={{
                  background: '#fff', borderRadius: 12, overflow: 'hidden',
                  border: '1px solid ' + (isHovered ? ACCENT : BORDER),
                  boxShadow: isHovered ? '0 4px 20px rgba(15, 115, 119, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: '#f0f0f0' }}>
                  {meta.thumb && (
                    <img
                      src={meta.thumb}
                      alt={t.name}
                      onError={function(e: any) { e.currentTarget.style.display = 'none'; }}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transition: 'transform 0.3s',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      }}
                    />
                  )}

                  {/* Hover overlay with buttons */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s',
                  }}>
                    <Link
                      href={'/dashboard/templates/' + t.id}
                      style={{
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                        background: '#fff', color: ACCENT, textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Preview
                    </Link>
                    <button
                      onClick={function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push('/dashboard/editor?template=' + t.id);
                      }}
                      style={{
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                        background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Use template
                    </button>
                  </div>

                  {/* Category badge */}
                  <span style={{
                    position: 'absolute', top: 10, left: 10, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600, borderRadius: 6,
                    background: 'rgba(255,255,255,0.92)', color: ACCENT,
                    backdropFilter: 'blur(4px)',
                  }}>{t.category}</span>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 18px 18px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}>{t.name}</h3>
                  <p style={{
                    fontSize: 13, color: MUTED, margin: '6px 0 0', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {t.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: MUTED }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>
                      </svg>
                      {meta.qCount} question{meta.qCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: MUTED }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 8l-4 4-2-2"/>
                      </svg>
                      Lead gate
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: MUTED }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3.01"/>
                      </svg>
                      3 outcomes
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </DashboardShell>
  );
}
