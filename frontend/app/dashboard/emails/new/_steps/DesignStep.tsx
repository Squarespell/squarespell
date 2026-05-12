'use client';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { Pill, GhostButton, PrimaryButton } from '../../../_components/PageShell';
import { CANVA_TEMPLATES, CANVA_CATEGORIES } from '../../../../../lib/email/canvaTemplates';
import { autoDesignTemplate, applyBrandKit } from '../../../../../lib/email/v2/autoDesign';
import type { AutoDesignResult, BrandKitFromAPI, QuizData } from '../../../../../lib/email/v2/autoDesign';
import { api } from '../../../../../lib/api';

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
  var [previewItem, setPreviewItem] = useState<TemplateItem | null>(null);
  var [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // AI design: auto-pick best template + apply brand
  var [aiDesign, setAiDesign] = useState<AutoDesignResult | null>(function() {
    return autoDesignTemplate(null, null);
  });
  var [aiBrandKit, setAiBrandKit] = useState<BrandKitFromAPI | null>(null);

  // Fetch quiz and brand data on mount
  var aiDataFetched = useRef(false);
  useEffect(function() {
    if (aiDataFetched.current) return;
    aiDataFetched.current = true;

    var brandPromise = api.getBrandKit().catch(function() { return null; });
    var quizPromise = quizId
      ? api.getQuiz(quizId).catch(function() { return null; })
      : Promise.resolve(null);

    Promise.all([brandPromise, quizPromise]).then(function(results: any[]) {
      var brandKit: BrandKitFromAPI | null = results[0];
      var quizRaw: any = results[1];

      if (!brandKit && quizRaw && quizRaw.branding) {
        var qb = quizRaw.branding;
        if (qb.colors || qb.font_family || qb.site_name) {
          brandKit = {
            colors: qb.colors || undefined,
            font_family: qb.font_family || undefined,
            site_name: qb.site_name || undefined,
            favicon_url: qb.favicon_url || undefined,
            logo_url: qb.logo_url || undefined,
          };
        }
      }

      var quizData: QuizData | null = null;
      if (quizRaw) {
        quizData = {
          id: quizRaw.id || quizId || '',
          title: quizRaw.title || '',
          slug: quizRaw.slug || '',
          category: quizRaw.category || quizRaw.quiz_category || '',
          outcomes: quizRaw.outcomes || [],
          questions: quizRaw.questions || [],
        };
      }

      var websiteUrl = quizRaw && quizRaw.settings && quizRaw.settings.website_url;
      if (!brandKit && websiteUrl) {
        setAiBrandKit(null);
        var unbrandedResult = autoDesignTemplate(null, quizData);
        setAiDesign(unbrandedResult);
        api.scrapeBrand(websiteUrl).then(function(scraped: any) {
          if (!scraped || !scraped.colors) return;
          var scrapedKit: BrandKitFromAPI = {
            colors: scraped.colors,
            font_family: scraped.font_family || undefined,
            site_name: scraped.site_name || undefined,
            favicon_url: scraped.favicon_url || undefined,
          };
          setAiBrandKit(scrapedKit);
          var brandedResult = autoDesignTemplate(scrapedKit, quizData);
          setAiDesign(brandedResult);
          api.saveBrandKit(scrapedKit).catch(function() {});
        }).catch(function() {});
        return;
      }

      setAiBrandKit(brandKit);
      var result = autoDesignTemplate(brandKit, quizData);
      setAiDesign(result);
    });
  }, [quizId]);

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

  // Auto-select AI design on mount
  var didAutoSelect = useRef(false);
  var userManuallySelected = useRef(false);
  useEffect(function() {
    if (userManuallySelected.current) return;
    if (!didAutoSelect.current) {
      didAutoSelect.current = true;
      if (state.templateId && state.templateId !== '__ai_designed__') return;
    }
    if (aiDesign) {
      setState({
        templateId: aiDesign.templateId,
        subject: aiDesign.subject,
        preheader: aiDesign.preheader,
        html: aiDesign.html,
      });
    }
  }, [aiDesign]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-apply brand when brandKit loads
  var prevBrandRef = useRef<BrandKitFromAPI | null>(null);
  useEffect(function() {
    if (!aiBrandKit || prevBrandRef.current === aiBrandKit) return;
    prevBrandRef.current = aiBrandKit;
    if (userManuallySelected.current && state.templateId && state.html) {
      var rawHtml = state.html;
      for (var ti = 0; ti < CANVA_TEMPLATES.length; ti++) {
        if (CANVA_TEMPLATES[ti].id === state.templateId) {
          rawHtml = CANVA_TEMPLATES[ti].html;
          break;
        }
      }
      var brandedHtml = applyBrandKit(rawHtml, aiBrandKit);
      setState({ html: brandedHtml });
    }
  }, [aiBrandKit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select template from gallery
  var handleSelectTemplate = useCallback(function(item: TemplateItem) {
    userManuallySelected.current = true;
    var brandedHtml = applyBrandKit(item.html, aiBrandKit);
    setState({
      templateId: item.id,
      subject: item.subject,
      preheader: item.preheader,
      html: brandedHtml,
    });
  }, [setState, aiBrandKit]);

  var aiSourceId = aiDesign ? aiDesign.sourceCanvaId : '';
  var orderedItems = useMemo(function() {
    var rec: TemplateItem[] = [];
    var rest: TemplateItem[] = [];
    for (var i = 0; i < visible.length; i++) {
      if (aiSourceId && visible[i].id === aiSourceId) continue;
      if (visible[i].id === recommendedId) {
        rec.push(visible[i]);
      } else {
        rest.push(visible[i]);
      }
    }
    return rec.concat(rest);
  }, [visible, recommendedId, aiSourceId]);

  var selectedItem = allItems.find(function(t) { return t.id === state.templateId; });

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: C.TEXT, fontWeight: 700 }}>Choose a template</h2>
        <p style={{ margin: '0 0 20px', color: C.TEXT_SUBTLE, fontSize: 13 }}>
          Pick a professionally designed template. Your brand colors and logo are applied automatically.
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
              var label = cat === 'all' ? 'All' : (V2_LABELS[cat] || cat);
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

        {/* Template grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* AI Auto-Designed template card */}
          {aiDesign && (
            <div style={{ position: 'relative' }} className="sq-tpl-card">
              <button
                onClick={function() {
                  userManuallySelected.current = true;
                  setState({
                    templateId: aiDesign!.templateId,
                    subject: aiDesign!.subject,
                    preheader: aiDesign!.preheader,
                    html: aiDesign!.html,
                  });
                }}
                style={{
                  textAlign: 'left' as any, padding: 0, overflow: 'hidden',
                  borderRadius: 14, cursor: 'pointer', width: '100%',
                  border: '2px solid ' + (state.templateId === aiDesign.templateId ? C.ACCENT : C.BORDER),
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #F7F7F5 100%)',
                  transition: 'all 0.15s',
                }}
              >
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
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'linear-gradient(135deg, #0f7377 0%, #059669 100%)',
                    color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: '0 2px 8px rgba(13,115,119,0.3)',
                  }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    AI Recommendation
                  </div>
                  {state.templateId === aiDesign.templateId && (
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
                  <button
                    onClick={function(e) {
                      e.stopPropagation();
                      setPreviewItem({
                        id: aiDesign!.templateId,
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
                    style={eyeBtnStyle}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aiDesign.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {aiDesign.brandApplied && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4 }}>Brand applied</span>
                    )}
                    {aiDesign.quizContentApplied && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#0f7377', background: '#F0FDFA', padding: '2px 8px', borderRadius: 4 }}>Quiz content</span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )}

          {orderedItems.map(function(t) {
            var selected = t.id === state.templateId;
            var isRecommended = t.id === recommendedId;
            return (
              <div key={t.id} style={{ position: 'relative' }} className="sq-tpl-card">
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
                    {isRecommended && !aiDesign && (
                      <div style={{
                        position: 'absolute', top: 8, left: 8,
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
                    <button
                      onClick={function(e) { e.stopPropagation(); setPreviewItem(t); }}
                      title="Preview template"
                      className="sq-tpl-eye"
                      style={eyeBtnStyle}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
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
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid ' + C.BORDER,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT }}>{previewItem.title}</div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>{previewItem.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Desktop/Mobile toggle */}
                  <div style={{ display: 'flex', borderRadius: 7, border: '1px solid ' + C.BORDER, overflow: 'hidden' }}>
                    <button onClick={function() { setPreviewDevice('desktop'); }} style={{
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: previewDevice === 'desktop' ? C.ACCENT : '#FFFFFF',
                      color: previewDevice === 'desktop' ? '#FFFFFF' : C.TEXT_MUTED,
                    }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                    </button>
                    <button onClick={function() { setPreviewDevice('mobile'); }} style={{
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      borderLeft: '1px solid ' + C.BORDER,
                      background: previewDevice === 'mobile' ? C.ACCENT : '#FFFFFF',
                      color: previewDevice === 'mobile' ? '#FFFFFF' : C.TEXT_MUTED,
                    }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                    </button>
                  </div>
                  <button
                    onClick={function() { setPreviewItem(null); }}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      background: C.ELEVATED, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: C.TEXT_MUTED,
                    }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', background: '#F3F4F6', padding: previewDevice === 'mobile' ? '20px 0' : 0 }}>
                <iframe
                  title="Template preview"
                  srcDoc={previewItem.html}
                  style={{
                    width: previewDevice === 'mobile' ? 375 : '100%',
                    height: 600,
                    border: previewDevice === 'mobile' ? '1px solid ' + C.BORDER : 'none',
                    borderRadius: previewDevice === 'mobile' ? 12 : 0,
                    background: '#FFFFFF',
                  }}
                />
              </div>
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

        {/* ============================================= */}
        {/* Customize section — shown when template selected */}
        {/* ============================================= */}
        {state.templateId && (
          <div style={{ marginTop: 24, borderTop: '1px solid ' + C.BORDER, paddingTop: 24 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Left: form fields */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: C.TEXT }}>Customize your email</h3>
                <p style={{ margin: '0 0 20px', color: C.TEXT_SUBTLE, fontSize: 13 }}>
                  Edit the subject line and preview text. Your brand colors are already applied.
                </p>

                {/* Inbox Preview Mockup */}
                <div style={{
                  background: '#F8F9FA', borderRadius: 10, padding: 14, marginBottom: 20,
                  border: '1px solid ' + C.BORDER,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.TEXT_MUTED, textTransform: 'uppercase' as any, letterSpacing: 0.8, marginBottom: 8 }}>
                    Inbox preview
                  </div>
                  <div style={{
                    background: '#FFFFFF', borderRadius: 8, padding: '12px 14px',
                    border: '1px solid ' + C.BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 14, background: C.ACCENT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFFFFF', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(state.fromName || 'B').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {state.fromName || 'Your Brand'}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.TEXT_MUTED, flexShrink: 0 }}>now</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                      {state.subject || 'Your subject line appears here'}
                    </div>
                    <div style={{ fontSize: 12, color: C.TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {state.preheader || 'Preview text appears after the subject...'}
                    </div>
                  </div>
                </div>

                {/* Subject Line */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.TEXT, marginBottom: 6 }}>
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
                    style={fieldInputStyle}
                  />
                </div>

                {/* Preview Text */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.TEXT, marginBottom: 6 }}>
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
                    style={fieldInputStyle}
                  />
                </div>

                {/* A/B Split Test */}
                <div style={{
                  background: state.abEnabled
                    ? 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%)'
                    : '#FAFAF8',
                  border: '1.5px solid ' + (state.abEnabled ? '#0f7377' : C.BORDER),
                  borderRadius: 12, padding: 16,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: state.abEnabled ? 16 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: state.abEnabled ? 'linear-gradient(135deg, #0f7377, #059669)' : C.ELEVATED,
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
                    <button
                      onClick={function() { setState({ abEnabled: !state.abEnabled, subjectB: state.subjectB || '', abTestPercent: state.abTestPercent || 20, abWaitHours: state.abWaitHours || 4 }); }}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: state.abEnabled ? '#0f7377' : '#D1D5DB',
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

                  {state.abEnabled && (
                    <div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0f7377', marginBottom: 6 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: 'linear-gradient(135deg, #0f7377, #059669)',
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
                          style={fieldInputStyle}
                        />
                      </div>
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
                      <div style={{
                        marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.7)',
                        borderRadius: 8, border: '1px solid rgba(13,115,119,0.15)',
                      }}>
                        <div style={{ fontSize: 11, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                          {state.abTestPercent || 20}% of your audience gets Subject A, {state.abTestPercent || 20}% gets Subject B. After {state.abWaitHours || 4} hours, the winning subject is sent to the remaining {100 - ((state.abTestPercent || 20) * 2)}%.
                        </div>
                      </div>
                    </div>
                  )}

                  {!state.abEnabled && (
                    <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 8, lineHeight: 1.5 }}>
                      Enable to test two subject lines. The winner gets sent to the rest automatically.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: template preview */}
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{
                  border: '1px solid ' + C.BORDER, borderRadius: 12, overflow: 'hidden',
                  background: '#F7F7F5',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + C.BORDER, background: '#FFFFFF' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT }}>
                      {selectedItem ? selectedItem.title : 'Template preview'}
                    </div>
                  </div>
                  <div style={{ height: 400, overflow: 'hidden' }}>
                    <iframe
                      title="Selected template preview"
                      srcDoc={state.html || '<div style="padding:40px;text-align:center;color:#9CA3AF">Select a template</div>'}
                      style={{
                        width: '200%', height: '800px', border: 0,
                        transform: 'scale(0.5)', transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={function() {
                    if (selectedItem) {
                      setPreviewItem(selectedItem);
                    }
                  }}
                  style={{
                    width: '100%', marginTop: 10, padding: '10px 16px',
                    borderRadius: 10, border: '1px solid ' + C.BORDER,
                    background: '#FFFFFF', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: C.TEXT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseOver={function(e) { (e.currentTarget as HTMLElement).style.borderColor = C.ACCENT; }}
                  onMouseOut={function(e) { (e.currentTarget as HTMLElement).style.borderColor = C.BORDER; }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Full-size preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {state.templateId && (
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: '#FFFFFF', borderTop: '1px solid ' + C.BORDER,
          borderRadius: '0 0 16px 16px',
          padding: '14px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}>
          <GhostButton onClick={onBack}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </GhostButton>
          <PrimaryButton onClick={onNext} disabled={!state.subject}>
            Continue to send
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, verticalAlign: 'middle' }}><polyline points="9 18 15 12 9 6" /></svg>
          </PrimaryButton>
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

/* ---- Styles ---- */

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

var fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: C.ELEVATED,
  border: '1px solid ' + C.BORDER, borderRadius: 10, color: C.TEXT, fontSize: 14,
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

var eyeBtnStyle: React.CSSProperties = {
  position: 'absolute', bottom: 8, right: 8,
  width: 30, height: 30, borderRadius: 8,
  background: 'rgba(255,255,255,0.92)', border: '1px solid ' + C.BORDER,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: C.TEXT_MUTED, transition: 'all 0.2s',
  zIndex: 5, backdropFilter: 'blur(4px)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
};
