'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ACC = '#D2FF1D';
const BG = '#07090c';
const BG2 = '#0d1018';
const BG3 = '#131720';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string; value?: number }[];
}

interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  cta?: string;
}

interface QuizData {
  title: string;
  questions: QuizQuestion[];
  outcomes?: QuizOutcome[];
  leadGate?: { headline?: string; subheadline?: string };
  settings?: { cta_text?: string; cta_url?: string };
}

interface BrandData {
  colors?: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string };
  fonts?: { heading?: string; body?: string };
  siteName?: string;
  favicon?: string;
}

const loadingMessages = [
  'Reading your website...',
  'Detecting brand colors & fonts...',
  'Analyzing your business type...',
  'Generating quiz questions...',
  'Building personalized outcomes...',
  'Polishing your quiz...',
  'Almost ready...',
];

export default function TryPage() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url') || '';

  const [url, setUrl] = useState(urlParam);
  const [stage, setStage] = useState<'input' | 'loading' | 'preview' | 'error'>('input');
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [selectedQ, setSelectedQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const hasAutoStarted = useRef(false);

  // Auto-start generation if URL param exists
  useEffect(() => {
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startGeneration(urlParam);
    }
  }, [urlParam]);

  // Loading progress animation
  useEffect(() => {
    if (stage !== 'loading') return;
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      // Slow progress: gets to ~85% over 25s, then slows down
      const pct = Math.min(92, 85 * (1 - Math.exp(-elapsed / 12000)));
      setProgress(pct);
      // Cycle through messages every ~3.5s
      setMsgIdx(Math.min(loadingMessages.length - 1, Math.floor(elapsed / 3500)));
    }, 100);
    return () => clearInterval(iv);
  }, [stage]);

  const startGeneration = useCallback(async (siteUrl: string) => {
    setStage('loading');
    setProgress(0);
    setMsgIdx(0);
    setErrorMsg('');

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
      setQuiz(data.quiz);
      setBrand(data.brand);
      setProgress(100);
      // Small delay so user sees 100% before transition
      setTimeout(() => setStage('preview'), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStage('error');
    }
  }, []);

  const handleAnswer = (questionIdx: number, optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionId }));
    // Auto-advance after short delay
    setTimeout(() => {
      if (quiz && questionIdx < quiz.questions.length - 1) {
        setSelectedQ(questionIdx + 1);
      } else {
        setShowResult(true);
      }
    }, 400);
  };

  const brandAccent = brand?.colors?.primary || brand?.colors?.accent || ACC;
  const brandBg = brand?.colors?.background || BG;
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '') || 'your site';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"DM Sans",system-ui,sans-serif', color: '#f0f2f5' }}>
      {/* Topbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: ACC, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </Link>
        <div style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)' }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 24px 60px', textAlign: 'center' }}>

        {/* ─── INPUT STAGE ─── */}
        {stage === 'input' && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '100px', padding: '6px 16px', marginBottom: '28px', fontSize: '13px', fontWeight: 700, color: ACC }}>
              Free · No credit card required
            </div>

            <h1 style={{ fontSize: 'clamp(36px,5vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: '16px' }}>
              See your quiz in 30 seconds
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: '32px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              Paste your website URL below. Our AI will read your brand and generate a complete quiz funnel instantly.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && url.trim()) startGeneration(url); }}
                placeholder="yoursite.com"
                style={{ flex: 1, height: '52px', background: BG2, border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f0f2f5', fontSize: '16px', padding: '0 20px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => { if (url.trim()) startGeneration(url); }}
                style={{ height: '52px', padding: '0 28px', background: url.trim() ? ACC : 'rgba(210,255,29,0.3)', color: BG, fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: url.trim() ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              >
                Generate free preview →
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.3)', marginTop: '12px' }}>
              Works with any website · Takes ~30 seconds · No sign-up required
            </p>

            {/* Trust row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '48px', flexWrap: 'wrap' }}>
              {[
                ['AI-powered quiz generation', '✦'],
                ['Brand colors auto-detected', '◎'],
                ['Ready to embed instantly', '⚡'],
              ].map(([text, icon]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(240,242,245,0.4)' }}>
                  <span style={{ color: 'rgba(210,255,29,0.5)' }}>{icon}</span> {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LOADING STAGE ─── */}
        {stage === 'loading' && (
          <div style={{ padding: '40px 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Building your quiz...
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginBottom: '32px' }}>
              Analyzing <span style={{ color: ACC, fontWeight: 600 }}>{domain}</span>
            </p>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '8px', overflow: 'hidden', marginBottom: '24px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ height: '8px', background: `linear-gradient(90deg, ${ACC}, #a8e600)`, borderRadius: '8px', width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
            </div>

            <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.6)', fontWeight: 500 }}>
              {loadingMessages[msgIdx]}
            </p>

            {/* Animated dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: ACC, opacity: 0.3,
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse{0%,80%,100%{opacity:0.3;transform:scale(1)}40%{opacity:1;transform:scale(1.2)}}`}</style>
          </div>
        )}

        {/* ─── ERROR STAGE ─── */}
        {stage === 'error' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '10px' }}>
              Generation failed
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              {errorMsg}
            </p>
            <button
              onClick={() => { setStage('input'); setProgress(0); }}
              style={{ height: '48px', padding: '0 32px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f5', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Try a different URL
            </button>
          </div>
        )}

        {/* ─── PREVIEW STAGE ─── */}
        {stage === 'preview' && quiz && (
          <div style={{ animation: 'fadeIn .5s ease', textAlign: 'left' }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Header: what was detected */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
              {brand?.favicon && (
                <img src={brand.favicon} alt="" width={20} height={20} style={{ borderRadius: '4px' }} onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <span style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)' }}>
                Quiz generated for <span style={{ color: '#f0f2f5', fontWeight: 600 }}>{brand?.siteName || domain}</span>
              </span>
            </div>

            {/* Brand colors detected bar */}
            {brand?.colors && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(240,242,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Brand detected</span>
                {Object.values(brand.colors).filter(Boolean).slice(0, 5).map((color, i) => (
                  <div key={i} style={{ width: '18px', height: '18px', borderRadius: '5px', background: color as string, border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
                {brand?.fonts?.heading && (
                  <span style={{ fontSize: '12px', color: 'rgba(240,242,245,0.35)', marginLeft: '4px' }}>· {brand.fonts.heading}</span>
                )}
              </div>
            )}

            {/* Quiz preview card */}
            <div style={{
              background: BG2,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '0',
              marginBottom: '20px',
              overflow: 'hidden',
            }}>
              {/* Quiz header with brand accent */}
              <div style={{
                background: `linear-gradient(135deg, ${brandAccent}15, ${brandAccent}08)`,
                borderBottom: `1px solid ${brandAccent}20`,
                padding: '24px 28px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live preview</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f2f5', margin: 0 }}>
                  {quiz.title}
                </h2>
              </div>

              {/* Questions interactive preview */}
              {!showResult ? (
                <div style={{ padding: '24px 28px 28px' }}>
                  {/* Progress indicator */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                    {quiz.questions.map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: i < selectedQ ? brandAccent : i === selectedQ ? `${brandAccent}60` : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>

                  <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.35)', marginBottom: '6px' }}>
                    Question {selectedQ + 1} of {quiz.questions.length}
                  </p>
                  <p style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '20px', color: '#f0f2f5' }}>
                    {quiz.questions[selectedQ]?.text}
                  </p>

                  {quiz.questions[selectedQ]?.options.map((opt, i) => {
                    const isSelected = selectedAnswers[selectedQ] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleAnswer(selectedQ, opt.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 16px',
                          background: isSelected ? `${brandAccent}12` : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${isSelected ? `${brandAccent}40` : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '12px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: isSelected ? brandAccent : 'rgba(255,255,255,0.05)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 800,
                          color: isSelected ? BG : 'rgba(240,242,245,0.35)',
                          flexShrink: 0,
                        }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span style={{ fontSize: '15px', color: isSelected ? '#f0f2f5' : 'rgba(240,242,245,0.6)' }}>
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}

                  {/* Navigation */}
                  {selectedQ > 0 && (
                    <button
                      onClick={() => setSelectedQ(prev => prev - 1)}
                      style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(240,242,245,0.4)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' }}
                    >
                      ← Previous question
                    </button>
                  )}
                </div>
              ) : (
                /* Result preview */
                <div style={{ padding: '28px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandAccent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brandAccent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.4)', marginBottom: '4px' }}>Your result</p>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f2f5' }}>
                      {quiz.outcomes?.[0]?.title || 'Your Personalized Recommendation'}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginTop: '8px' }}>
                      {quiz.outcomes?.[0]?.description || 'Based on your answers, we\'ve tailored a recommendation just for you.'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowResult(false); setSelectedQ(0); setSelectedAnswers({}); }}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'rgba(240,242,245,0.5)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ↻ Restart quiz preview
                  </button>
                </div>
              )}
            </div>

            {/* Stats preview */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                [quiz.questions.length.toString(), 'Questions'],
                [quiz.outcomes?.length?.toString() || '3', 'Outcomes'],
                ['Email gate', 'Built-in'],
              ].map(([val, label]) => (
                <div key={label} style={{ flex: 1, background: BG2, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: brandAccent, marginBottom: '2px' }}>{val}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(240,242,245,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* CTA section */}
            <div style={{
              background: `linear-gradient(135deg, ${brandAccent}10, rgba(255,255,255,0.02))`,
              border: `1px solid ${brandAccent}25`,
              borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#f0f2f5', marginBottom: '6px' }}>
                Like what you see?
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)', marginBottom: '20px' }}>
                Create a free account to publish this quiz on your site and start capturing leads.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link href={`/sign-up?from=try&url=${encodeURIComponent(url)}`} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: '48px', padding: '0 32px',
                  background: ACC, color: BG, fontSize: '15px', fontWeight: 700,
                  borderRadius: '12px', textDecoration: 'none',
                  transition: 'transform 0.15s',
                }}>
                  Publish my quiz — free →
                </Link>
                <Link href="/pricing" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: '48px', padding: '0 24px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(240,242,245,0.6)', fontSize: '14px', fontWeight: 500,
                  borderRadius: '12px', textDecoration: 'none',
                }}>
                  See pricing
                </Link>
              </div>
            </div>

            {/* Try another */}
            <button
              onClick={() => { setStage('input'); setQuiz(null); setBrand(null); setProgress(0); setSelectedQ(0); setSelectedAnswers({}); setShowResult(false); }}
              style={{ background: 'none', border: 'none', color: 'rgba(240,242,245,0.35)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: '12px', width: '100%' }}
            >
              Try a different URL
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
