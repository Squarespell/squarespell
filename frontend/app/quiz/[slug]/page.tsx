'use client';

/**
 * Public hosted quiz page - rendered in the visitor's Squarespace brand.
 *
 * This is what visitors see when they land on squarespell.com/q/{slug} OR when
 * the <script src="/embed.js"> embed iframes this URL into a Squarespace page.
 *
 * Supports all editor features:
 * - Question media (images, videos, YouTube/Vimeo embeds)
 * - Subtitle / help text
 * - Answer option images
 * - Answer layouts: list, grid, fullBackground, imageThumbnails, splitLayout
 * - Timer countdown
 * - Score-based outcome matching
 * - Lead gate
 * - Brand colors & font
 *
 * Container queries (@container) make the layout responsive to the iframe
 * width, not the device viewport, so the embed looks right at any width.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

import { addUtmParams, quizUtm } from '@/lib/urls';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface QuizOption {
  id: string;
  text: string;
  score?: number;
  imageUrl?: string;
  image_url?: string;
}
interface QuizQuestion {
  id: string;
  text?: string;
  question?: string;
  subtitle?: string;
  options: QuizOption[];
  timeLimit?: number;
  time_limit?: number;
  mediaUrl?: string;
  media_url?: string;
  mediaType?: 'image' | 'video';
  media_type?: string;
  answerLayout?: string;
  answer_layout?: string;
}
interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  cta_url?: string;
  cta_text?: string;
  cta_type?: string;
  minScore?: number;
  maxScore?: number;
  min_score?: number;
  max_score?: number;
  imageUrl?: string;
  image_url?: string;
}

/** Prefill scheduling URLs with lead name and email */
function prefillSchedulingUrl(url: string, ctaType: string | undefined, name: string, email: string): string {
  if (!url || !ctaType) return url;
  try {
    var u = new URL(url);
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
  results?: QuizOutcome[];
  branding?: QuizBranding;
  settings?: {
    primary_color?: string;
    primaryColor?: string;
    cta_text?: string;
    cta_url?: string;
    show_branding?: boolean;
    requireEmail?: boolean;
    show_progress_bar?: boolean;
    shuffle_questions?: boolean;
    transition_type?: 'slide' | 'fade' | 'none';
    custom_css?: string;
    remove_branding?: boolean;
    enable_recaptcha?: boolean;
  };
  leadGate?: { headline?: string; subtext?: string; buttonText?: string };
}

type Stage = 'loading' | 'error' | 'question' | 'leadgate' | 'submitted' | 'result';

function getOutcome(quiz: Quiz, answers: Record<number, number>): QuizOutcome | null {
  var outcomes = quiz.outcomes || quiz.results || [];
  if (outcomes.length === 0) return null;
  var total = 0;
  Object.entries(answers).forEach(function(entry) {
    var qi = entry[0];
    var oi = entry[1];
    var q = quiz.questions[Number(qi)];
    var opt = q?.options?.[Number(oi)];
    if (opt?.score !== undefined) total += Number(opt.score);
  });
  var matched = outcomes.find(function(o) {
    var min = o.minScore !== undefined ? o.minScore : o.min_score;
    var max = o.maxScore !== undefined ? o.maxScore : o.max_score;
    return min !== undefined && max !== undefined && total >= min && total <= max;
  });
  return matched || outcomes[0];
}

/* ------------------------------------------------------------------ */
/*  Media helpers                                                      */
/* ------------------------------------------------------------------ */

function getMediaUrl(q: QuizQuestion): string | undefined {
  return q.mediaUrl || q.media_url || undefined;
}

function getMediaType(q: QuizQuestion): string | undefined {
  return q.mediaType || q.media_type || undefined;
}

function getAnswerLayout(q: QuizQuestion): string {
  return q.answerLayout || q.answer_layout || 'list';
}

function getOptionImage(opt: QuizOption): string | undefined {
  return opt.imageUrl || opt.image_url || undefined;
}

function getTimeLimit(q: QuizQuestion): number | undefined {
  return q.timeLimit || q.time_limit || undefined;
}

/** Render question media — image or video (with YouTube/Vimeo embed support) */
function QuestionMedia({ mediaUrl, mediaType, brandPrimary }: { mediaUrl: string; mediaType: string; brandPrimary: string }) {
  if (mediaType === 'video') {
    var ytMatch = mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
    var vimeoMatch = mediaUrl.match(/(?:vimeo\.com\/)(\d+)/);
    var embedUrl = ytMatch ? 'https://www.youtube.com/embed/' + ytMatch[1] : vimeoMatch ? 'https://player.vimeo.com/video/' + vimeoMatch[1] : '';

    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', marginBottom: 20, background: '#000' }}>
        {embedUrl ? (
          <iframe src={embedUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <video src={mediaUrl} controls playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>
    );
  }

  // Image
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
      <img src={mediaUrl} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
    </div>
  );
}


export default function QuizPage() {
  var params = useParams();
  var slug = params?.slug as string;

  var [quiz, setQuiz] = useState<Quiz | null>(null);
  var [stage, setStage] = useState<Stage>('loading');
  var [error, setError] = useState('');
  var [qIdx, setQIdx] = useState(0);
  var [answers, setAnswers] = useState<Record<number, number>>({});
  var [email, setEmail] = useState('');
  var [firstName, setFirstName] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [leadError, setLeadError] = useState('');
  var [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  var [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  var [hoverOpt, setHoverOpt] = useState<number | null>(null);
  var sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );
  var [prevQIdx, setPrevQIdx] = useState(0);
  var [transitioning, setTransitioning] = useState(false);
  var transDir = useRef<'forward' | 'back'>('forward');

  // Shuffle questions once on load if setting is enabled
  useEffect(function() {
    if (!quiz) return;
    if (quiz.settings?.shuffle_questions) {
      var shuffled = quiz.questions.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      setQuiz(Object.assign({}, quiz, { questions: shuffled }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id]);

  // Notify embed parent of height changes
  useEffect(function() {
    if (typeof window === 'undefined' || window.parent === window) return;
    var notify = function() {
      var h = document.documentElement.scrollHeight;
      window.parent.postMessage({ source: 'squarespell', type: 'resize', height: h }, '*');
    };
    var ro = new ResizeObserver(notify);
    ro.observe(document.body);
    notify();
    return function() { ro.disconnect(); };
  }, [stage, qIdx]);

  // Load quiz
  useEffect(function() {
    if (!slug) return;
    fetch(API + '/api/quiz/' + slug)
      .then(function(r) { return r.json(); })
      .then(function(data) {
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
        fetch(API + '/api/quiz/' + slug + '/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'view', session_id: sessionIdRef.current }),
        }).catch(function() {});
      })
      .catch(function() {
        setError('Failed to load quiz.');
        setStage('error');
      });
  }, [slug]);

  var totalQs = quiz?.questions.length || 0;
  var currentQ = quiz?.questions[qIdx];
  var requireEmail = quiz?.settings?.requireEmail !== false;
  var progress =
    stage === 'question' ? Math.round(((qIdx + 1) / Math.max(totalQs, 1)) * 100) :
    stage === 'leadgate' ? 95 : 100;

  var pickOption = useCallback(
    function(oi: number) {
      if (!quiz) return;
      if (oi >= 0) {
        setAnswers(function(prev) { return Object.assign({}, prev, { [qIdx]: oi }); });
      }
      if (qIdx < (quiz.questions.length - 1)) {
        transDir.current = 'forward';
        setPrevQIdx(qIdx);
        setTransitioning(true);
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
    var tl = currentQ ? getTimeLimit(currentQ) : undefined;
    if (stage !== 'question' || !currentQ || !tl || tl <= 0) {
      setTimeRemaining(null);
      return;
    }
    setTimeRemaining(tl);
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

  var goBack = function() {
    if (qIdx > 0) {
      transDir.current = 'back';
      setPrevQIdx(qIdx);
      setTransitioning(true);
      setQIdx(qIdx - 1);
    }
  };

  // Transition effect between questions
  useEffect(function() {
    if (!transitioning) return;
    var t = setTimeout(function() { setTransitioning(false); }, 350);
    return function() { clearTimeout(t); };
  }, [transitioning]);

  var submitLead = useCallback(function() {
    if (!quiz) return;
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    setLeadError('');
    var o = getOutcome(quiz, answers);
    fetch(API + '/api/quiz/' + slug + '/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: firstName,
        email: email,
        answers: answers,
        outcome_id: o?.id,
        session_id: sessionIdRef.current,
      }),
    }).then(function() {
      setOutcome(o);
      setStage('result');
      fetch(API + '/api/quiz/' + slug + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'complete',
          session_id: sessionIdRef.current,
          metadata: { outcome_id: o?.id },
        }),
      }).catch(function() {});
      if (window.parent !== window) {
        window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
      }
    }).catch(function() {
      setLeadError('Something went wrong. Please try again.');
    }).finally(function() {
      setSubmitting(false);
    });
  }, [quiz, slug, email, firstName, answers]);

  /* ---------- brand derivation ---------- */
  var brand = quiz?.branding;
  var brandBg = brand?.colors?.background || '#ffffff';
  var brandSurface = brand?.colors?.surface || brandBg;
  var brandText = brand?.colors?.text || '#1a1a1a';
  var brandPrimary =
    brand?.colors?.primary || quiz?.settings?.primary_color || quiz?.settings?.primaryColor || '#0a0a0a';
  var brandBorder = 'rgba(0,0,0,0.10)';
  var brandFont =
    brand?.font_family && brand.font_family !== 'sans-serif'
      ? "'" + brand.font_family + "', system-ui, sans-serif"
      : "'Inter', system-ui, sans-serif";
  var brandName = brand?.site_name || '';
  var showBranding = quiz?.settings?.show_branding !== false && !quiz?.settings?.remove_branding;
  var showProgressBar = quiz?.settings?.show_progress_bar !== false;
  var transitionType = quiz?.settings?.transition_type || 'slide';
  var customCss = quiz?.settings?.custom_css || '';
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /* ---------- current question helpers ---------- */
  var layout = currentQ ? getAnswerLayout(currentQ) : 'list';
  var isSplit = layout === 'splitLayout';
  var isGrid = layout === 'grid' || layout === 'fullBackground';
  var isFullBg = layout === 'fullBackground';
  var isThumbnail = layout === 'imageThumbnails';
  var qMediaUrl = currentQ ? getMediaUrl(currentQ) : undefined;
  var qMediaType = currentQ ? getMediaType(currentQ) : undefined;

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
      <style dangerouslySetInnerHTML={{ __html: "\n@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;500;600;700;800&display=swap');\n*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }\nhtml, body { height: 100%; }\nbody {\n  font-family: " + brandFont + ";\n  background: " + brandBg + ";\n  color: " + brandText + ";\n}\n*:focus-visible { outline: 2px solid " + brandPrimary + "; outline-offset: 2px; }\n@keyframes sq-slide-in-fwd { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }\n@keyframes sq-slide-in-back { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }\n@keyframes sq-fade-in { from { opacity: 0; } to { opacity: 1; } }\n" + customCss + "\n" }} />

      <div style={{
        containerType: 'inline-size' as any,
        minHeight: '100svh',
        background: brandBg,
        color: brandText,
        padding: '28px 20px 40px',
        fontFamily: brandFont,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ============= QUESTION STAGE ============= */}
          {stage === 'question' && currentQ && (
            <div key={'q-' + qIdx} style={{
              animation: transitionType === 'none' ? 'none' :
                transitionType === 'fade' ? 'sq-fade-in 0.35s ease-out' :
                transDir.current === 'forward' ? 'sq-slide-in-fwd 0.35s ease-out' : 'sq-slide-in-back 0.35s ease-out',
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
                {brandName && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandPrimary }}>{brandName}</div>}
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{quiz.title}</div>
                {quiz.description && <div style={{ fontSize: 14, opacity: 0.64, lineHeight: 1.55 }}>{quiz.description}</div>}
              </div>

              {/* Question card */}
              {isSplit ? (
                /* ---- SPLIT LAYOUT ---- */
                <div style={{
                  background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 18,
                  overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 400,
                }}>
                  {/* Left: media */}
                  <div style={{
                    background: qMediaUrl ? 'transparent' : 'linear-gradient(135deg, #1D2939, #344054)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {qMediaUrl && qMediaType === 'video' ? (function() {
                      var ytM = qMediaUrl!.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
                      var viM = qMediaUrl!.match(/(?:vimeo\.com\/)(\d+)/);
                      var eUrl = ytM ? 'https://www.youtube.com/embed/' + ytM[1] : viM ? 'https://player.vimeo.com/video/' + viM[1] : '';
                      return eUrl
                        ? <iframe src={eUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        : <video src={qMediaUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                    })() : qMediaUrl ? (
                      <img src={qMediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                      </div>
                    )}
                  </div>
                  {/* Right: question + answers */}
                  <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {timeRemaining !== null && (
                      <div style={{
                        position: 'absolute', top: 22, right: 22,
                        width: 56, height: 56, borderRadius: '50%',
                        background: timeRemaining < 5 ? '#ff6b5b26' : brandPrimary + '14',
                        color: timeRemaining < 5 ? '#ff6b5b' : brandPrimary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700,
                      }}>{timeRemaining}s</div>
                    )}
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandPrimary, marginBottom: 8 }}>
                      Question {String(qIdx + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.22, marginBottom: 6 }}>
                      {currentQ.text || currentQ.question}
                    </div>
                    {currentQ.subtitle && (
                      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>{currentQ.subtitle}</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                              padding: '12px 14px', background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 12, fontFamily: brandFont, fontSize: 14, color: brandText,
                              cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-1px)' : 'none',
                            }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: picked ? brandPrimary : brandBorder,
                              color: picked ? brandBg : brandText,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                            }}>{LETTERS[oi]}</div>
                            {optImg && <img src={optImg} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1 }}>{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>
                    {qIdx > 0 && (
                      <button type="button" onClick={goBack} style={{ marginTop: 16, fontSize: 12, opacity: 0.5, cursor: 'pointer', background: 'none', border: 'none', fontFamily: brandFont, color: brandText }}>
                        ← Previous question
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ---- ALL OTHER LAYOUTS ---- */
                <div style={{
                  position: 'relative', background: brandSurface,
                  border: '1px solid ' + brandBorder, borderRadius: 18,
                  padding: '26px 22px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                }}>
                  {timeRemaining !== null && (
                    <div style={{
                      position: 'absolute', top: 22, right: 22,
                      width: 56, height: 56, borderRadius: '50%',
                      background: timeRemaining < 5 ? '#ff6b5b26' : brandPrimary + '14',
                      color: timeRemaining < 5 ? '#ff6b5b' : brandPrimary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, fontFamily: "'Inter', monospace",
                    }}>{timeRemaining}s</div>
                  )}

                  {/* Progress */}
                  {showProgressBar && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, opacity: 0.55, marginBottom: 10, letterSpacing: '0.02em' }}>
                        <span>Question {qIdx + 1} of {totalQs}</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: 4, background: brandBorder, borderRadius: 100, overflow: 'hidden', marginBottom: 22 }}>
                        <div style={{ height: '100%', background: brandPrimary, borderRadius: 100, transition: 'width 0.45s cubic-bezier(0.16,1,0.3,1)', width: progress + '%' }} />
                      </div>
                    </>
                  )}

                  {/* Question label + text */}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandPrimary, marginBottom: 8 }}>
                    Question {String(qIdx + 1).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.22, marginBottom: currentQ.subtitle ? 6 : 20 }}>
                    {currentQ.text || currentQ.question}
                  </div>
                  {currentQ.subtitle && (
                    <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 20, lineHeight: 1.5 }}>{currentQ.subtitle}</div>
                  )}

                  {/* Question media */}
                  {qMediaUrl && qMediaType && (
                    <QuestionMedia mediaUrl={qMediaUrl} mediaType={qMediaType} brandPrimary={brandPrimary} />
                  )}

                  {/* Answer options — layout-aware */}
                  {isGrid ? (
                    /* Grid / Full-background layout */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              padding: 0, background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                              fontFamily: brandFont, color: brandText,
                              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-2px)' : 'none',
                              boxShadow: hoverOpt === oi ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                              textAlign: 'center',
                            }}>
                            {/* Image area */}
                            <div style={{
                              width: '100%', height: isFullBg ? 160 : 120,
                              background: optImg ? 'transparent' : '#F2F4F7',
                              position: 'relative', overflow: 'hidden',
                            }}>
                              {optImg ? (
                                <img src={optImg} alt={opt.text || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>
                                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                                </div>
                              )}
                              {isFullBg && optImg && (
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.55))' }} />
                              )}
                              {isFullBg && optImg && (
                                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '0 8px', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                  {opt.text}
                                </div>
                              )}
                            </div>
                            {/* Text below image (unless fullBg which shows text over image) */}
                            {!isFullBg && (
                              <div style={{ padding: '10px 12px', width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                                  background: picked ? brandPrimary : brandBorder,
                                  color: picked ? brandBg : brandText,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 700,
                                }}>{LETTERS[oi]}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{opt.text}</div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : isThumbnail ? (
                    /* Thumbnail layout — image + text row */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                              padding: '10px 14px', background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 12, fontFamily: brandFont, fontSize: 14, color: brandText,
                              cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-1px)' : 'none',
                            }}>
                            {/* Thumbnail */}
                            <div style={{
                              width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                              background: optImg ? 'transparent' : '#F2F4F7',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {optImg ? (
                                <img src={optImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                              )}
                            </div>
                            <div style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: picked ? brandPrimary : brandBorder,
                              color: picked ? brandBg : brandText,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                            }}>{LETTERS[oi]}</div>
                            <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Default list layout */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                              padding: '14px 16px', background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 12, fontFamily: brandFont, fontSize: 14, color: brandText,
                              cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-1px)' : 'none',
                            }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: picked ? brandPrimary : brandBorder,
                              color: picked ? brandBg : brandText,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                            }}>{LETTERS[oi]}</div>
                            {optImg && <img src={optImg} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1 }}>{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Previous button */}
                  {qIdx > 0 && (
                    <button type="button" onClick={goBack} style={{
                      marginTop: 16, fontSize: 12, opacity: 0.5, cursor: 'pointer',
                      background: 'none', border: 'none', fontFamily: brandFont, color: brandText,
                    }}>
                      ← Previous question
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============= LEAD GATE ============= */}
          {stage === 'leadgate' && (
            <div style={{
              background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 18,
              padding: '40px 28px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 8 }}>
                {quiz.leadGate?.headline || 'Your result is ready'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.64, marginBottom: 22 }}>
                {quiz.leadGate?.subtext || 'Enter your email to see it'}
              </div>

              <div style={{ textAlign: 'left', marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>
                  First name <span style={{ opacity: 0.5, fontWeight: 500 }}>(optional)</span>
                </label>
                <input value={firstName} onChange={function(e) { setFirstName(e.target.value); }}
                  style={{
                    width: '100%', padding: '13px 14px', background: brandBg,
                    border: '1.5px solid ' + brandBorder, borderRadius: 12,
                    fontFamily: brandFont, fontSize: 14, color: brandText, outline: 'none',
                  }} />
              </div>
              <div style={{ textAlign: 'left', marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>
                  Email
                </label>
                <input type="email" value={email} placeholder="you@yoursite.com"
                  onChange={function(e) { setEmail(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') submitLead(); }}
                  style={{
                    width: '100%', padding: '13px 14px', background: brandBg,
                    border: '1.5px solid ' + brandBorder, borderRadius: 12,
                    fontFamily: brandFont, fontSize: 14, color: brandText, outline: 'none',
                  }} />
              </div>

              <button type="button" onClick={submitLead} disabled={submitting || !email.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px 22px', marginTop: 10,
                  background: brandPrimary, color: brandBg, border: 0, borderRadius: 100,
                  fontFamily: brandFont, fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                  transition: 'transform 0.2s', opacity: submitting || !email.trim() ? 0.5 : 1,
                }}>
                {submitting ? 'Loading...' : (quiz.leadGate?.buttonText || 'Show my result')}
              </button>
              {leadError && <div style={{ fontSize: 12, color: '#d44', marginTop: 8, textAlign: 'center' }}>{leadError}</div>}
            </div>
          )}

          {/* ============= SUBMITTED (check inbox) ============= */}
          {stage === 'submitted' && (
            <div style={{
              background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 18,
              padding: '40px 28px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>✉️</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800 }}>Check your inbox</h2>
              <p style={{ margin: '0 0 6px', color: '#444', fontSize: 14 }}>
                We just emailed your personalized report to <strong>{email}</strong>.
              </p>
              <p style={{ margin: '0 0 24px', color: '#777', fontSize: 14 }}>
                Don't see it in a minute? Check <strong>Promotions</strong> or <strong>Spam</strong>.
              </p>
              <button type="button" onClick={function() { setStage('result'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 18px', background: brandPrimary, color: brandBg,
                  border: 0, borderRadius: 100, fontFamily: brandFont, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                View results now →
              </button>
            </div>
          )}

          {/* ============= RESULT ============= */}
          {stage === 'result' && outcome && (
            <div style={{
              background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 18,
              padding: '36px 28px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-block', padding: '6px 12px',
                background: brandPrimary + '1a', color: brandPrimary,
                borderRadius: 100, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
              }}>Your result</div>

              {/* Outcome image */}
              {(outcome.imageUrl || outcome.image_url) && (
                <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
                  <img src={outcome.imageUrl || outcome.image_url} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
                </div>
              )}

              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>
                {outcome.title}
              </div>
              <div style={{ fontSize: 15, opacity: 0.72, lineHeight: 1.6, marginBottom: 20 }}>
                {outcome.description}
              </div>

              {(outcome.ctaUrl || outcome.cta_url) ? (
                <a href={addUtmParams(
                  prefillSchedulingUrl(outcome.ctaUrl || outcome.cta_url || '', outcome.cta_type, firstName, email),
                  quizUtm(slug, outcome.title)
                )} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button type="button" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '14px 22px', background: brandPrimary, color: brandBg,
                    border: 0, borderRadius: 100, fontFamily: brandFont, fontSize: 14, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    {outcome.ctaText || outcome.cta_text || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : quiz.settings?.cta_url ? (
                <a href={addUtmParams(quiz.settings.cta_url, quizUtm(slug))} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button type="button" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '14px 22px', background: brandPrimary, color: brandBg,
                    border: 0, borderRadius: 100, fontFamily: brandFont, fontSize: 14, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : (
                <button type="button" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px 22px', background: brandPrimary, color: brandBg,
                  border: 0, borderRadius: 100, fontFamily: brandFont, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                </button>
              )}
            </div>
          )}

          {/* Branding footer */}
          {showBranding && (
            <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11, opacity: 0.45 }}>
              <a href="https://squarespell.com" target="_top" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                Powered by Squarespell
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
