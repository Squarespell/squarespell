'use client';

// Templates gallery. Previews block-based templates rendered via
// renderBlocks() against DEFAULT_BRAND_KIT + SAMPLE_CONTEXT so designers
// see a realistic preview before picking a source quiz.

import { useMemo, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, Pill, PrimaryButton } from '../../_components/PageShell';
import { EMAIL_TEMPLATES, CATEGORY_LABELS, SITE_TYPE_LABELS } from '../../../../lib/email/templates';
import { DEFAULT_BRAND_KIT } from '../../../../lib/email/brandKit';
import { SAMPLE_CONTEXT } from '../../../../lib/email/mergeContext';
import { renderBlocks } from '../../../../lib/email/renderBlocks';
import type { EmailTemplate, TemplateCategory, SiteType } from '../../../../lib/email/blocks';

const FILTERS: (TemplateCategory | 'all')[] = [
  'all',
  'post-quiz',
  'outcome',
  'nurture',
  'abandoner',
  'booking',
  'discount',
];

const SITE_FILTERS: (SiteType | 'all')[] = [
  'all',
  'portfolio',
  'restaurant',
  'shop',
  'blog',
  'wedding',
  'fitness',
  'services',
];

export default function EmailTemplatesPage() {
  const [filter, setFilter] = useState<TemplateCategory | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState<SiteType | 'all'>('all');
  const [selected, setSelected] = useState<EmailTemplate | null>(null);

  const visible = useMemo(() => {
    var list = EMAIL_TEMPLATES;
    if (filter !== 'all') {
      list = list.filter(function (t) { return t.category === filter; });
    }
    if (siteFilter !== 'all') {
      list = list.filter(function (t) { return t.siteType === siteFilter; });
    }
    return list;
  }, [filter, siteFilter]);

  const previewHtml = useMemo(() => {
    if (!selected) return '';
    return renderBlocks(selected.blocks, DEFAULT_BRAND_KIT, SAMPLE_CONTEXT, {
      preheader: selected.defaultPreheader,
    });
  }, [selected]);

  return (
    <DashboardShell>
      <PageHeader
        title="Email templates"
        subtitle="Quiz-native templates. Each one only exists because you have a quiz feeding it."
      />

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Email type</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {FILTERS.map(function (f) {
          const active = f === filter;
          const label = f === 'all' ? 'All' : (CATEGORY_LABELS[f] || f);
          return (
            <button
              key={f}
              onClick={function () { setFilter(f); }}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: active ? C.ACCENT : 'transparent',
                color: active ? '#0b0b0c' : C.TEXT_MUTED,
                border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Site type</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {SITE_FILTERS.map(function (f) {
          const active = f === siteFilter;
          const label = f === 'all' ? 'All' : (SITE_TYPE_LABELS[f] || f);
          return (
            <button
              key={f}
              onClick={function () { setSiteFilter(f); }}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: active ? C.ACCENT : 'transparent',
                color: active ? '#0b0b0c' : C.TEXT_MUTED,
                border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {visible.map(function (t) {
          const thumb = renderBlocks(t.blocks, DEFAULT_BRAND_KIT, SAMPLE_CONTEXT, {
            preheader: t.defaultPreheader,
          });
          return (
            <Card key={t.id} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  height: 220,
                  overflow: 'hidden',
                  borderBottom: '1px solid ' + C.BORDER,
                  background: '#0b0b0c',
                  position: 'relative',
                }}
              >
                <iframe
                  title={t.title + ' preview'}
                  srcDoc={thumb}
                  style={{
                    width: '200%',
                    height: '440px',
                    border: 0,
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {t.siteType ? <Pill variant="accent">{SITE_TYPE_LABELS[t.siteType] || t.siteType}</Pill> : null}
                    <Pill variant="accent">{CATEGORY_LABELS[t.category] || t.category}</Pill>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5, marginBottom: 14 }}>
                  {t.oneLiner}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={function () { setSelected(t); }}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: C.TEXT,
                      border: '1px solid ' + C.BORDER,
                    }}
                  >
                    Preview
                  </button>
                  <div style={{ flex: 1 }}>
                    <PrimaryButton href={'/dashboard/emails/new?template=' + t.id}>
                      Use template
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selected ? (
        <div
          onClick={function () { setSelected(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              width: '100%',
              maxWidth: 1000,
              height: '90vh',
              background: C.SURFACE,
              borderRadius: 14,
              border: '1px solid ' + C.BORDER,
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 20, borderRight: '1px solid ' + C.BORDER, overflow: 'auto' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>{selected.title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.siteType ? <Pill variant="accent">{SITE_TYPE_LABELS[selected.siteType] || selected.siteType}</Pill> : null}
                <Pill variant="accent">{CATEGORY_LABELS[selected.category]}</Pill>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.6 }}>
                {selected.oneLiner}
              </div>
              <div style={{ marginTop: 20, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Why quiz-native</div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.6 }}>{selected.whyQuizNative}</div>
              <div style={{ marginTop: 20, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Subject</div>
              <div style={{ fontSize: 13, color: C.TEXT }}>{selected.defaultSubject}</div>
              <div style={{ marginTop: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Preheader</div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>{selected.defaultPreheader}</div>
              <div style={{ marginTop: 20, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Merge tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.mergeTags.map(function (tag) {
                  return (
                    <span
                      key={tag}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        padding: '3px 7px',
                        borderRadius: 5,
                        background: C.ELEVATED,
                        color: C.TEXT_MUTED,
                        border: '1px solid ' + C.BORDER,
                      }}
                    >
                      {'{{' + tag + '}}'}
                    </span>
                  );
                })}
              </div>
              <div style={{ marginTop: 24 }}>
                <PrimaryButton href={'/dashboard/emails/new?template=' + selected.id}>
                  Use this template
                </PrimaryButton>
              </div>
            </div>
            <div style={{ background: '#0b0b0c', overflow: 'auto' }}>
              <iframe
                title="template preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 0, background: '#0b0b0c' }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
