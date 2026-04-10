'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ── Design tokens ────────────────────────────────────────────────────────── */
const BG = '#07090c';
const SURFACE = '#0d1117';
const ELEVATED = '#161b22';
const BORDER = '#1b1f27';
const TEXT = '#f0f2f5';
const TEXT_MUTED = '#8b919a';
const ACCENT = '#D2FF1D';
const ACCENT_DIM = 'rgba(210,255,29,0.08)';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

/* ── Types ─────────────────────────────────────────────────────────────────── */
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

/* ── Build steps ───────────────────────────────────────────────────────── */
const BUILD_STEPS = [
  'Website scanned',
  'Brand extracted',
  'Generating questions',
  'Building outcomes',
  'Finalizing',
];

/* ── Global styles ────────────────────────────────────────────────────────── */
const CSS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-40px); }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes typewriter {
  0% {
    width: 0;
    opacity: 0;
  }
  1% {
    opacity: 1;
  }
  100% {
    width: 100%;
    opacity: 1;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.fade-up {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.slide-up {
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.scale-in {
  animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.typewriter {
  overflow: hidden;
  white-space: nowrap;
  animation: typewriter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

input:focus {
  border-color: rgba(210, 255, 29, 0.5) !important;
  box-shadow: 0 0 0 4px rgba(210, 255, 29, 0.08) !important;
}

button:active {
  transform: scale(0.97) !important;
}

* {
  box-sizing: border-box;
}

.option-card {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.option-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, ${ACCENT}, #a8e600);
  border-radius: 1px;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
`;

function TryPageInner() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url') || '';

  const [url, setUrl] = useState(urlParam);
  const [stage, setStage] = useState<'input' | 'building' | 'preview' | 'error'>('input');
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [claimToken, setClaimToken] = useState('');
  const hasAutoStarted = useRef(false);

  // Auto-start if URL param present
  useEffect(() => {
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startGeneration(urlParam);
    }
  }, [urlParam]);

  // Simulate build step progression during API call
  useEffect(() => {
    if (stage !== 'building') return;
    const interval = setInterval(() => {
      setCompletedSteps((prev) => Math.min(prev + 1, BUILD_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [stage]);

  const startGeneration = useCallback(async (siteUrl: string) => {
    setStage('building');
    setProgress(0);
    setCompletedSteps(0);
    setErrorMsg('');
    setQuiz(null);
    setBrand(null);
    setClaimToken('');

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
      const token = data.claim_token || '';

      setClaimToken(token);

      if (token) {
        document.cookie = `sq_claim=${token};path=/;max-age=14400;SameSite=Lax`;
      }

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
      setCompletedSteps(BUILD_STEPS.length);
      setProgress(100);

      // Delay transition to show completion
      setTimeout(() => setStage('preview'), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStage('error');
    }
  }, []);

  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '') || 'your site';
  const signUpUrl = `/sign-up?from=try&url=${encodeURIComponent(url)}${claimToken ? `&claim=${claimToken}` : ''}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        color: TEXT,
      }}
    >
      <style>{CSS}</style>

      {/* ── Navigation bar ────────────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: `1px solid ${BORDER}`,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              background: ACCENT,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={BG}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: TEXT,
              letterSpacing: '-0.03em',
            }}
          >
            Squarespell
          </span>
        </Link>
        <Link
          href="/sign-in"
          style={{
            fontSize: '13px',
            color: TEXT_MUTED,
            textDecoration: 'none',
          }}
        >
          Have an account? <span style={{ color: ACCENT, fontWeight: 600 }}>Log in</span>
        </Link>
      </nav>

      {/* ════════════════════════ INPUT STAGE ════════════════════════ */}
      {stage === 'input' && (
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 60px)',
            padding: '40px 20px',
          }}
        >
          <div className="fade-up" style={{ textAlign: 'center', maxWidth: '560px', width: '100%' }}>
            <h1
              style={{
                fontSize: 'clamp(36px, 5.5vw, 52px)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                lineHeight: 1.05,
                marginBottom: '16px',
              }}
            >
              Turn visitors into leads
            </h1>

            <p
              style={{
                fontSize: '16px',
                color: TEXT_MUTED,
                lineHeight: 1.7,
                marginBottom: '40px',
                maxWidth: '440px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Paste your URL. AI does the rest.
            </p>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '0 auto 40px' }}>
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '20px',
                    fontSize: '16px',
                    color: TEXT_MUTED,
                    pointerEvents: 'none',
                  }}
                >
                  https://
                </span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim()) startGeneration(url);
                  }}
                  placeholder="yoursite.com"
                  autoFocus
                  style={{
                    width: '100%',
                    height: '56px',
                    background: SURFACE,
                    border: `1.5px solid ${BORDER}`,
                    borderRadius: '100px',
                    color: TEXT,
                    fontSize: '16px',
                    padding: '0 20px 0 80px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
              <button
                onClick={() => {
                  if (url.trim()) startGeneration(url);
                }}
                disabled={!url.trim()}
                style={{
                  height: '56px',
                  padding: '0 32px',
                  background: url.trim() ? ACCENT : 'rgba(210, 255, 29, 0.2)',
                  color: url.trim() ? BG : TEXT_MUTED,
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '100px',
                  cursor: url.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                Generate
              </button>
            </div>

            {/* Underline accent */}
            <div
              style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                marginBottom: '40px',
              }}
            />

            {/* Feature pills */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {[
                'Brand colors auto-detected',
                'AI-powered questions',
                'Email capture built-in',
              ].map((label) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: `rgba(210, 255, 29, 0.03)`,
                    border: `1px solid ${BORDER}`,
                    borderRadius: '100px',
                    fontSize: '12px',
                    color: 'rgba(240, 242, 245, 0.35)',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: ACCENT,
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ BUILDING STAGE ════════════════════════ */}
      {stage === 'building' && (
        <main
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 60px)',
            padding: '40px 20px',
          }}
        >
          {/* Progress bar at top */}
          <div
            className="progress-bar"
            style={{
              position: 'fixed',
              top: 60,
              left: 0,
              width: `${(completedSteps / BUILD_STEPS.length) * 100}%`,
              zIndex: 100,
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '40px',
              width: '100%',
              maxWidth: '1200px',
            }}
          >
            {/* ── Left: Quiz preview ────────────────────────────────────── */}
            <div className="fade-in">
              <div
                style={{
                  padding: '32px',
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '16px',
                  minHeight: '400px',
                }}
              >
                {/* Animated quiz title */}
                {completedSteps >= 1 && (
                  <div className="slide-up" style={{ marginBottom: '28px' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        color: TEXT_MUTED,
                        marginBottom: '8px',
                      }}
                    >
                      Quiz Preview
                    </div>
                    <h2
                      className="typewriter"
                      style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                        color: TEXT,
                      }}
                    >
                      {quiz?.title || 'Building...'}
                    </h2>
                  </div>
                )}

                {/* Brand colors preview */}
                {completedSteps >= 2 && brand?.colors && (
                  <div className="scale-in" style={{ marginBottom: '28px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: TEXT_MUTED,
                        marginBottom: '8px',
                      }}
                    >
                      Brand Colors
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {Object.values(brand.colors)
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((color, i) => (
                          <div
                            key={i}
                            className="scale-in"
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              background: color as string,
                              border: `1px solid ${BORDER}`,
                              animationDelay: `${i * 100}ms`,
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Sample questions preview */}
                {completedSteps >= 3 && quiz?.questions && (
                  <div className="slide-up" style={{ marginBottom: '28px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: TEXT_MUTED,
                        marginBottom: '8px',
                      }}
                    >
                      Sample Questions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {quiz.questions.slice(0, 2).map((q, i) => (
                        <div
                          key={q.id}
                          className="fade-in"
                          style={{
                            padding: '12px 16px',
                            background: ELEVATED,
                            border: `1px solid ${BORDER}`,
                            borderRadius: '10px',
                            fontSize: '13px',
                            color: TEXT,
                            animationDelay: `${i * 150}ms`,
                          }}
                        >
                          {q.text}
                        </div>
                      ))}
                      {quiz.questions.length > 2 && (
                        <div
                          style={{
                            padding: '12px 16px',
                            background: ELEVATED,
                            border: `1px solid ${BORDER}`,
                            borderRadius: '10px',
                            fontSize: '13px',
                            color: TEXT_MUTED,
                            textAlign: 'center',
                          }}
                        >
                          +{quiz.questions.length - 2} more questions
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Build steps ────────────────────────────────────── */}
            <div className="fade-in">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {BUILD_STEPS.map((step, i) => {
                  const isDone = i < completedSteps;
                  const isActive = i === completedSteps;

                  return (
                    <div
                      key={i}
                      className="scale-in"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 16px',
                        background: isActive ? ACCENT_DIM : 'transparent',
                        border: `1px solid ${isActive ? ACCENT : BORDER}`,
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        animationDelay: `${i * 100}ms`,
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          background: isDone ? ACCENT : isActive ? `${ACCENT}20` : ELEVATED,
                          border: `1px solid ${isDone ? ACCENT : isActive ? ACCENT : BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {isDone ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={BG}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isActive ? (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              border: `1.5px solid ${ACCENT}`,
                              borderTopColor: 'transparent',
                              animation: 'spin 0.6s linear infinite',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: TEXT_MUTED,
                            }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 600 : isDone ? 500 : 400,
                          color: isDone ? ACCENT : isActive ? TEXT : TEXT_MUTED,
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ PREVIEW STAGE ════════════════════════ */}
      {stage === 'preview' && quiz && (
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 60px)',
            padding: '40px 20px 60px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '40px',
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* ── Left: Questions list ───────────────────────────────────── */}
            <div className="slide-up">
              {/* Quiz header */}
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  {brand?.favicon_url && (
                    <img
                      src={brand.favicon_url}
                      alt=""
                      width={20}
                      height={20}
                      style={{ borderRadius: '4px' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <span style={{ fontSize: '13px', color: TEXT_MUTED }}>
                    {brand?.site_name || domain}
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    lineHeight: 1.1,
                    marginBottom: '8px',
                  }}
                >
                  {quiz.title}
                </h1>

                {quiz.description && (
                  <p
                    style={{
                      fontSize: '15px',
                      color: TEXT_MUTED,
                      lineHeight: 1.6,
                    }}
                  >
                    {quiz.description}
                  </p>
                )}
              </div>

              {/* Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {quiz.questions.map((question, qIdx) => (
                  <div
                    key={question.id}
                    className="scale-in"
                    style={{
                      padding: '20px',
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: '14px',
                      animationDelay: `${qIdx * 50}ms`,
                    }}
                  >
                    {/* Question number and text */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <div
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          background: ACCENT,
                          color: BG,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {qIdx + 1}
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: TEXT,
                            marginBottom: '4px',
                            lineHeight: 1.4,
                          }}
                        >
                          {question.text}
                        </h3>
                        {question.subtitle && (
                          <p
                            style={{
                              fontSize: '13px',
                              color: TEXT_MUTED,
                            }}
                          >
                            {question.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '44px' }}>
                      {question.options.map((option) => (
                        <div
                          key={option.id}
                          style={{
                            padding: '10px 12px',
                            background: ELEVATED,
                            border: `1px solid ${BORDER}`,
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: TEXT_MUTED,
                          }}
                        >
                          {option.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Outcomes section */}
              {quiz.outcomes && quiz.outcomes.length > 0 && (
                <div className="slide-up" style={{ animationDelay: '150ms' }}>
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      marginBottom: '16px',
                      color: TEXT,
                    }}
                  >
                    Outcomes ({quiz.outcomes.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {quiz.outcomes.map((outcome, idx) => (
                      <div
                        key={outcome.id}
                        style={{
                          padding: '16px',
                          background: SURFACE,
                          border: `1px solid ${BORDER}`,
                          borderRadius: '12px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: ACCENT,
                            marginBottom: '4px',
                          }}
                        >
                          Outcome {idx + 1}
                        </div>
                        <h3
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: TEXT,
                            marginBottom: '4px',
                          }}
                        >
                          {outcome.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: TEXT_MUTED,
                            lineHeight: 1.5,
                          }}
                        >
                          {outcome.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Summary and CTA ────────────────────────────────── */}
            <div style={{ marginTop: '0px' }}>
              <div
                className="scale-in"
                style={{
                  padding: '28px',
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '16px',
                  position: 'sticky',
                  top: '20px',
                  maxHeight: 'calc(100vh - 100px)',
                  overflow: 'auto',
                }}
              >
                {/* Summary */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', color: TEXT_MUTED, marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Quiz Summary
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '4px' }}>
                      Questions
                    </div>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: TEXT,
                      }}
                    >
                      {quiz.questions.length}
                    </div>
                  </div>

                  {quiz.outcomes && quiz.outcomes.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '4px' }}>
                        Outcomes
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: TEXT,
                        }}
                      >
                        {quiz.outcomes.length}
                      </div>
                    </div>
                  )}

                  {quiz.leadGate && (
                    <div>
                      <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '4px' }}>
                        Lead Gate
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: ACCENT,
                        }}
                      >
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: ACCENT,
                          }}
                        />
                        Enabled
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand colors */}
                {brand?.colors && (
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontSize: '12px', color: TEXT_MUTED, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Brand Colors
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {Object.values(brand.colors)
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((color, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: '40px',
                              borderRadius: '8px',
                              background: color as string,
                              border: `1px solid ${BORDER}`,
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div
                  style={{
                    height: '1px',
                    background: BORDER,
                    marginBottom: '28px',
                  }}
                />

                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Link
                    href={signUpUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '48px',
                      background: ACCENT,
                      color: BG,
                      textDecoration: 'none',
                      borderRadius: '100px',
                      fontSize: '14px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Publish for free
                  </Link>

                  <button
                    onClick={() => setStage('input')}
                    style={{
                      height: '48px',
                      background: 'transparent',
                      color: TEXT,
                      border: `1.5px solid ${BORDER}`,
                      borderRadius: '100px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    Edit before publishing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ ERROR STAGE ════════════════════════ */}
      {stage === 'error' && (
        <main
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 60px)',
            padding: '40px 20px',
          }}
        >
          <div className="fade-up" style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(248, 113, 113, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                marginBottom: '8px',
              }}
            >
              Generation failed
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: TEXT_MUTED,
                marginBottom: '28px',
                lineHeight: 1.6,
              }}
            >
              {errorMsg}
            </p>
            <button
              onClick={() => {
                setStage('input');
              }}
              style={{
                height: '48px',
                padding: '0 28px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${BORDER}`,
                borderRadius: '100px',
                color: TEXT,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              Try again
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG }} />}>
      <TryPageInner />
    </Suspense>
  );
}
