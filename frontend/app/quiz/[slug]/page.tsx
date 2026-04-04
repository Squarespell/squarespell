'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────
interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

interface QuizResult {
  id: string;
  title: string;
  description: string;
  recommendation?: string;
}

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  settings?: {
    primary_color?: string;
    cta_text?: string;
    cta_url?: string;
    show_branding?: boolean;
  };
}

type Stage = 'loading' | 'error' | 'question' | 'leadgate' | 'result';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

function getResultForAnswers(quiz: Quiz, answers: Record<string, string>): QuizResult {
  // Simple scoring: count frequency of each result id in answers
  const counts: Record<string, number> = {};
  quiz.results.forEach(r => { counts[r.id] = 0; });
  Object.values(answers).forEach(optId => {
    quiz.questions.forEach(q => {
      q.options.forEach(opt => {
        if (opt.id === optId && (opt as any).result_id) {
          counts[(opt as any).result_id] = (counts[(opt as any).result_id] || 0) + 1;
        }
      });
    });
  });
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return quiz.results.find(r => r.id === topId) || quiz.results[0];
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────
export default function PublicQuizPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');

  const [result, setResult] = useState<QuizResult | null>(null);
  const [leadScore] = useState(() => Math.floor(Math.random() * 20) + 70);

  // ── Fetch quiz ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/quiz/public/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStage('error'); return; }
        setQuiz(data);
        setStage('question');
      })
      .catch(() => { setError('Failed to load quiz. Please try again.'); setStage('error'); });
  }, [slug]);

  // ── Select option ──────────────────────────────────────────────────────────
  const selectOption = useCallback((optId: string) => {
    if (animating) return;
    setSelected(optId);
  }, [animating]);

  // ── Next question ──────────────────────────────────────────────────────────
  const next = useCallback(() => {
    if (!quiz || !selected || animating) return;
    const q = quiz.questions[currentQ];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setAnimating(true);

    setTimeout(() => {
      if (currentQ + 1 < quiz.questions.length) {
        setCurrentQ(c => c + 1);
        setSelected(null);
      } else {
        setStage('leadgate');
      }
      setAnimating(false);
    }, 260);
  }, [quiz, selected, animating, currentQ, answers]);

  // ── Submit lead ────────────────────────────────────────────────────────────
  const submitLead = useCallback(async () => {
    if (!quiz || !email.trim()) { setLeadError('Please enter your email'); return; }
    setSubmitting(true);
    setLeadError('');
    try {
      await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quiz.id,
          first_name: firstName,
          email,
          answers,
        }),
      });
      const r = getResultForAnswers(quiz, answers);
      setResult(r);
      setStage('result');
      // track
      try {
        await fetch(`${API}/api/analytics/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: quiz.id, event: 'lead_submitted' }),
        });
      } catch {}
    } catch {
      setLeadError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [quiz, email, firstName, answers]);

  // ── Key handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'question' || !quiz) return;
    const q = quiz.questions[currentQ];
    const handler = (e: KeyboardEvent) => {
      const idx = ['a','b','c','d'].indexOf(e.key.toLowerCase());
      if (idx >= 0 && idx < q.options.length) selectOption(q.options[idx].id);
      if (e.key === 'Enter' && selected) next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stage, quiz, currentQ, selected, selectOption, next]);

  if (!quiz && stage === 'loading') return <LoadingScreen />;
  if (stage === 'error') return <ErrorScreen message={error} />;
  if (!quiz) return null;

  const progress = stage === 'question'
    ? Math.round(((currentQ) / quiz.questions.length) * 100)
    : stage === 'leadgate' ? 90 : 100;

  const currentQuestion = quiz.questions[currentQ];
  const letters = ['A','B','C','D','E'];
  const accent = quiz.settings?.primary_color || '#D2FF1D';
  const showBranding = quiz.settings?.show_branding !== false;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --acc: ${accent};
          --bg: #07090c;
          --bg2: #0d1018;
          --g1: rgba(255,255,255,.055);
          --g2: rgba(255,255,255,.034);
          --b1: rgba(255,255,255,.09);
          --b2: rgba(255,255,255,.058);
          --t1: #f0f2f5;
          --t2: rgba(240,242,245,.68);
          --t3: rgba(240,242,245,.42);
          --t4: rgba(240,242,245,.22);
          --acc-dim: rgba(210,255,29,.09);
          --acc-b: rgba(210,255,29,.18);
          --green: #4ade80;
          --red: #f87171;
          --fam: 'DM Sans', system-ui, sans-serif;
          --mono: 'DM Mono', monospace;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        body { font-family: var(--fam); background: var(--bg); color: var(--t1); }
        .quiz-wrap {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          position: relative;
          overflow: hidden;
          max-width: 540px;
          margin: 0 auto;
        }
        /* orb glow */
        .orb {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 0;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(100,180,20,.14) 0%, transparent 65%);
          top: -110px; right: -80px;
        }
        /* progress bar */
        .prog-wrap { height: 2px; background: rgba(255,255,255,.06); position: relative; z-index: 10; }
        .prog-fill {
          height: 2px; background: var(--acc); border-radius: 2px;
          transition: width .4s cubic-bezier(.4,0,.2,1);
        }
        /* status bar */
        .status { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; font-size: 11px; color: var(--t3); position: relative; z-index: 2; }
        /* main content */
        .qcontent { padding: 8px 20px 24px; position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; }
        /* xp row */
        .xp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 8px 12px; background: var(--g2); border: .5px solid var(--b2); border-radius: 9px; }
        .xp-wrap { flex: 1; background: rgba(255,255,255,.06); border-radius: 20px; height: 3px; }
        .xp-bar { height: 3px; border-radius: 20px; background: linear-gradient(90deg, var(--acc), #a8d50a); transition: width .4s; }
        .xp-label { font-size: 10px; color: var(--t4); font-weight: 600; white-space: nowrap; }
        /* label chip */
        .qlabel { font-size: 9px; font-weight: 700; color: var(--acc); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 5px; }
        /* question text */
        .qtext { font-size: 18px; font-weight: 800; color: var(--t1); margin-bottom: 20px; letter-spacing: -.04em; line-height: 1.22; }
        /* options */
        .opt {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 14px; background: var(--g2); border: .5px solid var(--b2);
          border-radius: 11px; cursor: pointer; margin-bottom: 8px;
          transition: background .15s, border-color .15s, transform .1s;
          user-select: none;
        }
        .opt:hover { background: var(--g1); border-color: var(--b1); transform: translateY(-1px); }
        .opt.on { background: var(--acc-dim); border-color: var(--acc-b); }
        .opt-key {
          width: 24px; height: 24px; background: var(--g1); border: .5px solid var(--b1);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: var(--t3); flex-shrink: 0;
          font-family: var(--mono); transition: all .15s;
        }
        .opt.on .opt-key { background: var(--acc); color: #07090c; border-color: transparent; }
        .opt-lbl { font-size: 13px; color: var(--t2); line-height: 1.35; transition: color .15s; }
        .opt.on .opt-lbl { color: var(--t1); font-weight: 600; }
        /* buttons */
        .btn-p {
          background: var(--acc); color: #07090c; border: none; border-radius: 11px;
          padding: 14px; font-size: 14px; font-weight: 700; font-family: var(--fam);
          cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: background .15s, transform .1s; letter-spacing: -.02em;
        }
        .btn-p:hover:not(:disabled) { background: #c8f517; transform: translateY(-1px); }
        .btn-p:disabled { opacity: .5; cursor: not-allowed; }
        .btn-s {
          background: var(--g1); color: var(--t1); border: .5px solid var(--b1);
          border-radius: 11px; padding: 13px; font-size: 13px; font-weight: 500;
          font-family: var(--fam); cursor: pointer; width: 100%;
          display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: all .15s;
        }
        .btn-s:hover { border-color: rgba(255,255,255,.16); }
        /* glass card */
        .glass {
          background: var(--g1); backdrop-filter: blur(24px);
          border: .5px solid var(--b1); border-radius: 16px;
        }
        /* inputs */
        .inp-row {
          background: var(--g2); border: .5px solid var(--b2); border-radius: 11px;
          padding: 12px 14px; display: flex; align-items: center; gap: 9px;
          transition: border-color .15s;
        }
        .inp-row:focus-within { border-color: var(--acc-b); }
        .inp {
          background: transparent; border: none; outline: none;
          font-size: 13px; color: var(--t1); font-family: var(--fam); flex: 1;
        }
        .inp::placeholder { color: var(--t4); }
        /* lead gate */
        .gate-emoji { font-size: 44px; margin-bottom: 13px; }
        .gate-title { font-size: 20px; font-weight: 800; color: var(--t1); letter-spacing: -.04em; margin-bottom: 7px; }
        .gate-sub { font-size: 12px; color: var(--t3); line-height: 1.65; margin-bottom: 20px; }
        /* result */
        .result-title { font-size: 20px; font-weight: 800; color: var(--t1); margin-bottom: 10px; letter-spacing: -.04em; }
        .result-desc { font-size: 12px; color: var(--t3); line-height: 1.65; margin-bottom: 16px; }
        .ai-box {
          background: var(--acc-dim); border: .5px solid var(--acc-b);
          border-radius: 11px; padding: 13px 14px; margin-bottom: 14px;
        }
        .ai-label { font-size: 11px; font-weight: 700; color: var(--acc); margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
        .ai-text { font-size: 12px; color: var(--t2); line-height: 1.6; }
        /* stats row */
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .stat-card {
          background: var(--g1); border: .5px solid var(--b1);
          border-radius: 11px; padding: 12px; text-align: center;
        }
        .stat-v { font-size: 20px; font-weight: 800; color: var(--acc); letter-spacing: -.05em; line-height: 1; }
        .stat-l { font-size: 8px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .07em; margin-top: 3px; }
        .stat-d { font-size: 10px; font-weight: 600; margin-top: 3px; color: var(--green); }
        /* badge */
        .badge-hot {
          display: inline-flex; align-items: center; gap: 3px;
          background: rgba(248,113,113,.12); border: .5px solid rgba(248,113,113,.25);
          border-radius: 20px; padding: 2px 8px;
          font-size: 10px; font-weight: 700; color: #fca5a5;
        }
        .chip-acc {
          background: var(--acc-dim); border: .5px solid var(--acc-b);
          border-radius: 20px; padding: 3px 10px;
          font-size: 11px; color: var(--acc); font-weight: 600;
          display: inline-flex; align-items: center; gap: 4px;
        }
        /* bottom nav safe area */
        .bsafe { height: 28px; }
        /* branding footer */
        .branding {
          padding: 16px 20px; text-align: center;
          border-top: .5px solid var(--b2); margin-top: auto;
        }
        .brand-link {
          font-size: 10px; color: var(--t4); text-decoration: none;
          display: inline-flex; align-items: center; gap: 4px;
          transition: color .15s;
        }
        .brand-link:hover { color: var(--t3); }
        .brand-mark { width: 14px; height: 14px; background: var(--acc); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; }
        /* slide animation */
        .slide-in { animation: slideIn .26s cubic-bezier(.4,0,.2,1) both; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(22px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fade-in { animation: fadeIn .3s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        /* error */
        .err-msg { font-size: 11px; color: #f87171; margin-top: 6px; text-align: center; }
        /* input label */
        .inp-label { font-size: 10px; font-weight: 500; color: var(--t4); display: block; margin-bottom: 5px; }
      `}</style>

      <div className="quiz-wrap">
        <div className="orb" />

        {/* ── Progress bar ── */}
        <div className="prog-wrap">
          <div className="prog-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── Status row ── */}
        <div className="status">
          <span style={{ fontWeight: 700, color: 'var(--t2)', fontSize: '13px', letterSpacing: '-.02em' }}>
            {quiz.title}
          </span>
          {stage === 'question' && (
            <span style={{ color: 'var(--acc)', fontWeight: 700, fontSize: '11px' }}>
              {currentQ + 1} of {quiz.questions.length}
            </span>
          )}
          {stage === 'leadgate' && (
            <span style={{ color: 'var(--acc)', fontWeight: 700, fontSize: '11px' }}>Almost done!</span>
          )}
          {stage === 'result' && (
            <span className="badge-hot">🔥 Hot lead</span>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* QUESTION STAGE                                         */}
        {/* ══════════════════════════════════════════════════════ */}
        {stage === 'question' && currentQuestion && (
          <div className="qcontent slide-in" key={currentQ}>
            {/* XP / progress row */}
            <div className="xp-row">
              <div className="xp-wrap">
                <div className="xp-bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="xp-label">{progress}% done</span>
            </div>

            {/* Question */}
            <p className="qlabel">Question {currentQ + 1}</p>
            <p className="qtext">{currentQuestion.question}</p>

            {/* Options */}
            <div style={{ flex: 1 }}>
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`opt${selected === opt.id ? ' on' : ''}`}
                  onClick={() => selectOption(opt.id)}
                >
                  <div className="opt-key">{letters[i]}</div>
                  <span className="opt-lbl">{opt.text}</span>
                </div>
              ))}
            </div>

            {/* Keyboard hint */}
            <p style={{ fontSize: '10px', color: 'var(--t4)', textAlign: 'center', margin: '8px 0 16px', fontFamily: 'var(--mono)' }}>
              press A–D to select · Enter to continue
            </p>

            <button
              className="btn-p"
              onClick={next}
              disabled={!selected || animating}
            >
              {currentQ + 1 < quiz.questions.length ? 'Next' : 'See my results'} <ArrowIcon />
            </button>
            <div className="bsafe" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* LEAD GATE STAGE                                        */}
        {/* ══════════════════════════════════════════════════════ */}
        {stage === 'leadgate' && (
          <div className="qcontent fade-in" style={{ textAlign: 'center' }}>
            <div className="gate-emoji">🎯</div>
            <p className="gate-title">Your results are ready!</p>
            <p className="gate-sub">
              Enter your details to unlock your personalised profile and action plan.
            </p>

            <div className="glass" style={{ padding: '16px', textAlign: 'left', marginBottom: '12px' }}>
              <div style={{ marginBottom: '9px' }}>
                <label className="inp-label">First name</label>
                <div className="inp-row">
                  <input
                    className="inp"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="inp-label">Email address</label>
                <div className="inp-row">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    className="inp"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitLead()}
                  />
                </div>
              </div>

              <button
                className="btn-p"
                onClick={submitLead}
                disabled={submitting || !email.trim()}
                style={{ marginBottom: '10px' }}
              >
                {submitting ? 'Loading…' : 'Show my personalised results 🎉'}
              </button>
              {leadError && <p className="err-msg">{leadError}</p>}
              <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--t4)' }}>
                No spam ever. Unsubscribe in one click.
              </p>
            </div>

            {/* Trust signals */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {['GDPR compliant', 'No spam', 'Secure'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--t4)' }}>
                  <CheckIcon />{t}
                </span>
              ))}
            </div>
            <div className="bsafe" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* RESULT STAGE                                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {stage === 'result' && result && (
          <div className="qcontent fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '14px' }}>🚀</div>

            {/* Score badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge-hot">🔥 Hot lead score</span>
              <span className="chip-acc">{leadScore} / 100</span>
            </div>

            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '7px' }}>
              Your result
            </p>
            <p className="result-title">{result.title}</p>
            <p className="result-desc">{result.description}</p>

            {/* AI Recommendation */}
            {result.recommendation && (
              <div className="ai-box" style={{ textAlign: 'left' }}>
                <p className="ai-label">
                  <ZapIcon /> AI Recommendation
                </p>
                <p className="ai-text">{result.recommendation}</p>
              </div>
            )}

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <p className="stat-v">{leadScore}</p>
                <p className="stat-l">Lead score</p>
                <p className="stat-d">Top {100 - leadScore}%</p>
              </div>
              <div className="stat-card">
                <p className="stat-v">14%</p>
                <p className="stat-l">Avg conversion</p>
                <p className="stat-d">Your profile</p>
              </div>
              <div className="stat-card">
                <p className="stat-v">4x</p>
                <p className="stat-l">More leads</p>
                <p className="stat-d">vs contact form</p>
              </div>
            </div>

            {/* CTAs */}
            {quiz.settings?.cta_url ? (
              <a href={quiz.settings.cta_url} style={{ textDecoration: 'none', display: 'block', marginBottom: '9px' }}>
                <button className="btn-p" style={{ marginBottom: 0 }}>
                  {quiz.settings.cta_text || 'Get started'} <ArrowIcon />
                </button>
              </a>
            ) : (
              <button className="btn-p" style={{ marginBottom: '9px' }}
                onClick={() => window.open('https://app.squarespell.com', '_blank')}>
                {quiz.settings?.cta_text || 'Get my free quiz template'} <ArrowIcon />
              </button>
            )}

            <button className="btn-s" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: result.title, text: result.description, url: window.location.href });
              } else {
                navigator.clipboard?.writeText(window.location.href);
              }
            }}>
              Share my result
            </button>

            <div className="bsafe" />
          </div>
        )}

        {/* ── Branding footer ── */}
        {showBranding && (
          <div className="branding">
            <a href="https://squarespell.com" target="_blank" rel="noopener noreferrer" className="brand-link">
              <span className="brand-mark">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </span>
              Powered by Squarespell
            </a>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,700;9..40,800&display=swap');
        body { background: #07090c; display: flex; align-items: center; justify-content: center; min-height: 100svh; font-family: 'DM Sans', sans-serif; }
        .loader-dot { width: 6px; height: 6px; border-radius: 50%; background: #D2FF1D; display: inline-block; animation: bounce 1.2s infinite; }
        .loader-dot:nth-child(2) { animation-delay: .2s; }
        .loader-dot:nth-child(3) { animation-delay: .4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
          <span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" />
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(240,242,245,.3)', fontFamily: 'DM Sans, sans-serif' }}>Loading quiz…</p>
      </div>
    </>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────
function ErrorScreen({ message }: { message: string }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,700;9..40,800&display=swap');
        body { background: #07090c; display: flex; align-items: center; justify-content: center; min-height: 100svh; font-family: 'DM Sans', sans-serif; padding: 24px; }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: '340px' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>😕</div>
        <p style={{ fontSize: '17px', fontWeight: 800, color: '#f0f2f5', marginBottom: '8px', letterSpacing: '-.04em' }}>Quiz not found</p>
        <p style={{ fontSize: '13px', color: 'rgba(240,242,245,.42)', lineHeight: 1.6 }}>{message || 'This quiz may have been removed or the link is incorrect.'}</p>
      </div>
    </>
  );
}
