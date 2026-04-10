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

/* ──────────────────────────────────────────────────────────────────────────
   PreviewStage - shows the full interactive quiz rendered INSIDE a live
   mockup of the user's actual website, using their auto-detected brand
   colors and font. All questions are navigable.
   ────────────────────────────────────────────────────────────────────────── */
type DeviceType = 'desktop' | 'tablet' | 'mobile';
function PreviewStage({
  quiz,
  brand,
  domain,
  signUpUrl,
  onBack,
}: {
  quiz: Quiz;
  brand: Brand | null;
  domain: string;
  signUpUrl: string;
  onBack: () => void;
}) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [step, setStep] = useState(0); // 0..questions.length-1 = question, questions.length = lead gate, +1 = result
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  // Extract brand colors (with sensible defaults if not detected)
  const colors = brand?.colors || {};
  const sitePrimary = (colors as any).primary || '#1a1a1a';
  const siteBg = (colors as any).background || '#ffffff';
  const siteText = (colors as any).text || '#111111';
  const accentOnPrimary = (colors as any).accent || '#ffffff';

  const rawFont = brand?.font_family || 'Inter';
  const siteFont = rawFont.replace(/['"]/g, '').split(',')[0].trim();
  const siteName = brand?.site_name || domain.replace(/^www\./, '').split('.')[0];
  const siteInitial = (siteName || 'S').charAt(0).toUpperCase() + (siteName || '').slice(1);

  const totalQuestions = quiz.questions.length;
  const leadGateEnabled = !!quiz.leadGate || !!(quiz as any).settings?.leadGate;
  const progressPct = ((step + 1) / (totalQuestions + (leadGateEnabled ? 2 : 1))) * 100;
  const isLeadGate = leadGateEnabled && step === totalQuestions;
  const isResult = step >= totalQuestions + (leadGateEnabled ? 1 : 0);
  const currentQ = step < totalQuestions ? quiz.questions[step] : null;

  // Pick an outcome based on answers (simple: just first outcome for preview)
  const resultOutcome = quiz.outcomes && quiz.outcomes.length > 0 ? quiz.outcomes[0] : null;

  const frameWidth = device === 'mobile' ? 380 : device === 'tablet' ? 700 : 1100;
  const mobileBezel = device === 'mobile';

  function advance() {
    if (step < totalQuestions + (leadGateEnabled ? 1 : 0)) {
      setStep(s => s + 1);
    }
  }
  function reset() {
    setStep(0);
    setAnswers({});
    setLeadName('');
    setLeadEmail('');
  }

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 60px)',
        padding: '20px 20px 40px',
      }}
    >
      {/* ── Top action bar ─────────────────────────────────────────────── */}
      <div
        className="fade-in"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto 20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              height: '40px',
              padding: '0 18px',
              background: 'transparent',
              color: TEXT_MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Start over
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4cb150', animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live preview on {siteName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Device toggle */}
          <div style={{ display: 'flex', gap: '2px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '3px' }}>
            {([
              { d: 'desktop' as DeviceType, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
              { d: 'tablet' as DeviceType, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
              { d: 'mobile' as DeviceType, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
            ]).map(({ d, icon }) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                style={{
                  width: '34px',
                  height: '30px',
                  borderRadius: '8px',
                  border: 'none',
                  background: device === d ? ACCENT : 'transparent',
                  color: device === d ? BG : TEXT_MUTED,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          <Link
            href={signUpUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding: '0 22px',
              background: ACCENT,
              color: BG,
              textDecoration: 'none',
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Publish for free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </div>

      {/* ── Live website mockup frame ──────────────────────────────────── */}
      <div
        className="scale-in"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: '100%',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: `${frameWidth}px`,
            background: '#ffffff',
            borderRadius: mobileBezel ? '36px' : '14px',
            overflow: 'hidden',
            boxShadow: mobileBezel
              ? '0 0 0 10px #1a1a1a, 0 0 0 12px #2b2b2b, 0 30px 90px rgba(0,0,0,0.55)'
              : '0 0 0 1px rgba(255,255,255,0.06), 0 30px 90px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.3)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Browser chrome / mobile notch */}
          {mobileBezel ? (
            <div style={{ height: '30px', background: '#f6f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '90px', height: '5px', background: '#ddd', borderRadius: '3px' }} />
            </div>
          ) : (
            <div style={{ height: '44px', background: '#ededf0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{ flex: 1, height: '28px', background: '#e0e0e5', borderRadius: '7px', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '11px', color: '#666', margin: '0 60px 0 10px', overflow: 'hidden' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ marginRight: '6px', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {domain}
              </div>
            </div>
          )}

          {/* Mock website body using brand colors + font */}
          <div
            style={{
              fontFamily: `'${siteFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
              color: siteText,
              background: siteBg,
              minHeight: '680px',
            }}
          >
            {/* Mock Nav */}
            <div style={{
              height: mobileBezel ? '52px' : '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: mobileBezel ? '0 18px' : '0 40px',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: mobileBezel ? '28px' : '32px',
                  height: mobileBezel ? '28px' : '32px',
                  borderRadius: '7px',
                  background: sitePrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentOnPrimary,
                  fontSize: mobileBezel ? '14px' : '16px',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                }}>
                  {siteInitial.charAt(0)}
                </div>
                <span style={{ fontSize: mobileBezel ? '15px' : '17px', fontWeight: 800, color: siteText, letterSpacing: '-0.02em' }}>
                  {siteInitial}
                </span>
              </div>
              {!mobileBezel && (
                <div style={{ display: 'flex', gap: '28px', fontSize: '13px', color: 'rgba(0,0,0,0.6)', fontWeight: 500 }}>
                  <span>Products</span>
                  <span>Pricing</span>
                  <span>About</span>
                  <span>Contact</span>
                </div>
              )}
            </div>

            {/* Mock Hero */}
            <div style={{
              padding: mobileBezel ? '28px 18px 12px' : '56px 40px 24px',
              textAlign: 'center',
            }}>
              <h1 style={{
                fontFamily: 'inherit',
                fontSize: mobileBezel ? '24px' : device === 'tablet' ? '30px' : '38px',
                fontWeight: 800,
                color: siteText,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: '0 auto 10px',
                maxWidth: '620px',
              }}>
                {quiz.title}
              </h1>
              <p style={{
                fontFamily: 'inherit',
                fontSize: mobileBezel ? '13px' : '15px',
                color: 'rgba(0,0,0,0.55)',
                lineHeight: 1.6,
                maxWidth: '520px',
                margin: '0 auto',
              }}>
                {quiz.description || 'Take our quick quiz to get a personalized recommendation.'}
              </p>
            </div>

            {/* THE QUIZ WIDGET */}
            <div style={{
              margin: mobileBezel ? '12px 14px 24px' : device === 'tablet' ? '20px 40px 40px' : '24px auto 56px',
              maxWidth: '640px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.08)',
              background: siteBg,
              boxShadow: '0 4px 28px rgba(0,0,0,0.07)',
            }}>
              {/* Widget Header */}
              <div style={{
                padding: mobileBezel ? '16px 18px 14px' : '22px 26px 18px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'inherit', fontSize: mobileBezel ? '15px' : '17px', fontWeight: 800, color: siteText, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                    {isResult ? 'Your result' : isLeadGate ? 'Almost done' : quiz.title}
                  </div>
                  <div style={{ fontFamily: 'inherit', fontSize: '12px', color: 'rgba(0,0,0,0.5)' }}>
                    {isResult ? 'Personalized for you' : isLeadGate ? 'Enter details to see your result' : `Question ${step + 1} of ${totalQuestions}`}
                  </div>
                </div>
                {!isResult && (
                  <div style={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, color: sitePrimary, padding: '4px 10px', borderRadius: '100px', background: `color-mix(in srgb, ${sitePrimary} 10%, transparent)`, whiteSpace: 'nowrap' }}>
                    {Math.round(progressPct)}%
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: sitePrimary,
                  transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>

              {/* Widget body */}
              <div style={{ padding: mobileBezel ? '18px' : '28px 26px' }}>
                {currentQ && (
                  <div key={currentQ.id} className="fade-in">
                    <div style={{ fontFamily: 'inherit', fontSize: mobileBezel ? '16px' : '19px', fontWeight: 700, color: siteText, marginBottom: currentQ.subtitle ? '6px' : '18px', lineHeight: 1.35 }}>
                      {currentQ.text}
                    </div>
                    {currentQ.subtitle && (
                      <div style={{ fontFamily: 'inherit', fontSize: '13px', color: 'rgba(0,0,0,0.55)', marginBottom: '18px' }}>
                        {currentQ.subtitle}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentQ.options.map((opt) => {
                        const isSelected = answers[currentQ.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setAnswers(prev => ({ ...prev, [currentQ.id]: opt.id }));
                              setTimeout(() => advance(), 220);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: mobileBezel ? '13px 16px' : '15px 18px',
                              background: isSelected ? `color-mix(in srgb, ${sitePrimary} 8%, ${siteBg})` : siteBg,
                              border: `1.5px solid ${isSelected ? sitePrimary : 'rgba(0,0,0,0.1)'}`,
                              borderRadius: '12px',
                              color: siteText,
                              fontFamily: 'inherit',
                              fontSize: mobileBezel ? '14px' : '15px',
                              fontWeight: isSelected ? 600 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? sitePrimary : 'rgba(0,0,0,0.18)'}`,
                              background: isSelected ? sitePrimary : 'transparent',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}>
                              {isSelected && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentOnPrimary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                            <span style={{ flex: 1 }}>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isLeadGate && (
                  <div className="fade-in">
                    <div style={{ fontFamily: 'inherit', fontSize: mobileBezel ? '16px' : '19px', fontWeight: 700, color: siteText, marginBottom: '6px', lineHeight: 1.35 }}>
                      Enter your details to see your result
                    </div>
                    <div style={{ fontFamily: 'inherit', fontSize: '13px', color: 'rgba(0,0,0,0.55)', marginBottom: '18px' }}>
                      We'll email your personalized recommendation.
                    </div>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Your name"
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        background: siteBg,
                        color: siteText,
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        marginBottom: '10px',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="you@email.com"
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        background: siteBg,
                        color: siteText,
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        marginBottom: '16px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={advance}
                      disabled={!leadName || !leadEmail}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: sitePrimary,
                        color: accentOnPrimary,
                        border: 'none',
                        borderRadius: '100px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: leadName && leadEmail ? 'pointer' : 'not-allowed',
                        opacity: leadName && leadEmail ? 1 : 0.5,
                      }}
                    >
                      See my result
                    </button>
                  </div>
                )}

                {isResult && (
                  <div className="fade-in" style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: `color-mix(in srgb, ${sitePrimary} 15%, ${siteBg})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '4px auto 18px',
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={sitePrimary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ fontFamily: 'inherit', fontSize: mobileBezel ? '20px' : '24px', fontWeight: 800, color: siteText, letterSpacing: '-0.02em', marginBottom: '8px' }}>
                      {resultOutcome?.title || 'Your personalized result'}
                    </div>
                    <div style={{ fontFamily: 'inherit', fontSize: '14px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6, marginBottom: '22px', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
                      {resultOutcome?.description || 'Based on your answers, here is what we recommend.'}
                    </div>
                    <button
                      onClick={reset}
                      style={{
                        padding: '12px 28px',
                        background: sitePrimary,
                        color: accentOnPrimary,
                        border: 'none',
                        borderRadius: '100px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginRight: '10px',
                      }}
                    >
                      {resultOutcome?.ctaText || 'Restart quiz'}
                    </button>
                  </div>
                )}
              </div>

              {/* Widget Footer - step dots */}
              {!isResult && !isLeadGate && totalQuestions > 0 && (
                <div style={{ padding: mobileBezel ? '0 18px 18px' : '0 26px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {quiz.questions.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setStep(i)}
                        style={{
                          width: i === step ? '20px' : '6px',
                          height: '6px',
                          borderRadius: i === step ? '3px' : '50%',
                          background: i === step ? sitePrimary : 'rgba(0,0,0,0.12)',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                  {step > 0 && (
                    <button
                      onClick={() => setStep(s => Math.max(0, s - 1))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(0,0,0,0.5)',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px 10px',
                      }}
                    >
                      ← Back
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mock Footer */}
            <div style={{ padding: mobileBezel ? '20px 18px' : '36px 40px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: mobileBezel ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '20px' }}>
                {[1,2,3,4].slice(0, mobileBezel ? 2 : 4).map(i => (
                  <div key={i}>
                    <div style={{ height: '10px', width: '60%', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', marginBottom: '10px' }} />
                    <div style={{ height: '6px', width: '80%', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', marginBottom: '6px' }} />
                    <div style={{ height: '6px', width: '70%', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer reassurance ─────────────────────────────────────────── */}
      <div
        className="fade-in"
        style={{
          textAlign: 'center',
          marginTop: '28px',
          fontSize: '13px',
          color: TEXT_MUTED,
        }}
      >
        This is how the quiz will look on your site. Sign up to publish and get the embed code.
      </div>
    </main>
  );
}

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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const hasAutoStarted = useRef(false);

  // Auto-start if URL param present
  useEffect(() => {
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startGeneration(urlParam);
    }
  }, [urlParam]);

  // Simulate build step progression during API call.
  // Stop advancing once the quiz arrives so the completion handler (which sets
  // completedSteps = BUILD_STEPS.length) is not clobbered by the next tick.
  useEffect(() => {
    if (stage !== 'building') return;
    if (quiz) return; // quiz arrived  -  leave final state untouched
    const interval = setInterval(() => {
      setCompletedSteps((prev) => {
        // Cap one step before the last so "Finalizing" stays active until the
        // quiz actually arrives; the success handler will bump it to done.
        if (prev >= BUILD_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [stage, quiz]);

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

      // Quiz is ready  -  user clicks "Preview your quiz" button to proceed
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
        <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '40px 20px' }}>
          {/* Progress bar at top */}
          <div className="progress-bar" style={{ position: 'fixed', top: 60, left: 0, width: `${(completedSteps / BUILD_STEPS.length) * 100}%`, zIndex: 100 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0', width: '100%', maxWidth: '1000px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '20px', overflow: 'hidden', minHeight: '480px' }}>
            {/* ── Left: Quiz assembling live ──────────────────────────── */}
            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>
              {/* Quiz title - shows as soon as quiz arrives, skeleton before */}
              {quiz ? (
                <div className="slide-up">
                  <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, color: TEXT, marginBottom: '16px' }}>
                    {quiz.title}
                  </h2>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ height: '28px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', width: '85%', marginBottom: '10px', animation: 'pulse 2s ease infinite' }} />
                  <div style={{ height: '28px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', width: '60%', animation: 'pulse 2s ease infinite', animationDelay: '200ms' }} />
                </div>
              )}

              {/* Brand colors + site name */}
              {brand?.colors ? (
                <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  {Object.values(brand.colors).filter(Boolean).slice(0, 3).map((color, i) => (
                    <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: color as string, border: `1px solid ${BORDER}` }} />
                  ))}
                  <span style={{ fontSize: '13px', color: TEXT_MUTED, marginLeft: '4px' }}>{brand?.site_name || domain}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ height: '12px', width: '100px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginLeft: '4px' }} />
                </div>
              )}

              {/* First question assembling */}
              {quiz?.questions?.[0] ? (
                <div className="slide-up" style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: TEXT, marginBottom: '16px', lineHeight: 1.4 }}>
                    {quiz.questions[0].text}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quiz.questions[0].options.slice(0, 4).map((opt, i) => {
                      const qId = quiz.questions[0].id;
                      const isSelected = selectedOptions[qId] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          className="fade-in"
                          onClick={() => setSelectedOptions((prev) => ({ ...prev, [qId]: opt.id }))}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px 14px',
                            background: isSelected ? ACCENT_DIM : 'transparent',
                            border: `1.5px solid ${isSelected ? 'rgba(210,255,29,0.4)' : BORDER}`,
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: isSelected ? TEXT : TEXT_MUTED,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            animationDelay: `${i * 150}ms`,
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                              background: isSelected ? ACCENT : 'transparent',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isSelected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span style={{ flex: 1 }}>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: `${80 - i * 10}%`, animation: 'pulse 2s ease infinite', animationDelay: `${i * 300}ms` }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Outcomes badge */}
              {quiz?.outcomes && quiz.outcomes.length > 0 && (
                <div className="scale-in" style={{ marginTop: '20px', padding: '10px 16px', background: ACCENT_DIM, border: `1px solid rgba(210,255,29,0.2)`, borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: ACCENT, display: 'inline-block', alignSelf: 'flex-start' }}>
                  {quiz.outcomes.length} outcomes ready
                </div>
              )}
            </div>

            {/* ── Divider ──────────────────────────────────────────────── */}
            <div style={{ background: BORDER, width: '1px' }} />

            {/* ── Right: Build steps + domain ─────────────────────────── */}
            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Building for
              </div>
              <div style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', marginBottom: '32px', wordBreak: 'break-word' }}>
                {domain}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
                {BUILD_STEPS.map((step, i) => {
                  const isDone = i < completedSteps;
                  const isActive = i === completedSteps;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: i < BUILD_STEPS.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: isDone ? ACCENT : 'transparent', border: `2px solid ${isDone ? ACCENT : isActive ? ACCENT : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : isActive ? (
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                        ) : null}
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: isDone ? 500 : isActive ? 600 : 400, color: isDone ? TEXT : isActive ? TEXT : TEXT_MUTED, transition: 'all 0.3s' }}>
                        {isActive ? step + '...' : step}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Preview button - appears when quiz is ready */}
              {quiz && (
                <button className="scale-in" onClick={() => setStage('preview')} style={{ marginTop: '24px', height: '48px', background: ACCENT_DIM, border: `1.5px solid rgba(210,255,29,0.3)`, borderRadius: '100px', color: ACCENT, fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                  Preview your quiz
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════ PREVIEW STAGE - LIVE WEBSITE MOCKUP ════════════════════════ */}
      {stage === 'preview' && quiz && (
        <PreviewStage
          quiz={quiz}
          brand={brand}
          domain={domain}
          signUpUrl={signUpUrl}
          onBack={() => setStage('input')}
        />
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
