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
  var [phase, setPhase] = useState<'gallery' | 'editor'>('gallery');

  useEffect(function() { injectDesignFocusStyles(); }, []);

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
    for (var j = 0; j < allItems.length; j++) {
      if (allItems[j].isV2) return allItems[j].id;
    }
    return allItems.length > 0 ? allItems[0].id : '';
  }, [allItems, quizCategory]);

  // Auto-select recommended template on mount if nothing selected
  var didAutoSelect = useRef(false);
  useEffect(function() {
    if (didAutoSelect.current) return;
    if (state.templateId) { didAutoSelect.current = true; return; }
    if (allItems.length === 0) return;
    var recId = recommendedId || allItems[0].id;
    var item = allItems.find(function(t) { return t.id === recId; });
    if (item) {
      setState({ templateId: item.id, subject: item.subject, html: item.html });
      didAutoSelect.current = true;
      // Stay on gallery so users can browse all templates
    }
  }, [allItems, recommendedId, state.templateId, setState]);

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

  // When editor becomes ready, send the current template HTML
  useEffect(function() {
    if (editorReady && state.html && editorRef.current && editorRef.current.contentWindow) {
      editorRef.current.contentWindow.postMessage({
        type: 'sq-load-template',
        html: state.html,
      }, '*');
    }
  }, [editorReady, state.html]);

  // Select template and switch to editor phase
  var handleSelectTemplate = useCallback(function(item: TemplateItem) {
    setState({
      templateId: item.id,
      subject: item.subject,
      html: item.html,
    });
    setEditorReady(false);
    setPhase('editor');
  }, [setState]);

  var selectedItem = allItems.find(function(t) { return t.id === state.templateId; });

  // Reorder items: recommended first, then rest. V2 before v1 within each group.
  var orderedItems = useMemo(function() {
    var rec: TemplateItem[] = [];
    var rest: TemplateItem[] = [];
    for (var i = 0; i < visible.length; i++) {
      if (visible[i].id === recommendedId) {
        rec.push(visible[i]);
      } else {
        rest.push(visible[i]);
      }
    }
    return rec.concat(rest);
  }, [visible, recommendedId]);

  // ==============================
  // PHASE 1: Full-width template gallery
  // ==============================
  if (phase === 'gallery') {
    return (
      <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
        {/* Top bar: Subject + From fields */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 240px', gap: 12, alignItems: 'end' }}>
            <Field label="Subject line">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={state.subject} onChange={function(e) { setState({ subject: e.target.value }); }}
                  placeholder="Your result is in" className="sq-dinput" style={inputStyle} />
                <button
                  onClick={function() { setState({ abEnabled: !state.abEnabled, subjectB: state.subjectB || '', abTestPercent: state.abTestPercent || 20, abWaitHours: state.abWaitHours || 4 }); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
                    background: state.abEnabled ? C.ACCENT_LIGHT : 'transparent',
                    border: '1px solid ' + (state.abEnabled ? C.ACCENT : C.BORDER),
                    borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: state.abEnabled ? C.ACCENT : C.TEXT_MUTED, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                    <path d="M18 2l4 4-4 4" />
                  </svg>
                  A/B
                </button>
              </div>
            </Field>
            <Field label="From name">
              <input value={state.fromName} onChange={function(e) { setState({ fromName: e.target.value }); }}
                placeholder="Your brand" className="sq-dinput" style={inputStyle} />
            </Field>
            <Field label="From email">
              <input value={state.fromEmail} onChange={function(e) { setState({ fromEmail: e.target.value }); }}
                placeholder="hello@yourdomain.com" className="sq-dinput" style={inputStyle} />
            </Field>
          </div>

          {/* A/B expanded */}
          {state.abEnabled && (
            <div style={{ marginTop: 10, padding: 12, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <Field label="Subject line (B)">
                  <input value={state.subjectB || ''} onChange={function(e) { setState({ subjectB: e.target.value }); }}
                    placeholder="Try a different angle" className="sq-dinput" style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
                <input type="number" min={10} max={50} value={state.abTestPercent || 20}
                  onChange={function(e) { setState({ abTestPercent: Math.min(50, Math.max(10, Number(e.target.value))) }); }}
                  style={{ width: 50, padding: '8px 6px', background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
                <span style={{ color: C.TEXT_SUBTLE, fontSize: 11 }}>% test</span>
                <input type="number" min={1} max={48} value={state.abWaitHours || 4}
                  onChange={function(e) { setState({ abWaitHours: Math.min(48, Math.max(1, Number(e.target.value))) }); }}
                  style={{ width: 50, padding: '8px 6px', background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
                <span style={{ color: C.TEXT_SUBTLE, fontSize: 11 }}>h wait</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid ' + C.BORDER, marginBottom: 18 }} />

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={function(e) { setSearch(e.target.value); }}
              placeholder="Search templates..."
              style={{
                width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10,
                border: '1px solid ' + C.BORDER, fontSize: 13, color: C.TEXT,
                background: C.ELEVATED, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(function(cat) {
              var active = cat === filter;
              var label = cat === 'all' ? 'All' : (V2_LABELS[cat] || CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat);
              return (
                <button
                  key={cat}
                  onClick={function() { setFilter(cat); }}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer',
                    background: active ? C.ACCENT : 'transparent',
                    color: active ? '#FFFFFF' : C.TEXT_MUTED,
                    border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template grid - 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {orderedItems.map(function(t) {
            var selected = t.id === state.templateId;
            var isRecommended = t.id === recommendedId;
            return (
              <button
                key={t.id}
                onClick={function() { handleSelectTemplate(t); }}
                style={{
                  textAlign: 'left', padding: 0, overflow: 'hidden',
                  borderRadius: 14, cursor: 'pointer',
                  border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                  background: C.SURFACE,
                  transition: 'all 0.15s',
                }}
              >
                {/* Large thumbnail */}
                <div style={{
                  height: 200, overflow: 'hidden', background: '#F7F7F5',
                  position: 'relative', borderBottom: '1px solid ' + C.BORDER,
                }}>
                  <iframe
                    title={t.title + ' preview'}
                    srcDoc={t.html}
                    style={{
                      width: '200%', height: '400px', border: 0,
                      transform: 'scale(0.5)', transformOrigin: 'top left',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                    {isRecommended && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 20,
                        background: C.ACCENT, color: '#FFFFFF',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Recommended
                      </div>
                    )}
                    {t.isV2 && (
                      <div style={{
                        padding: '4px 8px', borderRadius: 20,
                        background: 'rgba(255,255,255,0.92)', color: C.TEXT,
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}>
                        V2
                      </div>
                    )}
                  </div>
                  {/* Selected check */}
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 26, height: 26, borderRadius: 13,
                      background: C.ACCENT, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 3 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.4 }}>
                    {t.description.length > 80 ? t.description.slice(0, 80) + '...' : t.description}
                  </div>
                </div>
              </button>
            );
          })}
          {orderedItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>
              No templates match your search
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid ' + C.BORDER }}>
          <GhostButton onClick={onBack}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </GhostButton>
          <div style={{ display: 'flex', gap: 10 }}>
            {state.templateId && (
              <PrimaryButton onClick={function() { setPhase('editor'); }}>
                Edit template
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
              </PrimaryButton>
            )}
            <PrimaryButton onClick={onNext} disabled={!state.templateId || !state.subject || !state.fromEmail}>
              Continue to send
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // PHASE 2: Full-width editor
  // ==============================
  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Compact top bar - balanced grid */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid ' + C.BORDER,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end',
      }}>
        {/* Change template button */}
        <div>
          <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Template</div>
          <button
            onClick={function() { setPhase('gallery'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: C.ELEVATED, border: '1px solid ' + C.BORDER,
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: C.TEXT, width: '100%', boxSizing: 'border-box',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedItem ? selectedItem.title : 'Choose template'}
            </span>
          </button>
        </div>

        {/* Subject */}
        <Field label="Subject line">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={state.subject} onChange={function(e) { setState({ subject: e.target.value }); }}
              placeholder="Your result is in" className="sq-dinput" style={inputStyle} />
            <button
              onClick={function() { setState({ abEnabled: !state.abEnabled, subjectB: state.subjectB || '', abTestPercent: state.abTestPercent || 20, abWaitHours: state.abWaitHours || 4 }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
                background: state.abEnabled ? C.ACCENT_LIGHT : 'transparent',
                border: '1px solid ' + (state.abEnabled ? C.ACCENT : C.BORDER),
                borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: state.abEnabled ? C.ACCENT : C.TEXT_MUTED, whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              A/B
            </button>
          </div>
        </Field>

        {/* From name */}
        <Field label="From name">
          <input value={state.fromName} onChange={function(e) { setState({ fromName: e.target.value }); }}
            placeholder="Your brand" className="sq-dinput" style={inputStyle} />
        </Field>

        {/* From email */}
        <Field label="From email">
          <input value={state.fromEmail} onChange={function(e) { setState({ fromEmail: e.target.value }); }}
            placeholder="hello@yourdomain.com" className="sq-dinput" style={inputStyle} />
        </Field>
      </div>

      {/* A/B expanded row */}
      {state.abEnabled && (
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid ' + C.BORDER,
          background: C.ELEVATED, display: 'flex', gap: 12, alignItems: 'end',
        }}>
          <div style={{ flex: 1 }}>
            <Field label="Subject line (B)">
              <input value={state.subjectB || ''} onChange={function(e) { setState({ subjectB: e.target.value }); }}
                placeholder="Try a different angle" className="sq-dinput" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 4 }}>
            <input type="number" min={10} max={50} value={state.abTestPercent || 20}
              onChange={function(e) { setState({ abTestPercent: Math.min(50, Math.max(10, Number(e.target.value))) }); }}
              style={{ width: 50, padding: '8px 6px', background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
            <span style={{ color: C.TEXT_SUBTLE, fontSize: 11 }}>% test</span>
            <input type="number" min={1} max={48} value={state.abWaitHours || 4}
              onChange={function(e) { setState({ abWaitHours: Math.min(48, Math.max(1, Number(e.target.value))) }); }}
              style={{ width: 50, padding: '8px 6px', background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
            <span style={{ color: C.TEXT_SUBTLE, fontSize: 11 }}>h wait</span>
          </div>
        </div>
      )}

      {/* Full-width editor iframe */}
      <iframe
        ref={editorRef}
        title="Email editor"
        src="/email-editor.html"
        style={{
          flex: 1, border: 'none', width: '100%', minHeight: 640,
        }}
      />

      {/* Bottom nav */}
      <div style={{
        padding: '14px 20px', borderTop: '1px solid ' + C.BORDER,
        display: 'flex', justifyContent: 'space-between',
      }}>
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
    <div style={{ marginBottom: 0 }}>
      <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
};

/* ---- Focus-highlight style injected once ---- */
var FOCUS_STYLE_ID = 'sq-design-focus';
function injectDesignFocusStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOCUS_STYLE_ID)) return;
  var style = document.createElement('style');
  style.id = FOCUS_STYLE_ID;
  style.textContent = '.sq-dinput:focus { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; outline: none !important; }';
  document.head.appendChild(style);
}

var inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: C.ELEVATED,
  border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};
