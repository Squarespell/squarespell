'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

export default function EmbedQuizClient({
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
    let lastSent = 0;
    const notify = () => {
      // Measure actual content height, not the iframe-fitted documentElement.
      // Use the first child of body (the quiz root) to avoid feedback loops.
      const root = document.body.firstElementChild as HTMLElement | null;
      const h = root ? Math.ceil(root.getBoundingClientRect().height) : document.body.scrollHeight;
      if (Math.abs(h - lastSent) < 2) return;
      lastSent = h;
      window.parent.postMessage({ source: 'squarespell', type: 'resize', height: h }, '*');
    };
    const root = document.body.firstElementChild;
    const ro = new ResizeObserver(notify);
    if (root) ro.observe(root); else ro.observe(document.body);
    // Also observe body in case content isn't wrapped
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
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
        .sq-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          filter: saturate(0.6);
        }
        .sq-btn-lead {
          margin-top: 14px;
          padding: 15px 22px;
          font-size: 14px;
          box-shadow: 0 6px 18px ${brandPrimary}40;
        }
        .sq-btn-lead:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px ${brandPrimary}55;
        }
        .sq-lead { text-align: left; padding: 28px 26px 24px; }
        .sq-lead-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background: ${brandPrimary}14;
          color: ${brandPrimary};
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .sq-lead-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.18;
          margin-bottom: 8px;
        }
        .sq-lead-sub {
          font-size: 14px;
          line-height: 1.55;
          opacity: 0.66;
          margin-bottom: 20px;
        }
        .sq-lead-preview {
          position: relative;
          background: ${brandBg};
          border: 1px dashed ${brandBorder};
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 22px;
          overflow: hidden;
          min-height: 96px;
        }
        .sq-lead-preview-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          filter: blur(6px);
          user-select: none;
          pointer-events: none;
        }
        .sq-lead-preview-desc {
          font-size: 13px;
          line-height: 1.55;
          opacity: 0.7;
          filter: blur(5px);
          user-select: none;
          pointer-events: none;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sq-lead-preview-cover {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, ${brandSurface}00 0%, ${brandSurface}cc 45%, ${brandSurface} 100%);
          color: ${brandPrimary};
        }
        .sq-lead-form { display: flex; flex-direction: column; }
        .sq-lead-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .sq-opt-tag {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          opacity: 0.45;
          text-transform: none;
          margin-left: 4px;
        }
        .sq-trust {
          text-align: center;
          font-size: 11px;
          opacity: 0.5;
          margin-top: 10px;
          letter-spacing: 0.01em;
        }
        @container (max-width: 540px) {
          .sq-lead { padding: 24px 20px 22px; }
          .sq-lead-title { font-size: 22px; }
          .sq-lead-grid { grid-template-columns: 1fr; gap: 8px; }
        }

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

        /* Container queries can't target the container itself, so .sq-root
           padding must use @media. In an iframe the viewport IS the embed
           width, so this fires correctly on narrow embeds. */
        @media (max-width: 540px) {
          .sq-root { padding: 20px 14px 32px; }
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
              {(() => {
                const peekOutcome = getOutcome(answers);
                return (
                  <>
                    <div className="sq-lead-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Your result is ready
                    </div>
                    <div className="sq-lead-title">
                      {quiz.leadGate?.headline || (peekOutcome?.title ? `You are a ${peekOutcome.title}` : 'Unlock your personalized result')}
                    </div>
                    <div className="sq-lead-sub">
                      {quiz.leadGate?.subtext || 'Enter your email below to see your full result, recommendations, and next steps.'}
                    </div>
                    {peekOutcome && (
                      <div className="sq-lead-preview" aria-hidden="true">
                        <div className="sq-lead-preview-title">{peekOutcome.title}</div>
                        <div className="sq-lead-preview-desc">{peekOutcome.description}</div>
                        <div className="sq-lead-preview-cover">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      </div>
                    )}
                    <div className="sq-lead-form">
                      <div className="sq-lead-grid">
                        <div className="sq-field">
                          <label>First name <span className="sq-opt-tag">Optional</span></label>
                          <input className="sq-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                        </div>
                        <div className="sq-field">
                          <label>Email</label>
                          <input
                            className="sq-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@yoursite.com"
                            type="email"
                            autoComplete="email"
                            onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) submitLead(); }}
                          />
                        </div>
                      </div>
                      {leadError && <div className="sq-err">{leadError}</div>}
                      <button className="sq-btn sq-btn-lead" onClick={submitLead} disabled={submitting || !email.trim()} type="button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        {submitting ? 'Unlocking...' : (quiz.leadGate?.buttonText || 'Unlock my result')}
                      </button>
                      <div className="sq-trust">No spam. Unsubscribe anytime.</div>
                    </div>
                  </>
                );
              })()}
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
