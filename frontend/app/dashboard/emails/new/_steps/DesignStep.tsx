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
import { autoDesignTemplate } from '../../../../../lib/email/v2/autoDesign';
import type { AutoDesignResult } from '../../../../../lib/email/v2/autoDesign';
import { CANVA_TEMPLATES, CANVA_CATEGORIES } from '../../../../../lib/email/canvaTemplates';

export type DesignState = {
  templateId: string;
  subject: string;
  preheader: string;
  html: string;
  fromName: string;
  fromEmail: string;
  abEnabled?: boolean;
  subjectB?: string;
  abTestPercent?: number;
  abWaitHours?: number;
};

export type DesignPhase = 'gallery' | 'editor';

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
  // Canva templates (primary - professional designs)
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
  return items;
}

var V2_LABELS: Record<string, string> = {};
for (var ci = 0; ci < CANVA_CATEGORIES.length; ci++) {
  V2_LABELS[CANVA_CATEGORIES[ci]] = CANVA_CATEGORIES[ci];
}

export function DesignStep({
  state, setState, phase, setPhase, onNext, onBack, quizCategory, quizId,
}: {
  state: DesignState;
  setState: (u: Partial<DesignState>) => void;
  phase: DesignPhase;
  setPhase: (p: DesignPhase) => void;
  onNext: () => void;
  onBack: () => void;
  quizCategory?: string;
  quizId?: string;
}) {
  var allItems = useMemo(buildItems, []);
  var [filter, setFilter] = useState('all');
  var [search, setSearch] = useState('');
  var editorRef = useRef<HTMLIFrameElement>(null);
  var [editorReady, setEditorReady] = useState(false);
  var [previewItem, setPreviewItem] = useState<TemplateItem | null>(null);
  var [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  var [editorDevice, setEditorDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Compute AI design instantly (synchronous) - no loading, no glitch
  var aiDesign = useMemo(function() {
    return autoDesignTemplate(null, null);
  }, []);

  useEffect(function() { injectDesignFocusStyles(); }, []);

  // Lock body scroll when editor phase is active (prevents grey bar bleed-through)
  useEffect(function() {
    if (phase === 'editor') {
      document.body.style.overflow = 'hidden';
      return function() { document.body.style.overflow = ''; };
    }
  }, [phase]);

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

  // Auto-select AI design on mount (synchronous, no loading delay)
  var didAutoSelect = useRef(false);
  var userManuallySelected = useRef(false);
  useEffect(function() {
    if (didAutoSelect.current) return;
    if (state.templateId) { didAutoSelect.current = true; return; }
    didAutoSelect.current = true;
    if (aiDesign) {
      setState({
        templateId: aiDesign.templateId,
        subject: aiDesign.subject,
        preheader: aiDesign.preheader,
        html: aiDesign.html,
      });
    }
  }, [aiDesign, state.templateId, setState]);

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

  // Keep a ref to the latest HTML so the editor-ready effect always has the current value
  var latestHtmlRef = useRef(state.html);
  latestHtmlRef.current = state.html;

  // When editor becomes ready, send the current template HTML once
  var didSendInitial = useRef(false);
  useEffect(function() {
    if (!editorReady) { didSendInitial.current = false; return; }
    if (didSendInitial.current) return;
    if (!editorRef.current || !editorRef.current.contentWindow) return;
    didSendInitial.current = true;
    // Hide the template picker and topbar in the iframe (parent provides unified bar)
    editorRef.current.contentWindow.postMessage({ type: 'sq-hide-templates' }, '*');
    editorRef.current.contentWindow.postMessage({ type: 'sq-hide-topbar' }, '*');
    if (latestHtmlRef.current) {
      editorRef.current.contentWindow.postMessage({
        type: 'sq-load-template',
        html: latestHtmlRef.current,
      }, '*');
    }
  }, [editorReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select template from gallery
  var handleSelectTemplate = useCallback(function(item: TemplateItem) {
    userManuallySelected.current = true;
    setState({
      templateId: item.id,
      subject: item.subject,
      preheader: item.preheader,
      html: item.html,
    });
  }, [setState]);

  // Stable cache-bust value: only changes when entering editor phase
  var [editorCacheBust, setEditorCacheBust] = useState(Date.now);

  // Enter editor phase
  var handleEditTemplate = useCallback(function() {
    setEditorReady(false);
    setEditorCacheBust(Date.now());
    setPhase('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPhase]);

  var handleStartFromScratch = useCallback(function() {
    var blankHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;"><tbody><tr><td style="padding:32px;text-align:center;color:#9CA3AF;font-size:14px;font-family:sans-serif;">Start adding blocks to build your email</td></tr></tbody></table></body></html>';
    setState({
      templateId: '__scratch__',
      subject: '',
      preheader: '',
      html: blankHtml,
    });
    setEditorReady(false);
    setPhase('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setState, setPhase]);

  // Send commands to editor iframe
  var sendToEditor = useCallback(function(msg: Record<string, any>) {
    if (editorRef.current && editorRef.current.contentWindow) {
      editorRef.current.contentWindow.postMessage(msg, '*');
    }
  }, []);

  var handleEditorUndo = useCallback(function() { sendToEditor({ type: 'sq-undo' }); }, [sendToEditor]);
  var handleEditorRedo = useCallback(function() { sendToEditor({ type: 'sq-redo' }); }, [sendToEditor]);
  var handleEditorSave = useCallback(function() { sendToEditor({ type: 'sq-save' }); }, [sendToEditor]);
  var handleSetEditorMode = useCallback(function(mode: 'edit' | 'preview') {
    setEditorMode(mode);
    sendToEditor({ type: 'sq-set-mode', mode: mode });
  }, [sendToEditor]);
  var handleSetEditorDevice = useCallback(function(device: 'desktop' | 'mobile') {
    setEditorDevice(device);
    sendToEditor({ type: 'sq-set-device', device: device });
  }, [sendToEditor]);

  var selectedItem = state.templateId === '__ai_designed__' && aiDesign
    ? { id: '__ai_designed__', title: aiDesign.title, description: aiDesign.description, category: 'ai', isV2: true, html: aiDesign.html, subject: aiDesign.subject, preheader: aiDesign.preheader } as TemplateItem
    : allItems.find(function(t) { return t.id === state.templateId; });

  var aiSourceId = aiDesign ? aiDesign.sourceCanvaId : '';
  // Reorder items: recommended first, then rest; exclude the AI-picked template to avoid duplicate
  var orderedItems = useMemo(function() {
    var rec: TemplateItem[] = [];
    var rest: TemplateItem[] = [];
    for (var i = 0; i < visible.length; i++) {
      // Skip the template already shown as AI Recommendation card
      if (aiSourceId && visible[i].id === aiSourceId) continue;
      if (visible[i].id === recommendedId) {
        rec.push(visible[i]);
      } else {
        rest.push(visible[i]);
      }
    }
    return rec.concat(rest);
  }, [visible, recommendedId, aiSourceId]);

  // ==============================
  // PHASE 1: Full-width template gallery
  // ==============================
  if (phase === 'gallery') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: C.TEXT, fontWeight: 700 }}>Choose a template</h2>
          <p style={{ margin: '0 0 20px', color: C.TEXT_SUBTLE, fontSize: 13 }}>
            Pick a starting point, then customize it in the visual editor.
          </p>

          {/* Search + filters */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="sq-dinput"
                value={search}
                onChange={function(e) { setSearch(e.target.value); }}
                placeholder="Search templates..."
                style={{
                  width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10,
                  border: '1px solid ' + C.BORDER, fontSize: 13, color: C.TEXT,
                  background: C.ELEVATED, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
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
            {/* Start from scratch card */}
            <button
              onClick={handleStartFromScratch}
              style={{
                textAlign: 'center' as any, padding: 0, overflow: 'hidden',
                borderRadius: 14, cursor: 'pointer',
                border: '2px dashed ' + C.BORDER,
                background: C.SURFACE,
                transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 270,
              }}
              onMouseOver={function(e) { (e.currentTarget as HTMLElement).style.borderColor = C.ACCENT; }}
              onMouseOut={function(e) { (e.currentTarget as HTMLElement).style.borderColor = C.BORDER; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: C.ACCENT_LIGHT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>Start from scratch</div>
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, maxWidth: 180, lineHeight: 1.4 }}>Build your email from a blank canvas using the block editor</div>
            </button>

            {/* AI Auto-Designed template card */}
            {aiDesign && (
              <div style={{ position: 'relative' }} className="sq-tpl-card">
                <button
                  onClick={function() {
                    userManuallySelected.current = true;
                    setState({
                      templateId: aiDesign.templateId,
                      subject: aiDesign.subject,
                      preheader: aiDesign.preheader,
                      html: aiDesign.html,
                    });
                  }}
                  style={{
                    textAlign: 'left' as any, padding: 0, overflow: 'hidden',
                    borderRadius: 14, cursor: 'pointer', width: '100%',
                    border: '2px solid ' + (state.templateId === '__ai_designed__' ? C.ACCENT : C.BORDER),
                    background: 'linear-gradient(135deg, #F0FDFA 0%, #F7F7F5 100%)',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    height: 200, overflow: 'hidden', background: '#F7F7F5',
                    position: 'relative', borderBottom: '1px solid ' + C.BORDER,
                  }}>
                    <iframe
                      title="AI designed preview"
                      srcDoc={aiDesign.html}
                      style={{
                        width: '200%', height: '400px', border: 0,
                        transform: 'scale(0.5)', transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* AI Designed badge */}
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6 }}>
                      <div style={{
                        padding: '5px 12px', borderRadius: 20,
                        background: 'linear-gradient(135deg, #0D7377 0%, #059669 100%)',
                        color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 5,
                        boxShadow: '0 2px 8px rgba(13,115,119,0.3)',
                      }}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                        AI Recommendation
                      </div>
                      {aiDesign.brandApplied && (
                        <div style={{
                          padding: '5px 10px', borderRadius: 20,
                          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                          color: C.TEXT, fontSize: 10, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                          border: '1px solid ' + C.BORDER,
                        }}>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Brand applied
                        </div>
                      )}
                      {aiDesign.quizContentApplied && (
                        <div style={{
                          padding: '5px 10px', borderRadius: 20,
                          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                          color: C.TEXT, fontSize: 10, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                          border: '1px solid ' + C.BORDER,
                        }}>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Quiz content
                        </div>
                      )}
                    </div>
                    {/* Selected check */}
                    {state.templateId === '__ai_designed__' && (
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
                    {/* Preview eye */}
                    <button
                      onClick={function(e) {
                        e.stopPropagation();
                        setPreviewItem({
                          id: '__ai_designed__',
                          title: aiDesign!.title,
                          description: aiDesign!.description,
                          category: 'ai',
                          isV2: true,
                          html: aiDesign!.html,
                          subject: aiDesign!.subject,
                          preheader: aiDesign!.preheader,
                        });
                      }}
                      title="Preview template"
                      className="sq-tpl-eye"
                      style={{
                        position: 'absolute', bottom: 8, right: 8,
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.92)', border: '1px solid ' + C.BORDER,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: C.TEXT_MUTED, transition: 'all 0.2s',
                        zIndex: 5, backdropFilter: 'blur(4px)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        opacity: 1, pointerEvents: 'auto',
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '12px 16px', height: 72, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aiDesign.title}</div>
                    <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                      {aiDesign.description}
                    </div>
                  </div>
                </button>
              </div>
            )}


            {orderedItems.map(function(t) {
              var selected = t.id === state.templateId;
              var isRecommended = t.id === recommendedId;
              return (
                <div key={t.id} style={{ position: 'relative' }}
                  className="sq-tpl-card"
                >
                  <button
                    onClick={function() { handleSelectTemplate(t); }}
                    style={{
                      textAlign: 'left' as any, padding: 0, overflow: 'hidden',
                      borderRadius: 14, cursor: 'pointer', width: '100%',
                      border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                      background: C.SURFACE,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Thumbnail */}
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
                        {isRecommended && !aiDesign && (
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
                            AI Recommendation
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
                      {/* Preview eye button - inside thumbnail, bottom-right, hover-only */}
                      <button
                        onClick={function(e) { e.stopPropagation(); setPreviewItem(t); }}
                        title="Preview template"
                        className="sq-tpl-eye"
                        style={{
                          position: 'absolute', bottom: 8, right: 8,
                          width: 30, height: 30, borderRadius: 8,
                          background: 'rgba(255,255,255,0.92)', border: '1px solid ' + C.BORDER,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: C.TEXT_MUTED, transition: 'all 0.2s',
                          zIndex: 5, backdropFilter: 'blur(4px)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          opacity: 1, pointerEvents: 'auto',
                        }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                    {/* Info */}
                    <div style={{ padding: '12px 14px', height: 72, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                        {t.description}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            {orderedItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>
                No templates match your search
              </div>
            )}
          </div>

          {/* Template preview modal */}
          {previewItem && (
            <div
              onClick={function() { setPreviewItem(null); }}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(2px)',
              }}
            >
              <div
                onClick={function(e) { e.stopPropagation(); }}
                style={{
                  background: C.SURFACE, borderRadius: 16, width: 680, maxHeight: '90vh',
                  overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid ' + C.BORDER,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT }}>{previewItem.title}</div>
                    <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>{previewItem.description}</div>
                  </div>
                  <button
                    onClick={function() { setPreviewItem(null); }}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      background: C.ELEVATED, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: C.TEXT_MUTED,
                      flexShrink: 0,
                    }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {/* Preview iframe */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <iframe
                    title="Template preview"
                    srcDoc={previewItem.html.replace(/<a[^>]*>[\s]*<img[^>]*src=["']?["']?[^>]*alt=["']?Logo["']?[^>]*\/?>[\s]*<\/a>/gi, '').replace(/<img[^>]*src=["']?["']?[^>]*alt=["']?Logo["']?[^>]*\/?>/gi, '').replace(/<div[^>]*>[\s]*<\/div>/g, '')}
                    style={{ width: '100%', height: 600, border: 'none' }}
                  />
                </div>
                {/* Footer actions */}
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid ' + C.BORDER,
                  display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                  <GhostButton onClick={function() { setPreviewItem(null); }}>Close</GhostButton>
                  <PrimaryButton onClick={function() {
                    handleSelectTemplate(previewItem!);
                    setPreviewItem(null);
                  }}>
                    Use this template
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom action bar - appears when a template is selected */}
        {state.templateId && (
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: '#FFFFFF', borderTop: '1px solid ' + C.BORDER,
            borderRadius: '0 0 16px 16px',
            padding: '14px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <GhostButton onClick={onBack}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </GhostButton>
              {selectedItem && (
                <div style={{ color: C.TEXT_SUBTLE, fontSize: 13 }}>
                  Selected: <span style={{ fontWeight: 600, color: C.TEXT }}>{selectedItem.title}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <PrimaryButton onClick={handleEditTemplate}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit template
              </PrimaryButton>
              <PrimaryButton onClick={onNext} disabled={!state.subject}>
                Continue to send
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Non-sticky back if no template selected */}
        {!state.templateId && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + C.BORDER }}>
            <GhostButton onClick={onBack}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </GhostButton>
          </div>
        )}
      </div>
    );
  }

  // ==============================
  // PHASE 2: Full-screen editor with campaign sidebar
  // Layout: Top bar | Editor (left) + Campaign sidebar (right)
  // ==============================
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* === SLIM TOP BAR: Navigation + Editor controls === */}
      <div style={{
        padding: '0 12px 0 16px', height: 48, borderBottom: '1px solid ' + C.BORDER,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        background: '#FFFFFF',
      }}>
        {/* Back to templates */}
        <button
          onClick={function() { setPhase('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          title="Back to templates"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.BORDER,
            background: 'transparent', cursor: 'pointer', color: C.TEXT, flexShrink: 0,
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div style={{ width: 1, height: 20, background: C.BORDER, flexShrink: 0 }} />

        {/* Edit / Preview toggle */}
        <div style={{ display: 'flex', borderRadius: 7, border: '1px solid ' + C.BORDER, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={function() { handleSetEditorMode('edit'); }} style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: editorMode === 'edit' ? C.ACCENT : '#FFFFFF',
            color: editorMode === 'edit' ? '#FFFFFF' : C.TEXT_MUTED,
            transition: 'all 0.15s',
          }}>Edit</button>
          <button onClick={function() { handleSetEditorMode('preview'); }} style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            borderLeft: '1px solid ' + C.BORDER,
            background: editorMode === 'preview' ? C.ACCENT : '#FFFFFF',
            color: editorMode === 'preview' ? '#FFFFFF' : C.TEXT_MUTED,
            transition: 'all 0.15s',
          }}>Preview</button>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={handleEditorUndo} title="Undo" style={iconBtnStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
          </button>
          <button onClick={handleEditorRedo} title="Redo" style={iconBtnStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
          </button>
        </div>

        {/* Device toggle */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={function() { handleSetEditorDevice('desktop'); }} title="Desktop" style={{
            ...iconBtnStyle,
            background: editorDevice === 'desktop' ? C.ELEVATED : 'transparent',
            color: editorDevice === 'desktop' ? C.TEXT : C.TEXT_MUTED,
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </button>
          <button onClick={function() { handleSetEditorDevice('mobile'); }} title="Mobile" style={{
            ...iconBtnStyle,
            background: editorDevice === 'mobile' ? C.ELEVATED : 'transparent',
            color: editorDevice === 'mobile' ? C.TEXT : C.TEXT_MUTED,
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
          </button>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Save */}
        <button onClick={handleEditorSave} style={{
          padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', border: '1px solid ' + C.BORDER, background: '#FFFFFF',
          color: C.TEXT, transition: 'all 0.15s', flexShrink: 0,
        }}>Save</button>

        {/* Continue */}
        <PrimaryButton onClick={onNext} disabled={!state.templateId || !state.subject}>
          Continue
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
        </PrimaryButton>
      </div>

      {/* === MAIN AREA: Campaign Sidebar (left) + Editor (right) === */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* === CAMPAIGN SIDEBAR - Always visible (left) === */}
        <div style={{
          width: 320, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid ' + C.BORDER,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '16px 20px 12px', borderBottom: '1px solid ' + C.BORDER,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT }}>Campaign Settings</div>
            <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>Subject, preview text & split testing</div>
          </div>

          {/* Sidebar content - scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

            {/* Subject Line A */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.TEXT, textTransform: 'uppercase' as any, letterSpacing: 0.5, marginBottom: 6 }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                Subject Line {state.abEnabled ? '(A)' : ''}
              </label>
              <input
                value={state.subject}
                onChange={function(e) { setState({ subject: e.target.value }); }}
                placeholder="What will they see in their inbox?"
                className="sq-dinput"
                style={sidebarInputStyle}
              />
            </div>

            {/* Preview Text */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.TEXT, textTransform: 'uppercase' as any, letterSpacing: 0.5, marginBottom: 6 }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                Preview Text
              </label>
              <input
                value={state.preheader || ''}
                onChange={function(e) { setState({ preheader: e.target.value }); }}
                placeholder="Shown after subject in inbox..."
                className="sq-dinput"
                style={sidebarInputStyle}
              />
              <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 4, lineHeight: 1.4 }}>
                This text appears after the subject line in most email clients.
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.BORDER, marginBottom: 20 }} />

            {/* === A/B SPLIT TEST SECTION === */}
            <div style={{
              background: state.abEnabled
                ? 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)'
                : '#FAFAF8',
              border: '1.5px solid ' + (state.abEnabled ? '#0D7377' : C.BORDER),
              borderRadius: 12, padding: 16, marginBottom: 20,
              transition: 'all 0.2s',
            }}>
              {/* A/B Header with toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: state.abEnabled ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: state.abEnabled ? 'linear-gradient(135deg, #0D7377, #059669)' : C.ELEVATED,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={state.abEnabled ? '#FFFFFF' : C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>A/B Split Test</div>
                    <div style={{ fontSize: 11, color: C.TEXT_MUTED }}>Test two subject lines</div>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={function() { setState({ abEnabled: !state.abEnabled, subjectB: state.subjectB || '', abTestPercent: state.abTestPercent || 20, abWaitHours: state.abWaitHours || 4 }); }}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: state.abEnabled ? '#0D7377' : '#D1D5DB',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: '#FFFFFF',
                    position: 'absolute', top: 3,
                    left: state.abEnabled ? 23 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* A/B Content - shown when enabled */}
              {state.abEnabled && (
                <div>
                  {/* Subject B */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0D7377', marginBottom: 6 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        background: 'linear-gradient(135deg, #0D7377, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: '#FFFFFF',
                      }}>B</div>
                      SUBJECT LINE B
                    </label>
                    <input
                      value={state.subjectB || ''}
                      onChange={function(e) { setState({ subjectB: e.target.value }); }}
                      placeholder="Try a different angle..."
                      className="sq-dinput"
                      style={sidebarInputStyle}
                    />
                  </div>

                  {/* Split visualization */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>Test Split</div>
                    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, background: '#E5E7EB' }}>
                      <div style={{ width: (state.abTestPercent || 20) + '%', background: '#0D7377', transition: 'width 0.3s' }} />
                      <div style={{ width: (state.abTestPercent || 20) + '%', background: '#059669', transition: 'width 0.3s' }} />
                      <div style={{ flex: 1, background: '#D1D5DB' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#0D7377', fontWeight: 600 }}>{state.abTestPercent || 20}% A</span>
                      <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>{state.abTestPercent || 20}% B</span>
                      <span style={{ fontSize: 10, color: C.TEXT_MUTED, fontWeight: 600 }}>{100 - ((state.abTestPercent || 20) * 2)}% Winner</span>
                    </div>
                  </div>

                  {/* Settings */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: C.TEXT_MUTED, display: 'block', marginBottom: 4 }}>Test size</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={10} max={50} value={state.abTestPercent || 20}
                          onChange={function(e) { setState({ abTestPercent: Math.min(50, Math.max(10, Number(e.target.value))) }); }}
                          style={{ width: '100%', padding: '6px 8px', background: '#FFFFFF', border: '1px solid ' + C.BORDER, borderRadius: 6, color: C.TEXT, fontSize: 13, textAlign: 'center' as any, boxSizing: 'border-box' }} />
                        <span style={{ color: C.TEXT_MUTED, fontSize: 12, flexShrink: 0 }}>%</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: C.TEXT_MUTED, display: 'block', marginBottom: 4 }}>Wait time</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={1} max={48} value={state.abWaitHours || 4}
                          onChange={function(e) { setState({ abWaitHours: Math.min(48, Math.max(1, Number(e.target.value))) }); }}
                          style={{ width: '100%', padding: '6px 8px', background: '#FFFFFF', border: '1px solid ' + C.BORDER, borderRadius: 6, color: C.TEXT, fontSize: 13, textAlign: 'center' as any, boxSizing: 'border-box' }} />
                        <span style={{ color: C.TEXT_MUTED, fontSize: 12, flexShrink: 0 }}>hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* How it works */}
                  <div style={{
                    marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.7)',
                    borderRadius: 8, border: '1px solid rgba(13,115,119,0.15)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0D7377', marginBottom: 4 }}>How it works</div>
                    <div style={{ fontSize: 11, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                      {state.abTestPercent || 20}% of your audience gets Subject A, {state.abTestPercent || 20}% gets Subject B. After {state.abWaitHours || 4} hours, the winning subject (by open rate) is sent to the remaining {100 - ((state.abTestPercent || 20) * 2)}%.
                    </div>
                  </div>
                </div>
              )}

              {/* When disabled - show benefit */}
              {!state.abEnabled && (
                <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 8, lineHeight: 1.5 }}>
                  Enable to test two subject lines. The winner gets sent to the rest of your audience automatically.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Editor iframe (right) */}
        <iframe
          ref={editorRef}
          title="Email editor"
          src={'/email-editor.html?v=' + editorCacheBust}
          style={{ flex: 1, border: 'none', minWidth: 0 }}
        />
      </div>
    </div>
  );
}

var Field = function({ label, children }: any) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
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
  style.textContent = '.sq-dinput:focus { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; outline: none !important; }' +
    ' .sq-tpl-eye:hover { border-color: ' + C.ACCENT + ' !important; color: ' + C.ACCENT + ' !important; background: #FFFFFF !important; transform: scale(1.08); }' +
    ' @keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

var inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: C.ELEVATED,
  border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

var subjectInputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', background: '#FFFFFF',
  border: '1px solid ' + C.BORDER, borderRadius: 6, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

var iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer', color: C.TEXT_MUTED,
  transition: 'all 0.12s',
};

var sidebarInputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: C.ELEVATED,
  border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};
