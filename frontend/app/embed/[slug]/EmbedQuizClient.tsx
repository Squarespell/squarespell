'use client';
import { addUtmParams, quizUtm } from '@/lib/urls';

import { useEffect, useState, useCallback, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface QuizOption {
  id: string;
  text: string;
  score?: number;
  imageUrl?: string;
  explanation?: string;
}

interface BranchRule {
  if_answer: string;
  goto: string;
}

interface QuizQuestion {
  id: string;
  text?: string;
  question?: string;
  subtitle?: string;
  options: QuizOption[];
  questionStyle?: string;
  questionType?: string;
  answerLayout?: string;
  mediaUrl?: string;
  mediaType?: string;
  timeLimit?: number;
  next_question_rules?: BranchRule[];
  shuffle_answers?: boolean;
}

interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  minScore?: number;
  maxScore?: number;
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
    redirect_url?: string;
    redirect_delay?: number;
    gdpr_consent_enabled?: boolean;
    gdpr_consent_text?: string;
    gdpr_policy_url?: string;
    gdpr_allow_deletion?: boolean;
    gdpr_data_retention_days?: number;
    schedule_enabled?: boolean;
    publish_at?: string;
    unpublish_at?: string;
    shuffle_questions?: boolean;
  };
  leadGate?: { headline?: string; subtext?: string; buttonText?: string };
}

export default function EmbedQuizClient({
  quiz,
  brandBg,
  brandText,
  brandPrimary,
  brandFont,
}: {
  quiz: Quiz;
  brandBg: string;
  brandText: string;
  brandPrimary: string;
  brandFont: string;
}) {
  const [stage, setStage] = useState<'loading' | 'error' | 'question' | 'leadgate' | 'result'>('question');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [qHistory, setQHistory] = useState<number[]>([0]);
  const startSentRef = useRef(false);
  const viewedQsRef = useRef<Record<number, boolean>>({});

  // Fire-and-forget analytics event helper. This embed flow previously sent
  // ONLY a 'complete' event and nothing else — no 'view' on load, no 'start',
  // no per-question events — meaning every quiz embedded on a customer's
  // Squarespace site contributed zero data to the dashboard's "viewed" /
  // "started" funnel stages and to /dropoff, while still counting toward
  // "completed". That silently broke conversion-rate math (completed/viewed)
  // for the embed flow, which is this product's primary distribution channel.
  const trackEvent = useCallback(
    function(eventType: string, metadata?: Record<string, any>) {
      fetch(API + '/api/quiz/' + quiz.slug + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, session_id: sessionIdRef.current, metadata: metadata }),
      }).catch(function() {});
    },
    [quiz.slug]
  );

  // Fire 'view' once when the embed mounts (equivalent to the hosted
  // /quiz/[slug] page's load-time 'view' event, which this embed never had).
  useEffect(function() {
    trackEvent('view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track each question's first view (feeds /dropoff's "started" count).
  useEffect(function() {
    if (stage !== 'question') return;
    if (viewedQsRef.current[qIdx]) return;
    viewedQsRef.current[qIdx] = true;
    trackEvent('question_' + qIdx + '_view');
  }, [stage, qIdx, trackEvent]);

  // Build question ID → index map for branching logic
  var questionIdMap = useRef<Record<string, number>>({});
  useEffect(function() {
    var map: Record<string, number> = {};
    quiz.questions.forEach(function(q, idx) {
      if (q.id) map[q.id] = idx;
    });
    questionIdMap.current = map;
  }, [quiz.questions]);

  // Shuffle options per question if shuffle_answers is enabled (memoize once)
  var shuffledQuestions = useRef<QuizQuestion[] | null>(null);
  if (!shuffledQuestions.current) {
    shuffledQuestions.current = quiz.questions.map(function(q) {
      if (q.shuffle_answers || quiz.settings?.shuffle_questions) {
        var opts = q.options.slice();
        // Fisher-Yates shuffle
        for (var i = opts.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = opts[i];
          opts[i] = opts[j];
          opts[j] = tmp;
        }
        return Object.assign({}, q, { options: opts });
      }
      return q;
    });
  }

  var questions = shuffledQuestions.current;
  var totalQs = questions.length || 0;
  var currentQ = questions[qIdx];
  const requireEmail = quiz.settings?.requireEmail !== false;
  const progress =
    stage === 'question' ? Math.round(((qIdx + 1) / Math.max(totalQs, 1)) * 100) :
    stage === 'leadgate' ? 95 : 100;

  // Custom redirect after quiz completion
  useEffect(function() {
    if (stage !== 'result') return;
    var redirectUrl = quiz.settings?.redirect_url;
    if (!redirectUrl) return;
    var delay = quiz.settings?.redirect_delay ?? 5;
    setRedirectCountdown(delay);
    var interval = setInterval(function() {
      setRedirectCountdown(function(prev) {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (window.parent !== window) {
            window.parent.postMessage({ source: 'squarespell', type: 'redirect', url: redirectUrl }, '*');
          }
          window.top ? window.top.location.href = redirectUrl : window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function() { clearInterval(interval); };
  }, [stage, quiz.settings?.redirect_url, quiz.settings?.redirect_delay]);

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const brandSurface = quiz.branding?.colors?.surface || brandBg;
  const brandBorder = 'rgba(0,0,0,0.10)';
  const brandName = quiz.branding?.site_name || '';
  const showBranding = quiz.settings?.show_branding !== false;

  /** Detect YouTube/Vimeo and return embed URL, or empty string for direct video */
  function getVideoEmbedUrl(url: string): string {
    if (!url) return '';
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    var vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1];
    return '';
  }

  // Notify embed parent of height changes
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;
    let lastSent = 0;
    const notify = () => {
      // Measure the .sq-root element directly — in Next.js the first child of
      // body is #__next, not .sq-root. Use scrollHeight as a fallback which
      // captures the full content height regardless of overflow clipping.
      const sqRoot = document.querySelector('.sq-root') as HTMLElement | null;
      const h = sqRoot
        ? Math.ceil(sqRoot.getBoundingClientRect().height)
        : document.body.scrollHeight;
      if (Math.abs(h - lastSent) < 2) return;
      lastSent = h;
      window.parent.postMessage({ source: 'squarespell', type: 'resize', height: h }, '*');
    };
    // Observe the .sq-root element, falling back to body
    const sqRoot = document.querySelector('.sq-root');
    const ro = new ResizeObserver(notify);
    if (sqRoot) ro.observe(sqRoot); else ro.observe(document.body);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    // Fire immediately, then again after a short delay to catch late-rendering
    // content like YouTube embeds that load asynchronously.
    notify();
    const delayed = setTimeout(notify, 1000);
    return () => { ro.disconnect(); clearTimeout(delayed); };
  }, [stage, qIdx]);

  // Timer countdown for current question
  useEffect(function() {
    if (stage !== 'question' || !currentQ || !currentQ.timeLimit || currentQ.timeLimit <= 0) {
      setTimeRemaining(null);
      return;
    }
    setTimeRemaining(currentQ.timeLimit);
    var interval = setInterval(function() {
      setTimeRemaining(function(prev) {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-advance when time runs out (pass -1 to skip)
          pickOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function() { clearInterval(interval); };
  }, [qIdx, currentQ, stage]);

  function getOutcome(answers: Record<number, number>): QuizOutcome | null {
    var outcomes = quiz.outcomes || quiz.results || [];
    if (outcomes.length === 0) return null;
    var total = 0;
    Object.entries(answers).forEach(function(entry) {
      var qi = entry[0];
      var oi = entry[1];
      var q = questions[Number(qi)];
      var opt = q?.options?.[Number(oi)];
      if (opt?.score !== undefined) total += Number(opt.score);
    });
    var matched = outcomes.find(function(o) {
      return o.minScore !== undefined && o.maxScore !== undefined && total >= o.minScore && total <= o.maxScore;
    });
    return matched || outcomes[0];
  }

  // Evaluate branching rules to find the next question index
  function getNextQuestionIndex(currentIdx: number, selectedOptionId: string): number {
    var q = questions[currentIdx];
    if (!q) return currentIdx + 1;

    var rules = q.next_question_rules;
    if (rules && Array.isArray(rules) && rules.length > 0) {
      var matchedRule = rules.find(function(r) { return r.if_answer === selectedOptionId; });
      if (matchedRule && matchedRule.goto) {
        var targetIdx = questionIdMap.current[matchedRule.goto];
        if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < questions.length) {
          return targetIdx;
        }
      }
    }

    return currentIdx + 1;
  }

  var pickOption = useCallback(
    function(oi: number) {
      if (!startSentRef.current) {
        startSentRef.current = true;
        trackEvent('start');
      }
      // Only record answer if oi >= 0 (oi = -1 means time ran out, skip)
      if (oi >= 0) {
        setAnswers(function(prev) { return Object.assign({}, prev, { [qIdx]: oi }); });
        trackEvent('question_' + qIdx + '_answer');
      }

      // Determine next question using branching logic
      var selectedOptionId = (oi >= 0 && currentQ && currentQ.options[oi]) ? currentQ.options[oi].id : '';
      var nextIdx = getNextQuestionIndex(qIdx, selectedOptionId);

      if (nextIdx < questions.length) {
        setQIdx(nextIdx);
        setQHistory(function(prev) { return prev.concat([nextIdx]); });
      } else {
        if (requireEmail) {
          setStage('leadgate');
        } else {
          var newAnswers = Object.assign({}, answers);
          if (oi >= 0) {
            newAnswers[qIdx] = oi;
          }
          var o = getOutcome(newAnswers);
          setOutcome(o);
          setStage('result');
          trackEvent('complete', { outcome_id: o?.id });
          if (window.parent !== window) {
            window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
          }
        }
      }
    },
    [qIdx, answers, requireEmail, questions.length, quiz.slug, currentQ, trackEvent]
  );

  // Go back using history stack (handles non-linear branching paths)
  var goBack = useCallback(function() {
    if (qHistory.length > 1) {
      var newHistory = qHistory.slice(0, -1);
      setQHistory(newHistory);
      setQIdx(newHistory[newHistory.length - 1]);
    }
  }, [qHistory]);

  const submitLead = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email');
      return;
    }
    // If GDPR consent is required, enforce it
    const gdprRequired = quiz.settings?.gdpr_consent_enabled === true;
    if (gdprRequired && !gdprConsent) {
      setLeadError('Please accept the consent checkbox to continue');
      return;
    }
    setSubmitting(true);
    setLeadError('');
    const o = getOutcome(answers);
    const consentText = quiz.settings?.gdpr_consent_text || 'I agree to receive communications from this business';

    // Lead submission is the conversion-critical gate of the embed widget,
    // so it gets retry-with-backoff + a per-attempt timeout instead of a
    // single unprotected fetch. Previously a hung/slow backend left the
    // button on "Unlocking..." forever with no recovery, and the missing
    // response.ok check meant an HTTP error response would still fall into
    // the success branch and silently show a result as if the lead had
    // been saved.
    const maxAttempts = 3;
    async function attempt(n: number): Promise<void> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch(`${API}/api/quiz/${quiz.slug}/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: firstName,
            email,
            answers,
            outcome_id: o?.id,
            session_id: sessionIdRef.current,
            consent: gdprRequired ? gdprConsent : undefined,
            consent_text: gdprRequired && gdprConsent ? consentText : undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('HTTP ' + r.status);
      } catch (err) {
        clearTimeout(timeoutId);
        if (n < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, n === 1 ? 600 : 1500));
          return attempt(n + 1);
        }
        throw err;
      }
    }

    try {
      await attempt(1);
      setOutcome(o);
      setStage('result');
      trackEvent('complete', { outcome_id: o?.id });
      if (window.parent !== window) {
        window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: o?.id }, '*');
      }
    } catch {
      setLeadError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, firstName, answers, quiz.slug, trackEvent]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        body {
          font-family: ${brandFont};
          background: ${brandBg};
          color: ${brandText};
        }
        .sq-root {
          container-type: inline-size;
          background: ${brandBg};
          color: ${brandText};
          padding: 28px 20px 40px;
          font-family: ${brandFont};
        }
        .sq-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .sq-head {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-bottom: 4px;
        }
        .sq-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${brandPrimary};
        }
        .sq-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }
        .sq-sub {
          font-size: 14px;
          opacity: 0.64;
          line-height: 1.55;
        }
        .sq-card {
          position: relative;
          background: ${brandSurface};
          border: 1px solid ${brandBorder};
          border-radius: 18px;
          padding: 26px 22px 26px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.04);
        }
        .sq-timer {
          position: absolute;
          top: 22px;
          right: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: ${brandPrimary}14;
          border-radius: 50%;
          font-size: 18px;
          font-weight: 700;
          color: ${brandPrimary};
          font-family: 'Inter', monospace;
        }
        .sq-timer.warning {
          background: #ff6b5b26;
          color: #ff6b5b;
        }
        .sq-prog {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.55;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .sq-bar {
          height: 3px;
          background: ${brandBorder};
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .sq-bar-fill {
          height: 100%;
          background: ${brandPrimary};
          border-radius: 100px;
          transition: width 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-qlabel {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${brandPrimary};
          margin-bottom: 8px;
        }
        .sq-q {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.22;
          margin-bottom: 20px;
        }
        .sq-opts {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sq-opt {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-opt:hover {
          border-color: ${brandPrimary};
          transform: translateY(-1px);
        }
        .sq-opt.picked {
          border-color: ${brandPrimary};
          background: ${brandPrimary}14;
        }
        .sq-opt-letter {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: ${brandBorder};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .sq-opt.picked .sq-opt-letter {
          background: ${brandPrimary};
          color: ${brandBg};
        }
        .sq-q-media {
          width: 100%;
          border-radius: 12px;
          max-height: 320px;
          object-fit: cover;
          margin-bottom: 18px;
        }
        .sq-q-video-wrap {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 18px;
          background: #0a0a0a;
          max-height: 280px;
        }
        .sq-q-video-wrap iframe,
        .sq-q-video-wrap video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        .sq-q-video-wrap video {
          object-fit: contain;
        }
        .sq-opts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .sq-opt-grid {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          text-align: center;
          padding: 0;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 13px;
          color: ${brandText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .sq-opt-grid:hover {
          border-color: ${brandPrimary};
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .sq-opt-grid.picked {
          border-color: ${brandPrimary};
          background: ${brandPrimary}14;
        }
        .sq-opt-grid-img-area {
          width: 100%;
          height: 110px;
          position: relative;
          overflow: hidden;
        }
        .sq-opt-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sq-opt-grid-bar {
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-align: left;
        }
        .sq-opt-thumb {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-opt-thumb:hover {
          border-color: ${brandPrimary};
          transform: translateY(-1px);
          box-shadow: 0 3px 12px rgba(0,0,0,0.05);
        }
        .sq-opt-thumb.picked {
          border-color: ${brandPrimary};
          background: ${brandPrimary}14;
        }
        .sq-opt-thumb-wrap {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sq-opt-thumb-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sq-opt-thumb-text {
          flex: 1;
          min-width: 0;
        }
        .sq-opt-thumb-title {
          font-weight: 600;
          font-size: 14px;
        }
        .sq-opt-thumb-desc {
          font-size: 12px;
          opacity: 0.55;
          margin-top: 2px;
          line-height: 1.4;
        }
        .sq-opt-full {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          min-height: 130px;
          display: flex;
          align-items: flex-end;
          cursor: pointer;
          border: 1.5px solid ${brandBorder};
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-opt-full:hover {
          border-color: ${brandPrimary};
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .sq-opt-full.picked {
          border-color: ${brandPrimary};
          box-shadow: 0 0 0 1px ${brandPrimary};
        }
        .sq-opt-full-bg {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .sq-opt-full-label {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 14px;
          background: linear-gradient(transparent 30%, rgba(0,0,0,0.6));
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          font-family: ${brandFont};
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .sq-cards-layout {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sq-opt-card {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          text-align: left;
          padding: 16px 18px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 14px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .sq-opt-card:hover {
          border-color: ${brandPrimary};
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.08);
        }
        .sq-opt-card.picked {
          border-color: ${brandPrimary};
          background: ${brandPrimary}14;
        }

        /* Split layout — media left, question+answers right */
        .sq-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 360px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid ${brandBorder};
          background: ${brandSurface};
          box-shadow: 0 8px 30px rgba(0,0,0,0.04);
        }
        .sq-split-media {
          position: relative;
          overflow: hidden;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sq-split-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sq-split-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sq-split-media iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        .sq-split-media-placeholder {
          color: rgba(255,255,255,0.3);
          text-align: center;
          font-size: 13px;
          font-weight: 600;
        }
        .sq-split-body {
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sq-split-body .sq-qlabel {
          margin-bottom: 6px;
        }
        .sq-split-body .sq-q {
          font-size: 20px;
          margin-bottom: 6px;
        }
        .sq-split-body .sq-opts {
          gap: 7px;
          flex: 1;
        }
        .sq-split-body .sq-opt {
          padding: 11px 13px;
          font-size: 13px;
        }
        .sq-split-body .sq-opt-letter {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          font-size: 10px;
        }
        .sq-split-body .sq-opt-thumb-wrap {
          width: 36px;
          height: 36px;
          border-radius: 6px;
        }
        @container (max-width: 600px) {
          .sq-split {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .sq-split-media {
            height: 220px;
          }
          .sq-split-body {
            padding: 22px 20px;
          }
        }
        @media (max-width: 600px) {
          .sq-split {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .sq-split-media {
            height: 220px;
          }
          .sq-split-body {
            padding: 22px 20px;
          }
        }

        .sq-back {
          margin-top: 16px;
          font-size: 12px;
          opacity: 0.5;
          cursor: pointer;
          display: inline-block;
        }
        .sq-back:hover { opacity: 0.9; }

        .sq-lead {
          text-align: center;
        }
        .sq-lead-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 8px;
        }
        .sq-lead-sub {
          font-size: 14px;
          opacity: 0.64;
          margin-bottom: 22px;
        }
        .sq-field {
          text-align: left;
          margin-bottom: 12px;
        }
        .sq-field label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 6px;
        }
        .sq-input {
          width: 100%;
          padding: 13px 14px;
          background: ${brandBg};
          border: 1.5px solid ${brandBorder};
          border-radius: 12px;
          font-family: ${brandFont};
          font-size: 14px;
          color: ${brandText};
          outline: none;
        }
        .sq-input:focus { border-color: ${brandPrimary}; }
        .sq-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 22px;
          background: ${brandPrimary};
          color: ${brandBg};
          border: 0;
          border-radius: 100px;
          font-family: ${brandFont};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .sq-btn:hover { transform: translateY(-1px); }
        .sq-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          filter: saturate(0.6);
        }
        .sq-btn-lead {
          margin-top: 14px;
          padding: 15px 22px;
          font-size: 14px;
          box-shadow: 0 6px 18px ${brandPrimary}40;
        }
        .sq-btn-lead:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px ${brandPrimary}55;
        }
        .sq-lead { text-align: left; padding: 28px 26px 24px; }
        .sq-lead-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background: ${brandPrimary}14;
          color: ${brandPrimary};
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .sq-lead-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.18;
          margin-bottom: 8px;
        }
        .sq-lead-sub {
          font-size: 14px;
          line-height: 1.55;
          opacity: 0.66;
          margin-bottom: 20px;
        }
        .sq-lead-preview {
          position: relative;
          background: ${brandBg};
          border: 1px dashed ${brandBorder};
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 22px;
          overflow: hidden;
          min-height: 96px;
        }
        .sq-lead-preview-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          filter: blur(6px);
          user-select: none;
          pointer-events: none;
        }
        .sq-lead-preview-desc {
          font-size: 13px;
          line-height: 1.55;
          opacity: 0.7;
          filter: blur(5px);
          user-select: none;
          pointer-events: none;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sq-lead-preview-cover {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, ${brandSurface}00 0%, ${brandSurface}cc 45%, ${brandSurface} 100%);
          color: ${brandPrimary};
        }
        .sq-lead-form { display: flex; flex-direction: column; }
        .sq-lead-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .sq-opt-tag {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          opacity: 0.45;
          text-transform: none;
          margin-left: 4px;
        }
        .sq-trust {
          text-align: center;
          font-size: 11px;
          opacity: 0.5;
          margin-top: 10px;
          letter-spacing: 0.01em;
        }
        @container (max-width: 540px) {
          .sq-lead { padding: 24px 20px 22px; }
          .sq-lead-title { font-size: 22px; }
          .sq-lead-grid { grid-template-columns: 1fr; gap: 8px; }
        }

        .sq-result {
          text-align: center;
        }
        .sq-result-badge {
          display: inline-block;
          padding: 6px 12px;
          background: ${brandPrimary}1a;
          color: ${brandPrimary};
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sq-result-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 10px;
        }
        .sq-result-desc {
          font-size: 15px;
          opacity: 0.72;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .sq-err {
          font-size: 12px;
          color: #d44;
          margin-top: 8px;
          text-align: center;
        }
        .sq-brand-foot {
          text-align: center;
          margin-top: 22px;
          font-size: 11px;
          opacity: 0.45;
        }
        .sq-brand-foot a { color: inherit; text-decoration: none; }

        @container (max-width: 540px) {
          .sq-root { padding: 20px 14px 32px; }
          .sq-card { padding: 22px 18px; border-radius: 14px; }
          .sq-title { font-size: 22px; }
          .sq-q { font-size: 19px; }
          .sq-result-title { font-size: 24px; }
        }
        @container (max-width: 420px) {
          .sq-opt { padding: 12px 13px; font-size: 13px; }
          .sq-q { font-size: 18px; }
          .sq-title { font-size: 20px; }
        }

        /* Container queries can't target the container itself, so .sq-root
           padding must use @media. In an iframe the viewport IS the embed
           width, so this fires correctly on narrow embeds. */
        @media (max-width: 540px) {
          .sq-root { padding: 20px 14px 32px; }
        }
      ` }} />

      <div className="sq-root">
        <div className="sq-inner">
          {stage === 'question' && currentQ && (
            <>
              <div className="sq-head">
                {brandName && <div className="sq-eyebrow">{brandName}</div>}
                <div className="sq-title">{quiz.title}</div>
                {quiz.description && <div className="sq-sub">{quiz.description}</div>}
              </div>

              <div className="sq-card">
                {timeRemaining !== null && currentQ.answerLayout !== 'splitLayout' && (
                  <div className={'sq-timer' + (timeRemaining < 5 ? ' warning' : '')} aria-label={'Time remaining: ' + timeRemaining + ' seconds'}>{timeRemaining}s</div>
                )}
                {currentQ.answerLayout !== 'splitLayout' && (
                  <>
                    <div className="sq-prog">
                      <span>Question {qIdx + 1} of {totalQs}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="sq-bar"><div className="sq-bar-fill" style={{ width: `${progress}%` }} /></div>

                    <div className="sq-qlabel">Question {String(qIdx + 1).padStart(2, '0')}</div>
                    <div className="sq-q">{currentQ.text || currentQ.question}</div>
                    {currentQ.subtitle && <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, marginTop: -12, lineHeight: 1.5 }}>{currentQ.subtitle}</div>}

                    {/* Question media (image or video) — not in splitLayout, it renders its own */}
                    {currentQ.mediaUrl && currentQ.mediaType === 'video' && (function() {
                      var embedUrl = getVideoEmbedUrl(currentQ.mediaUrl!);
                      return (
                        <div className="sq-q-video-wrap">
                          {embedUrl ? (
                            <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                          ) : (
                            <video src={currentQ.mediaUrl} controls playsInline />
                          )}
                        </div>
                      );
                    })()}
                    {currentQ.mediaUrl && currentQ.mediaType !== 'video' && (
                      <img className="sq-q-media" src={currentQ.mediaUrl} alt="" onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                    )}
                  </>
                )}

                {/* Answer options — render based on answerLayout */}
                {(() => {
                  var layout = currentQ.answerLayout || 'list';
                  var hasImages = currentQ.options.some(function(o) { return !!o.imageUrl; });

                  /* Split layout — media on left, question + answers on right */
                  if (layout === 'splitLayout') {
                    var hasMedia = !!currentQ.mediaUrl;
                    var isVid = currentQ.mediaType === 'video';
                    var splitEmbedUrl = isVid && currentQ.mediaUrl ? getVideoEmbedUrl(currentQ.mediaUrl) : '';
                    return (
                      <>
                        {/* Close the sq-card early — splitLayout replaces it */}
                        <style dangerouslySetInnerHTML={{ __html: '.sq-card:has(.sq-split-inject) { border: none; padding: 0; background: transparent; box-shadow: none; }' }} />
                        <div className="sq-split-inject" style={{ margin: '-26px -22px -26px' }}>
                          <div className="sq-split">
                            <div className="sq-split-media">
                              {hasMedia && isVid && splitEmbedUrl ? (
                                <iframe src={splitEmbedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                              ) : hasMedia && isVid ? (
                                <video src={currentQ.mediaUrl} controls playsInline />
                              ) : hasMedia ? (
                                <img src={currentQ.mediaUrl} alt="" onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <div className="sq-split-media-placeholder">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px' }}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                  No media
                                </div>
                              )}
                            </div>
                            <div className="sq-split-body">
                              <div className="sq-qlabel">Question {String(qIdx + 1).padStart(2, '0')}</div>
                              <div className="sq-q">{currentQ.text || currentQ.question}</div>
                              {currentQ.subtitle && <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 12, marginTop: -2, lineHeight: 1.5 }}>{currentQ.subtitle}</div>}
                              <div className="sq-opts">
                                {currentQ.options.map(function(opt, oi) {
                                  return (
                                    <button key={opt.id + oi} className={'sq-opt' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button">
                                      {opt.imageUrl && <div className="sq-opt-thumb-wrap" style={{ width: 32, height: 32, borderRadius: 6 }}><img src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} /></div>}
                                      <div className="sq-opt-letter">{LETTERS[oi]}</div>
                                      <div>{opt.text}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              {qHistory.length > 1 && (
                                <span className="sq-back" onClick={goBack} style={{ marginTop: 12 }}>← Previous question</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  /* Grid layout (2x2) */
                  if (layout === 'grid') {
                    return (
                      <div className="sq-opts-grid">
                        {currentQ.options.map(function(opt, oi) {
                          return (
                            <button key={opt.id + oi} className={'sq-opt-grid' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button">
                              <div className="sq-opt-grid-img-area">
                                {opt.imageUrl ? (
                                  <img className="sq-opt-img" src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                  </div>
                                )}
                              </div>
                              <div className="sq-opt-grid-bar">
                                <span className="sq-opt-letter" style={{ width: 20, height: 20, borderRadius: 5, fontSize: 9 }}>{LETTERS[oi]}</span>
                                <span>{opt.text}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  /* Thumbnails layout — image + text + description row */
                  if (layout === 'imageThumbnails') {
                    return (
                      <div className="sq-opts">
                        {currentQ.options.map(function(opt, oi) {
                          return (
                            <button key={opt.id + oi} className={'sq-opt-thumb' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button">
                              <div className="sq-opt-thumb-wrap">
                                {opt.imageUrl ? (
                                  <img src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                                )}
                              </div>
                              <div className="sq-opt-letter" style={{ width: 22, height: 22, borderRadius: 6, fontSize: 10 }}>{LETTERS[oi]}</div>
                              <div className="sq-opt-thumb-text">
                                <div className="sq-opt-thumb-title">{opt.text}</div>
                                {opt.explanation && <div className="sq-opt-thumb-desc">{opt.explanation}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  /* Full background image layout */
                  if (layout === 'fullBackground') {
                    return (
                      <div className="sq-opts-grid">
                        {currentQ.options.map(function(opt, oi) {
                          return (
                            <button key={opt.id + oi} className={'sq-opt-full' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button" style={{ minHeight: hasImages ? 160 : 120 }}>
                              {opt.imageUrl ? (
                                <img className="sq-opt-full-bg" src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                </div>
                              )}
                              <div className="sq-opt-full-label">{opt.text}</div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  /* Default list layout (buttons or cards style) */
                  var style = currentQ.questionStyle || 'buttons';
                  if (style === 'cards') {
                    return (
                      <div className="sq-cards-layout">
                        {currentQ.options.map(function(opt, oi) {
                          return (
                            <button key={opt.id + oi} className={'sq-opt-card' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button">
                              {opt.imageUrl && <img style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />}
                              <div className="sq-opt-letter">{LETTERS[oi]}</div>
                              <div>{opt.text}</div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  /* Default: list buttons */
                  return (
                    <div className="sq-opts">
                      {currentQ.options.map(function(opt, oi) {
                        return (
                          <button key={opt.id + oi} className={'sq-opt' + (answers[qIdx] === oi ? ' picked' : '')} onClick={function() { pickOption(oi); }} type="button">
                            {opt.imageUrl && <img style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} src={opt.imageUrl} alt={opt.text} onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />}
                            <div className="sq-opt-letter">{LETTERS[oi]}</div>
                            <div>{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {currentQ.answerLayout !== 'splitLayout' && qHistory.length > 1 && (
                  <span className="sq-back" onClick={goBack}>← Previous question</span>
                )}
              </div>
            </>
          )}

          {stage === 'leadgate' && (
            <div className="sq-card sq-lead">
              {(() => {
                const peekOutcome = getOutcome(answers);
                return (
                  <>
                    <div className="sq-lead-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Your result is ready
                    </div>
                    <div className="sq-lead-title">
                      {quiz.leadGate?.headline || (peekOutcome?.title ? `You are a ${peekOutcome.title}` : 'Unlock your personalized result')}
                    </div>
                    <div className="sq-lead-sub">
                      {quiz.leadGate?.subtext || 'Enter your email below to see your full result, recommendations, and next steps.'}
                    </div>
                    {peekOutcome && (
                      <div className="sq-lead-preview" aria-hidden="true">
                        <div className="sq-lead-preview-title">{peekOutcome.title}</div>
                        <div className="sq-lead-preview-desc">{peekOutcome.description}</div>
                        <div className="sq-lead-preview-cover">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      </div>
                    )}
                    <div className="sq-lead-form">
                      <div className="sq-lead-grid">
                        <div className="sq-field">
                          <label>First name <span className="sq-opt-tag">Optional</span></label>
                          <input className="sq-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                        </div>
                        <div className="sq-field">
                          <label>Email</label>
                          <input
                            className="sq-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@yoursite.com"
                            type="email"
                            autoComplete="email"
                            onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) submitLead(); }}
                          />
                        </div>
                      </div>
                      {quiz.settings?.gdpr_consent_enabled && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '10px 0 6px', fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
                          <input
                            type="checkbox"
                            checked={gdprConsent}
                            onChange={function(e) { setGdprConsent(e.target.checked); }}
                            style={{ marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span>
                            {quiz.settings?.gdpr_consent_text || 'I agree to receive communications from this business'}
                            {quiz.settings?.gdpr_policy_url && (
                              <span>
                                {' '}
                                <a href={quiz.settings.gdpr_policy_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', opacity: 0.8 }}>
                                  Privacy Policy
                                </a>
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {leadError && <div className="sq-err">{leadError}</div>}
                      <button className="sq-btn sq-btn-lead" onClick={submitLead} disabled={submitting || !email.trim()} type="button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        {submitting ? 'Unlocking...' : (quiz.leadGate?.buttonText || 'Unlock my result')}
                      </button>
                      <div className="sq-trust">No spam. Unsubscribe anytime.</div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {stage === 'result' && outcome && (
            <div className="sq-card sq-result">
              <div className="sq-result-badge">Your result</div>
              <div className="sq-result-title">{outcome.title}</div>
              <div className="sq-result-desc">{outcome.description}</div>

              {outcome.ctaUrl ? (
                <a href={addUtmParams(outcome.ctaUrl, quizUtm(quiz.slug, outcome.title))} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="sq-btn" type="button">
                    {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : quiz.settings?.cta_url ? (
                <a href={addUtmParams(quiz.settings.cta_url, quizUtm(quiz.slug))} target="_top" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="sq-btn" type="button">
                    {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                  </button>
                </a>
              ) : (
                <button className="sq-btn" type="button">
                  {outcome.ctaText || quiz.settings?.cta_text || 'Get my plan'} →
                </button>
              )}

              {redirectCountdown !== null && redirectCountdown > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
                  Redirecting in {redirectCountdown}s...
                </div>
              )}
            </div>
          )}

          {showBranding && (
            <div className="sq-brand-foot">
              <a href="https://squarespell.com" target="_top" rel="noopener noreferrer">
                Powered by Squarespell Quiz
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
