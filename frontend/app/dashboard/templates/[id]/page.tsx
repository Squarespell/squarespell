'use client';

/**
 * /dashboard/templates/[id] — Template detail page with live preview.
 *
 * Shows template info on the left and a fully interactive quiz preview
 * on the right. Users can take the quiz in-place, then click
 * "Use this template" to create a quiz from it.
 */

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useCallback, useMemo } from 'react';
import {
  QUIZ_TEMPLATE_CATALOG,
  findTemplateData,
  getTemplateThumbnail,
  getTemplateQuestionCount,
} from '../../../../lib/quiz/templates';
import type { QuizBlock } from '../../../../lib/quiz/blocks';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';

var ACCENT = C.ACCENT || '#0F7377';
var ACCENT_LIGHT = C.ACCENT_LIGHT || '#E8F5F5';
var PAPER = '#F7F7F5';
/* Shorthand aliases */
var TEXT = C.TEXT;
var MUTED = C.TEXT_MUTED;
var BORDER = C.BORDER;

/* ------------------------------------------------------------------ */
/*  Quiz player utilities                                              */
/* ------------------------------------------------------------------ */

function getQuestions(blocks: QuizBlock[]) {
  return blocks.filter(function(b) { return b.type === 'question'; });
}
function getOutcomes(blocks: QuizBlock[]) {
  return blocks.filter(function(b) { return b.type === 'outcome'; });
}
function getLeadGate(blocks: QuizBlock[]) {
  return blocks.find(function(b) { return b.type === 'leadGate'; }) || null;
}
function matchOutcome(blocks: QuizBlock[], totalScore: number) {
  var outcomes = getOutcomes(blocks);
  var matched = outcomes.find(function(o: any) {
    return totalScore >= (o.minScore || 0) && totalScore <= (o.maxScore || 999);
  });
  return matched || outcomes[0] || null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardTemplateDetailPage() {
  var params = useParams();
  var router = useRouter();
  var templateId = typeof params.id === 'string' ? params.id : '';
  var template = useMemo(function() { return findTemplateData(templateId) || null; }, [templateId]);
  var thumb = useMemo(function() { return getTemplateThumbnail(templateId); }, [templateId]);
  var qCount = useMemo(function() { return getTemplateQuestionCount(templateId); }, [templateId]);

  /* Related templates */
  var related = useMemo(function() {
    if (!template) return [];
    return QUIZ_TEMPLATE_CATALOG.filter(function(t) {
      return t.category === template.category && t.id !== template.id;
    }).slice(0, 3);
  }, [template]);

  /* Quiz player state */
  var blocks = useMemo(function() { return template ? template.blocks() : []; }, [template]);
  var questions = useMemo(function() { return getQuestions(blocks); }, [blocks]);
  var leadGate = useMemo(function() { return getLeadGate(blocks); }, [blocks]);

  var [currentStep, setCurrentStep] = useState(0); // question index
  var [answers, setAnswers] = useState<Record<string, { text: string; score: number }>>({});
  var [phase, setPhase] = useState<'quiz' | 'leadGate' | 'result'>('quiz');
  var [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  var totalScore = useMemo(function() {
    var s = 0;
    Object.keys(answers).forEach(function(k) { s += answers[k].score; });
    return s;
  }, [answers]);

  var outcome = useMemo(function() {
    return matchOutcome(blocks, totalScore);
  }, [blocks, totalScore]);

  var selectAnswer = useCallback(function(questionId: string, text: string, score: number) {
    setAnswers(function(prev) {
      var next = Object.assign({}, prev);
      next[questionId] = { text: text, score: score };
      return next;
    });
    // Advance after short delay
    setTimeout(function() {
      if (currentStep < questions.length - 1) {
        setCurrentStep(function(s) { return s + 1; });
      } else if (leadGate) {
        setPhase('leadGate');
      } else {
        setPhase('result');
      }
    }, 400);
  }, [currentStep, questions.length, leadGate]);

  var skipLeadGate = useCallback(function() {
    setPhase('result');
  }, []);

  var restartQuiz = useCallback(function() {
    setCurrentStep(0);
    setAnswers({});
    setPhase('quiz');
  }, []);

  if (!template) {
    return (
      <DashboardShell title="Template not found">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>Template not found</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '8px 0 20px' }}>This template does not exist or has been removed.</p>
        <Link href="/dashboard/templates" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Browse all templates</Link>
      </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={template.name}>
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: MUTED }}>
        <Link href="/dashboard/templates" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 500 }}>Templates</Link>
        <span>/</span>
        <span style={{ color: TEXT }}>{template.name}</span>
      </div>

      {/* Main layout: Info left + Preview right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* Left: Template info */}
        <div>
          {/* Hero image */}
          {thumb && (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20, height: 220, background: '#f0f0f0' }}>
              <img src={thumb} alt={template.name} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Title + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
              background: ACCENT_LIGHT, color: ACCENT,
            }}>{template.category}</span>
            <span style={{ fontSize: 12, color: MUTED }}>{qCount} questions</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{template.name}</h1>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>{template.description}</p>

          {/* Use template CTA */}
          <button
            onClick={function() { router.push('/dashboard/editor?template=' + template.id); }}
            style={{
              width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700, borderRadius: 10,
              background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 24,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Use this template
          </button>

          {/* Details cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid ' + BORDER, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Built for</div>
              <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{template.audience}</div>
            </div>
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid ' + BORDER, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>Why it works</div>
              <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{template.whyItWorks}</div>
            </div>
          </div>

          {/* Features list */}
          <div style={{ padding: '16px', background: '#fff', border: '1px solid ' + BORDER, borderRadius: 10, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>What is included</div>
            {[
              { icon: 'M9 11l3 3L22 4', label: qCount + ' professionally written questions' },
              { icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 8l-4 4-2-2', label: 'Lead capture gate with email and name' },
              { icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3.01', label: '3 scored outcomes with images and CTAs' },
              { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Real Unsplash images throughout' },
              { icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.658a9 9 0 00-9.632-7.316', label: 'Social sharing on result pages' },
            ].map(function(item, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon}/>
                  </svg>
                  <span style={{ fontSize: 13, color: TEXT }}>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Related templates */}
          {related.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Related templates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {related.map(function(rel) {
                  var relThumb = getTemplateThumbnail(rel.id);
                  return (
                    <Link key={rel.id} href={'/dashboard/templates/' + rel.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10,
                      border: '1px solid ' + BORDER, background: '#fff', textDecoration: 'none',
                    }}>
                      {relThumb && (
                        <img src={relThumb} alt={rel.name} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{rel.name}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{rel.category}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live quiz preview */}
        <div style={{ position: 'sticky', top: 20 }}>

          {/* Device toggle + restart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
              {(['desktop', 'mobile'] as const).map(function(device) {
                var isActive = previewDevice === device;
                return (
                  <button
                    key={device}
                    onClick={function() { setPreviewDevice(device); }}
                    style={{
                      padding: '5px 14px', fontSize: 12, fontWeight: isActive ? 600 : 400,
                      borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: isActive ? '#fff' : 'transparent',
                      color: isActive ? TEXT : MUTED,
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {device === 'desktop' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        Desktop
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                        Mobile
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={restartQuiz} style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6,
              border: '1px solid ' + BORDER, background: '#fff', color: MUTED, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              Restart
            </button>
          </div>

          {/* Preview frame */}
          <div style={{
            width: previewDevice === 'mobile' ? 375 : '100%',
            margin: previewDevice === 'mobile' ? '0 auto' : undefined,
            minHeight: 520, background: PAPER, borderRadius: 16, overflow: 'hidden',
            border: '1px solid ' + BORDER,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>

            {/* Progress bar */}
            {phase === 'quiz' && questions.length > 0 && (
              <div style={{ height: 4, background: '#e5e5e5' }}>
                <div style={{
                  height: '100%', background: ACCENT, borderRadius: 2,
                  width: ((currentStep + 1) / questions.length * 100) + '%',
                  transition: 'width 0.3s',
                }} />
              </div>
            )}

            <div style={{ padding: previewDevice === 'mobile' ? '24px 20px' : '32px 36px' }}>
              {/* QUIZ PHASE */}
              {phase === 'quiz' && questions[currentStep] && (function() {
                var q = questions[currentStep] as any;
                var selectedId = answers[q.id] ? answers[q.id].text : null;
                return (
                  <div>
                    {/* Question media — image or video */}
                    {q.mediaUrl && (
                      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20, height: 160 }}>
                        {q.mediaType === 'video' ? (
                          <video src={q.mediaUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={q.mediaUrl} alt="" onError={function(e: any) { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 6 }}>
                      Question {currentStep + 1} of {questions.length}
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.4 }}>{q.text}</h2>
                    {q.subtitle && <p style={{ fontSize: 13, color: '#888', margin: '0 0 18px' }}>{q.subtitle}</p>}
                    {!q.subtitle && <div style={{ height: 14 }} />}

                    {/* Options */}
                    {q.questionStyle === 'dropdown' ? (
                      <select
                        value={selectedId || ''}
                        onChange={function(e) {
                          var val = e.target.value;
                          var matched = (q.options || []).find(function(o: any) { return o.text === val; });
                          if (matched) selectAnswer(q.id, matched.text, matched.score || 0);
                        }}
                        style={{
                          width: '100%', padding: '12px 16px', fontSize: 14,
                          border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#fff',
                          color: selectedId ? '#333' : '#999', cursor: 'pointer', appearance: 'none' as const,
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                        }}
                      >
                        <option value="" disabled>Select an option...</option>
                        {(q.options || []).map(function(opt: any) {
                          return <option key={opt.id} value={opt.text}>{opt.text}</option>;
                        })}
                      </select>
                    ) : (
                    <div style={{
                      display: q.questionStyle === 'imageChoice' ? 'grid' : 'flex',
                      gridTemplateColumns: q.questionStyle === 'imageChoice' ? '1fr 1fr' : undefined,
                      flexDirection: q.questionStyle !== 'imageChoice' ? 'column' : undefined,
                      gap: 10,
                    }}>
                      {(q.options || []).map(function(opt: any) {
                        var isSelected = selectedId === opt.text;
                        if (q.questionStyle === 'imageChoice' && opt.imageUrl) {
                          return (
                            <button
                              key={opt.id}
                              onClick={function() { selectAnswer(q.id, opt.text, opt.score || 0); }}
                              style={{
                                border: isSelected ? '2px solid ' + ACCENT : '1.5px solid #e0e0e0',
                                borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                                background: '#fff', padding: 0, textAlign: 'left' as const,
                                transition: 'all 0.15s',
                              }}
                            >
                              <img src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                              <div style={{
                                padding: '8px 10px', fontSize: 13, fontWeight: 600,
                                color: isSelected ? ACCENT : '#333',
                              }}>{opt.text}</div>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={opt.id}
                            onClick={function() { selectAnswer(q.id, opt.text, opt.score || 0); }}
                            style={{
                              padding: '12px 16px', fontSize: 14, fontWeight: 500,
                              border: isSelected ? '2px solid ' + ACCENT : '1.5px solid #e0e0e0',
                              borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const,
                              background: isSelected ? ACCENT_LIGHT : '#fff',
                              color: isSelected ? ACCENT : '#333',
                              transition: 'all 0.15s',
                            }}
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                    )}
                  </div>
                );
              })()}

              {/* LEAD GATE PHASE */}
              {phase === 'leadGate' && leadGate && (function() {
                var gate = leadGate as any;
                return (
                  <div style={{ textAlign: 'center' as const, padding: '40px 0' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', background: ACCENT_LIGHT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>{gate.headline}</h2>
                    {gate.subtext && <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>{gate.subtext}</p>}
                    <div style={{ maxWidth: 300, margin: '0 auto' }}>
                      {(gate.fields || []).map(function(f: any) {
                        return (
                          <input
                            key={f.id}
                            type={f.type === 'email' ? 'email' : 'text'}
                            placeholder={f.placeholder || f.label}
                            disabled
                            style={{
                              width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8,
                              border: '1.5px solid #e0e0e0', marginBottom: 10, boxSizing: 'border-box' as const,
                              background: '#fafafa', color: '#999',
                            }}
                          />
                        );
                      })}
                      <button
                        onClick={skipLeadGate}
                        style={{
                          width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                          borderRadius: 10, background: ACCENT, color: '#fff', border: 'none',
                          cursor: 'pointer', marginTop: 4,
                        }}
                      >{gate.buttonLabel || 'Continue'}</button>
                      <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>This is a preview — no data is collected</p>
                    </div>
                  </div>
                );
              })()}

              {/* RESULT PHASE */}
              {phase === 'result' && outcome && (function() {
                var o = outcome as any;
                return (
                  <div style={{ textAlign: 'center' as const }}>
                    {o.imageUrl && (
                      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20, height: 180 }}>
                        <img src={o.imageUrl} alt={o.title} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>{o.title}</h2>
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 24px' }}>{o.description}</p>
                    {o.ctaText && (
                      <button style={{
                        padding: '12px 28px', fontSize: 15, fontWeight: 700, borderRadius: 10,
                        background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
                      }}>{o.ctaText}</button>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <button onClick={restartQuiz} style={{
                        fontSize: 13, color: ACCENT, background: 'none', border: 'none',
                        cursor: 'pointer', fontWeight: 600,
                      }}>Take the quiz again</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Preview note */}
          <p style={{ fontSize: 11, color: MUTED, textAlign: 'center' as const, marginTop: 10 }}>
            This is a live preview — try answering questions to see how the quiz flows
          </p>
        </div>
      </div>
    </div>
    </DashboardShell>
  );
}
