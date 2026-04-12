'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import PaymentStep from './PaymentStep';
import styles from './QuizRunner.module.css';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement | string, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | null;
      remove: (widgetId: string) => void;
    };
  }
}

function postToParent(type: string, data?: Record<string, any>) {
  if (typeof window === 'undefined' || window.self === window.top) return;
  window.parent.postMessage({ source: 'squarespell', type, ...data }, '*');
}

// Format currency value to USD
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Calculate price from answers for price calculator mode
function calculatePriceTotal(questions: any[], answers: Record<string, any>): { total: number; breakdown: Array<{ label: string; value: number }> } {
  let total = 0;
  const breakdown: Array<{ label: string; value: number }> = [];

  questions.forEach(q => {
    if (q.type === 'range_input') {
      const rangeValue = answers[q.id];
      if (rangeValue !== undefined && rangeValue !== null) {
        const cost = rangeValue * (q.value_per_unit ?? 0);
        total += cost;
        if (cost > 0) {
          breakdown.push({
            label: `${q.label || q.text}: ${rangeValue} ${q.unit_label || ''}`,
            value: cost
          });
        }
      }
    } else {
      const answerValue = answers[q.id];
      if (answerValue) {
        const selectedIds = Array.isArray(answerValue) ? answerValue : [answerValue];
        selectedIds.forEach(id => {
          const option = q.options?.find((o: any) => o.id === id);
          if (option && option.value !== undefined) {
            total += option.value;
            breakdown.push({
              label: option.label || option.text,
              value: option.value
            });
          }
        });
      }
    }
  });

  return { total, breakdown };
}

export default function QuizRunner({ quiz, slug }: { quiz: any; slug: string }) {
  // Ensure quiz has mode field with fallback to 'lead_quiz'
  const quizMode = quiz?.mode || 'lead_quiz';
  const sessionStorageKey = `squarespell-quiz-${slug}`;

  // Initialize state from sessionStorage or defaults
  const initializeState = () => {
    if (typeof window === 'undefined') return { step: 0, answers: {}, quizStartedAt: null };

    try {
      const stored = sessionStorage.getItem(sessionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          step: parsed.currentQuestion ?? 0,
          answers: parsed.answers ?? {},
          quizStartedAt: parsed.quizStartedAt ?? null
        };
      }
    } catch (e) {
      console.warn('Failed to parse quiz state from sessionStorage:', e);
    }
    return { step: 0, answers: {}, quizStartedAt: null };
  };

  const initialState = initializeState();
  const [step, setStep] = useState(initialState.step);
  const [answers, setAnswers] = useState<Record<string, any>>(initialState.answers);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(initialState.quizStartedAt);
  const [leadDone, setLeadDone] = useState(false);
  const [outcome, setOutcome] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [gdprConsent, setGdprConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileResponse, setTurnstileResponse] = useState<string | null>(null);
  const [qualificationScore, setQualificationScore] = useState<number | null>(null);
  const [qualificationPath, setQualificationPath] = useState<'booking' | 'nurture' | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const turnstileWidgetRef = useRef<string | null>(null);

  const questions: any[] = quiz.questions ?? [];

  // Build a map of question ID to index for branching logic
  const questionMap = useRef<Record<string, number>>({});
  useEffect(() => {
    const map: Record<string, number> = {};
    questions.forEach((q, idx) => {
      if (q.id) map[q.id] = idx;
    });
    questionMap.current = map;
  }, [questions]);

  // Function to calculate next question index, considering branching rules
  const getNextQuestionIndex = (currentIdx: number, selectedOptionId: string): number => {
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return currentIdx + 1;

    // Check if the question has branching rules
    const rules = currentQuestion.next_question_rules;
    if (rules && Array.isArray(rules) && rules.length > 0) {
      // Find a matching rule based on the selected option
      const matchedRule = rules.find((r: any) => r.if_answer === selectedOptionId);
      if (matchedRule && matchedRule.goto) {
        const targetIdx = questionMap.current[matchedRule.goto];
        if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < questions.length) {
          return targetIdx;
        }
      }
    }

    // Fall back to the next question in array order
    return currentIdx + 1;
  };

  const current = questions[step];
  const branding = quiz.branding ?? {};
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isEmbedded = sp?.get('embed') === '1';
  const bgColor = sp?.get('bg') || branding.colors?.background || '#0a0f05';
  const accent = sp?.get('accent') || branding.colors?.primary || '#D2FF1D';
  const textColor = sp?.get('fg') || branding.colors?.text || '#e8f5c8';
  const font = sp?.get('font') || branding.font_family || 'Poppins';
  const hasTurnstile = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Initialize quiz start time on first answer
  useEffect(() => {
    if (Object.keys(answers).length > 0 && quizStartedAt === null) {
      setQuizStartedAt(Date.now());
    }
  }, [answers, quizStartedAt]);

  // Persist quiz state to sessionStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stateToSave = {
      currentQuestion: step,
      answers,
      quizStartedAt: quizStartedAt,
      startedAt: new Date().toISOString(),
      sessionId
    };

    try {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to persist quiz state to sessionStorage:', e);
    }
  }, [step, answers, quizStartedAt, sessionStorageKey]);

  // Clear sessionStorage on quiz completion
  useEffect(() => {
    if (leadDone && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(sessionStorageKey);
      } catch (e) {
        console.warn('Failed to clear quiz state from sessionStorage:', e);
      }
    }
  }, [leadDone, sessionStorageKey]);

  // Load Turnstile script if configured
  useEffect(() => {
    if (hasTurnstile && typeof window !== 'undefined' && !window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [hasTurnstile]);

  // Render Turnstile widget when on lead capture step
  useEffect(() => {
    if (hasTurnstile && current?.type === 'lead_capture' && window.turnstile && !turnstileWidgetRef.current) {
      const container = document.getElementById('turnstile-container');
      if (container) {
        turnstileWidgetRef.current = window.turnstile.render(container, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token: string) => setTurnstileResponse(token)
        });
      }
    }
  }, [hasTurnstile, current?.type]);

  useEffect(() => {
    postToParent('resize', { height: document.body.scrollHeight });
  }, [step, leadDone]);

  function selectAnswer(qid: string, value: any) {
    if (Object.keys(answers).length === 0) postToParent('start');
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  function calculateScore() {
    let score = 0;
    questions.forEach(q => {
      const ans = answers[q.id]; const sel = Array.isArray(ans) ? ans : [ans];
      sel.forEach((id: string) => { const opt = q.options?.find((o: any) => o.id === id); score += opt?.score_value ?? 0; });
    });
    return score;
  }

  function calculateOutcome() {
    const score = calculateScore();
    return (quiz.outcomes ?? []).find((o: any) => score >= o.score_range?.min && score <= o.score_range?.max) ?? quiz.outcomes?.[0];
  }

  async function submitLead() {
    if (!email) return;
    const settings = quiz.settings ?? {};
    if (settings.gdpr_consent_enabled && !gdprConsent) return;

    setSubmitting(true);
    const resolved = calculateOutcome();
    const submission_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const gdprText = settings.gdpr_consent_text || 'I agree to receive communications from this business';

    // Calculate price for price calculator mode
    const { total: calculatedPrice } = quizMode === 'price_calculator' ? calculatePriceTotal(questions, answers) : { total: 0 };

    // Calculate score and qualification for client qualifier mode
    let qualificationData: Record<string, any> = {};
    if (quizMode === 'client_qualifier') {
      const score = calculateScore();
      const threshold = settings.qualification_threshold ?? 70;
      const isQualified = score >= threshold;
      const path = isQualified ? 'booking' : 'nurture';

      qualificationData = {
        qualified: isQualified,
        score: score,
        path_taken: path
      };

      setQualificationScore(score);
      setQualificationPath(path);
    }

    const timeToCompletMs = quizStartedAt ? Date.now() - quizStartedAt : undefined;

    const result = await api.submitLead(slug, {
      name,
      email,
      answers,
      outcome_id: resolved?.id,
      submission_id,
      consent: gdprConsent,
      consent_text: gdprConsent ? gdprText : null,
      website,
      quiz_started_at: quizStartedAt,
      time_to_complete_ms: timeToCompletMs,
      cf_turnstile_response: turnstileResponse,
      calculated_price: quizMode === 'price_calculator' ? calculatedPrice : undefined,
      ...qualificationData
    });

    await api.trackEvent(slug, { event_type: 'complete', session_id: 'anon' });
    postToParent('lead_captured', { email });
    postToParent('complete', { outcome_id: resolved?.id, lead_email: email });

    if (result?.lead_id) {
      setLeadId(result.lead_id);
    }

    setOutcome(resolved);

    if (settings.payment_enabled && calculatedPrice > 0) {
      setShowPayment(true);
    } else {
      setLeadDone(true);
    }

    setSubmitting(false);
  }

  const style: React.CSSProperties = { background: bgColor, color: textColor, fontFamily: `'${font}', sans-serif`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };

  if (showPayment && outcome && leadId) {
    const settings = quiz.settings ?? {};
    const { total: calculatedPrice } = calculatePriceTotal(questions, answers);

    return (
      <div style={style}>
        <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
          <h1 style={{ color: accent, marginBottom: 12 }}>{outcome.title}</h1>
          <p style={{ opacity: 0.6, marginBottom: 32 }}>Complete your payment to finalize this purchase</p>

          <PaymentStep
            amountCents={calculatedPrice * 100}
            currency="usd"
            leadId={leadId}
            slug={slug}
            accent={accent}
            textColor={textColor}
            bgColor={bgColor}
            font={font}
            isOptional={settings.payment_optional === true}
            onPaymentComplete={() => setLeadDone(true)}
            onSkip={() => setLeadDone(true)}
          />
        </div>
      </div>
    );
  }

  if (leadDone && outcome) {
    // Segmentation Quiz mode result page
    if (quizMode === 'segmentation_quiz') {
      return (
        <div style={style}>
          <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>You are a</p>
              <h1 style={{ color: accent, marginBottom: 16, fontSize: 40 }}>{outcome.title}</h1>
            </div>

            {outcome.description && (
              <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <p style={{ opacity: 0.85, lineHeight: 1.7, fontSize: 16 }}>{outcome.description}</p>
              </div>
            )}

            <div style={{ marginBottom: 32, padding: '20px', background: `${accent}12`, borderRadius: 16, textAlign: 'center' }}>
              <p style={{ opacity: 0.9, marginBottom: 8, fontSize: 15 }}>Check your inbox - we are sending you content tailored to your type</p>
            </div>

            {outcome.content_preview && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: accent }}>Content you will receive</h3>
                <div className={styles.insights}>
                  {Array.isArray(outcome.content_preview) ? outcome.content_preview.map((item: string, i: number) => (
                    <div key={i} className={styles.insight} style={{ textAlign: 'center' }}>✓ {item}</div>
                  )) : <div className={styles.insight} style={{ textAlign: 'center' }}>✓ {outcome.content_preview}</div>}
                </div>
              </div>
            )}

            {outcome.tags && Array.isArray(outcome.tags) && outcome.tags.length > 0 && (
              <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {outcome.tags.map((tag: string, i: number) => (
                    <div key={i} style={{ background: accent, color: '#0a0f05', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quiz.settings?.show_branding !== false && (
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, marginTop: 28 }}>
                Powered by Squarespell
              </div>
            )}
          </div>
        </div>
      );
    }

    // Price Calculator mode result page
    if (quizMode === 'price_calculator') {
      const { total, breakdown } = calculatePriceTotal(questions, answers);

      return (
        <div style={style}>
          <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
            <h1 style={{ color: accent, marginBottom: 12 }}>Your Price Estimate</h1>
            <p style={{ opacity: 0.6, marginBottom: 32 }}>Based on your selections:</p>

            <div style={{
              background: `${accent}15`,
              border: `2px solid ${accent}`,
              borderRadius: 12,
              padding: '24px',
              marginBottom: 32,
              textAlign: 'center'
            }}>
              <p style={{ opacity: 0.7, marginBottom: 8, fontSize: 14 }}>Estimated price range:</p>
              <div style={{ fontSize: 48, fontWeight: 800, color: accent, marginBottom: 8 }}>
                {formatCurrency(total)}
              </div>
              <p style={{ opacity: 0.6, fontSize: 12 }}>This is an estimate based on your selections</p>
            </div>

            {breakdown.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Breakdown by item</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {breakdown.map((item, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${accent}30` }}>
                        <td style={{ padding: '12px 0', textAlign: 'left', opacity: 0.8 }}>{item.label}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', color: accent, fontWeight: 700 }}>{formatCurrency(item.value)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${accent}` }}>
                      <td style={{ padding: '16px 0', textAlign: 'left', fontWeight: 700 }}>Total</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontSize: 18, fontWeight: 800, color: accent }}>{formatCurrency(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div style={{
              background: `${accent}08`,
              border: `1px solid ${accent}40`,
              borderRadius: 8,
              padding: '16px',
              marginBottom: 24,
              fontSize: 13,
              opacity: 0.7,
              lineHeight: 1.6
            }}>
              This estimate is based on your selections. A detailed quote may vary. Please reach out for a comprehensive assessment.
            </div>

            {quiz.settings?.show_branding !== false && (
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
                Powered by Squarespell
              </div>
            )}

            <button
              onClick={() => setLeadDone(false)}
              style={{
                background: accent,
                color: '#0a0f05',
                borderRadius: 20,
                padding: '14px 28px',
                display: 'inline-block',
                fontWeight: 700,
                marginTop: 0,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              Get a Detailed Quote
            </button>
          </div>
        </div>
      );
    }

    // Client Qualifier mode result page
    if (quizMode === 'client_qualifier' && qualificationPath) {
      const threshold = quiz.settings?.qualification_threshold ?? 70;
      const isQualified = qualificationPath === 'booking';

      // Qualified path - show booking CTA
      if (isQualified) {
        const ctaUrl = outcome.cta_url;
        const ctaText = outcome.cta_text || 'Book Your Free Consultation';
        const ctaTarget = isEmbedded ? '_blank' : '_self';

        return (
          <div style={style}>
            <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
              <div style={{
                textAlign: 'center',
                marginBottom: 32
              }}>
                <div style={{
                  fontSize: 48,
                  marginBottom: 16
                }}>✓</div>
                <h1 style={{ color: accent, marginBottom: 12 }}>Great news! You're a perfect fit.</h1>
                <p style={{ opacity: 0.7, fontSize: 16 }}>Your qualification score: {qualificationScore}/{threshold}</p>
              </div>

              <div style={{
                background: `${accent}15`,
                border: `2px solid ${accent}`,
                borderRadius: 12,
                padding: '24px',
                marginBottom: 32,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: accent
                }}>
                  {qualificationScore}%
                </div>
                <p style={{ opacity: 0.7, marginTop: 8 }}>Qualification score</p>
              </div>

              {outcome.description && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ opacity: 0.8, lineHeight: 1.6 }}>{outcome.description}</p>
                </div>
              )}

              {ctaUrl && (
                <a
                  href={ctaUrl}
                  target={ctaTarget}
                  rel="noopener noreferrer"
                  style={{
                    background: accent,
                    color: '#0a0f05',
                    borderRadius: 20,
                    padding: '14px 28px',
                    display: 'inline-block',
                    fontWeight: 700,
                    marginTop: 24,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  {ctaText}
                </a>
              )}
            </div>
          </div>
        );
      }

      // Nurture path - show resource and newsletter
      return (
        <div style={style}>
          <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
            <div style={{
              textAlign: 'center',
              marginBottom: 32
            }}>
              <div style={{
                fontSize: 48,
                marginBottom: 16
              }}>→</div>
              <h1 style={{ color: accent, marginBottom: 12 }}>You're on the right track, but not quite ready yet.</h1>
              <p style={{ opacity: 0.7, fontSize: 16 }}>Your qualification score: {qualificationScore}/{threshold}</p>
            </div>

            <div style={{
              background: `${accent}15`,
              border: `2px solid ${accent}`,
              borderRadius: 12,
              padding: '24px',
              marginBottom: 32,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: accent
              }}>
                {qualificationScore}%
              </div>
              <p style={{ opacity: 0.7, marginTop: 8 }}>Qualification score</p>
            </div>

            {outcome.description && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Here's a free resource to help you get started</h3>
                <p style={{ opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>{outcome.description}</p>
                {outcome.cta_url && (
                  <a
                    href={outcome.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: accent,
                      color: '#0a0f05',
                      borderRadius: 12,
                      padding: '12px 24px',
                      display: 'inline-block',
                      fontWeight: 700,
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {outcome.cta_text || 'Get Resource'}
                  </a>
                )}
              </div>
            )}

            <div style={{
              background: `${accent}08`,
              border: `1px solid ${accent}40`,
              borderRadius: 12,
              padding: '24px',
              marginTop: 32
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Join our newsletter</h3>
              <p style={{ opacity: 0.7, marginBottom: 16, fontSize: 14 }}>Get insights and tips to help you succeed</p>
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: `1px solid ${accent}40`,
                  background: `${accent}08`,
                  color: textColor,
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={() => {
                  if (newsletterEmail) {
                    // Newsletter signup would be sent to backend
                    setNewsletterEmail('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  background: accent,
                  color: '#0a0f05',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Service Recommender mode result page
    if (quizMode === 'service_recommender') {
      const ctaUrl = outcome.cta_url;
      const ctaText = outcome.cta_text || 'Get This Package';
      const ctaTarget = isEmbedded ? '_blank' : '_self';

      return (
        <div style={style}>
          <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
            <p style={{ opacity: 0.6, marginBottom: 16, fontSize: 14 }}>Based on your answers, we recommend:</p>
            <h1 style={{ color: accent, marginBottom: 12 }}>{outcome.title}</h1>

            {outcome.price && (
              <div style={{ fontSize: 28, fontWeight: 800, color: accent, marginBottom: 24 }}>
                {outcome.price}
              </div>
            )}

            {outcome.description && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Why this fits you</h3>
                <p style={{ opacity: 0.8, lineHeight: 1.6 }}>{outcome.description}</p>
              </div>
            )}

            {outcome.features && Array.isArray(outcome.features) && outcome.features.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Package includes:</h3>
                <div className={styles.insights}>
                  {outcome.features.map((feature: string, i: number) => (
                    <div key={i} className={styles.insight}>✓ {feature}</div>
                  ))}
                </div>
              </div>
            )}

            {ctaUrl && (
              <a
                href={ctaUrl}
                target={ctaTarget}
                rel="noopener noreferrer"
                style={{
                  background: accent,
                  color: '#0a0f05',
                  borderRadius: 20,
                  padding: '14px 28px',
                  display: 'inline-block',
                  fontWeight: 700,
                  marginTop: 24,
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                {ctaText}
              </a>
            )}

            {quiz.settings?.show_branding !== false && (
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, marginTop: 24 }}>
                Powered by Squarespell
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default lead_quiz mode result page
    const quizScore = calculateScore();
    const maxPossibleScore = questions.reduce((sum, q) => {
      const maxOption = (q.options || []).reduce((max, opt) => Math.max(max, opt.score ?? 0), 0);
      return sum + maxOption;
    }, 0);
    const scorePercentage = maxPossibleScore > 0 ? Math.round((quizScore / maxPossibleScore) * 100) : 0;

    return (
      <div style={style}>
        <div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h1 style={{ color: accent, marginBottom: 12 }}>{outcome.title}</h1>
            {outcome.subtitle && (
              <p style={{ opacity: 0.7, fontSize: 16, lineHeight: 1.6 }}>{outcome.subtitle}</p>
            )}
          </div>

          {maxPossibleScore > 0 && (
            <div style={{ marginBottom: 32, padding: '24px', background: `${accent}08`, borderRadius: 12, border: `1px solid ${accent}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 14, opacity: 0.7 }}>Your Score</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: accent }}>{scorePercentage}%</span>
              </div>
              <div style={{
                width: '100%',
                height: 8,
                background: `${accent}20`,
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 12
              }}>
                <div style={{
                  height: '100%',
                  width: `${scorePercentage}%`,
                  background: accent,
                  transition: 'width 0.3s ease',
                  borderRadius: 4
                }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'right' }}>
                {quizScore} / {maxPossibleScore} points
              </div>
            </div>
          )}

          {outcome.score_cards && Array.isArray(outcome.score_cards) && outcome.score_cards.length > 0 && (
            <div className={styles.scoreCards} style={{ marginBottom: 32 }}>
              {outcome.score_cards.map((sc: any, i: number) => (
                <div key={i} className={styles.scoreCard} style={{
                  borderColor: accent,
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: accent, marginBottom: 4 }}>
                    {sc.value}<span style={{ fontSize: 14 }}>{sc.unit}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{sc.label}</div>
                </div>
              ))}
            </div>
          )}

          {outcome.insights && Array.isArray(outcome.insights) && outcome.insights.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: accent }}>Key insights for you</h3>
              <div className={styles.insights}>
                {outcome.insights.map((ins: string, i: number) => (
                  <div key={i} className={styles.insight} style={{ padding: '12px 0' }}>
                    <span style={{ marginRight: 8, fontSize: 18 }}>✓</span> {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {outcome.recommendation && (
            <a
              href={outcome.recommendation.cta_url}
              style={{
                background: accent,
                color: '#0a0f05',
                borderRadius: 20,
                padding: '14px 28px',
                display: 'inline-block',
                fontWeight: 700,
                marginTop: 8,
                textDecoration: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              {outcome.recommendation.cta_text}
            </a>
          )}

          {quiz.settings?.show_branding !== false && (
            <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, marginTop: 24 }}>
              Powered by Squarespell
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!current) return null;

  if (current.type === 'lead_capture') {
    const settings = quiz.settings ?? {};
    const gdprEnabled = settings.gdpr_consent_enabled;
    const gdprText = settings.gdpr_consent_text || 'I agree to receive communications from this business';
    const submitDisabled = submitting || (gdprEnabled && !gdprConsent);

    return (
      <div style={style}><div className={styles.card} style={isEmbedded ? { background: 'transparent', border: 'none' } : {}}>
        <h2>{current.text}</h2>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>{current.description}</p>
        {/* Honeypot field - hidden from users, catches bots */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          style={{ position: 'absolute', left: '-9999px' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        {current.fields?.map((f: any) => <input key={f.id} type={f.type} placeholder={f.label} value={f.id === 'name' ? name : email} onChange={e => f.id === 'name' ? setName(e.target.value) : setEmail(e.target.value)} style={{ marginBottom: 12 }} />)}
        {gdprEnabled && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, gap: 8 }}>
            <input
              type="checkbox"
              checked={gdprConsent}
              onChange={e => setGdprConsent(e.target.checked)}
              style={{ marginTop: 4, cursor: 'pointer', accentColor: accent }}
            />
            <label style={{ fontSize: 13, opacity: 0.7, cursor: 'pointer', userSelect: 'none' }}>
              {gdprText}
            </label>
          </div>
        )}
        {/* Cloudflare Turnstile widget - only rendered if configured */}
        {hasTurnstile && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div id="turnstile-container" />
          </div>
        )}
        <button onClick={submitLead} disabled={submitDisabled} style={{ background: submitDisabled ? '#666' : accent, color: '#0a0f05', width: '100%', padding: '16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 16, marginTop: 8, cursor: submitDisabled ? 'not-allowed' : 'pointer', opacity: submitDisabled ? 0.6 : 1 }}>{submitting ? 'Getting your results...' : 'Get My Results'}</button>
        {current.consent_text && <p style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>{current.consent_text}</p>}
      </div></div>
    );
  }

  const progress = Math.round((step / questions.length) * 100);
  return (
    <div style={style}><div className={styles.card} style={isEmbedded ? { background: 'transparent', border: 'none' } : {}}>
      <div className={styles.progress}><div className={styles.progressBar} style={{ width: `${progress}%`, background: accent }} /></div>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>Question {step + 1} of {questions.length}</p>
      <h2 style={{ marginBottom: 24 }}>{current.text}</h2>
      {current.description && <p style={{ opacity: 0.6, marginBottom: 20 }}>{current.description}</p>}
      {current.type === 'range_input' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'baseline' }}>
            <label style={{ opacity: 0.7 }}>{current.label || current.text}</label>
            <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>
              {(answers[current.id] ?? current.min) || 0}
              {current.unit_label && <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 4 }}>{current.unit_label}</span>}
            </div>
          </div>
          <input
            type="range"
            min={current.min ?? 0}
            max={current.max ?? 100}
            step={current.step ?? 1}
            value={answers[current.id] ?? current.min ?? 0}
            onChange={e => selectAnswer(current.id, parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: '#2a3e14',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none' as any,
              cursor: 'pointer',
              marginBottom: 8
            }}
          />
          <style>{`
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${accent};
              cursor: pointer;
              border: none;
            }
            input[type='range']::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${accent};
              cursor: pointer;
              border: none;
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: 12, marginBottom: 12 }}>
            <span>{current.min ?? 0} {current.unit_label}</span>
            <span>{current.max ?? 100} {current.unit_label}</span>
          </div>
          {current.value_per_unit && (
            <div style={{ padding: 12, background: `${accent}10`, borderRadius: 6, fontSize: 13, opacity: 0.8 }}>
              {formatCurrency((answers[current.id] ?? current.min ?? 0) * current.value_per_unit)} at {formatCurrency(current.value_per_unit)} per {current.unit_label}
            </div>
          )}
        </div>
      )}
      {(current.type === 'single_choice' || current.type === 'multi_select') && <div className={styles.options}>{current.options?.map((opt: any) => {
        const isSel = current.type === 'single_choice' ? answers[current.id] === opt.id : (answers[current.id] ?? []).includes(opt.id);
        return <div key={opt.id} className={styles.option} style={{ borderColor: isSel ? accent : '#2a3e14', background: isSel ? `${accent}18` : 'transparent' }} onClick={() => {
          if (current.type === 'single_choice') selectAnswer(current.id, opt.id);
          else { const prev: string[] = answers[current.id] ?? []; selectAnswer(current.id, prev.includes(opt.id) ? prev.filter((x: string) => x !== opt.id) : [...prev, opt.id]); }
        }}>{opt.is_other ? <input placeholder="Describe your situation..." style={{ background: 'transparent', border: 'none', width: '100%', color: textColor }} onChange={e => selectAnswer(`${current.id}_other_text`, e.target.value)} /> : <span>{opt.label}</span>}</div>;
      })}</div>}
      {current.type === 'text_input' && <textarea rows={3} placeholder={current.placeholder ?? 'Type your answer...'} style={{ marginBottom: 16 }} onChange={e => selectAnswer(current.id, e.target.value)} />}
      <button onClick={() => {
        let nextIdx = step + 1;
        // For single choice questions, check if branching rules apply
        if (current.type === 'single_choice' && answers[current.id]) {
          nextIdx = getNextQuestionIndex(step, answers[current.id]);
        }
        setStep(nextIdx);
      }} style={{ background: accent, color: '#0a0f05', width: '100%', padding: '16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 16, marginTop: 16, cursor: 'pointer' }}>{step === questions.length - 1 ? 'See My Results' : 'Continue'}</button>
    </div></div>
  );
}
