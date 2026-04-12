/**
 * Lightweight Embed Route
 *
 * This is a minimal, SSR-rendered quiz page optimized for embedding in iframes.
 * It fetches quiz data server-side and renders a clean quiz interface with zero
 * Clerk/Supabase/auth overhead.
 *
 * Key features:
 * - Server-side quiz data fetching
 * - No Clerk provider or authentication
 * - Minimal CSS-in-JS to keep bundle small
 * - Client-side handles: answer selection, form submission, postMessage to parent
 * - Uses quiz branding (colors, fonts) from the quiz data or query params
 * - Container queries for responsive embed sizing
 *
 * Usage:
 *   squarespell.com/embed/quiz-slug
 *   quiz.squarespell.com/embed/quiz-slug?bg=#fff&fg=#000&accent=#0a0a0a&font=Inter
 */

import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

interface QuizOption {
  id: string;
  text: string;
  score?: number;
}

interface QuizQuestion {
  id: string;
  text?: string;
  question?: string;
  subtitle?: string;
  options: QuizOption[];
}

interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  minScore?: number;
  maxScore?: number;
}

interface QuizBranding {
  colors?: Record<string, string>;
  font_family?: string;
  site_name?: string;
}

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  outcomes?: QuizOutcome[];
  results?: QuizOutcome[];
  branding?: QuizBranding;
  settings?: {
    primary_color?: string;
    primaryColor?: string;
    cta_text?: string;
    cta_url?: string;
    show_branding?: boolean;
    requireEmail?: boolean;
  };
  leadGate?: { headline?: string; subtext?: string; buttonText?: string };
}

async function fetchQuiz(slug: string): Promise<Quiz | null> {
  try {
    const res = await fetch(`${API}/api/quiz/${slug}`, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function EmbedQuizClient({
  quiz,
  brandBg,
  brandText,
  brandPrimary,
  brandFont,
}: {
  quiz: Quiz;
  brandBg: string;
  brandText: string;
  brandPrimary: string;
  brandFont: string;
}) {
  'use client';

  const React = require('react') as typeof import('react');
  const { useEffect, useState, useCallback, useRef } = React;

  const [stage, setStage] = useState<'loading' | 'error' | 'question' | 'leadgate' | 'result'>('question');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const totalQs = quiz.questions.length || 0;
  const currentQ = quiz.questions[qIdx];
  const requireEmail = quiz.settings?.requireEmail !== false;
  const progress =
    stage === 'question' ? Math.round(((qIdx + 1) / Math.max(totalQs, 1)) * 100) :
    stage === 'leadgate' ? 95 : 100;

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const brandSurface = quiz.branding?.colors?.surface || brandBg;
  const brandBorder = 'rgba(0,0,0,0.10)';
  const brandName = quiz.branding?.site_name || '';
  const showBranding = quiz.settings?.show_branding !== false;

  // Notify embed parent of height changes
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;
    const notify = () => {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ source: 'squarespell', type: 'resize', height: h }, '*');
    };
    const ro = new ResizeObserver(notify);
    ro.observe(document.body);
    notify();
    return () => ro.disconnect();
  }, [stage, qIdx]);

  function getOutcome(answers: Record<number, number>): QuizOutcome | null {
    const outcomes = quiz.outcomes || quiz.results || [];
    if (outcomes.length === 0) return null;
    let total = 0;
    Object.entries(answers).forEach(([qi, oi]) => {
      const q = quiz.questions[Number(qi)];
      const opt = q?.options?.[Number(oi)];
      if (opt?.score !== undefined) total += Number(opt.score);
    });
    const matched = outcomes.find(
      (o) => o.minScore !== undefined && o.maxScore !== undefined && total >= o.minScore && total <= o.maxScore
    );
    return matched || outcomes[0];
  }

  const pickOption = useCallback(
    (oi: number) => {
      setAnswers((prev) => ({ ...prev, [qIdx]: oi }));
      if (qIdx < (quiz.questions.length - 1)) {
        setQIdx(qIdx + 1);
      } else {
        if (requireEmail) {
          setStage('leadgate');
        } else {
          const o = getOutcome({ ...answers, [qIdx]: oi });
          setOutcome(o);
          setStage('result');
          fetch(`${API}/api/quiz/${quiz.slug}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'complete', session_id: sessionIdRef.current, metadata: { outcome_id: o?.id } }),
          }).catch(() => {});
          if (window.parent !== window) {
            window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
          }
        }
      }
    },
    [qIdx, answers, requireEmail, quiz.questions.length, quiz.slug]
  );

  const goBack = () => { if (qIdx > 0) setQIdx(qIdx - 1); };

  const submitLead = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    setLeadError('');
    const o = getOutcome(answers);
    try {
      await fetch(`${API}/api/quiz/${quiz.slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: firstName,
          email,
          answers,
          outcome_id: o?.id,
          session_id: sessionIdRef.current,
        }),
      });
      setOutcome(o);
      setStage('result');
      fetch(`${API}/api/quiz/${quiz.slug}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'complete',
          session_id: sessionIdRef.current,
          metadata: { outcome_id: o?.id },
        }),
      }).catch(() => {});
      if (window.parent !== window) {
        window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
      }
    } catch {
      setLeadError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, firstName, answers, quiz.slug]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        html, body { height: 100%; }
        body {
          font-family: ${brandFont};
          background: ${brandBg};
          color: ${brandText};
        }
        .sq-root {
          container-type: inline-size;
          min-height: 100svh;
          background: ${brandBg};
          color: ${brandText};
          padding: 28px 20px 40px;
          font-family: ${brandFont};
        }
        .sq-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .sq-head {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-bottom: 4px;
        }
        .sq-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${brandPrimary};
        }
        .sq-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }
        .sq-sub {
          font-size: 14px;
          opacity: 0.64;
          line-height: 1.55;
        }
        .sq-card {
          background: ${brandSurface};
          border: 1px solid ${brandBorder};
          border-radius: 18px;
          padding: 26px 22px 26px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.04);
        }
        .sq-prog {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.55;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .sq-bar {
          height: 4px;
          background: ${brandBorder};
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .sq-bar-fill {
          height: 100%;
          background: ${brandPrimary};
          border-radius: 100px;
          transition: width 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-qlabel {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${brandPrimary};
          margin-bottom: 8px;
        }
        .sq-q {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.22;
          margin-bottom: 20px;
        }
        .sq-opts {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sq-opt {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-opt:hover {
          border-color: ${brandPrimary};
          transform: translateY(-1px);
        }
        .sq-opt.picked {
          border-color: ${brandPrimary};
          background: ${brandPrimary}14;
        }
        .sq-opt-letter {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: ${brandBorder};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .sq-opt.picked .sq-opt-letter {
          background: ${brandPrimary};
          color: ${brandBg};
        }
        .sq-back {
          margin-top: 16px;
          font-size: 12px;
          opacity: 0.5;
          cursor: pointer;
          display: inline-block;
        }
        .sq-back:hover { opacity: 0.9; }

        .sq-lead {
          text-align: center;
        }
        .sq-lead-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 8px;
        }
        .sq-lead-sub {
          font-size: 14px;
          opacity: 0.64;
          margin-bottom: 22px;
        }
        .sq-field {
          text-align: left;
          margin-bottom: 12px;
        }
        .sq-field label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 6px;
        }
        .sq-input {
          width: 100%;
          padding: 13px 14px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          outline: none;
        }
        .sq-input:focus { border-color: ${brandPrimary}; }
        .sq-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 22px;
          background: ${brandPrimary};
          color: ${brandBg};
          border: 0;
          border-radius: 100px;
          font-family: ${brandFont};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-btn:hover { transform: translateY(-1px); }
        .sq-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .sq-result {
          text-align: center;
        }
        .sq-result-badge {
          display: inline-block;
          padding: 6px 12px;
          background: ${brandPrimary}1a;
          color: ${brandPrimary};
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sq-result-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 10px;
        }
        .sq-result-desc {
          font-size: 15px;
          opacity: 0.72;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .sq-err {
          font-size: 12px;
          color: #d44;
          margin-top: 8px;
          text-align: center;
        }
        .sq-brand-foot {
          text-align: center;
          margin-top: 22px;
          font-size: 11px;
          opacity: 0.45;
        }
        .sq-brand-foot a { color: inherit; text-decoration: none; }

        @container (max-width: 540px) {
          .sq-root { padding: 20px 14px 32px; }
          .sq-card { padding: 22px 18px; border-radius: 14px; }
          .sq-title { font-size: 22px; }
          .sq-q { font-size: 19px; }
          .sq-result-title { font-size: 24px; }
        }
        @container (max-width: 420px) {
          .sq-opt { padding: 12px 13px; font-size: 13px; }
          .sq-q { font-size: 18px; }
          .sq-title { font-size: 20px; }
        }
      ` }} />

      <div className="sq-root">
        <div className="sq-inner">
          {stage === 'question' && currentQ && (
            <>
              <div className="sq-head">
                {brandName && <div className="sq-eyebrow">{brandName} · Free quiz</div>}
                <div className="sq-title">{quiz.title}</div>
                {quiz.description && <div className="sq-sub">{quiz.description}</div>}
              </div>

              <div className="sq-card">
                <div className="sq-prog">
                  <span>Question {qIdx + 1} of {totalQs}</span>
                  <span>{progress}%</span>
                </div>
                <div className="sq-bar"><div className="sq-bar-fill" style={{ width: `${progress}%` }} /></div>

                <div className="sq-qlabel">Question {String(qIdx + 1).padStart(2, '0')}</div>
                <div className="sq-q">{currentQ.text || currentQ.question}</div>

                <div className="sq-opts">
                  {currentQ.options.map((opt, oi) => (
                    <button
                      key={opt.id + oi}
                      className={`sq-opt${answers[qIdx] === oi ? ' picked' : ''}`}
                      onClick={() => pickOption(oi)}
                      type="button"
                    >
                      <div className="sq-opt-letter">{LETTERS[oi]}</div>
                      <div>{opt.text}</div>
                    </button>
                  ))}
                </div>

                {qIdx > 0 && (
                  <span className="sq-back" onClick={goBack}>← Previous question</span>
                )}
              </div>
            </>
          )}

          {stage === 'leadgate' && (
            <div className="sq-card sq-lead">
              <div className="sq-lead-title">{quiz.leadGate?.headline || 'Your result is ready'}</div>
              <div className="sq-lead-sub">{quiz.leadGate?.subtext || 'Enter your email to see it'}</div>

              <div className="sq-field">
                <label>First name <span style={{ opacity: 0.5, fontWeight: 500 }}>(optional)</span></label>
                <input className="sq-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="sq-field">
                <label>Email</label>
                <input
                  className="sq-input"
                  type="email"
                  value={email}
                  placeholder="you@yoursite.com"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitLead(); }}
                />
              </div>

              <button className="sq-btn" onClick={submitLead} disabled={submitting || !email.trim()} type="button" style={{ marginTop: 10 }}>
                {submitting ? 'Loading…' : (quiz.leadGate?.buttonText || 'Show my result')}
              </button>
              {leadError && <div className="sq-err">{leadError}</div>}
            </div>
          )}

          {stage === 'result' && outcome && (
            <div className="sq-card sq-result">
              <div className="sq-result-badge">Your result</div>
              <div className="sq-result-title">{outcome.title}</div>
              <div className="sq-result-desc">{outcome.description}</div>

              {outcome.ctaUrl ? (
                <a href={outcome.ctaUrl} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="sq-btn" type="button">
                    {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : quiz.settings?.cta_url ? (
                <a href={quiz.settings.cta_url} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="sq-btn" type="button">
                    {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : (
                <button className="sq-btn" type="button">
                  {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                </button>
              )}
            </div>
          )}

          {showBranding && (
            <div className="sq-brand-foot">
              <a href="https://squarespell.com" target="_top" rel="noopener noreferrer">
                Powered by Squarespell
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ErrorView() {
  return (
    <div style={{ minHeight: '100svh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", color: '#1a1a1a', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 340 }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quiz not found</p>
        <p style={{ fontSize: 13, opacity: 0.6 }}>This quiz may have been removed or is not yet published.</p>
      </div>
    </div>
  );
}

export default async function EmbedPage({ params }: { params: { slug: string } }) {
  const quiz = await fetchQuiz(params.slug);

  if (!quiz) {
    return <ErrorView />;
  }

  // Derive branding from quiz settings (matches the main /quiz/[slug] logic)
  const brand = quiz.branding;
  const brandBg = brand?.colors?.background || '#ffffff';
  const brandText = brand?.colors?.text || '#1a1a1a';
  const brandPrimary =
    brand?.colors?.primary || quiz.settings?.primary_color || quiz.settings?.primaryColor || '#0a0a0a';
  const brandFont =
    brand?.font_family && brand.font_family !== 'sans-serif'
      ? `'${brand.font_family}', system-ui, sans-serif`
      : "'Inter', system-ui, sans-serif";

  return (
    <Suspense fallback={<ErrorView />}>
      <EmbedQuizClient
        quiz={quiz}
        brandBg={brandBg}
        brandText={brandText}
        brandPrimary={brandPrimary}
        brandFont={brandFont}
      />
    </Suspense>
  );
}
