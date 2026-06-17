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
import generatePdfReport from './generatePdfReport';
import QuizRenderer from '@/components/quiz-taker/QuizRenderer';

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
interface OutcomeProduct {
  title: string;
  imageUrl?: string;
  image_url?: string;
  price?: string;
  url: string;
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
  tips?: string[];
  couponCode?: string;
  coupon_code?: string;
  couponLabel?: string;
  coupon_label?: string;
  products?: OutcomeProduct[];
  bookingUrl?: string;
  booking_url?: string;
  bookingText?: string;
  booking_text?: string;
  testimonialQuote?: string;
  testimonial_quote?: string;
  testimonialAuthor?: string;
  testimonial_author?: string;
  beforeText?: string;
  before_text?: string;
  afterText?: string;
  after_text?: string;
  shareEnabled?: boolean;
  share_enabled?: boolean;
  shareText?: string;
  share_text?: string;
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
    redirect_url?: string;
    redirect_delay?: number;
    logo_url?: string;
    consent_required?: boolean;
    privacy_policy_url?: string;
    webhook_url?: string;
    meta_description?: string;
    show_social_sharing?: boolean;
    show_score_breakdown?: boolean;
    show_email_results?: boolean;
    show_countdown_timer?: boolean;
    show_coupon?: boolean;
    show_products?: boolean;
    show_booking?: boolean;
    show_testimonial?: boolean;
    show_before_after?: boolean;
    show_pdf_download?: boolean;
  };
  leadGate?: { headline?: string; subtext?: string; buttonText?: string };
  owner_plan?: string;
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
  if (mediaType === 'video' || /youtube\.com|youtu\.be|vimeo\.com/.test(mediaUrl)) {
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
  // Several layout sections below (split question layout, the grid/card
  // answer layout, and the before/after comparison) use a hardcoded
  // `gridTemplateColumns: '1fr 1fr'` with no responsive fallback, which was
  // found during real-device mobile QA to squeeze content into unusably
  // narrow columns on phone-width screens. Track viewport width here so
  // those sections can collapse to a single column below ~640px.
  var [isMobile, setIsMobile] = useState(false);
  useEffect(function() {
    function checkWidth() { setIsMobile(window.innerWidth < 640); }
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return function() { window.removeEventListener('resize', checkWidth); };
  }, []);
  var [qIdx, setQIdx] = useState(0);
  var [answers, setAnswers] = useState<Record<number, number>>({});
  var [email, setEmail] = useState('');
  var [firstName, setFirstName] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [consentGiven, setConsentGiven] = useState(false);
  var [countdown, setCountdown] = useState(-1);
  var [couponCopied, setCouponCopied] = useState(false);
  var [resultEmail, setResultEmail] = useState('');
  var [resultEmailSent, setResultEmailSent] = useState(false);
  var [resultEmailSending, setResultEmailSending] = useState(false);
  var [resultEmailError, setResultEmailError] = useState('');
  var [linkCopied, setLinkCopied] = useState(false);
  var [totalScore, setTotalScore] = useState(0);
  var [leadError, setLeadError] = useState('');
  var [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  var [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  var [hoverOpt, setHoverOpt] = useState<number | null>(null);
  var [pdfGenerating, setPdfGenerating] = useState(false);
  var resultCardRef = useRef<HTMLDivElement>(null);
  var sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );
  var [prevQIdx, setPrevQIdx] = useState(0);
  var [transitioning, setTransitioning] = useState(false);
  var transDir = useRef<'forward' | 'back'>('forward');
  var startSentRef = useRef(false);
  var viewedQsRef = useRef<Record<number, boolean>>({});

  // Fire-and-forget analytics event helper. Used to feed the dashboard's
  // funnel ('start'), dropoff (question_<n>_view/answer), and other
  // analytics endpoints, which previously received zero data from this page
  // because it only ever sent 'view' (on load) and 'complete' (on finish).
  var trackEvent = useCallback(
    function(eventType: string, metadata?: Record<string, any>) {
      if (!slug) return;
      fetch(API + '/api/quiz/' + slug + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, session_id: sessionIdRef.current, metadata: metadata }),
      }).catch(function() {});
    },
    [slug]
  );

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

  // Load quiz.
  //
  // Hardened against transient network/backend blips: the bare single-shot
  // fetch here used to convert ANY failure (timeout, brief 5xx during a
  // backend restart, a dropped connection, a non-JSON error body) into a
  // permanent, non-recoverable "Quiz not found" dead end for the visitor —
  // with no way to retry short of a full page reload. That was confirmed in
  // real-browser testing: repeated hard navigations to a known-good quiz
  // intermittently failed even though the same endpoint, hit directly,
  // succeeded every time — i.e. a transient-failure UX problem, not a
  // missing-quiz problem. We now retry with backoff and a per-attempt
  // timeout before giving up, and offer a manual "Try Again" action instead
  // of a dead end.
  var [retryToken, setRetryToken] = useState(0);

  useEffect(function() {
    if (!slug) return;
    var cancelled = false;
    var maxAttempts = 3;

    function attempt(n: number): Promise<any> {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 10000);
      return fetch(API + '/api/quiz/' + slug, { signal: controller.signal })
        .then(function(r) {
          clearTimeout(timeoutId);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(function(err) {
          clearTimeout(timeoutId);
          if (cancelled) throw err;
          if (n < maxAttempts) {
            var delay = n === 1 ? 600 : 1500;
            return new Promise(function(resolve) { setTimeout(resolve, delay); }).then(function() {
              return attempt(n + 1);
            });
          }
          throw err;
        });
    }

    setStage('loading');
    setError('');
    attempt(1)
      .then(function(data) {
        if (cancelled) return;
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
        if (cancelled) return;
        setError('Failed to load quiz.');
        setStage('error');
      });

    return function() { cancelled = true; };
  }, [slug, retryToken]);

  // Track each question's first view (feeds /dropoff's "started" count).
  useEffect(function() {
    if (stage !== 'question' || !quiz) return;
    if (viewedQsRef.current[qIdx]) return;
    viewedQsRef.current[qIdx] = true;
    trackEvent('question_' + qIdx + '_view');
  }, [stage, qIdx, quiz, trackEvent]);

  var totalQs = quiz?.questions.length || 0;
  var currentQ = quiz?.questions[qIdx];
  var requireEmail = quiz?.settings?.requireEmail !== false;
  var progress =
    stage === 'question' ? Math.round(((qIdx + 1) / Math.max(totalQs, 1)) * 100) :
    stage === 'leadgate' ? 95 : 100;

  var pickOption = useCallback(
    function(oi: number) {
      if (!quiz) return;
      if (!startSentRef.current) {
        startSentRef.current = true;
        trackEvent('start');
      }
      if (oi >= 0) {
        setAnswers(function(prev) { return Object.assign({}, prev, { [qIdx]: oi }); });
        trackEvent('question_' + qIdx + '_answer');
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
    [quiz, qIdx, answers, requireEmail, slug, trackEvent]
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

  // Countdown + redirect after result is shown
  var countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(function() {
    if (stage !== 'result' || !redirectUrl) return;
    var secs = redirectDelay || 5;
    setCountdown(secs);
    countdownRef.current = setInterval(function() {
      setCountdown(function(prev) {
        if (prev <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); window.location.href = redirectUrl; return 0; }
        return prev - 1;
      });
    }, 1000);
    return function() { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [stage, redirectUrl, redirectDelay]);

  // Calculate total score when result is shown
  useEffect(function() {
    if (stage !== 'result' || !quiz) return;
    var questions = quiz.questions || [];
    var score = 0;
    Object.keys(answers).forEach(function(k) {
      var qIdx = parseInt(k);
      var q = questions[qIdx];
      if (q && q.options && q.options[answers[qIdx]]) {
        score += (q.options[answers[qIdx]].score || 0);
      }
    });
    setTotalScore(score);
  }, [stage, quiz, answers]);

  // Fire webhook on quiz completion
  useEffect(function() {
    if (stage !== 'result' || !webhookUrl || !quiz) return;
    var payload = { quiz_id: quiz.id, quiz_title: quiz.title, answers: answers, outcome: outcome, email: email, first_name: firstName, completed_at: new Date().toISOString() };
    fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(function() { /* silent fail */ });
  }, [stage, webhookUrl]);

  // Lead submission is the conversion-critical gate of the entire funnel, so
  // it gets the same retry-with-backoff + per-attempt timeout hardening as
  // the quiz-load fetch above (see retryToken comment). Previously this had
  // no timeout at all (a hung/slow backend left the button on "Loading..."
  // forever with no recovery) and no response.ok check (an HTTP error would
  // still fall into the success branch and silently show a result as if the
  // lead had been saved).
  var submitLead = useCallback(function() {
    if (!quiz) return;
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    setLeadError('');
    var o = getOutcome(quiz, answers);
    var maxAttempts = 3;

    function attempt(n: number): Promise<any> {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
      return fetch(API + '/api/quiz/' + slug + '/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: firstName,
          email: email,
          answers: answers,
          outcome_id: o?.id,
          session_id: sessionIdRef.current,
        }),
        signal: controller.signal,
      }).then(function(r) {
        clearTimeout(timeoutId);
        if (!r.ok) {
          // 4xx responses (bad email, invalid name, missing fields, etc.) are
          // deterministic validation failures, not transient backend issues —
          // retrying the exact same payload three times wastes ~2s and then
          // still ends up showing a generic "Something went wrong" instead of
          // the specific, actionable reason the server already gave us (e.g.
          // "Name contains invalid characters"). Only 5xx/network-style
          // failures are worth retrying; surface 4xx immediately as a
          // non-retryable error carrying the real server message.
          return r.json().catch(function() { return {}; }).then(function(body) {
            var err: any = new Error(body?.error || ('HTTP ' + r.status));
            err.status = r.status;
            err.nonRetryable = r.status >= 400 && r.status < 500;
            throw err;
          });
        }
        return r;
      }).catch(function(err) {
        clearTimeout(timeoutId);
        if (!err.nonRetryable && n < maxAttempts) {
          var delay = n === 1 ? 600 : 1500;
          return new Promise(function(resolve) { setTimeout(resolve, delay); }).then(function() {
            return attempt(n + 1);
          });
        }
        throw err;
      });
    }

    attempt(1).then(function() {
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
    }).catch(function(err) {
      setLeadError(err && err.nonRetryable && err.message ? err.message : 'Something went wrong. Please try again.');
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
  var redirectUrl = quiz?.settings?.redirect_url || '';
  var redirectDelay = quiz?.settings?.redirect_delay || 5;
  var logoUrl = quiz?.settings?.logo_url || '';
  var consentRequired = quiz?.settings?.consent_required || false;
  var privacyPolicyUrl = quiz?.settings?.privacy_policy_url || '';
  var webhookUrl = quiz?.settings?.webhook_url || '';
  var metaDescription = quiz?.settings?.meta_description || '';
  // Plan gating: Pro features require pro/business/agency plan
  var ownerPlan = quiz?.owner_plan || 'free';
  var isProPlan = ownerPlan === 'pro' || ownerPlan === 'business' || ownerPlan === 'agency' || ownerPlan === 'trial';

  var showSocialSharing = quiz?.settings?.show_social_sharing !== false;
  var showScoreBreakdown = quiz?.settings?.show_score_breakdown !== false;
  // Pro-gated features: only show if owner has Pro+ plan
  var showEmailResults = isProPlan && (quiz?.settings?.show_email_results !== false);
  var showCountdownTimer = isProPlan && (quiz?.settings?.show_countdown_timer !== false);
  var showCoupon = isProPlan && (quiz?.settings?.show_coupon || false);
  var showProducts = isProPlan && (quiz?.settings?.show_products || false);
  var showBooking = isProPlan && (quiz?.settings?.show_booking || false);
  var showTestimonial = isProPlan && (quiz?.settings?.show_testimonial || false);
  var showBeforeAfter = isProPlan && (quiz?.settings?.show_before_after || false);
  var showPdfDownload = isProPlan && (quiz?.settings?.show_pdf_download || false);
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
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>{error || 'This quiz may have been removed.'}</p>
          <button
            type="button"
            onClick={function() { setRetryToken(function(t) { return t + 1; }); }}
            style={{
              background: brandPrimary || '#0a0a0a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!quiz) return null;

  /* ---------- adapt local handlers to QuizRenderer's prop contract ---------- */
  var handleCopyLink = function() {
    var ta = document.createElement('textarea');
    ta.value = window.location.href;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setLinkCopied(true);
    setTimeout(function() { setLinkCopied(false); }, 2000);
  };

  var handleCopyCoupon = function() {
    var code = outcome?.couponCode || outcome?.coupon_code || '';
    var ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setCouponCopied(true);
    setTimeout(function() { setCouponCopied(false); }, 2000);
  };

  var handleSendResultEmail = function() {
    if (!resultEmail.trim() || !resultEmail.includes('@') || !quiz) return;
    setResultEmailSending(true);
    setResultEmailError('');
    fetch(API + '/api/quiz/' + slug + '/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resultEmail, first_name: '', outcome_id: outcome?.id }),
    }).then(function(r) {
      if (!r.ok) {
        return r.json().catch(function() { return {}; }).then(function(body) {
          throw new Error(body?.error || ('HTTP ' + r.status));
        });
      }
      setResultEmailSent(true);
    }).catch(function(err) {
      setResultEmailError((err && err.message) || 'Something went wrong. Please try again.');
    }).finally(function() {
      setResultEmailSending(false);
    });
  };

  var handleCancelCountdown = function() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(-1);
  };

  var handleDownloadPdf = function() {
    if (pdfGenerating || !quiz) return;
    setPdfGenerating(true);
    try {
      var questions = quiz.questions || [];
      var questionResults: Array<{ questionText: string; chosenAnswer: string; score: number; maxScore: number }> = [];
      var maxPossible = 0;
      Object.keys(answers).forEach(function(k) {
        var qi = parseInt(k);
        var q = questions[qi];
        if (!q) return;
        var chosenIdx = answers[qi];
        var chosenOpt = q.options[chosenIdx];
        var qMaxScore = 0;
        q.options.forEach(function(opt) {
          var s = opt.score || 0;
          if (s > qMaxScore) qMaxScore = s;
        });
        maxPossible += qMaxScore;
        questionResults.push({
          questionText: q.text || q.question || 'Question ' + (qi + 1),
          chosenAnswer: chosenOpt ? chosenOpt.text : '',
          score: chosenOpt ? (chosenOpt.score || 0) : 0,
          maxScore: qMaxScore,
        });
      });
      var oc = outcome || getOutcome(quiz, answers);
      generatePdfReport({
        quizTitle: quiz.title || 'Quiz Report',
        quizDescription: quiz.description,
        respondentName: firstName || 'Quiz Taker',
        respondentEmail: email || '',
        outcomeName: oc ? oc.title : '',
        outcomeDescription: oc ? oc.description : '',
        totalScore: totalScore,
        maxPossibleScore: maxPossible,
        questionResults: questionResults,
        tips: oc?.tips || [],
        ctaText: oc?.ctaText || oc?.cta_text || quiz.settings?.cta_text || '',
        ctaUrl: oc?.ctaUrl || oc?.cta_url || quiz.settings?.cta_url || '',
        couponCode: oc?.couponCode || oc?.coupon_code || '',
        couponLabel: oc?.couponLabel || oc?.coupon_label || '',
        testimonialQuote: oc?.testimonialQuote || oc?.testimonial_quote || '',
        testimonialAuthor: oc?.testimonialAuthor || oc?.testimonial_author || '',
        beforeText: oc?.beforeText || oc?.before_text || '',
        afterText: oc?.afterText || oc?.after_text || '',
        bookingUrl: oc?.bookingUrl || oc?.booking_url || '',
        bookingText: oc?.bookingText || oc?.booking_text || '',
        brandPrimary: brandPrimary,
        brandName: brandName || quiz.title || 'Quiz',
        brandFont: brandFont,
        logoUrl: logoUrl,
        generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
      setTimeout(function() { setPdfGenerating(false); }, 2000);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfGenerating(false);
    }
  };

  return (
    <>
      {metaDescription && <meta name="description" content={metaDescription} />}

      <style dangerouslySetInnerHTML={{ __html: "\n@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;500;600;700;800&display=swap');\n*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }\nhtml, body { height: 100%; }\nbody {\n  font-family: " + brandFont + ";\n  background: " + brandBg + ";\n  color: " + brandText + ";\n}\n*:focus-visible { outline: 2px solid " + brandPrimary + "; outline-offset: 2px; }\n@keyframes sq-slide-in-fwd { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }\n@keyframes sq-slide-in-back { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }\n@keyframes sq-fade-in { from { opacity: 0; } to { opacity: 1; } }\n" + customCss + "\n" }} />

      <div style={{ minHeight: '100svh' }}>
        <QuizRenderer
          quiz={quiz as any}
          slug={slug}
          stage={stage as any}
          isMobile={isMobile}
          qIdx={qIdx}
          answers={answers}
          outcome={outcome}
          totalScore={totalScore}
          timeRemaining={timeRemaining}
          hoverOpt={hoverOpt}
          setHoverOpt={setHoverOpt}
          transitioning={transitioning}
          transDir={transDir.current}
          pickOption={pickOption}
          goBack={goBack}
          firstName={firstName}
          setFirstName={setFirstName}
          email={email}
          setEmail={setEmail}
          consentGiven={consentGiven}
          setConsentGiven={setConsentGiven}
          submitting={submitting}
          submitLead={submitLead}
          leadError={leadError}
          onViewResultsNow={function() { setStage('result'); }}
          resultEmail={resultEmail}
          setResultEmail={setResultEmail}
          resultEmailSending={resultEmailSending}
          resultEmailSent={resultEmailSent}
          resultEmailError={resultEmailError}
          onSendResultEmail={handleSendResultEmail}
          linkCopied={linkCopied}
          onCopyLink={handleCopyLink}
          couponCopied={couponCopied}
          onCopyCoupon={handleCopyCoupon}
          countdown={countdown}
          onCancelCountdown={handleCancelCountdown}
          pdfGenerating={pdfGenerating}
          onDownloadPdf={handleDownloadPdf}
          shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
          isProPlan={isProPlan}
        />
      </div>
    </>
  );
}

/* ============================================================================
 * The legacy inline JSX below has been fully replaced by <QuizRenderer />
 * above (frontend/components/quiz-taker/QuizRenderer.tsx). Kept removed —
 * see that file for the canonical question/leadgate/submitted/result markup,
 * which is now shared with the quiz-funnel builder's Stage 4 preview.
 * ========================================================================= */
/* Legacy inline JSX removed — see QuizRenderer.tsx for the canonical markup. */
