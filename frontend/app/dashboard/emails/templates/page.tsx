'use client';

// Templates gallery. Shows both v1 block-based templates and v2 section-based
// templates in a unified grid. V2 templates render through the new TABLE-based
// render engine with Outlook/mobile support.

import { useMemo, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, Pill, PrimaryButton } from '../../_components/PageShell';
import { EMAIL_TEMPLATES, CATEGORY_LABELS, SITE_TYPE_LABELS } from '../../../../lib/email/templates';
import { DEFAULT_BRAND_KIT } from '../../../../lib/email/brandKit';
import { SAMPLE_CONTEXT } from '../../../../lib/email/mergeContext';
import { renderBlocks } from '../../../../lib/email/renderBlocks';
import { V2_TEMPLATES } from '../../../../lib/email/v2/templates';
import { renderTemplateV2, SAMPLE_DATA } from '../../../../lib/email/v2/renderer';
import type { EmailTemplate, TemplateCategory, SiteType } from '../../../../lib/email/blocks';
import type { EmailTemplateV2 } from '../../../../lib/email/v2/schema';

// ---------------------------------------------------------------------------
// Unified gallery item type
// ---------------------------------------------------------------------------

interface GalleryItem {
  id: string;
  title: string;
  oneLiner: string;
  whyQuizNative: string;
  category: string;
  siteType?: string;
  defaultSubject: string;
  defaultPreheader: string;
  mergeTags: string[];
  isV2: boolean;
  v1?: EmailTemplate;
  v2?: EmailTemplateV2;
}

// Map v2 category to the label set
var V2_CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORY_LABELS,
  'quiz-result': 'Quiz result',
  'lead-nurture': 'Lead nurture',
  'promotional': 'Promotional',
};

function adaptV2(t: EmailTemplateV2): GalleryItem {
  return {
    id: t.metadata.id,
    title: t.metadata.name,
    oneLiner: t.metadata.description,
    whyQuizNative: 'Built on the v2 render engine with TABLE-based layout, Outlook MSO conditionals, VML button fallbacks, and mobile responsive design.',
    category: t.metadata.category,
    defaultSubject: t.metadata.subject,
    defaultPreheader: t.metadata.preheader,
    mergeTags: t.metadata.mergeTags,
    isV2: true,
    v2: t,
  };
}

function adaptV1(t: EmailTemplate): GalleryItem {
  return {
    id: t.id,
    title: t.title,
    oneLiner: t.oneLiner,
    whyQuizNative: t.whyQuizNative,
    category: t.category,
    siteType: t.siteType,
    defaultSubject: t.defaultSubject,
    defaultPreheader: t.defaultPreheader,
    mergeTags: t.mergeTags,
    isV2: false,
    v1: t,
  };
}

function renderGalleryPreview(item: GalleryItem): string {
  if (item.isV2 && item.v2) {
    return renderTemplateV2(item.v2, SAMPLE_DATA);
  }
  if (item.v1) {
    return renderBlocks(item.v1.blocks, DEFAULT_BRAND_KIT, SAMPLE_CONTEXT, {
      preheader: item.v1.defaultPreheader,
    });
  }
  return '';
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

var ALL_CATEGORIES = [
  'all',
  'quiz-result',
  'lead-nurture',
  'promotional',
  'post-quiz',
  'outcome',
  'nurture',
  'abandoner',
  'booking',
  'discount',
];

var SITE_FILTERS: (SiteType | 'all')[] = [
  'all',
  'portfolio',
  'restaurant',
  'shop',
  'blog',
  'wedding',
  'fitness',
  'services',
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailTemplatesPage() {
  var [filter, setFilter] = useState('all');
  var [siteFilter, setSiteFilter] = useState<SiteType | 'all'>('all');
  var [selected, setSelected] = useState<GalleryItem | null>(null);

  var allItems = useMemo(function () {
    var v2Items = V2_TEMPLATES.map(adaptV2);
    var v1Items = EMAIL_TEMPLATES.map(adaptV1);
    return v2Items.concat(v1Items);
  }, []);

  var visible = useMemo(function () {
    var list = allItems;
    if (filter !== 'all') {
      list = list.filter(function (t) { return t.category === filter; });
    }
    if (siteFilter !== 'all') {
      list = list.filter(function (t) { return t.siteType === siteFilter; });
    }
    return list;
  }, [allItems, filter, siteFilter]);

  var previewHtml = useMemo(function () {
    if (!selected) return '';
    return renderGalleryPreview(selected);
  }, [selected]);

  // Only show category filters that have at least one template
  var activeCategories = useMemo(function () {
    var cats = new Set<string>();
    for (var i = 0; i < allItems.length; i++) {
      cats.add(allItems[i].category);
    }
    return ALL_CATEGORIES.filter(function (c) { return c === 'all' || cats.has(c); });
  }, [allItems]);

  return (
    <DashboardShell>
      <PageHeader
        title="Email templates"
        subtitle="Quiz-native templates. Each one only exists because you have a quiz feeding it."
      />

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.TEXT_SUBTLE, marginBottom: 6 }}>Email type</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {activeCategories.map(function (f) {
          var active = f === filter;
          var label = f === 'all' ? 'All' : (V2_CATEGORY_LABELS[f] || CATEGORY_LABELS[f as TemplateCategory] || f);
          return (
            <button
              key={f}
              onClick={function () { setFilter(f); }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: active ? C.ACCENT : 'transparent',
                color: active ? '#FFFFFF' : C.TEXT_MUTED,
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
          var active = f === siteFilter;
          var label = f === 'all' ? 'All' : (SITE_TYPE_LABELS[f] || f);
          return (
            <button
              key={f}
              onClick={function () { setSiteFilter(f); }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: active ? C.ACCENT : 'transparent',
                color: active ? '#FFFFFF' : C.TEXT_MUTED,
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
          var thumb = renderGalleryPreview(t);
          return (
            <Card key={t.id} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  height: 220,
                  overflow: 'hidden',
                  borderBottom: '1px solid ' + C.BORDER,
                  background: '#F7F7F5',
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
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {t.isV2 ? <Pill variant="accent">V2</Pill> : null}
                    {t.siteType ? <Pill variant="accent">{SITE_TYPE_LABELS[t.siteType as SiteType] || t.siteType}</Pill> : null}
                    <Pill variant="accent">{V2_CATEGORY_LABELS[t.category] || CATEGORY_LABELS[t.category as TemplateCategory] || t.category}</Pill>
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
            background: 'rgba(0,0,0,0.25)',
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
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selected.isV2 ? <Pill variant="accent">V2</Pill> : null}
                {selected.siteType ? <Pill variant="accent">{SITE_TYPE_LABELS[selected.siteType as SiteType] || selected.siteType}</Pill> : null}
                <Pill variant="accent">{V2_CATEGORY_LABELS[selected.category] || CATEGORY_LABELS[selected.category as TemplateCategory]}</Pill>
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
            <div style={{ background: '#F7F7F5', overflow: 'auto' }}>
              <iframe
                title="template preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 0, background: '#F7F7F5' }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
