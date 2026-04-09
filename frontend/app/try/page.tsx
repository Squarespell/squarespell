'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ── Design tokens ────────────────────────────────────────────────────────── */
const ACC  = '#D2FF1D';
const BG   = '#07090c';
const BG2  = '#0e1117';
const BG3  = '#151a23';
const CARD = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT  = '#f0f2f5';
const DIM  = 'rgba(240,242,245,0.45)';
const API  = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Option { id: string; text: string; score?: number }
interface Question { id: string; text: string; subtitle?: string; options: Option[] }
interface Outcome { id: string; title: string; description: string; ctaText?: string }
interface Quiz { title: string; description?: string; questions: Question[]; outcomes?: Outcome[]; leadGate?: any; settings?: any }
interface Brand { detected?: boolean; colors?: any; font_family?: string; site_name?: string; favicon_url?: string; business?: any }

/* ── Loading steps ────────────────────────────────────────────────────────── */
const STEPS = [
  { msg: 'Connecting to your website', done: 'Connected' },
  { msg: 'Reading pages & content', done: 'Content extracted' },
  { msg: 'Detecting brand identity', done: 'Brand detected' },
  { msg: 'Analyzing your business', done: 'Business understood' },
  { msg: 'Crafting quiz questions', done: 'Questions ready' },
  { msg: 'Building outcomes', done: 'Outcomes created' },
  { msg: 'Finalizing your quiz', done: 'Quiz ready' },
];

/* ── Global styles ────────────────────────────────────────────────────────── */
const CSS = `
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-40px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes checkmark{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes scaleIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.fade-up{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both}
.slide-up{animation:slideUp .5s cubic-bezier(.16,1,.3,1) both}
.scale-in{animation:scaleIn .4s cubic-bezier(.16,1,.3,1) both}
.fade-in{animation:fadeIn .4s ease both}
input:focus{border-color:rgba(210,255,29,0.5)!important;box-shadow:0 0 0 4px rgba(210,255,29,0.08)!important}
button:active{transform:scale(0.97)!important}
*{box-sizing:border-box}
.option-card{transition:all .2s cubic-bezier(.16,1,.3,1)}
.option-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.15)!important;background:rgba(255,255,255,0.05)!important}
`;

function TryPageInner() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url') || '';

  const [url, setUrl] = useState(urlParam);
  const [stage, setStage] = useState<'input' | 'loading' | 'preview' | 'error'>('input');
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [claimToken, setClaimToken] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [showLeadGate, setShowLeadGate] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const hasAutoStarted = useRef(false);

  // Auto-start if URL param present
  useEffect(() => {
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startGeneration(urlParam);
    }
  }, [urlParam]);

  // Loading animation
  useEffect(() => {
    if (stage !== 'loading') return;
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, 90 * (1 - Math.exp(-elapsed / 18000)));
      setProgress(pct);
      setStepIdx(Math.min(STEPS.length - 1, Math.floor(elapsed / 3500)));
    }, 60);
    return () => clearInterval(iv);
  }, [stage]);

  const startGeneration = useCallback(async (siteUrl: string) => {
    setStage('loading');
    setProgress(0);
    setStepIdx(0);
    setErrorMsg('');
    setQuiz(null);
    setBrand(null);
    setClaimToken('');
    setCurrentQ(0);
    setAnswers({});
    setShowResult(false);
    setShowLeadGate(false);

    let normalized = siteUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

    try {
      const res = await fetch(`${API}/api/preview-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }
      const data = await res.json();

      // Store claim token (primary handoff mechanism)
      const token = data.claim_token || '';
      setClaimToken(token);

      // Save claim token to cookie (survives OAuth redirects)
      if (token) {
        document.cookie = `sq_claim=${token};path=/;max-age=14400;SameSite=Lax`;
      }

      // Also save to localStorage as backup
      try {
        localStorage.setItem('squarespell_preview', JSON.stringify({
          quiz: data.quiz,
          brand: data.brand,
          url: normalized,
          claim_token: token,
          createdAt: Date.now(),
        }));
        sessionStorage.setItem('sq_claim_token', token);
      } catch {}

      setQuiz(data.quiz);
      setBrand(data.brand);
      setProgress(100);
      setTimeout(() => setStage('preview'), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStage('error');
    }
  }, []);

  const selectAnswer = (qIdx: number, optId: string) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optId }));
    setTransitioning(true);
    setTimeout(() => {
      if (quiz && qIdx < quiz.questions.length - 1) {
        setCurrentQ(qIdx + 1);
      } else {
        setShowLeadGate(true);
      }
      setTransitioning(false);
    }, 400);
  };

  const goBack = () => {
    if (currentQ > 0) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentQ(p => p - 1);
        setTransitioning(false);
      }, 300);
    }
  };

  const accent = brand?.colors?.primary || brand?.colors?.accent || ACC;
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '') || 'your site';
  const signUpUrl = `/sign-up?from=try&url=${encodeURIComponent(url)}${claimToken ? `&claim=${claimToken}` : ''}`;

  // Calculate result based on total score
  const totalScore = Object.entries(answers).reduce((sum, [qIdx, optId]) => {
    const q = quiz?.questions[parseInt(qIdx)];
    const opt = q?.options.find(o => o.id === optId);
    return sum + (opt?.score || 0);
  }, 0);
  const outcomeIdx = quiz?.outcomes
    ? quiz.outcomes.findIndex(o => totalScore >= (o as any).minScore && totalScore <= (o as any).maxScore)
    : 0;
  const outcome = quiz?.outcomes?.[outcomeIdx >= 0 ? outcomeIdx : 0];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"DM Sans",system-ui,sans-serif', color: TEXT, overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${BORDER}`, position: 'relative', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '30px', height: '30px', background: ACC, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: TEXT, letterSpacing: '-0.03em' }}>Squarespell</span>
        </Link>
        <Link href="/sign-in" style={{ fontSize: '13px', color: DIM, textDecoration: 'none' }}>
          Have an account? <span style={{ color: ACC, fontWeight: 600 }}>Log in</span>
        </Link>
      </nav>

      {/* ════════════════════════ INPUT ════════════════════════ */}
      {stage === 'input' && (
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 20px' }}>
          <div className="fade-up" style={{ textAlign: 'center', maxWidth: '560px', width: '100%' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${ACC}10`, border: `1px solid ${ACC}20`, borderRadius: '100px', padding: '6px 16px', marginBottom: '28px', fontSize: '12px', fontWeight: 700, color: ACC, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Free · No sign-up required
            </div>

            <h1 style={{ fontSize: 'clamp(36px,5.5vw,52px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.05, marginBottom: '16px' }}>
              Your AI quiz in<br /><span style={{ color: ACC }}>30 seconds</span>
            </h1>
            <p style={{ fontSize: '16px', color: DIM, lineHeight: 1.7, marginBottom: '40px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              Paste any website. AI reads your brand, understands your business, and creates a lead-generation quiz — ready to embed.
            </p>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '0 auto 16px' }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && url.trim()) startGeneration(url); }}
                placeholder="yoursite.com"
                autoFocus
                style={{ flex: 1, height: '56px', background: BG2, border: `1.5px solid ${BORDER}`, borderRadius: '14px', color: TEXT, fontSize: '16px', padding: '0 20px', outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}
              />
              <button
                onClick={() => { if (url.trim()) startGeneration(url); }}
                disabled={!url.trim()}
                style={{ height: '56px', padding: '0 28px', background: url.trim() ? ACC : `${ACC}30`, color: BG, fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '14px', cursor: url.trim() ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >
                Generate quiz
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'rgba(240,242,245,0.2)', marginBottom: '60px' }}>Works with any website — Squarespace, Shopify, WordPress, custom sites</p>

            {/* Feature pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {[
                ['Brand colors auto-detected', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
                ['AI-powered questions', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v6l4 2'],
                ['Email capture built-in', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'],
              ].map(([label, path]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '10px', fontSize: '12px', color: 'rgba(240,242,245,0.35)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ LOADING ════════════════════════ */}
      {stage === 'loading' && (
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 20px' }}>
          <div className="fade-in" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
            <p style={{ fontSize: '14px', color: DIM, marginBottom: '6px' }}>
              Analyzing <span style={{ color: ACC, fontWeight: 600 }}>{domain}</span>
            </p>
            <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '36px' }}>
              Building your quiz...
            </h2>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', height: '4px', overflow: 'hidden', marginBottom: '36px' }}>
              <div style={{ height: '4px', background: `linear-gradient(90deg, ${ACC}, #a8e600)`, borderRadius: '12px', width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {STEPS.map((s, i) => {
                const isDone = i < stepIdx;
                const isCurrent = i === stepIdx;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(210,255,29,0.04)' : 'transparent',
                    opacity: isDone ? 0.4 : isCurrent ? 1 : 0.15,
                    transition: 'all 0.4s',
                  }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                      background: isDone ? `${ACC}20` : isCurrent ? `${ACC}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isDone ? `${ACC}30` : isCurrent ? `${ACC}25` : 'rgba(255,255,255,0.06)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : isCurrent ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${ACC}`, borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }}/>
                      ) : (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isCurrent ? 600 : 400, color: isDone ? 'rgba(210,255,29,0.6)' : isCurrent ? TEXT : DIM }}>
                      {isDone ? s.done : s.msg}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ ERROR ════════════════════════ */}
      {stage === 'error' && (
        <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 20px' }}>
          <div className="fade-up" style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(248,113,113,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px' }}>Generation failed</h2>
            <p style={{ fontSize: '14px', color: DIM, marginBottom: '28px', lineHeight: 1.6 }}>{errorMsg}</p>
            <button onClick={() => { setStage('input'); setProgress(0); }} style={{ height: '48px', padding: '0 28px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '12px', color: TEXT, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              ← Try again
            </button>
          </div>
        </main>
      )}

      {/* ════════════════════════ PREVIEW ════════════════════════ */}
      {stage === 'preview' && quiz && (
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 60px)', padding: '32px 20px 60px' }}>

          {/* Brand badge */}
          <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {brand?.favicon_url && (
              <img src={brand.favicon_url} alt="" width={16} height={16} style={{ borderRadius: '3px' }} onError={e => (e.currentTarget.style.display = 'none')} />
            )}
            <span style={{ fontSize: '12px', color: 'rgba(240,242,245,0.3)' }}>
              Generated for <span style={{ color: TEXT, fontWeight: 600 }}>{brand?.site_name || domain}</span>
            </span>
            {brand?.colors && (
              <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
                {Object.values(brand.colors).filter(Boolean).slice(0, 3).map((c, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '3px', background: c as string, border: `1px solid rgba(255,255,255,0.08)` }} />
                ))}
              </div>
            )}
          </div>

          {/* ── Quiz container ─────────────────────────────────────── */}
          <div style={{ maxWidth: '580px', width: '100%' }}>

            {/* Quiz title */}
            <div className="slide-up" style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: '6px' }}>
                {quiz.title}
              </h2>
              {quiz.description && <p style={{ fontSize: '14px', color: DIM }}>{quiz.description}</p>}
            </div>

            {/* Progress bar */}
            {!showLeadGate && !showResult && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '28px' }}>
                {quiz.questions.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: '3px', borderRadius: '2px',
                    background: i < currentQ ? accent : i === currentQ ? `${accent}60` : 'rgba(255,255,255,0.06)',
                    transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
                  }} />
                ))}
              </div>
            )}

            {/* ── Question (Typeform-style full card) ──────────────── */}
            {!showLeadGate && !showResult && (
              <div key={currentQ} className={transitioning ? '' : 'slide-up'} style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(240,242,245,0.25)', fontWeight: 600 }}>
                    Question {currentQ + 1} of {quiz.questions.length}
                  </span>
                  {currentQ > 0 && (
                    <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'rgba(240,242,245,0.3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>
                      ← Back
                    </button>
                  )}
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: '24px' }}>
                  {quiz.questions[currentQ]?.text}
                </h3>
                {quiz.questions[currentQ]?.subtitle && (
                  <p style={{ fontSize: '13px', color: DIM, marginBottom: '20px', marginTop: '-16px' }}>{quiz.questions[currentQ].subtitle}</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quiz.questions[currentQ]?.options.map((opt, i) => {
                    const sel = answers[currentQ] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className="option-card"
                        onClick={() => selectAnswer(currentQ, opt.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px',
                          background: sel ? `${accent}08` : 'rgba(255,255,255,0.02)',
                          border: `1.5px solid ${sel ? `${accent}40` : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '14px', cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                          background: sel ? accent : 'rgba(255,255,255,0.04)',
                          border: sel ? 'none' : `1.5px solid rgba(255,255,255,0.08)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: sel ? BG : 'rgba(240,242,245,0.3)',
                          transition: 'all 0.2s',
                        }}>
                          {sel ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : String.fromCharCode(65 + i)}
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: sel ? 600 : 400, color: sel ? TEXT : 'rgba(240,242,245,0.6)', transition: 'all 0.2s' }}>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Keyboard hint */}
                <p style={{ fontSize: '11px', color: 'rgba(240,242,245,0.15)', textAlign: 'center', marginTop: '20px' }}>
                  Click an option to continue
                </p>
              </div>
            )}

            {/* ── Lead gate preview ────────────────────────────────── */}
            {showLeadGate && !showResult && (
              <div className="slide-up" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${accent}08`, border: `1px solid ${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/></svg>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>
                  {quiz.leadGate?.headline || 'Your results are ready!'}
                </h3>
                <p style={{ fontSize: '14px', color: DIM, marginBottom: '24px', lineHeight: 1.6 }}>
                  {quiz.leadGate?.subtext || 'Enter your email to see your personalized recommendation'}
                </p>

                <div style={{ maxWidth: '340px', margin: '0 auto' }}>
                  <input disabled placeholder="visitor@email.com" style={{ width: '100%', height: '48px', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${BORDER}`, borderRadius: '12px', color: DIM, fontSize: '15px', padding: '0 16px', outline: 'none', fontFamily: 'inherit', textAlign: 'center', marginBottom: '10px' }} />
                  <button onClick={() => setShowResult(true)} style={{ width: '100%', height: '48px', background: accent, color: BG, border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {quiz.leadGate?.buttonText || 'Show my results'} →
                  </button>
                </div>

                <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: '11px', color: 'rgba(240,242,245,0.2)' }}>
                    This is where visitors enter their email — you capture the lead
                  </span>
                </div>
              </div>
            )}

            {/* ── Result preview ───────────────────────────────────── */}
            {showResult && (
              <div className="scale-in" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${accent}08`, border: `1px solid ${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontSize: '11px', color: `${accent}80`, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '6px' }}>Your result</p>
                <h3 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '12px' }}>
                  {outcome?.title || 'Your Personalized Recommendation'}
                </h3>
                <p style={{ fontSize: '15px', color: DIM, lineHeight: 1.7, maxWidth: '460px', margin: '0 auto' }}>
                  {outcome?.description || 'Based on your answers, we\'ve tailored a recommendation just for you.'}
                </p>
                <button onClick={() => { setShowResult(false); setShowLeadGate(false); setCurrentQ(0); setAnswers({}); }} style={{ marginTop: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 18px', color: DIM, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  ↻ Replay quiz
                </button>
              </div>
            )}
          </div>

          {/* ── CTA section ─────────────────────────────────────────── */}
          <div style={{ maxWidth: '580px', width: '100%', marginTop: '40px' }}>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                [String(quiz.questions.length), 'Questions'],
                [String(quiz.outcomes?.length || 3), 'Outcomes'],
                ['Built-in', 'Email gate'],
              ].map(([v, l]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: accent, marginBottom: '2px' }}>{v}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(240,242,245,0.25)', fontWeight: 500 }}>{l}</p>
                </div>
              ))}
            </div>

            {/* Publish CTA */}
            <div style={{ background: `linear-gradient(135deg, ${accent}06, ${accent}03)`, border: `1px solid ${accent}15`, borderRadius: '20px', padding: '32px 28px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px' }}>
                This quiz is ready to publish
              </h3>
              <p style={{ fontSize: '14px', color: DIM, marginBottom: '24px', lineHeight: 1.5 }}>
                Create a free account to embed it on your site and start capturing leads.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={signUpUrl} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: '52px', padding: '0 32px',
                  background: ACC, color: BG,
                  fontSize: '15px', fontWeight: 700, borderRadius: '14px',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                  Publish my quiz — free →
                </Link>
                <Link href="/pricing" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: '52px', padding: '0 22px',
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
                  color: DIM, fontSize: '13px', fontWeight: 500, borderRadius: '14px',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                  View pricing
                </Link>
              </div>
            </div>

            <button onClick={() => { setStage('input'); setQuiz(null); setBrand(null); setProgress(0); setCurrentQ(0); setAnswers({}); setShowResult(false); setShowLeadGate(false); }} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'rgba(240,242,245,0.15)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '16px', marginTop: '4px' }}>
              Try a different URL
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <TryPageInner />
    </Suspense>
  );
}
