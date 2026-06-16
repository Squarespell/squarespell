'use client';

/**
 * /templates/[id]/preview - Public template preview page.
 *
 * Visitors can TAKE a full template quiz without authentication.
 * At the end they see the outcome + a CTA to sign up and customize.
 * This page drives template discovery and organic signups.
 *
 * The quiz data comes entirely from the client-side catalog (no API call).
 * Blocks are rendered in a minimal, branded quiz player.
 */

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { QUIZ_TEMPLATE_CATALOG, findTemplateData } from '../../../../lib/quiz/templates';
import type { QuizBlock } from '../../../../lib/quiz/blocks';

var SIGN_UP_URL = '/sign-up';
var TEMPLATES_URL = '/tools/quiz-funnel';

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
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
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

var COLORS = {
  bg: '#F7F7F5',
  card: '#FFFFFF',
  accent: '#0f7377',
  accentLight: '#E8F4F4',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E7EB',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TemplatePreviewPage() {
  var params = useParams();
  var router = useRouter();
  var templateId = typeof params.id === 'string' ? params.id : '';

  var template = useMemo(function() {
    return findTemplateData(templateId) || null;
  }, [templateId]);

  var blocks = useMemo(function() {
    if (!template) return [];
    return template.blocks();
  }, [template]);

  var questions = useMemo(function() { return getQuestions(blocks); }, [blocks]);
  var leadGate = useMemo(function() { return getLeadGate(blocks); }, [blocks]);

  var [currentIndex, setCurrentIndex] = useState(0);
  var [answers, setAnswers] = useState<Record<string, string>>({});
  var [scores, setScores] = useState<Record<string, number>>({});
  var [stage, setStage] = useState<'quiz' | 'gate' | 'result'>('quiz');
  var [gateEmail, setGateEmail] = useState('');

  var totalScore = useMemo(function() {
    var sum = 0;
    Object.values(scores).forEach(function(s) { sum += s; });
    return sum;
  }, [scores]);

  var outcome: any = useMemo(function() {
    if (stage !== 'result') return null;
    return matchOutcome(blocks, totalScore);
  }, [stage, blocks, totalScore]);

  var handleAnswer = useCallback(function(questionId: string, optionId: string, score: number) {
    setAnswers(function(prev) { return Object.assign({}, prev, { [questionId]: optionId }); });
    setScores(function(prev) { return Object.assign({}, prev, { [questionId]: score }); });

    // Auto-advance after short delay
    setTimeout(function() {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(function(i) { return i + 1; });
      } else {
        // Last question answered
        if (leadGate) {
          setStage('gate');
        } else {
          setStage('result');
        }
      }
    }, 350);
  }, [currentIndex, questions.length, leadGate]);

  var handleGateSubmit = useCallback(function() {
    setStage('result');
  }, []);

  var handleSignUp = useCallback(function() {
    router.push(SIGN_UP_URL + '?from=template&template=' + templateId);
  }, [router, templateId]);

  // Not found
  if (!template) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>Template not found</h1>
          <p style={{ fontSize: 15, color: COLORS.muted, margin: '0 0 24px' }}>This template does not exist or has been removed.</p>
          <a href={TEMPLATES_URL} style={{ color: COLORS.accent, fontWeight: 600, textDecoration: 'none' }}>Browse all templates</a>
        </div>
      </div>
    );
  }

  // Progress
  var progress = questions.length > 0 ? ((currentIndex + (stage === 'quiz' ? 0 : 1)) / questions.length) * 100 : 0;
  if (stage === 'result') progress = 100;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + COLORS.border, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={template.iconPath} />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{template.name}</span>
          <span style={{ fontSize: 12, color: COLORS.muted, background: COLORS.accentLight, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>Preview</span>
        </div>
        <button
          onClick={handleSignUp}
          style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: COLORS.accent, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
        >
          Use this template
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: COLORS.border }}>
        <div style={{ height: '100%', background: COLORS.accent, width: progress + '%', transition: 'width 0.3s ease' }} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Quiz stage */}
          {stage === 'quiz' && questions[currentIndex] && (function() {
            var q: any = questions[currentIndex];
            var isCards = q.questionStyle === 'cards';
            return (
              <div key={q.id} style={{ animation: 'fadeIn 0.3s ease' }}>
                <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8, fontWeight: 500 }}>
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: '0 0 6px', lineHeight: 1.3 }}>
                  {q.text}
                </h2>
                {q.subtitle && <p style={{ fontSize: 14, color: COLORS.muted, margin: '0 0 24px' }}>{q.subtitle}</p>}
                {!q.subtitle && <div style={{ height: 20 }} />}
                <div style={{ display: 'grid', gridTemplateColumns: isCards ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {(q.options || []).map(function(opt: any) {
                    var selected = answers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={function() { handleAnswer(q.id, opt.id, opt.score || 0); }}
                        style={{
                          padding: isCards ? '20px 16px' : '14px 18px',
                          borderRadius: 12,
                          border: '2px solid ' + (selected ? COLORS.accent : COLORS.border),
                          background: selected ? COLORS.accentLight : '#fff',
                          cursor: 'pointer',
                          textAlign: isCards ? 'center' : 'left',
                          fontSize: 14,
                          fontWeight: 500,
                          color: COLORS.text,
                          transition: 'all 0.15s ease',
                          fontFamily: 'inherit',
                        }}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Lead gate stage */}
          {stage === 'gate' && leadGate && (function() {
            var gate: any = leadGate;
            return (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>{gate.headline}</h2>
                <p style={{ fontSize: 15, color: COLORS.muted, margin: '0 0 28px', lineHeight: 1.5 }}>{gate.subtext}</p>
                <div style={{ maxWidth: 360, margin: '0 auto' }}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={gateEmail}
                    onChange={function(e) { setGateEmail(e.target.value); }}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1px solid ' + COLORS.border, fontSize: 15,
                      outline: 'none', fontFamily: 'inherit', marginBottom: 12,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={handleGateSubmit}
                    style={{
                      width: '100%', padding: '14px 24px', borderRadius: 10,
                      background: COLORS.accent, color: '#fff', border: 'none',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {gate.buttonLabel || 'See my results'}
                  </button>
                  <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12 }}>
                    This is a preview — no data is collected.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Result stage */}
          {stage === 'result' && outcome && (function() {
            return (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: COLORS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 12px' }}>
                  {(outcome as any).title}
                </h2>
                <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.6, margin: '0 0 32px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                  {(outcome as any).description}
                </p>

                {/* CTA to sign up */}
                <div style={{ background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: 16, padding: '28px 24px', maxWidth: 420, margin: '0 auto' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>
                    Want this quiz for your website?
                  </h3>
                  <p style={{ fontSize: 14, color: COLORS.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                    Customize every question, add your branding, and embed it on Squarespace in under 5 minutes.
                  </p>
                  <button
                    onClick={handleSignUp}
                    style={{
                      width: '100%', padding: '14px 24px', borderRadius: 10,
                      background: COLORS.accent, color: '#fff', border: 'none',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Start with this template — free
                  </button>
                  <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12 }}>No credit card required</p>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid ' + COLORS.border, background: '#fff' }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          Powered by{' '}
          <a href="https://squarespell.com" style={{ color: COLORS.accent, textDecoration: 'none', fontWeight: 500 }}>Squarespell Quiz</a>
          {' '}— Quiz funnels for Squarespace
        </span>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
