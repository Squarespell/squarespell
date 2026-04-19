'use client';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { Pill, GhostButton, PrimaryButton } from '../../../_components/PageShell';
import { EMAIL_TEMPLATES as BLOCK_TEMPLATES, CATEGORY_LABELS } from '../../../../../lib/email/templates';
import { DEFAULT_BRAND_KIT } from '../../../../../lib/email/brandKit';
import { SAMPLE_CONTEXT } from '../../../../../lib/email/mergeContext';
import { renderBlocks } from '../../../../../lib/email/renderBlocks';
import { V2_TEMPLATES } from '../../../../../lib/email/v2/templates';
import { renderTemplateV2, SAMPLE_DATA } from '../../../../../lib/email/v2/renderer';
import type { EmailTemplateV2 } from '../../../../../lib/email/v2/schema';

export type DesignState = {
  templateId: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  abEnabled?: boolean;
  subjectB?: string;
  abTestPercent?: number;
  abWaitHours?: number;
};

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: string;
  isV2: boolean;
  html: string;
  subject: string;
  preheader: string;
}

function buildItems(): TemplateItem[] {
  var items: TemplateItem[] = [];
  for (var i = 0; i < V2_TEMPLATES.length; i++) {
    var t2 = V2_TEMPLATES[i];
    items.push({
      id: t2.metadata.id,
      title: t2.metadata.name,
      description: t2.metadata.description,
      category: t2.metadata.category,
      isV2: true,
      html: renderTemplateV2(t2, SAMPLE_DATA),
      subject: t2.metadata.subject,
      preheader: t2.metadata.preheader,
    });
  }
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
    });
  }
  return items;
}

var V2_LABELS: Record<string, string> = {
  'quiz-result': 'Quiz result',
  'lead-nurture': 'Lead nurture',
  'promotional': 'Promotional',
};

export function DesignStep({
  state, setState, onNext, onBack, quizCategory,
}: {
  state: DesignState;
  setState: (u: Partial<DesignState>) => void;
  onNext: () => void;
  onBack: () => void;
  quizCategory?: string;
}) {
  var allItems = useMemo(buildItems, []);
  var [filter, setFilter] = useState('all');
  var [search, setSearch] = useState('');
  var editorRef = useRef<HTMLIFrameElement>(null);
  var [editorReady, setEditorReady] = useState(false);

  // Categories
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

  // Filter + search
  var visible = allItems.filter(function(t) {
    var matchFilter = filter === 'all' || t.category === filter;
    var matchSearch = !search || t.title.toLowerCase().indexOf(search.toLowerCase()) >= 0
      || t.description.toLowerCase().indexOf(search.toLowerCase()) >= 0;
    return matchFilter && matchSearch;
  });

  // AI recommendation: match quiz category to template category
  var recommendedId = useMemo(function() {
    if (!quizCategory) return allItems.length > 0 ? allItems[0].id : '';
    var cat = quizCategory.toLowerCase();
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].category.toLowerCase().indexOf(cat) >= 0) return allItems[i].id;
    }
    // Default to first v2 template
    for (var j = 0; j < allItems.length; j++) {
      if (allItems[j].isV2) return allItems[j].id;
    }
    return allItems.length > 0 ? allItems[0].id : '';
  }, [allItems, quizCategory]);

  // Listen for messages from editor iframe
  useEffect(function() {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === 'sq-editor-ready') {
        setEditorReady(true);
      }
      if (e.data && e.data.type === 'sq-editor-html') {
        setState({ html: e.data.html });
      }
    }
    window.addEventListener('message', handleMessage);
    return function() { window.removeEventListener('message', handleMessage); };
  }, [setState]);

  // When template is selected, load into editor
  var handleSelectTemplate = useCallback(function(item: TemplateItem) {
    setState({
      templateId: item.id,
      subject: item.subject,
      html: item.html,
    });
    // Send to editor iframe
    if (editorRef.current && editorRef.current.contentWindow) {
      editorRef.current.contentWindow.postMessage({
        type: 'sq-load-template',
        html: item.html,
      }, '*');
    }
  }, [setState]);

  var selectedItem = allItems.find(function(t) { return t.id === state.templateId; });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, minHeight: 600 }}>
      {/* LEFT: Template gallery + fields */}
      <div style={{
        background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16,
        padding: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Subject + From fields */}
        <div style={{ marginBottom: 16 }}>
          <Field label="Subject line (A)">
            <input value={state.subject} onChange={function(e) { setState({ subject: e.target.value }); }}
              placeholder="Your result is in" style={inputStyle} />
          </Field>

          {/* A/B toggle */}
          <button
            onClick={function() { setState({ abEnabled: !state.abEnabled, subjectB: state.subjectB || '', abTestPercent: state.abTestPercent || 20, abWaitHours: state.abWaitHours || 4 }); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 8,
              background: state.abEnabled ? C.ACCENT_LIGHT : 'transparent',
              border: '1px solid ' + (state.abEnabled ? C.ACCENT : C.BORDER),
              borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              color: state.abEnabled ? C.ACCENT : C.TEXT_MUTED,
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
              <path d="M18 2l4 4-4 4" />
            </svg>
            {state.abEnabled ? 'A/B test on' : 'A/B test'}
          </button>

          {state.abEnabled && (
            <div style={{ marginBottom: 8, padding: 10, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
              <Field label="Subject (B)">
                <input value={state.subjectB || ''} onChange={function(e) { setState({ subjectB: e.target.value }); }}
                  placeholder="Try a different angle" style={inputStyle} />
              </Field>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" min={10} max={50} value={state.abTestPercent || 20}
                  onChange={function(e) { setState({ abTestPercent: Math.min(50, Math.max(10, Number(e.target.value))) }); }}
                  style={{ ...inputStyle, width: 50, textAlign: 'center' }} />
                <span style={{ color: C.TEXT_SUBTLE, fontSize: 10 }}>% test,</span>
                <input type="number" min={1} max={48} value={state.abWaitHours || 4}
                  onChange={function(e) { setState({ abWaitHours: Math.min(48, Math.max(1, Number(e.target.value))) }); }}
                  style={{ ...inputStyle, width: 50, textAlign: 'center' }} />
                <span style={{ color: C.TEXT_SUBTLE, fontSize: 10 }}>h wait</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="From name">
              <input value={state.fromName} onChange={function(e) { setState({ fromName: e.target.value }); }}
                placeholder="Your brand" style={inputStyle} />
            </Field>
            <Field label="From email">
              <input value={state.fromEmail} onChange={function(e) { setState({ fromEmail: e.target.value }); }}
                placeholder="hello@yourdomain.com" style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid ' + C.BORDER, margin: '0 0 14px' }} />

        {/* Search bar */}
        <div style={{ marginBottom: 10 }}>
          <input
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            placeholder="Search templates..."
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid ' + C.BORDER, fontSize: 12, color: C.TEXT,
              background: C.ELEVATED, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {categories.map(function(cat) {
            var active = cat === filter;
            var label = cat === 'all' ? 'All' : (V2_LABELS[cat] || CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat);
            return (
              <button
                key={cat}
                onClick={function() { setFilter(cat); }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
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

        {/* Template list (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(function(t) {
            var selected = t.id === state.templateId;
            var isRecommended = t.id === recommendedId;
            return (
              <button
                key={t.id}
                onClick={function() { handleSelectTemplate(t); }}
                style={{
                  textAlign: 'left', padding: '10px 12px', overflow: 'hidden',
                  borderRadius: 10, cursor: 'pointer',
                  border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                  background: selected ? C.ACCENT_LIGHT : C.SURFACE,
                  transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  height: 100, overflow: 'hidden', background: '#F7F7F5',
                  borderRadius: 6, marginBottom: 8, position: 'relative',
                }}>
                  <iframe
                    title={t.title + ' preview'}
                    srcDoc={t.html}
                    style={{
                      width: '200%', height: '200px', border: 0,
                      transform: 'scale(0.5)', transformOrigin: 'top left',
                      pointerEvents: 'none',
                    }}
                  />
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 22, height: 22, borderRadius: 11,
                      background: C.ACCENT, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, flex: 1 }}>{t.title}</div>
                  {isRecommended && <Pill variant="accent">Recommended</Pill>}
                  {t.isV2 && <Pill variant="accent">V2</Pill>}
                </div>
                <div style={{ fontSize: 11, color: C.TEXT_MUTED, lineHeight: 1.3 }}>
                  {t.description.length > 60 ? t.description.slice(0, 60) + '...' : t.description}
                </div>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 12 }}>
              No templates match your search
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Visual editor */}
      <div style={{
        background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {state.templateId ? (
          <iframe
            ref={editorRef}
            title="Email editor"
            src="/email-editor.html"
            style={{
              flex: 1, border: 'none', width: '100%', minHeight: 600,
              borderRadius: 16,
            }}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: C.TEXT_MUTED,
          }}>
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={C.BORDER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8h20" />
              <path d="M9 4v4" />
              <path d="M15 4v4" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.TEXT_SUBTLE }}>
              Pick a template to start editing
            </div>
            <div style={{ fontSize: 13, color: C.TEXT_MUTED, maxWidth: 280, textAlign: 'center' }}>
              Select a template from the left panel. You can customize everything - text, images, buttons, and colors.
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <GhostButton onClick={onBack}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </GhostButton>
        <PrimaryButton onClick={onNext} disabled={!state.templateId || !state.subject || !state.fromEmail}>
          Continue to send
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
        </PrimaryButton>
      </div>
    </div>
  );
}

var Field = function({ label, children }: any) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
};

var inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: C.ELEVATED,
  border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box',
};
