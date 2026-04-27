'use client';

/**
 * /templates/[id] - SEO-optimized template detail page.
 *
 * Shows template description, audience, why it works, question count,
 * and a live Desktop/Mobile preview toggle. Each template page targets
 * "squarespace quiz template for [use case]" keywords.
 *
 * Links to:
 *   - /templates/[id]/preview (try the quiz)
 *   - /sign-up?template=[id] (use this template)
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  QUIZ_TEMPLATE_CATALOG,
  findTemplateData,
  getTemplateThumbnail,
  getTemplateQuestionCount,
} from '../../../lib/quiz/templates';

var COLORS = {
  bg: '#F9FAFB',
  card: '#FFFFFF',
  accent: '#0D7377',
  accentLight: '#E8F4F4',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E7EB',
};

export default function TemplateDetailPage() {
  var params = useParams();
  var templateId = typeof params.id === 'string' ? params.id : '';
  var template = useMemo(function() { return findTemplateData(templateId) || null; }, [templateId]);
  var thumb = useMemo(function() { return getTemplateThumbnail(templateId); }, [templateId]);
  var qCount = useMemo(function() { return getTemplateQuestionCount(templateId); }, [templateId]);

  var [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Suggest related templates (same category, different id)
  var related = useMemo(function() {
    if (!template) return [];
    return QUIZ_TEMPLATE_CATALOG.filter(function(t) {
      return t.category === template.category && t.id !== template.id;
    }).slice(0, 3);
  }, [template]);

  if (!template) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text }}>Template not found</h1>
          <p style={{ fontSize: 15, color: COLORS.muted, margin: '8px 0 24px' }}>This template does not exist or has been removed.</p>
          <Link href="/templates" style={{ color: COLORS.accent, fontWeight: 600, textDecoration: 'none' }}>Browse all templates</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid ' + COLORS.border, background: '#fff', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/templates" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: COLORS.muted, fontSize: 13, fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All templates
          </Link>
        </div>
        <Link href="/sign-up" style={{
          fontSize: 13, fontWeight: 600, color: '#fff', background: COLORS.accent,
          borderRadius: 8, padding: '8px 16px', textDecoration: 'none',
        }}>
          Get started free
        </Link>
      </header>

      {/* Main content — two column: description left, preview right */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px', display: 'grid', gridTemplateColumns: '400px 1fr', gap: 40, alignItems: 'start' }}>

        {/* Left — Template info */}
        <div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: COLORS.accent, background: COLORS.accentLight,
            padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
            display: 'inline-block', marginBottom: 16,
          }}>
            {template.category}
          </span>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: '0 0 12px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {template.name}
          </h1>

          <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
            {template.description}
          </p>

          {/* Meta info */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.muted }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
              {qCount} questions
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.muted }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              ~2 min to complete
            </div>
          </div>

          {/* Who it's for */}
          <div style={{ background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Who it is for
            </h3>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6, margin: 0 }}>
              {template.audience}
            </p>
          </div>

          {/* Why it works */}
          <div style={{ background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: 12, padding: '20px', marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Why it converts
            </h3>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6, margin: 0 }}>
              {template.whyItWorks}
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              href={'/templates/' + templateId + '/preview'}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 20px', borderRadius: 10,
                background: COLORS.accent, color: '#fff', textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Try this template
            </Link>
            <Link
              href={'/sign-up?from=template&template=' + templateId}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 20px', borderRadius: 10,
                background: '#fff', color: COLORS.accent, textDecoration: 'none',
                fontSize: 14, fontWeight: 600, border: '1.5px solid ' + COLORS.accent,
              }}
            >
              Use this template
            </Link>
          </div>
        </div>

        {/* Right — Live preview with device toggle */}
        <div>
          {/* Device toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Preview</span>
            <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 8, border: '1px solid ' + COLORS.border, padding: 3 }}>
              {(['desktop', 'mobile'] as const).map(function(device) {
                var isActive = previewDevice === device;
                return (
                  <button
                    key={device}
                    onClick={function() { setPreviewDevice(device); }}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none',
                      background: isActive ? COLORS.accent : 'transparent',
                      color: isActive ? '#fff' : COLORS.muted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', textTransform: 'capitalize',
                    }}
                  >
                    {device === 'desktop' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        Desktop
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                        Mobile
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview frame */}
          <div style={{
            background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: 16,
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            width: previewDevice === 'mobile' ? 375 : '100%',
            margin: previewDevice === 'mobile' ? '0 auto' : undefined,
            transition: 'width 0.3s ease',
          }}>
            {/* Hero image */}
            {thumb && (
              <div style={{ height: 200, overflow: 'hidden' }}>
                <img
                  src={thumb.replace('w=1200', 'w=800')}
                  alt={template.name + ' preview'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            {/* Quiz preview embed */}
            <div style={{ padding: '24px 20px' }}>
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                  {qCount} questions — takes about 2 minutes
                </p>
                <Link
                  href={'/templates/' + templateId + '/preview'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 10,
                    background: COLORS.accent, color: '#fff', textDecoration: 'none',
                    fontSize: 14, fontWeight: 600,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Take the quiz
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related templates */}
      {related.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 16px' }}>
            More {template.category} templates
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {related.map(function(tpl) {
              var relThumb = getTemplateThumbnail(tpl.id);
              return (
                <Link key={tpl.id} href={'/templates/' + tpl.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: '#fff', borderRadius: 12, overflow: 'hidden',
                    border: '1px solid ' + COLORS.border,
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={function(e) { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={function(e) { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    {relThumb && (
                      <div style={{ height: 140, overflow: 'hidden' }}>
                        <img src={relThumb.replace('w=1200', 'w=600')} alt={tpl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                    )}
                    <div style={{ padding: '14px 16px' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>{tpl.name}</h3>
                      <p style={{ fontSize: 12, color: COLORS.muted, margin: 0, lineHeight: 1.4 }}>{tpl.description.substring(0, 80)}...</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '48px 24px 64px', background: '#fff', borderTop: '1px solid ' + COLORS.border }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>
          Need something custom?
        </h2>
        <p style={{ fontSize: 14, color: COLORS.muted, margin: '0 0 24px' }}>
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
      </section>
    </div>
  );
}
