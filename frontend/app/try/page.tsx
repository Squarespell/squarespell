'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FLOW_CSS from './flow-css';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

/* ========================================================================= */
/* Types                                                                     */
/* ========================================================================= */
interface Option {
  id: string;
  text: string;
  score?: number;
}
interface Question {
  id: string;
  text: string;
  subtitle?: string;
  options: Option[];
}
interface Outcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  minScore?: number;
  maxScore?: number;
}
interface Quiz {
  title: string;
  description?: string;
  questions: Question[];
  outcomes?: Outcome[];
  leadGate?: any;
  settings?: any;
}
interface Brand {
  detected?: boolean;
  colors?: Record<string, string>;
  font_family?: string;
  site_name?: string;
  favicon_url?: string;
  business?: any;
}
interface OnboardingQ {
  id: string;
  text: string;
  options: string[];
}

/* ========================================================================= */
/* Inline SVG icons (no emoji)                                               */
/* ========================================================================= */
const SvgBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const SvgArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
const SvgArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
);
const SvgDrag = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>
);

/* ========================================================================= */
/* Main component                                                            */
/* ========================================================================= */
function TryFlowInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlParam = searchParams.get('url') || '';

  // Navigation
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Stage 1 state
  const [url, setUrl] = useState(urlParam);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Brand + session
  const [brand, setBrand] = useState<Brand | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [claimToken, setClaimToken] = useState('');

  // Stage 2 state
  const [onboardingQs, setOnboardingQs] = useState<OnboardingQ[]>([]);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, number>>({});
  const [buildingQuiz, setBuildingQuiz] = useState(false);

  // Stage 3 state (editor)
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage 4 state (visitor preview)
  const [s4Idx, setS4Idx] = useState(0);
  const [s4Answers, setS4Answers] = useState<Record<number, number>>({});
  const [s4ShowResult, setS4ShowResult] = useState(false);

  const hasAutoStarted = useRef(false);

  /* ======================== STAGE 1 → STAGE 2 ======================== */
  const goAnalyze = useCallback(async (siteUrl: string) => {
    if (!siteUrl) return;
    setLoading(true);
    setErrorMsg('');
    let normalized = siteUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    try {
      const res = await fetch(`${API}/api/preview-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analyze failed (${res.status})`);
      }
      const data = await res.json();
      setBrand(data.brand);
      setSessionToken(data.session_token);
      setOnboardingQs(data.onboarding_questions || []);
      setOnboardingAnswers({});
      setUrl(normalized);
      setStage(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-start if URL param is present
  useEffect(() => {
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      goAnalyze(urlParam);
    }
  }, [urlParam, goAnalyze]);

  /* ======================== STAGE 2 → STAGE 3 ======================== */
  const onboardingCount = Object.keys(onboardingAnswers).length;
  const buildQuiz = useCallback(async () => {
    if (onboardingCount < 5 || !sessionToken) return;
    setBuildingQuiz(true);
    setErrorMsg('');
    try {
      const payload: Record<string, string> = {};
      for (const q of onboardingQs) {
        if (onboardingAnswers[q.id] !== undefined) payload[q.id] = String(onboardingAnswers[q.id]);
      }
      const res = await fetch(`${API}/api/preview-build-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, answers: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Quiz build failed (${res.status})`);
      }
      const data = await res.json();
      const normalizedQuiz: Quiz = {
        title: data.quiz?.title || 'Your quiz',
        description: data.quiz?.description || '',
        questions: data.quiz?.questions || [],
        outcomes: data.quiz?.outcomes || [],
        leadGate: data.quiz?.leadGate,
        settings: data.quiz?.settings,
      };
      setQuiz(normalizedQuiz);
      setClaimToken(data.claim_token || '');
      setSelectedIdx(0);
      setStage(3);
      try {
        if (data.claim_token) {
          document.cookie = `sq_claim=${data.claim_token};path=/;max-age=86400;SameSite=Lax`;
          sessionStorage.setItem('sq_claim_token', data.claim_token);
        }
        localStorage.setItem('squarespell_preview', JSON.stringify({
          quiz: normalizedQuiz,
          brand,
          url,
          claim_token: data.claim_token,
          createdAt: Date.now(),
        }));
      } catch {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to build quiz.');
    } finally {
      setBuildingQuiz(false);
    }
  }, [onboardingAnswers, onboardingQs, sessionToken, brand, url, onboardingCount]);

  /* ======================== STAGE 3 editor helpers ==================== */
  const scheduleSave = useCallback((nextQuiz: Quiz) => {
    if (!claimToken) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API}/api/preview-quiz/${claimToken}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: nextQuiz.title,
            questions: nextQuiz.questions,
            outcomes: nextQuiz.outcomes,
            settings: nextQuiz.settings,
          }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1800);
      } catch {
        setSaveStatus('idle');
      }
    }, 700);
  }, [claimToken]);

  const updateQuiz = useCallback((next: Quiz) => {
    setQuiz(next);
    scheduleSave(next);
  }, [scheduleSave]);

  const updateQuestionText = (qi: number, text: string) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => i === qi ? { ...q, text } : q);
    updateQuiz({ ...quiz, questions: qs });
  };
  const updateOptionText = (qi: number, oi: number, text: string) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.map((o, j) => j === oi ? { ...o, text } : o);
      return { ...q, options: opts };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const addOption = (qi: number) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      const nextLetter = String.fromCharCode(97 + q.options.length);
      return { ...q, options: [...q.options, { id: nextLetter, text: 'New answer', score: 0 }] };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const deleteOption = (qi: number, oi: number) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, options: q.options.filter((_, j) => j !== oi) };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const deleteQuestion = (qi: number) => {
    if (!quiz) return;
    const qs = quiz.questions.filter((_, i) => i !== qi);
    const next = { ...quiz, questions: qs };
    updateQuiz(next);
    setSelectedIdx((prev) => Math.max(0, Math.min(prev, qs.length - 1)));
  };
  const addQuestion = () => {
    if (!quiz) return;
    const newQ: Question = {
      id: `q${quiz.questions.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      text: 'New question',
      subtitle: '',
      options: [
        { id: 'a', text: 'Option A', score: 3 },
        { id: 'b', text: 'Option B', score: 2 },
        { id: 'c', text: 'Option C', score: 1 },
        { id: 'd', text: 'Option D', score: 0 },
      ],
    };
    const qs = [...quiz.questions, newQ];
    updateQuiz({ ...quiz, questions: qs });
    setSelectedIdx(qs.length - 1);
  };

  /* ======================== STAGE 4 helpers =========================== */
  const resetS4 = () => {
    setS4Idx(0);
    setS4Answers({});
    setS4ShowResult(false);
  };
  const s4Pick = (oi: number) => {
    if (!quiz) return;
    setS4Answers((prev) => ({ ...prev, [s4Idx]: oi }));
    if (s4Idx < quiz.questions.length - 1) {
      setS4Idx(s4Idx + 1);
    } else {
      setS4ShowResult(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const s4Back = () => {
    if (s4Idx > 0) setS4Idx(s4Idx - 1);
  };

  // Pick the matched outcome by summing scores and matching minScore/maxScore
  const s4Outcome = (() => {
    if (!quiz || !quiz.outcomes || quiz.outcomes.length === 0) return null;
    let total = 0;
    Object.entries(s4Answers).forEach(([qi, oi]) => {
      const q = quiz.questions[Number(qi)];
      const opt = q?.options?.[Number(oi)];
      if (opt?.score !== undefined) total += Number(opt.score);
    });
    const matched = quiz.outcomes.find((o) => {
      if (o.minScore === undefined || o.maxScore === undefined) return false;
      return total >= o.minScore && total <= o.maxScore;
    });
    return matched || quiz.outcomes[0];
  })();

  /* ======================== Derived values =========================== */
  const domain = url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || 'your site';
  const siteLetter = (brand?.site_name || domain || 'B').charAt(0).toUpperCase();
  const accent = brand?.colors?.primary || '#D2FF1D';

  const currentQ = quiz && quiz.questions[selectedIdx];

  /* ======================== Sign in → claim flow ====================== */
  const goSignUp = () => {
    const claim = claimToken || (typeof window !== 'undefined' ? sessionStorage.getItem('sq_claim_token') || '' : '');
    router.push(`/sign-up?from=try&url=${encodeURIComponent(url)}${claim ? `&claim=${claim}` : ''}`);
  };

  /* ===================================================================== */
  /* RENDER                                                                */
  /* ===================================================================== */
  return (
    <div className="flow-root" style={{ '--accent': accent } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: FLOW_CSS }} />
      {/* ============ STAGE 1: URL HOOK ============ */}
      <div className={`stage${stage === 1 ? ' active' : ''}`} id="stage-1">
        <div className="topbar">
          <Link href="/" className="brand">
            <div className="brand-dot"><SvgBolt /></div>
            <span>squarespell</span>
          </Link>
          <Link href="/sign-in" className="nav-signin">
            Have an account? <span>Log in</span>
          </Link>
        </div>
        <div className="s1-hero">
          <div className="s1-eyebrow">
            <span className="s1-dot" /> AI quiz builder, live in seconds
          </div>
          <h1 className="s1-title">
            Turn visitors into <span className="s1-title-accent">leads</span>.
          </h1>
          <p className="s1-sub">
            Drop your URL. We read your site, ask you 5 quick questions, and build a quiz that captures real leads on autopilot.
          </p>
          <form
            className="s1-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              goAnalyze(url);
            }}
          >
            <input
              type="text"
              className="s1-input"
              placeholder="yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary s1-btn" disabled={loading || !url}>
              {loading ? 'Analyzing...' : (<><span>Generate quiz</span><span className="btn-icon"><SvgArrowRight /></span></>)}
            </button>
          </form>
          {errorMsg && <div className="s1-error">{errorMsg}</div>}
          <div className="s1-meta">
            <span><span className="dot-dot" /> No sign up needed</span>
            <span><span className="dot-dot" /> 60 seconds</span>
            <span><span className="dot-dot" /> Free preview</span>
          </div>
        </div>
      </div>

      {/* ============ STAGE 2: 5 ONBOARDING QUESTIONS ============ */}
      <div className={`stage${stage === 2 ? ' active' : ''}`} id="stage-2">
        <div className="topbar">
          <div className="brand">
            <div className="brand-dot"><SvgBolt /></div>
            <span>squarespell</span>
          </div>
          <div className="s2-status">
            <span className="s2-status-dot" /> Brand captured
          </div>
        </div>
        <div className="s2-wrap">
          <div className="s2-head">
            <div className="s2-head-left">
              <div className="s2-site-card">
                <div className="s2-site-letter" style={{ background: accent }}>{siteLetter}</div>
                <div>
                  <div className="s2-site-label">Site detected</div>
                  <div className="s2-site-domain">{brand?.site_name || domain}</div>
                </div>
              </div>
            </div>
            <div className="s2-head-right">
              <h2 className="s2-title">A few quick questions about your business</h2>
              <p className="s2-sub">These shape the quiz your visitors will see.</p>
            </div>
          </div>
          <div className="s2-progress">
            <div className="s2-progress-text">{onboardingCount} of 5 answered</div>
            <div className="s2-progress-bar">
              <div className="s2-progress-fill" style={{ width: `${(onboardingCount / 5) * 100}%`, background: accent }} />
            </div>
          </div>

          <div className="s2-list">
            {onboardingQs.map((q, qi) => {
              const answered = onboardingAnswers[q.id] !== undefined;
              return (
                <div key={q.id} className={`s2-question${answered ? ' answered' : ''}`}>
                  <div className="s2-q-head">
                    <div className="s2-q-num">{qi + 1}</div>
                    <div className="s2-q-text">{q.text}</div>
                  </div>
                  <div className="s2-opts">
                    {q.options.map((opt, oi) => {
                      const selected = onboardingAnswers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          type="button"
                          className={`s2-opt${selected ? ' selected' : ''}`}
                          onClick={() => setOnboardingAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        >
                          <div className="s2-opt-radio" />
                          <div>{opt}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {errorMsg && <div className="s1-error" style={{ marginTop: 20 }}>{errorMsg}</div>}
          <div className="s2-footer">
            <button
              className="btn btn-primary btn-large"
              disabled={onboardingCount < 5 || buildingQuiz}
              onClick={buildQuiz}
            >
              {buildingQuiz ? 'Building your quiz...' : (<><span>Build my quiz</span><span className="btn-icon"><SvgArrowRight /></span></>)}
            </button>
          </div>
        </div>
      </div>

      {/* ============ STAGE 3: EDITOR ============ */}
      <div className={`stage${stage === 3 ? ' active' : ''}`} id="stage-3">
        <div className="s3-top">
          <div className="s3-top-left">
            <button className="icon-btn" onClick={() => setStage(2)} aria-label="Back">
              <SvgArrowLeft />
            </button>
            <div className="s3-title-wrap">
              <input
                className="s3-title"
                value={quiz?.title || ''}
                onChange={(e) => quiz && updateQuiz({ ...quiz, title: e.target.value })}
                placeholder="Untitled quiz"
              />
              <div className="s3-title-meta">
                <span className="s3-live-pill"><span className="s3-live-dot" /> DRAFT</span>
                <span className="s3-saved">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="s3-top-right">
            <button className="btn btn-dark" onClick={() => { resetS4(); setStage(4); }}>Preview my quiz</button>
            <button className="btn btn-primary" onClick={() => setStage(5)}>Publish</button>
          </div>
        </div>

        <div className="s3-main">
          <div className="s3-left">
            <div className="qc-list" id="qc-list">
              {quiz && quiz.questions.map((q, i) => {
                const selected = i === selectedIdx;
                return (
                  <div key={q.id + i} className={`qc${selected ? ' selected' : ''}`} onClick={() => setSelectedIdx(i)}>
                    <div className="qc-head">
                      <div className="qc-num">{i + 1}</div>
                      <div className="qc-head-main">
                        <div className="qc-q">{q.text}</div>
                        <div className="qc-meta">{q.options.length} answers &middot; single select</div>
                      </div>
                      <div className="qc-drag" onClick={(e) => e.stopPropagation()}><SvgDrag /></div>
                    </div>
                    {selected && (
                      <div className="qc-body">
                        {q.options.map((o, oi) => (
                          <div key={o.id + oi} className="qc-opt">
                            <div className="qc-opt-letter">{String.fromCharCode(65 + oi)}</div>
                            <div className="qc-opt-text">{o.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="qc-add" onClick={addQuestion}>
                <span className="qc-add-icon"><SvgPlus /></span>
                Add new question
              </button>
            </div>
          </div>

          <aside className="s3-right">
            <div className="side-head">
              <div className="side-title">Edit question</div>
              <div className="side-sub">Click any answer to edit it</div>
            </div>
            {currentQ ? (
              <>
                <div className="side-field">
                  <label className="side-label">Question text</label>
                  <textarea
                    className="side-textarea"
                    value={currentQ.text}
                    onChange={(e) => updateQuestionText(selectedIdx, e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="side-field">
                  <label className="side-label">Answers</label>
                  <div className="side-answers">
                    {currentQ.options.map((opt, oi) => (
                      <div key={opt.id + oi} className="side-answer-row">
                        <div className="side-answer-letter">{String.fromCharCode(65 + oi)}</div>
                        <input
                          className="side-answer-input"
                          value={opt.text}
                          onChange={(e) => updateOptionText(selectedIdx, oi, e.target.value)}
                        />
                        <button
                          className="side-answer-trash"
                          type="button"
                          onClick={() => deleteOption(selectedIdx, oi)}
                          aria-label="Delete answer"
                        >
                          <SvgTrash />
                        </button>
                      </div>
                    ))}
                    <button className="side-add-answer" onClick={() => addOption(selectedIdx)}>
                      <SvgPlus /> Add answer
                    </button>
                  </div>
                </div>
                <div className="side-stats">
                  <div className="side-stat">
                    <div className="side-stat-val">{quiz?.questions.length || 0}</div>
                    <div className="side-stat-label">Questions</div>
                  </div>
                  <div className="side-stat">
                    <div className="side-stat-val">{quiz?.outcomes?.length || 0}</div>
                    <div className="side-stat-label">Outcomes</div>
                  </div>
                </div>
                <button className="side-danger" onClick={() => deleteQuestion(selectedIdx)}>
                  <SvgTrash /> Delete this question
                </button>
              </>
            ) : (
              <div className="side-empty">Select a question to edit</div>
            )}
          </aside>
        </div>
      </div>

      {/* ============ STAGE 4: VISITOR PREVIEW ============ */}
      <div className={`stage${stage === 4 ? ' active' : ''}`} id="stage-4">
        <div className="s4-top">
          <button className="icon-btn" onClick={() => { resetS4(); setStage(3); }} aria-label="Back">
            <SvgArrowLeft />
          </button>
          <div className="s4-note"><div className="s4-note-dot" /> This is how your visitors will see the quiz</div>
          <button className="btn btn-ghost" onClick={() => { resetS4(); setStage(3); }}>Exit preview</button>
        </div>

        {quiz && !s4ShowResult && (
          <div className="s4-stage" id="s4-quiz-view">
            <div className="s4-progress-row">
              <div className="s4-step-label">Question {s4Idx + 1} of {quiz.questions.length}</div>
              <div className="s4-pct">{Math.round(((s4Idx + 1) / quiz.questions.length) * 100)}%</div>
            </div>
            <div className="s4-bar">
              <div className="s4-fill" style={{ width: `${((s4Idx + 1) / quiz.questions.length) * 100}%`, background: accent }} />
            </div>
            <div className="s4-q-num-label">QUESTION {String(s4Idx + 1).padStart(2, '0')}</div>
            <div className="s4-q">{quiz.questions[s4Idx]?.text}</div>
            <div className="s4-opts">
              {quiz.questions[s4Idx]?.options.map((o, oi) => (
                <button
                  key={o.id + oi}
                  className={`s4-opt${s4Answers[s4Idx] === oi ? ' selected' : ''}`}
                  onClick={() => s4Pick(oi)}
                >
                  <div className="s4-opt-letter">{String.fromCharCode(65 + oi)}</div>
                  <div>{o.text}</div>
                </button>
              ))}
            </div>
            {s4Idx > 0 && (
              <button className="s4-back-btn" onClick={s4Back}>
                <SvgArrowLeft /> Back
              </button>
            )}
          </div>
        )}

        {quiz && s4ShowResult && s4Outcome && (
          <div className="s4-result">
            <div className="s4-result-badge">YOUR RESULT</div>
            <div className="s4-result-title">{s4Outcome.title}</div>
            <div className="s4-result-desc">{s4Outcome.description}</div>
            <div className="s4-result-card">
              <h4>Why this fits you</h4>
              <div className="s4-result-points">
                <div className="s4-result-point">
                  <div className="s4-result-point-check"><SvgCheck /></div>
                  <div>Matches the goal you picked during onboarding</div>
                </div>
                <div className="s4-result-point">
                  <div className="s4-result-point-check"><SvgCheck /></div>
                  <div>Tuned to your audience and tone</div>
                </div>
                <div className="s4-result-point">
                  <div className="s4-result-point-check"><SvgCheck /></div>
                  <div>Ready to embed on {brand?.site_name || domain}</div>
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-large" onClick={() => setStage(5)}>Sign in to publish this quiz</button>
            <button className="s4-back-btn" onClick={resetS4}>Take quiz again</button>
          </div>
        )}
      </div>

      {/* ============ STAGE 5: SIGN IN ============ */}
      <div className={`stage${stage === 5 ? ' active' : ''}`} id="stage-5">
        <div className="s5">
          <div className="s5-card">
            <div className="s5-brand">
              <div className="brand-dot"><SvgBolt /></div>
              <span>squarespell</span>
            </div>
            <div className="s5-banner">
              <SvgCheck /> Your quiz is saved. Sign in to publish it.
            </div>
            <div className="s5-title">Sign in to publish</div>
            <div className="s5-sub">One more step, then your quiz goes live.</div>
            <button type="button" className="btn btn-primary btn-block s5-submit" onClick={goSignUp}>
              Continue to sign up
            </button>
            <div className="s5-tiny">
              Already have an account? <Link href="/sign-in">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <TryFlowInner />
    </Suspense>
  );
}
