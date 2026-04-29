'use client';

/**
 * Public hosted quiz page - rendered in the visitor's Squarespace brand.
 *
 * This is what visitors see when they land on squarespell.com/q/{slug} OR when
 * the <script src="/embed.js"> embed iframes this URL into a Squarespace page.
 *
 * Per the prototype-v4 restoration decision, this page mirrors the Stage 4
 * visitor preview from /try: brand colors, brand font, light aesthetic, and a
 * score-based outcome matcher (minScore/maxScore) - NOT the old dark
 * Squarespell-branded theme.
 *
 * Container queries (@container) make the layout responsive to the iframe
 * width, not the device viewport, so the embed looks right at any width.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

import { addUtmParams, quizUtm } from '@/lib/urls';

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
  timeLimit?: number;
}
interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  cta_url?: string;     // snake_case from builder
  cta_text?: string;
  cta_type?: string;
  minScore?: number;
  maxScore?: number;
}

/** Prefill scheduling URLs with lead name and email */
function prefillSchedulingUrl(url: string, ctaType: string | undefined, name: string, email: string): string {
  if (!url || !ctaType) return url;
  try {
    const u = new URL(url);
    if (ctaType === 'scheduling' || ctaType === 'acuity') {
      if (name) u.searchParams.set('firstName', name.split(' ')[0]);
      if (name.includes(' ')) u.searchParams.set('lastName', name.split(' ').slice(1).join(' '));
      if (email) u.searchParams.set('email', email);
    } else if (ctaType === 'calendly') {
      if (name) u.searchParams.set('name', name);
      if (email) u.searchParams.set('email', email);
    }
    return u.toString();
  } catch { return url; }
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
  results?: QuizOutcome[]; // backward compat
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

type Stage = 'loading' | 'error' | 'question' | 'leadgate' | 'submitted' | 'result';

function getOutcome(quiz: Quiz, answers: Record<number, number>): QuizOutcome | null {
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

export default function QuizPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

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

  // Load quiz
  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/quiz/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setStage('error');
          return;
        }
        setQuiz(data);
        setStage('question');
        if (window.parent !== window) {
          window.parent.postMessage({ source: 'squarespell', type: 'start' }, '*');
        }
        fetch(`${API}/api/quiz/${slug}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'view', session_id: sessionIdRef.current }),
        }).catch(() => {});
      })
      .catch(() => {
        setError('Failed to load quiz.');
        setStage('error');
      });
  }, [slug]);

  const totalQs = quiz?.questions.length || 0;
  const currentQ = quiz?.questions[qIdx];
  const requireEmail = quiz?.settings?.requireEmail !== false;
  const progress =
    stage === 'question' ? Math.round(((qIdx + 1) / Math.max(totalQs, 1)) * 100) :
    stage === 'leadgate' ? 95 : 100;

  var pickOption = useCallback(
    function(oi: number) {
      if (!quiz) return;
      // Only record answer if oi >= 0 (oi = -1 means time ran out, skip)
      if (oi >= 0) {
        setAnswers(function(prev) { return Object.assign({}, prev, { [qIdx]: oi }); });
      }
      if (qIdx < (quiz.questions.length - 1)) {
        setQIdx(qIdx + 1);
      } else {
        if (requireEmail) {
          setStage('leadgate');
        } else {
          var newAnswers = Object.assign({}, answers);
          if (oi >= 0) {
            newAnswers[qIdx] = oi;
          }
          var o = getOutcome(quiz, newAnswers);
          setOutcome(o);
          setStage('submitted');
          fetch(API + '/api/quiz/' + slug + '/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'complete', session_id: sessionIdRef.current, metadata: { outcome_id: o?.id } }),
          }).catch(function() {});
          if (window.parent !== window) {
            window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
          }
        }
      }
    },
    [quiz, qIdx, answers, requireEmail, slug]
  );

  // Timer countdown for current question
  useEffect(function() {
    if (stage !== 'question' || !currentQ || !currentQ.timeLimit || currentQ.timeLimit <= 0) {
      setTimeRemaining(null);
      return;
    }
    setTimeRemaining(currentQ.timeLimit);
    var interval = setInterval(function() {
      setTimeRemaining(function(prev) {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          pickOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function() { clearInterval(interval); };
  }, [qIdx, currentQ, stage, pickOption]);

  const goBack = () => { if (qIdx > 0) setQIdx(qIdx - 1); };

  const submitLead = useCallback(async () => {
    if (!quiz) return;
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    setLeadError('');
    const o = getOutcome(quiz, answers);
    try {
      await fetch(`${API}/api/quiz/${slug}/lead`, {
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
      fetch(`${API}/api/quiz/${slug}/event`, {
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
  }, [quiz, slug, email, firstName, answers]);

  /* ---------- brand derivation (matches try/page Stage 4) ---------- */
  const brand = quiz?.branding;
  const brandBg = brand?.colors?.background || '#ffffff';
  const brandSurface = brand?.colors?.surface || brandBg;
  const brandText = brand?.colors?.text || '#1a1a1a';
  const brandPrimary =
    brand?.colors?.primary || quiz?.settings?.primary_color || quiz?.settings?.primaryColor || '#0a0a0a';
  const brandBorder = 'rgba(0,0,0,0.10)';
  const brandFont =
    brand?.font_family && brand.font_family !== 'sans-serif'
      ? `'${brand.font_family}', system-ui, sans-serif`
      : "'Inter', system-ui, sans-serif";
  const brandName = brand?.site_name || '';
  const showBranding = quiz?.settings?.show_branding !== false;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ---------- render ---------- */
  if (stage === 'loading') {
    return (
      <div role="status" aria-label="Loading quiz" style={{ minHeight: '100svh', background: brandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: brandFont, color: brandText, fontSize: 14, opacity: 0.6 }}>
        Loading...
      </div>
    );
  }
  if (stage === 'error') {
    return (
      <div style={{ minHeight: '100svh', background: brandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: brandFont, color: brandText, padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 340 }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quiz not found</p>
          <p style={{ fontSize: 13, opacity: 0.6 }}>{error || 'This quiz may have been removed.'}</p>
        </div>
      </div>
    );
  }
  if (!quiz) return null;

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
          position: relative;
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

        .sq-timer {
          position: absolute;
          top: 22px;
          right: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: ${brandPrimary}14;
          border-radius: 50%;
          font-size: 18px;
          font-weight: 700;
          color: ${brandPrimary};
          font-family: 'Inter', monospace;
        }
        .sq-timer.warning {
          background: #ff6b5b26;
          color: #ff6b5b;
        }

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
        .sq-input:focus { border-color: ${brandPrimary}; outline: 2px solid ${brandPrimary}; outline-offset: 1px; }
        *:focus-visible { outline: 2px solid ${brandPrimary}; outline-offset: 2px; }
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
                {timeRemaining !== null && (
                  <div className={'sq-timer' + (timeRemaining < 5 ? ' warning' : '')} aria-label={'Time remaining: ' + timeRemaining + ' seconds'}>{timeRemaining}s</div>
                )}
                <div className="sq-prog">
                  <span>Question {qIdx + 1} of {totalQs}</span>
                  <span>{progress}%</span>
                </div>
                <div className="sq-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Quiz progress: ${progress}%`}><div className="sq-bar-fill" style={{ width: `${progress}%` }} /></div>

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
                  <button type="button" className="sq-back" onClick={goBack} style={{ background: 'none', border: 'none', fontFamily: brandFont, color: brandText, cursor: 'pointer' }}>Previous question</button>
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

          {stage === 'submitted' && (
        <div className="sq-card sq-submitted" style={{textAlign:'center',padding:'40px 28px'}}>
          <div style={{fontSize:48,lineHeight:1,marginBottom:16}}>✉️</div>
          <h2 style={{margin:'0 0 8px',fontSize:24}}>Check your inbox</h2>
          <p style={{margin:'0 0 6px',color:'#444'}}>
            We just emailed your personalized report to <strong>{email}</strong>.
          </p>
          <p style={{margin:'0 0 24px',color:'#777',fontSize:14}}>
            Don’t see it in a minute? Check <strong>Promotions</strong> or <strong>Spam</strong>  - 
            mark it as <em>Not Spam</em> so future emails land in your Inbox.
          </p>
          <button
            type="button"
            className="sq-btn sq-btn-secondary"
            onClick={() => setStage('result')}
            style={{padding:'10px 18px'}}
          >
            View results now →
          </button>
        </div>
      )}

      {stage === 'result' && outcome && (
            <div className="sq-card sq-result">
              <div className="sq-result-badge">Your result</div>
              <div className="sq-result-title">{outcome.title}</div>
              <div className="sq-result-desc">{outcome.description}</div>

              {(outcome.ctaUrl || outcome.cta_url) ? (
                <a href={addUtmParams(
                  prefillSchedulingUrl(outcome.ctaUrl || outcome.cta_url || '', outcome.cta_type, firstName, email),
                  quizUtm(slug, outcome.title)
                )} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="sq-btn" type="button">
                    {outcome.ctaText || outcome.cta_text || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : quiz.settings?.cta_url ? (
                <a href={addUtmParams(quiz.settings.cta_url, quizUtm(slug))} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
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
