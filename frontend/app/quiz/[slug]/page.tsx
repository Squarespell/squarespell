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

  return (
    <>
      {metaDescription && <meta name="description" content={metaDescription} />}

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
                {logoUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><img src={logoUrl} alt="" style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain' }} /></div>}
                {brandName && !logoUrl && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandPrimary }}>{brandName}</div>}
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{quiz.title}</div>
                {quiz.description && <div style={{ fontSize: 14, opacity: 0.64, lineHeight: 1.55 }}>{quiz.description}</div>}
              </div>

              {/* Question card */}
              {isSplit ? (
                /* ---- SPLIT LAYOUT ---- */
                <div style={{
                  background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 16,
                  overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                  display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', minHeight: isMobile ? 'auto' : 360,
                }}>
                  {/* Left: media */}
                  <div style={{
                    background: '#0a0a0a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {qMediaUrl && (qMediaType === 'video' || /youtube\.com|youtu\.be|vimeo\.com/.test(qMediaUrl)) ? (function() {
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
                  <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                      <div style={{ height: 3, background: brandBorder, borderRadius: 100, overflow: 'hidden', marginBottom: 22 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                              padding: 0, background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                              fontFamily: brandFont, color: brandText,
                              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-2px)' : 'none',
                              boxShadow: hoverOpt === oi ? '0 4px 16px rgba(0,0,0,0.06)' : picked ? '0 0 0 1px ' + brandPrimary : 'none',
                              textAlign: 'center',
                            }}>
                            {/* Image area */}
                            <div style={{
                              width: '100%', height: isFullBg ? 140 : 110,
                              background: optImg ? 'transparent' : 'rgba(0,0,0,0.03)',
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
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.6))' }} />
                              )}
                              {isFullBg && optImg && (
                                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '0 8px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                                  {opt.text}
                                </div>
                              )}
                            </div>
                            {/* Text below image (unless fullBg which shows text over image) */}
                            {!isFullBg && (
                              <div style={{ padding: '8px 10px', width: '100%', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                                  background: picked ? brandPrimary : brandBorder,
                                  color: picked ? brandBg : brandText,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700,
                                }}>{LETTERS[oi]}</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{opt.text}</div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : isThumbnail ? (
                    /* Thumbnail layout — image + letter + text + description row */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentQ.options.map(function(opt, oi) {
                        var optImg = getOptionImage(opt);
                        var picked = answers[qIdx] === oi;
                        return (
                          <button key={opt.id + oi} type="button" onClick={function() { pickOption(oi); }}
                            onMouseEnter={function() { setHoverOpt(oi); }}
                            onMouseLeave={function() { setHoverOpt(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                              padding: '10px 14px', background: picked ? brandPrimary + '14' : brandBg,
                              border: '1.5px solid ' + (picked ? brandPrimary : hoverOpt === oi ? brandPrimary : brandBorder),
                              borderRadius: 12, fontFamily: brandFont, fontSize: 14, color: brandText,
                              cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                              transform: hoverOpt === oi ? 'translateY(-1px)' : 'none',
                              boxShadow: hoverOpt === oi ? '0 3px 12px rgba(0,0,0,0.05)' : 'none',
                            }}>
                            {/* Thumbnail */}
                            <div style={{
                              width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                              background: optImg ? 'transparent' : 'rgba(0,0,0,0.04)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {optImg ? (
                                <img src={optImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                              )}
                            </div>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: picked ? brandPrimary : brandBorder,
                              color: picked ? brandBg : brandText,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700,
                            }}>{LETTERS[oi]}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.text}</div>
                              {(opt as any).explanation && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2, lineHeight: 1.4 }}>{(opt as any).explanation}</div>}
                            </div>
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

              {consentRequired && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', marginTop: 8 }}>
                  <input type="checkbox" checked={consentGiven} onChange={function(e) { setConsentGiven(e.target.checked); }}
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: brandPrimary }} />
                  <span style={{ fontSize: 12, color: brandText, opacity: 0.7, lineHeight: 1.4 }}>
                    I agree to the {privacyPolicyUrl ? (
                      <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" style={{ color: brandPrimary, textDecoration: 'underline' }}>privacy policy</a>
                    ) : 'privacy policy'} and consent to having my data processed.
                  </span>
                </div>
              )}

              <button type="button" onClick={submitLead} disabled={submitting || !email.trim() || (consentRequired && !consentGiven)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px 22px', marginTop: 10,
                  background: brandPrimary, color: brandBg, border: 0, borderRadius: 100,
                  fontFamily: brandFont, fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                  transition: 'transform 0.2s', opacity: submitting || !email.trim() || (consentRequired && !consentGiven) ? 0.5 : 1,
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
            <div ref={resultCardRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Main outcome card */}
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

                {/* Actionable tips — always on */}
                {outcome.tips && outcome.tips.length > 0 && outcome.tips.some(function(t) { return t.trim(); }) && (
                  <div style={{ textAlign: 'left', background: brandPrimary + '08', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: brandPrimary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Based on your answers, we recommend</div>
                    {outcome.tips.filter(function(t) { return t.trim(); }).map(function(tip, i) {
                      return (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < (outcome.tips || []).length - 1 ? 8 : 0 }}>
                          <span style={{ fontSize: 14, color: brandPrimary, fontWeight: 700, marginTop: 1 }}>✓</span>
                          <span style={{ fontSize: 14, lineHeight: 1.5, color: brandText }}>{tip}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Score breakdown */}
                {showScoreBreakdown && totalScore > 0 && (
                  <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: brandText, opacity: 0.6 }}>Your score</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: brandPrimary }}>{totalScore} pts</span>
                    </div>
                    <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: brandPrimary, borderRadius: 4, width: Math.min(100, (totalScore / Math.max(1, (quiz.questions || []).length * 10)) * 100) + '%', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                )}

                {/* CTA button */}
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

                {/* Booking CTA */}
                {showBooking && (outcome.bookingUrl || outcome.booking_url) && (
                  <a href={outcome.bookingUrl || outcome.booking_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginTop: 10 }}>
                    <button type="button" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '12px 20px', background: 'transparent', color: brandPrimary,
                      border: '2px solid ' + brandPrimary, borderRadius: 100, fontFamily: brandFont, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                      {outcome.bookingText || outcome.booking_text || 'Book a free call'} →
                    </button>
                  </a>
                )}

                {/* Social sharing */}
                {showSocialSharing && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    {[
                      { name: 'Twitter', icon: '𝕏', getUrl: function() { return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('I got "' + outcome.title + '"! Take the quiz: ' + window.location.href); } },
                      { name: 'Facebook', icon: 'f', getUrl: function() { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href); } },
                      { name: 'LinkedIn', icon: 'in', getUrl: function() { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href); } },
                    ].map(function(s) {
                      return (
                        <a key={s.name} href={s.getUrl()} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <button type="button" style={{
                            width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + brandBorder, background: brandSurface,
                            color: brandText, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }} title={'Share on ' + s.name}>{s.icon}</button>
                        </a>
                      );
                    })}
                    <button type="button" onClick={function() {
                      var ta = document.createElement('textarea');
                      ta.value = window.location.href;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      setLinkCopied(true);
                      setTimeout(function() { setLinkCopied(false); }, 2000);
                    }} style={{
                      height: 38, borderRadius: 100, border: '1px solid ' + brandBorder, background: linkCopied ? brandPrimary + '1a' : brandSurface,
                      color: linkCopied ? brandPrimary : brandText, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 14px',
                    }}>
                      {linkCopied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>

              {/* Coupon code card */}
              {showCoupon && (outcome.couponCode || outcome.coupon_code) && (
                <div style={{
                  background: brandPrimary + '0d', border: '2px dashed ' + brandPrimary + '40', borderRadius: 14,
                  padding: '22px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: brandText, opacity: 0.7, marginBottom: 6 }}>
                    {outcome.couponLabel || outcome.coupon_label || 'Special offer for you'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: brandPrimary, letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                      {outcome.couponCode || outcome.coupon_code}
                    </span>
                    <button type="button" onClick={function() {
                      var ta = document.createElement('textarea');
                      ta.value = outcome.couponCode || outcome.coupon_code || '';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      setCouponCopied(true);
                      setTimeout(function() { setCouponCopied(false); }, 2000);
                    }} style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: couponCopied ? brandPrimary : brandSurface, color: couponCopied ? brandBg : brandPrimary,
                      border: '1px solid ' + brandPrimary, cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      {couponCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Product recommendations */}
              {showProducts && outcome.products && outcome.products.length > 0 && (
                <div style={{
                  background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 14,
                  padding: '22px 24px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: brandText, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Recommended for you</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {outcome.products.map(function(p, i) {
                      var imgUrl = p.imageUrl || p.image_url;
                      return (
                        <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{
                            display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px',
                            border: '1px solid ' + brandBorder, borderRadius: 10, cursor: 'pointer',
                            transition: 'box-shadow 0.2s',
                          }}>
                            {imgUrl && <img src={imgUrl} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: brandText }}>{p.title}</div>
                              {p.price && <div style={{ fontSize: 15, fontWeight: 800, color: brandPrimary, marginTop: 2 }}>{p.price}</div>}
                            </div>
                            <span style={{ fontSize: 18, color: brandPrimary }}>→</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Testimonial */}
              {showTestimonial && (outcome.testimonialQuote || outcome.testimonial_quote) && (
                <div style={{
                  background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 14,
                  padding: '24px 28px', textAlign: 'center', fontStyle: 'italic',
                }}>
                  <div style={{ fontSize: 36, lineHeight: 1, color: brandPrimary, opacity: 0.3, marginBottom: 8 }}>"</div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: brandText, marginBottom: 12 }}>
                    {outcome.testimonialQuote || outcome.testimonial_quote}
                  </div>
                  {(outcome.testimonialAuthor || outcome.testimonial_author) && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: brandText, opacity: 0.5, fontStyle: 'normal' }}>
                      — {outcome.testimonialAuthor || outcome.testimonial_author}
                    </div>
                  )}
                </div>
              )}

              {/* Before / After comparison */}
              {showBeforeAfter && (outcome.beforeText || outcome.before_text) && (outcome.afterText || outcome.after_text) && (
                <div style={{
                  display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12,
                }}>
                  <div style={{
                    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14,
                    padding: '20px 18px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Where you are now</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: '#7F1D1D' }}>{outcome.beforeText || outcome.before_text}</div>
                  </div>
                  <div style={{
                    background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14,
                    padding: '20px 18px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Where you could be</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: '#14532D' }}>{outcome.afterText || outcome.after_text}</div>
                  </div>
                </div>
              )}

              {/* Email me my results */}
              {showEmailResults && !email && !resultEmailSent && (
                <div style={{
                  background: brandSurface, border: '1px solid ' + brandBorder, borderRadius: 14,
                  padding: '20px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: brandText, marginBottom: 10 }}>Want a copy of your results?</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="email" placeholder="your@email.com" value={resultEmail}
                      onChange={function(e) { setResultEmail(e.target.value); }}
                      style={{
                        flex: 1, padding: '10px 14px', border: '1px solid ' + brandBorder, borderRadius: 8,
                        fontSize: 14, fontFamily: brandFont, color: brandText, outline: 'none',
                      }} />
                    <button type="button" disabled={resultEmailSending} onClick={function() {
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
                    }} style={{
                      padding: '10px 20px', background: brandPrimary, color: brandBg, border: 0,
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: resultEmailSending ? 'default' : 'pointer',
                      fontFamily: brandFont, opacity: resultEmailSending ? 0.6 : 1,
                    }}>{resultEmailSending ? 'Sending…' : 'Send'}</button>
                  </div>
                  {resultEmailError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626' }}>{resultEmailError}</div>
                  )}
                </div>
              )}
              {showEmailResults && resultEmailSent && (
                <div style={{
                  background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14,
                  padding: '14px 24px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#16A34A',
                }}>
                  Results sent to {resultEmail || email}!
                </div>
              )}

              {/* Countdown timer before redirect */}
              {showCountdownTimer && redirectUrl && countdown > 0 && (
                <div style={{
                  textAlign: 'center', fontSize: 12, color: brandText, opacity: 0.5,
                  padding: '8px 0',
                }}>
                  Redirecting in {countdown}s... <button type="button" onClick={function() { if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(-1); }}
                    style={{ background: 'none', border: 'none', color: brandPrimary, cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Cancel</button>
                </div>
              )}

              {/* PDF Download */}
              {showPdfDownload && (
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  <button type="button" disabled={pdfGenerating} onClick={function() {
                    if (pdfGenerating || !quiz) return;
                    setPdfGenerating(true);
                    try {
                      var questions = quiz.questions || [];
                      var questionResults: Array<{ questionText: string; chosenAnswer: string; score: number; maxScore: number }> = [];
                      var maxPossible = 0;
                      Object.keys(answers).forEach(function(k) {
                        var qIdx = parseInt(k);
                        var q = questions[qIdx];
                        if (!q) return;
                        var chosenIdx = answers[qIdx];
                        var chosenOpt = q.options[chosenIdx];
                        var qMaxScore = 0;
                        q.options.forEach(function(opt) {
                          var s = opt.score || 0;
                          if (s > qMaxScore) qMaxScore = s;
                        });
                        maxPossible += qMaxScore;
                        questionResults.push({
                          questionText: q.text || q.question || 'Question ' + (qIdx + 1),
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
                    } catch(err) {
                      console.error('PDF generation failed:', err);
                      setPdfGenerating(false);
                    }
                  }} data-pdf-trigger="true" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px 24px', background: brandSurface, color: brandText,
                    border: '1px solid ' + brandBorder, borderRadius: 100,
                    fontFamily: brandFont, fontSize: 13, fontWeight: 600, cursor: pdfGenerating ? 'wait' : 'pointer',
                    opacity: pdfGenerating ? 0.6 : 1, transition: 'all 0.2s',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {pdfGenerating ? 'Generating PDF...' : 'Download PDF Report'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Branding footer */}
          {showBranding && (
            <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11, opacity: 0.45 }}>
              <a href="https://squarespell.com" target="_top" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                Powered by Squarespell Quiz
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
