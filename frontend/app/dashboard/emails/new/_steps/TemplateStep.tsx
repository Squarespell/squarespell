'use client';
import React, { useMemo, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { Pill, PrimaryButton } from '../../../_components/PageShell';
import { EMAIL_TEMPLATES as BLOCK_TEMPLATES, CATEGORY_LABELS } from '../../../../../lib/email/templates';
import { DEFAULT_BRAND_KIT } from '../../../../../lib/email/brandKit';
import { SAMPLE_CONTEXT } from '../../../../../lib/email/mergeContext';
import { renderBlocks } from '../../../../../lib/email/renderBlocks';
import { V2_TEMPLATES } from '../../../../../lib/email/v2/templates';
import { renderTemplateV2, SAMPLE_DATA } from '../../../../../lib/email/v2/renderer';
import type { EmailTemplateV2 } from '../../../../../lib/email/v2/schema';
import { CANVA_TEMPLATES } from '../../../../../lib/email/canvaTemplates';

// Unified gallery item for both v1 and v2
interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: string;
  isV2: boolean;
  html: string;       // pre-rendered preview
  subject: string;
  preheader: string;
  blocks?: any[];      // v1 blocks if v1
  v2?: EmailTemplateV2;
}

function buildItems(): TemplateItem[] {
  var items: TemplateItem[] = [];

  // Canva templates (primary)
  for (var k = 0; k < CANVA_TEMPLATES.length; k++) {
    var ct = CANVA_TEMPLATES[k];
    items.push({
      id: ct.id,
      title: ct.name,
      description: ct.description,
      category: ct.category,
      isV2: true,
      html: ct.html,
      subject: ct.subject,
      preheader: ct.preheader,
    });
  }

  // V1 templates (legacy)
  for (var j = 0; j < BLOCK_TEMPLATES.length; j++) {
    var t1 = BLOCK_TEMPLATES[j];
    items.push({
      id: t1.id,
      title: t1.title,
      description: t1.oneLiner,
      category: t1.category,
      isV2: false,
      html: renderBlocks(t1.blocks, DEFAULT_BRAND_KIT, SAMPLE_CONTEXT, { preheader: t1.defaultPreheader }),
      subject: t1.defaultSubject,
      preheader: t1.defaultPreheader,
      blocks: t1.blocks,
    });
  }

  return items;
}

var V2_LABELS: Record<string, string> = {
  'quiz-result': 'Quiz result',
  'lead-nurture': 'Lead nurture',
  'promotional': 'Promotional',
};

export function TemplateStep({
  selectedId, onSelect, onNext, onBack,
}: {
  selectedId: string;
  onSelect: (item: TemplateItem) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  var allItems = useMemo(buildItems, []);
  var [filter, setFilter] = useState('all');

  // Collect unique categories
  var categories = useMemo(function() {
    var cats = ['all'];
    var seen = new Set<string>();
    for (var i = 0; i < allItems.length; i++) {
      if (!seen.has(allItems[i].category)) {
        seen.add(allItems[i].category);
        cats.push(allItems[i].category);
      }
    }
    return cats;
  }, [allItems]);

  var visible = filter === 'all' ? allItems : allItems.filter(function(t) { return t.category === filter; });

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Pick a template</h2>
      <p style={{ margin: '0 0 20px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Choose a starting design. You'll customize everything in the next step.
      </p>

      {/* Category filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {categories.map(function(cat) {
          var active = cat === filter;
          var label = cat === 'all' ? 'All' : (V2_LABELS[cat] || CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat);
          return (
            <button
              key={cat}
              onClick={function() { setFilter(cat); }}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
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

      {/* Template grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {visible.map(function(t) {
          var selected = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={function() { onSelect(t); }}
              style={{
                textAlign: 'left', padding: 0, overflow: 'hidden',
                borderRadius: 12, cursor: 'pointer',
                border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                background: selected ? C.ACCENT_LIGHT : C.SURFACE,
                transition: 'all 0.15s',
              }}
            >
              {/* Preview thumbnail */}
              <div style={{
                height: 180, overflow: 'hidden', background: '#F7F7F5',
                borderBottom: '1px solid ' + C.BORDER, position: 'relative',
              }}>
                <iframe
                  title={t.title + ' preview'}
                  srcDoc={t.html}
                  style={{
                    width: '200%', height: '360px', border: 0,
                    transform: 'scale(0.5)', transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                />
                {selected && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 28, height: 28, borderRadius: 14,
                    background: C.ACCENT, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, flex: 1 }}>{t.title}</div>
                  {t.isV2 && <Pill variant="accent">V2</Pill>}
                </div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.4 }}>
                  {t.description.length > 80 ? t.description.slice(0, 80) + '...' : t.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{
        marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 20, borderTop: '1px solid ' + C.BORDER,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', background: 'transparent', color: C.TEXT_MUTED,
            border: '1px solid ' + C.BORDER,
          }}
        >
          Back
        </button>
        <div style={{ opacity: selectedId ? 1 : 0.5, pointerEvents: selectedId ? 'auto' : 'none' }}>
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
