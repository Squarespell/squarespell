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

/* ── Loading copy ──────────────────────────────────────────────────────────── */
const STEPS = [
  { msg: 'Connecting to your website...', icon: '🌐' },
  { msg: 'Reading your pages & services...', icon: '📄' },
  { msg: 'Detecting brand colors & fonts...', icon: '🎨' },
  { msg: 'Understanding your business...', icon: '🧠' },
  { msg: 'Generating quiz questions...', icon: '✨' },
  { msg: 'Building personalized outcomes...', icon: '🎯' },
  { msg: 'Polishing & finalizing...', icon: '💎' },
];

/* ── Animations ────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,80%,100%{opacity:.25;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp .5s ease both}
.fade-in{animation:fadeIn .4s ease both}
input:focus{border-color:rgba(210,255,29,0.4)!important;box-shadow:0 0 0 3px rgba(210,255,29,0.08)!important}
button:active{transform:scale(0.98)}
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
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [showLeadGate, setShowLeadGate] = useState(false);
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
      const pct = Math.min(93, 88 * (1 - Math.exp(-elapsed / 14000)));
      setProgress(pct);
      setStepIdx(Math.min(STEPS.length - 1, Math.floor(elapsed / 4000)));
    }, 80);
    return () => clearInterval(iv);
  }, [stage]);

  const startGeneration = useCallback(async (siteUrl: string) => {
    setStage('loading');
    setProgress(0);
    setStepIdx(0);
    setErrorMsg('');
    setQuiz(null);
    setBrand(null);
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

      // Save to localStorage so sign-up flow can retrieve it
      try {
        localStorage.setItem('squarespell_preview', JSON.stringify({
          quiz: data.quiz,
          brand: data.brand,
          url: normalized,
          createdAt: Date.now(),
        }));
      } catch {}

      setQuiz(data.quiz);
      setBrand(data.brand);
      setProgress(100);
      setTimeout(() => setStage('preview'), 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStage('error');
    }
  }, []);

  const selectAnswer = (qIdx: number, optId: string) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optId }));
    setTimeout(() => {
      if (quiz && qIdx < quiz.questions.length - 1) {
        setCurrentQ(qIdx + 1);
      } else {
        setShowLeadGate(true);
      }
    }, 350);
  };

  const accent = brand?.colors?.primary || brand?.colors?.accent || ACC;
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '') || 'your site';
  const signUpUrl = `/sign-up?from=try&url=${encodeURIComponent(url)}`;

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"DM Sans",system-ui,sans-serif', color: TEXT }}>
      <style>{CSS}</style>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: `1px solid ${BORDER}` }}>
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

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 20px 60px' }}>

        {/* ════════════════════════ INPUT ════════════════════════ */}
        {stage === 'input' && (
          <div className="fade-up" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${ACC}10`, border: `1px solid ${ACC}25`, borderRadius: '100px', padding: '5px 14px', marginBottom: '24px', fontSize: '12px', fontWeight: 700, color: ACC, letterSpacing: '0.02em' }}>
              FREE PREVIEW · NO SIGN-UP
            </div>

            <h1 style={{ fontSize: 'clamp(32px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.08, marginBottom: '12px' }}>
              See your AI quiz in<br /><span style={{ color: ACC }}>30 seconds</span>
            </h1>
            <p style={{ fontSize: '15px', color: DIM, lineHeight: 1.6, marginBottom: '32px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              Paste any website URL. Our AI reads your brand, understands your business, and builds a complete lead-generation quiz.
            </p>

            <div style={{ display: 'flex', gap: '8px', maxWidth: '500px', margin: '0 auto 12px' }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && url.trim()) startGeneration(url); }}
                placeholder="yoursite.com"
                autoFocus
                style={{ flex: 1, height: '52px', background: BG2, border: `1.5px solid ${BORDER}`, borderRadius: '14px', color: TEXT, fontSize: '16px', padding: '0 18px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.15s' }}
              />
              <button
                onClick={() => { if (url.trim()) startGeneration(url); }}
                disabled={!url.trim()}
                style={{ height: '52px', padding: '0 24px', background: url.trim() ? ACC : `${ACC}40`, color: BG, fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '14px', cursor: url.trim() ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              >
                Generate →
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'rgba(240,242,245,0.25)', marginBottom: '48px' }}>Works with any website · AI-powered · No credit card</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
              {[['Brand auto-detected', '🎨'], ['Smart questions', '🧠'], ['Ready to embed', '⚡']].map(([t, i]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(240,242,245,0.35)' }}>
                  <span>{i}</span> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ LOADING ════════════════════════ */}
        {stage === 'loading' && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '14px', color: DIM, marginBottom: '8px' }}>
              Analyzing <span style={{ color: ACC, fontWeight: 600 }}>{domain}</span>
            </p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '32px' }}>
              Building your quiz...
            </h2>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '6px', overflow: 'hidden', maxWidth: '360px', margin: '0 auto 28px' }}>
              <div style={{ height: '6px', background: `linear-gradient(90deg, ${ACC}, #a8e600)`, borderRadius: '10px', width: `${progress}%`, transition: 'width 0.25s ease-out' }} />
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  opacity: i < stepIdx ? 0.35 : i === stepIdx ? 1 : 0.15,
                  transition: 'opacity 0.4s',
                }}>
                  <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>
                    {i < stepIdx ? '✓' : s.icon}
                  </span>
                  <span style={{ fontSize: '14px', color: i === stepIdx ? TEXT : DIM, fontWeight: i === stepIdx ? 600 : 400 }}>
                    {s.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ ERROR ════════════════════════ */}
        {stage === 'error' && (
          <div className="fade-up" style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(248,113,113,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Generation failed</h2>
            <p style={{ fontSize: '14px', color: DIM, marginBottom: '24px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>{errorMsg}</p>
            <button onClick={() => { setStage('input'); setProgress(0); }} style={{ height: '48px', padding: '0 28px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', color: TEXT, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Try a different URL
            </button>
          </div>
        )}

        {/* ════════════════════════ PREVIEW ════════════════════════ */}
        {stage === 'preview' && quiz && (
          <div className="fade-up">

            {/* Brand detected header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {brand?.favicon_url && (
                <img src={brand.favicon_url} alt="" width={18} height={18} style={{ borderRadius: '4px' }} onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <span style={{ fontSize: '13px', color: DIM }}>
                Generated for <span style={{ color: TEXT, fontWeight: 600 }}>{brand?.site_name || domain}</span>
              </span>
            </div>

            {/* Brand color swatches */}
            {brand?.colors && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(240,242,245,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Brand</span>
                {Object.values(brand.colors).filter(Boolean).slice(0, 4).map((c, i) => (
                  <div key={i} style={{ width: '14px', height: '14px', borderRadius: '4px', background: c as string, border: `1px solid ${BORDER}` }} />
                ))}
                {brand?.font_family && brand.font_family !== 'sans-serif' && (
                  <span style={{ fontSize: '11px', color: 'rgba(240,242,245,0.25)', marginLeft: '4px' }}>· {brand.font_family}</span>
                )}
              </div>
            )}

            {/* ── Quiz card ──────────────────────────────────────────── */}
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>

              {/* Quiz title bar */}
              <div style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}06)`, borderBottom: `1px solid ${accent}18`, padding: '20px 24px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live preview</span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{quiz.title}</h2>
                {quiz.description && <p style={{ fontSize: '13px', color: DIM, marginTop: '4px' }}>{quiz.description}</p>}
              </div>

              {/* ── Questions ────────────────────────────────────────── */}
              {!showLeadGate && !showResult && (
                <div className="fade-in" style={{ padding: '20px 24px 24px' }}>
                  {/* Progress dots */}
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                    {quiz.questions.map((_, i) => (
                      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < currentQ ? accent : i === currentQ ? `${accent}50` : 'rgba(255,255,255,0.06)', transition: 'all 0.3s' }} />
                    ))}
                  </div>

                  <p style={{ fontSize: '12px', color: 'rgba(240,242,245,0.3)', marginBottom: '4px' }}>
                    {currentQ + 1} / {quiz.questions.length}
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '16px' }}>
                    {quiz.questions[currentQ]?.text}
                  </p>

                  {quiz.questions[currentQ]?.options.map((opt, i) => {
                    const sel = answers[currentQ] === opt.id;
                    return (
                      <div key={opt.id} onClick={() => selectAnswer(currentQ, opt.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px',
                        background: sel ? `${accent}10` : CARD,
                        border: `1.5px solid ${sel ? `${accent}35` : BORDER}`,
                        borderRadius: '12px', marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span style={{
                          width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
                          background: sel ? accent : 'rgba(255,255,255,0.04)',
                          border: sel ? 'none' : `1px solid ${BORDER}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 800, color: sel ? BG : 'rgba(240,242,245,0.3)',
                        }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span style={{ fontSize: '14px', color: sel ? TEXT : 'rgba(240,242,245,0.55)' }}>{opt.text}</span>
                      </div>
                    );
                  })}

                  {currentQ > 0 && (
                    <button onClick={() => setCurrentQ(p => p - 1)} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'rgba(240,242,245,0.3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' }}>
                      ← Back
                    </button>
                  )}
                </div>
              )}

              {/* ── Lead gate preview ────────────────────────────────── */}
              {showLeadGate && !showResult && (
                <div className="fade-in" style={{ padding: '28px 24px', textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
                    {quiz.leadGate?.headline || 'Your results are ready!'}
                  </h3>
                  <p style={{ fontSize: '13px', color: DIM, marginBottom: '16px' }}>
                    {quiz.leadGate?.subtext || 'Enter your email to see your personalized recommendation'}
                  </p>
                  <input disabled placeholder="visitor@email.com" style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '10px', color: DIM, fontSize: '14px', padding: '0 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px', textAlign: 'center' }} />
                  <button onClick={() => setShowResult(true)} style={{ width: '100%', height: '44px', background: accent, color: BG, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {quiz.leadGate?.buttonText || 'Show my results'} →
                  </button>
                  <p style={{ fontSize: '11px', color: 'rgba(240,242,245,0.2)', marginTop: '10px' }}>
                    This is where your visitors enter their email — you capture the lead.
                  </p>
                </div>
              )}

              {/* ── Result preview ───────────────────────────────────── */}
              {showResult && (
                <div className="fade-in" style={{ padding: '28px 24px', textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(240,242,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '4px' }}>Your result</p>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>
                    {quiz.outcomes?.[0]?.title || 'Your Personalized Recommendation'}
                  </h3>
                  <p style={{ fontSize: '14px', color: DIM, lineHeight: 1.6 }}>
                    {quiz.outcomes?.[0]?.description || 'Based on your answers, we\'ve tailored a recommendation just for you.'}
                  </p>
                  <button onClick={() => { setShowResult(false); setShowLeadGate(false); setCurrentQ(0); setAnswers({}); }} style={{ marginTop: '16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '8px 16px', color: DIM, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ↻ Replay quiz
                  </button>
                </div>
              )}
            </div>

            {/* ── Stats ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[
                [String(quiz.questions.length), 'Questions'],
                [String(quiz.outcomes?.length || 3), 'Outcomes'],
                ['Email gate', 'Built-in'],
              ].map(([v, l]) => (
                <div key={l} style={{ flex: 1, background: BG2, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '12px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', fontWeight: 800, color: accent, marginBottom: '1px' }}>{v}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(240,242,245,0.3)' }}>{l}</p>
                </div>
              ))}
            </div>

            {/* ── CTA ────────────────────────────────────────────────── */}
            <div style={{ background: `${accent}08`, border: `1px solid ${accent}20`, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
                This quiz is ready to publish
              </h3>
              <p style={{ fontSize: '13px', color: DIM, marginBottom: '18px' }}>
                Create a free account to embed it on your site and start capturing leads.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Link href={signUpUrl} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '48px', padding: '0 28px', background: ACC, color: BG, fontSize: '14px', fontWeight: 700, borderRadius: '12px', textDecoration: 'none', transition: 'transform 0.1s' }}>
                  Publish my quiz — free →
                </Link>
                <Link href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '48px', padding: '0 20px', background: CARD, border: `1px solid ${BORDER}`, color: DIM, fontSize: '13px', fontWeight: 500, borderRadius: '12px', textDecoration: 'none' }}>
                  Pricing
                </Link>
              </div>
            </div>

            <button onClick={() => { setStage('input'); setQuiz(null); setBrand(null); setProgress(0); setCurrentQ(0); setAnswers({}); setShowResult(false); setShowLeadGate(false); }} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'rgba(240,242,245,0.2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '10px' }}>
              Try a different URL
            </button>
          </div>
        )}
      </main>
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
