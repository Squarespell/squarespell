'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FLOW_CSS from './flow-css';
import { api } from '@/lib/api';
import { publicQuizUrl, embedSnippet, APP_URL } from '@/lib/urls';

type Device = 'desktop' | 'tablet' | 'mobile';
export type TryFlowMode = 'preview' | 'authed';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

/* ========================================================================= */
/* Types                                                                     */
/* ========================================================================= */
interface Option {
  id: string;
  text: string;
  score?: number;
}
interface Question {
  id: string;
  text: string;
  type?: string;
  subtitle?: string;
  options: Option[];
  next_question_rules?: Array<{ if_answer: string; goto: string }>;
}
interface Outcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
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
interface OnboardingQ {
  id: string;
  text: string;
  options: string[];
}

/* ========================================================================= */
/* Stage 2: Goal selection (Option C - AI analyzes site, user picks goal)    */
/* ========================================================================= */
const GOAL_OPTIONS = [
  { id: 'capture_leads', label: 'Capture leads', description: 'Qualify visitors and collect emails before showing personalized results' },
  { id: 'recommend_service', label: 'Recommend a service', description: 'Guide visitors to the right product, plan, or package for them' },
  { id: 'score_segment', label: 'Score and segment', description: 'Score visitors by intent and readiness to buy, then segment automatically' },
  { id: 'grow_email', label: 'Grow email list', description: 'Offer a free result or resource in exchange for email signup' },
];

/* ========================================================================= */
/* SVG icons                                                                 */
/* ========================================================================= */
const SvgArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
const SvgArrowLeft = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
const SvgCheck = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
);
const SvgDrag = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>
);
const SvgClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const SvgRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
);
const SvgCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const SvgChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
);
const SvgChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const SvgLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
);
const SvgPencil = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
);
const SvgBolt = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
const SvgUsers = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const SvgPackage = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
);
const SvgBarChart = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);
const SvgMail = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
);
const SvgSpark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
);

/* ========================================================================= */
/* Main component                                                            */
/* ========================================================================= */
export interface TryFlowInnerProps {
  /** 'preview' = anonymous funnel starting at Stage 1. 'authed' = signed-in editor
   *  reusing Stages 3/4/6 with the quiz preloaded from the API. */
  mode?: TryFlowMode;
  /** In authed mode: the quiz id in the DB, used for PUT /api/quizzes/:id saves. */
  authedQuizId?: string;
  /** Preload a quiz (authed mode, or testing). */
  initialQuiz?: Quiz;
  /** Preload a brand object (so Stage 4 visitor mock matches the scraped brand). */
  initialBrand?: Brand | null;
  /** Preload the site URL (drives the domain chip + Stage 4 iframe address bar). */
  initialUrl?: string;
  /** Which stage to render first. Defaults to 1 for preview, 3 for authed. */
  initialStage?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Called when user clicks Publish in authed mode. Return true to advance to
   *  Stage 6 (success screen), false to stay put (the handler is responsible
   *  for surfacing its own error). Ignored in preview mode. */
  onPublish?: () => Promise<boolean>;
  /** User's current plan - used to gate paid-only features like branding removal. */
  plan?: 'trial' | 'starter' | 'pro' | 'agency' | 'free';
}

export function TryFlowInner({
  mode = 'preview',
  authedQuizId,
  initialQuiz,
  initialBrand = null,
  initialUrl = '',
  initialStage,
  onPublish,
  plan = 'trial',
}: TryFlowInnerProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlParam = mode === 'preview' ? (searchParams.get('url') || '') : '';

  // If the visitor arrives from /tools/quiz-funnel with a `?url=...` param, they
  // already pasted their site on the landing page. Skip the Stage 1 hook widget
  // entirely and drop them straight into Stage 2 (the questions page). The
  // background analyze call runs while they're reading question 1.
  const defaultStage: 1 | 2 | 3 | 4 | 5 | 6 =
    initialStage ??
    (mode === 'authed' ? 3 : (urlParam ? 2 : 1));
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(defaultStage);
  const [publishingRemote, setPublishingRemote] = useState(false);
  // Authed-mode publish: await the parent onPublish callback (which hits the
  // real API) before flipping to Stage 6. Preview mode keeps the old behavior.
  const doPublish = async () => {
    if (mode !== 'authed' || !onPublish) {
      setStage(mode === 'authed' ? 6 : 5);
      return;
    }
    if (publishingRemote) return;
    setPublishingRemote(true);
    try {
      const ok = await onPublish();
      if (ok) setStage(6);
    } finally {
      setPublishingRemote(false);
    }
  };

  // Stage 1
  const [url, setUrl] = useState(initialUrl || urlParam);
  // Seed `loading` to true when we have a urlParam so Stage 2 renders in the
  // "Analyzing your site…" state on first paint (no flash of "Ready" before
  // the background analyze call starts).
  const [loading, setLoading] = useState<boolean>(!!(mode === 'preview' && urlParam));
  const [errorMsg, setErrorMsg] = useState('');
  /** Shown when the scraper is taking >3s (Render cold-start or slow site). */
  const [slowHint, setSlowHint] = useState(false);

  // Brand + session
  const [brand, setBrand] = useState<Brand | null>(initialBrand);
  const [sessionToken, setSessionToken] = useState('');
  const [claimToken, setClaimToken] = useState('');

  // Stage 2 - goal selection (Option C)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, number>>({});
  const [buildingQuiz, setBuildingQuiz] = useState(false);

  // Stage 2 - inline editing of AI-detected tags
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the input when an edit starts
  useEffect(() => {
    if (editingTag && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTag]);

  const startEditTag = (tagKey: string, currentValue: string) => {
    setEditingTag(tagKey);
    setEditValues((prev) => ({ ...prev, [tagKey]: currentValue }));
  };

  const commitEditTag = (tagKey: string) => {
    const newValue = (editValues[tagKey] || '').trim();
    if (newValue && brand) {
      setBrand({
        ...brand,
        business: {
          ...brand.business,
          [tagKey]: newValue,
        },
      });
    }
    setEditingTag(null);
  };

  // Stage 3 editor
  const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz ?? null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage 4 visitor preview (rebuilt: device switcher + scraped brand)
  const [s4Idx, setS4Idx] = useState(0);
  const [s4Answers, setS4Answers] = useState<Record<number, number>>({});
  const [s4ShowResult, setS4ShowResult] = useState(false);
  const [s4Device, setS4Device] = useState<Device>('desktop');

  // Stage 6 publish
  const [copyState, setCopyState] = useState<'idle' | 'copied-link' | 'copied-embed'>('idle');
  const [editorToast, setEditorToast] = useState<string>('');
  const flashToast = useCallback((msg: string) => {
    setEditorToast(msg);
    window.setTimeout(() => setEditorToast((t) => (t === msg ? '' : t)), 1800);
  }, []);
  const [titleEditing, setTitleEditing] = useState(false);

  const hasAutoStarted = useRef(false);

  /* ======================== STAGE 1 -> STAGE 2 ======================== */
  const goAnalyze = useCallback(async (siteUrl: string) => {
    if (!siteUrl) return;
    setLoading(true);
    setSlowHint(false);
    setErrorMsg('');
    let normalized = siteUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

    // Surface a "waking up servers" hint after 3s so users don't think it's
    // broken when Render's free tier is cold-starting.
    const slowTimer = window.setTimeout(() => setSlowHint(true), 3000);

    // Hard abort after 75s so the button doesn't stay disabled forever if the
    // backend never responds.
    const ac = new AbortController();
    const killTimer = window.setTimeout(() => ac.abort(), 75000);

    // eslint-disable-next-line no-console
    console.info('[squarespell] analyze start', { url: normalized, api: API });

    try {
      const res = await fetch(`${API}/api/preview-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
        signal: ac.signal,
      });
      // eslint-disable-next-line no-console
      console.info('[squarespell] analyze response', { status: res.status, ok: res.ok });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analyze failed (${res.status})`);
      }
      const data = await res.json();
      // eslint-disable-next-line no-console
      console.info('[squarespell] analyze data', {
        hasBrand: !!data?.brand,
        hasSession: !!data?.session_token,
      });
      if (!data || !data.session_token) {
        throw new Error('Invalid response from server. Please try again.');
      }
      setBrand(data.brand ?? null);
      setSessionToken(data.session_token);
      setOnboardingAnswers({});
      setUrl(normalized);
      setStage(2);
      // eslint-disable-next-line no-console
      console.info('[squarespell] advanced to Stage 2');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[squarespell] analyze error', err);
      if (err?.name === 'AbortError') {
        setErrorMsg(
          "That took too long. Our server may be waking up - please try again in a moment.",
        );
      } else {
        setErrorMsg(
          err?.message || "We couldn't reach that site. Check the URL and try again.",
        );
      }
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(killTimer);
      setSlowHint(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'preview') return;
    if (urlParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      goAnalyze(urlParam);
    }
  }, [mode, urlParam, goAnalyze]);

  /* ======================== STAGE 2 -> STAGE 3 ======================== */
  const buildQuiz = useCallback(async () => {
    if (!selectedGoal || !sessionToken) return;
    setBuildingQuiz(true);
    setErrorMsg('');
    try {
      const payload: Record<string, string> = {
        goal: selectedGoal,
        business_type: brand?.business?.type || 'unknown',
        audience: brand?.business?.audience || 'unknown',
        tone: brand?.business?.tone || 'unknown',
        key_offer: brand?.business?.key_offer || 'unknown',
      };
      const res = await fetch(`${API}/api/preview-build-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, answers: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Quiz build failed (${res.status})`);
      }
      const data = await res.json();
      const normalizedQuiz: Quiz = {
        title: data.quiz?.title || 'Your quiz',
        description: data.quiz?.description || '',
        questions: data.quiz?.questions || [],
        outcomes: data.quiz?.outcomes || [],
        leadGate: data.quiz?.leadGate,
        settings: data.quiz?.settings,
      };
      setQuiz(normalizedQuiz);
      setClaimToken(data.claim_token || '');
      setSelectedIdx(0);
      setStage(3);
      // Scroll to top of page and editor panel
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        document.getElementById('stage-3')?.scrollIntoView({ behavior: 'instant', block: 'start' });
        document.querySelector('.s3-main')?.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
      try {
        if (data.claim_token) {
          document.cookie = `sq_claim=${data.claim_token};path=/;max-age=86400;SameSite=Lax`;
          sessionStorage.setItem('sq_claim_token', data.claim_token);
        }
        localStorage.setItem('squarespell_preview', JSON.stringify({
          quiz: normalizedQuiz,
          brand,
          url,
          claim_token: data.claim_token,
          createdAt: Date.now(),
        }));
      } catch {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to build quiz.');
    } finally {
      setBuildingQuiz(false);
    }
  }, [selectedGoal, sessionToken, brand, url]);

  /* ======================== STAGE 3 editor helpers ==================== */
  const scheduleSave = useCallback((nextQuiz: Quiz) => {
    // Authed mode: save via the authenticated /api/quizzes/:id endpoint.
    // Preview mode: save via the anonymous /api/preview-quiz/:claimToken endpoint.
    if (mode === 'authed' ? !authedQuizId : !claimToken) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (mode === 'authed' && authedQuizId) {
          await api.updateQuiz(authedQuizId, {
            title: nextQuiz.title,
            questions: nextQuiz.questions,
            outcomes: nextQuiz.outcomes,
            settings: nextQuiz.settings,
          });
        } else {
          await fetch(`${API}/api/preview-quiz/${claimToken}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: nextQuiz.title,
              questions: nextQuiz.questions,
              outcomes: nextQuiz.outcomes,
              settings: nextQuiz.settings,
            }),
          });
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1800);
      } catch {
        setSaveStatus('idle');
      }
    }, 700);
  }, [mode, authedQuizId, claimToken]);

  const updateQuiz = useCallback((next: Quiz) => {
    setQuiz(next);
    scheduleSave(next);
  }, [scheduleSave]);

  const updateQuestionText = (qi: number, text: string) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => i === qi ? { ...q, text } : q);
    updateQuiz({ ...quiz, questions: qs });
  };
  const updateOptionText = (qi: number, oi: number, text: string) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.map((o, j) => j === oi ? { ...o, text } : o);
      return { ...q, options: opts };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const addOption = (qi: number) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      if (q.options.length >= 6) return q;
      const nextLetter = String.fromCharCode(97 + q.options.length);
      return { ...q, options: [...q.options, { id: nextLetter, text: 'New answer', score: 0 }] };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const deleteOption = (qi: number, oi: number) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      if (q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, j) => j !== oi) };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const deleteQuestion = (qi: number) => {
    if (!quiz) return;
    if (quiz.questions.length <= 1) return;
    const qs = quiz.questions.filter((_, i) => i !== qi);
    const next = { ...quiz, questions: qs };
    updateQuiz(next);
    setSelectedIdx((prev) => Math.max(0, Math.min(prev, qs.length - 1)));
  };
  const addQuestion = () => {
    if (!quiz) return;
    const newQ: Question = {
      id: `q${quiz.questions.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      text: 'New question',
      subtitle: '',
      options: [
        { id: 'a', text: 'Answer A', score: 3 },
        { id: 'b', text: 'Answer B', score: 2 },
        { id: 'c', text: 'Answer C', score: 1 },
        { id: 'd', text: 'Answer D', score: 0 },
      ],
    };
    const qs = [...quiz.questions, newQ];
    updateQuiz({ ...quiz, questions: qs });
    setSelectedIdx(qs.length - 1);
  };
  const duplicateQuestion = (qi: number) => {
    if (!quiz) return;
    const src = quiz.questions[qi];
    if (!src) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    const copy: Question = {
      ...src,
      id: `${src.id}_copy_${suffix}`,
      text: `${src.text} (copy)`,
      options: src.options.map((o, idx) => ({ ...o, id: `${o.id}_${suffix}_${idx}` })),
    };
    const qs = [
      ...quiz.questions.slice(0, qi + 1),
      copy,
      ...quiz.questions.slice(qi + 1),
    ];
    updateQuiz({ ...quiz, questions: qs });
    setSelectedIdx(qi + 1);
  };
  const moveQuestion = (qi: number, dir: -1 | 1) => {
    if (!quiz) return;
    const target = qi + dir;
    if (target < 0 || target >= quiz.questions.length) return;
    const qs = [...quiz.questions];
    const [moved] = qs.splice(qi, 1);
    qs.splice(target, 0, moved);
    updateQuiz({ ...quiz, questions: qs });
    setSelectedIdx(target);
  };
  const moveOption = (qi: number, oi: number, dir: -1 | 1) => {
    if (!quiz) return;
    const q = quiz.questions[qi];
    if (!q) return;
    const target = oi + dir;
    if (target < 0 || target >= q.options.length) return;
    const opts = [...q.options];
    const [moved] = opts.splice(oi, 1);
    opts.splice(target, 0, moved);
    const qs = quiz.questions.map((qq, i) => (i === qi ? { ...qq, options: opts } : qq));
    updateQuiz({ ...quiz, questions: qs });
  };
  const updateBranchingRule = (qi: number, oi: number, targetQuestionId: string | null) => {
    if (!quiz) return;
    const qs = quiz.questions.map((q, i) => {
      if (i !== qi) return q;
      const optionId = q.options[oi]?.id;
      if (!optionId) return q;

      // Build new rules array
      let rules = q.next_question_rules || [];

      if (targetQuestionId) {
        // Add or update rule
        const existingRuleIdx = rules.findIndex((r: any) => r.if_answer === optionId);
        if (existingRuleIdx >= 0) {
          rules[existingRuleIdx] = { if_answer: optionId, goto: targetQuestionId };
        } else {
          rules = [...rules, { if_answer: optionId, goto: targetQuestionId }];
        }
      } else {
        // Remove rule if target is null
        rules = rules.filter((r: any) => r.if_answer !== optionId);
      }

      return { ...q, next_question_rules: rules.length > 0 ? rules : undefined };
    });
    updateQuiz({ ...quiz, questions: qs });
  };
  const updateQuizTitle = (title: string) => {
    if (!quiz) return;
    updateQuiz({ ...quiz, title });
  };
  const deselect = () => setSelectedIdx(-1);

  /* ======================== Stage 3 keyboard shortcuts =============== */
  // Cmd/Ctrl+N new question, Alt+ArrowUp/Down move selected question,
  // Cmd/Ctrl+D duplicate selected question, Esc to deselect.
  useEffect(() => {
    if (stage !== 3) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod && !typing && e.key === 'Escape') {
        setSelectedIdx(-1);
        return;
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addQuestion();
        flashToast('New question added');
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && selectedIdx >= 0) {
        e.preventDefault();
        duplicateQuestion(selectedIdx);
        flashToast('Question duplicated');
        return;
      }
      if (e.altKey && e.key === 'ArrowUp' && selectedIdx > 0) {
        e.preventDefault();
        moveQuestion(selectedIdx, -1);
        return;
      }
      if (e.altKey && e.key === 'ArrowDown' && quiz && selectedIdx < quiz.questions.length - 1) {
        e.preventDefault();
        moveQuestion(selectedIdx, 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedIdx, quiz]);

  /* ======================== STAGE 4 helpers =========================== */
  const [s4LeadGate, setS4LeadGate] = useState(false);
  const [s4Email, setS4Email] = useState('');
  const resetS4 = () => {
    setS4Idx(0);
    setS4Answers({});
    setS4ShowResult(false);
    setS4LeadGate(false);
    setS4Email('');
  };
  const s4Pick = (oi: number) => {
    if (!quiz) return;
    setS4Answers((prev) => ({ ...prev, [s4Idx]: oi }));
    if (s4Idx < quiz.questions.length - 1) {
      setS4Idx(s4Idx + 1);
    } else {
      // Show lead gate before results
      setS4LeadGate(true);
    }
    // Scroll only the inner visitor preview to top - never the outer editor page.
    if (typeof document !== 'undefined') {
      const chrome = document.querySelector('.s4-chrome') as HTMLElement | null;
      if (chrome) chrome.scrollTop = 0;
    }
  };
  const s4SubmitLead = () => {
    setS4LeadGate(false);
    setS4ShowResult(true);
  };
  const s4Back = () => {
    if (s4LeadGate) {
      setS4LeadGate(false);
    } else if (s4Idx > 0) {
      setS4Idx(s4Idx - 1);
    }
  };

  const s4Outcome = (() => {
    if (!quiz || !quiz.outcomes || quiz.outcomes.length === 0) return null;
    let total = 0;
    Object.entries(s4Answers).forEach(([qi, oi]) => {
      const q = quiz.questions[Number(qi)];
      const opt = q?.options?.[Number(oi)];
      if (opt?.score !== undefined) total += Number(opt.score);
    });
    const matched = quiz.outcomes.find((o) => {
      if (o.minScore === undefined || o.maxScore === undefined) return false;
      return total >= o.minScore && total <= o.maxScore;
    });
    return matched || quiz.outcomes[0];
  })();

  /* ======================== Derived values =========================== */
  const domain = (url || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || 'your site';
  const siteLetter = (brand?.site_name || domain || 'B').charAt(0).toUpperCase();

  // Safe CTA URL: validates the outcome's ctaUrl against the real pages scraped
  // from the site. If it's a hallucinated/off-site/empty URL, fall back to the
  // best text-matching real page, then to the site root. This guarantees the
  // result CTA always lands somewhere real for the visitor.
  const safeCtaUrl = (() => {
    const navPages: { text: string; url: string }[] = Array.isArray((brand?.business as any)?.nav_pages)
      ? (brand!.business as any).nav_pages
      : [];
    const siteRoot = url ? `https://${domain}` : '#';
    const realUrls = new Set(navPages.map(p => p.url));
    let siteOrigin = '';
    try { if (url) siteOrigin = new URL(`https://${domain}`).origin; } catch {}

    const raw = (s4Outcome?.ctaUrl || '').trim();
    if (raw) {
      if (/^https?:\/\//i.test(raw)) {
        if (siteOrigin && raw.startsWith(siteOrigin) && realUrls.has(raw)) return raw;
      } else if (raw.startsWith('/') && siteOrigin) {
        const abs = siteOrigin + raw;
        if (realUrls.has(abs)) return abs;
      }
    }
    // Fuzzy match by cta text + outcome title against nav page labels
    const needle = `${s4Outcome?.ctaText || ''} ${s4Outcome?.title || ''}`.toLowerCase();
    if (navPages.length && needle.trim()) {
      let best: { url: string; score: number } | null = null;
      for (const p of navPages) {
        const t = (p.text || '').toLowerCase();
        if (!t) continue;
        const words = t.split(/\s+/).filter(w => w.length > 2);
        let score = 0;
        for (const w of words) if (needle.includes(w)) score += w.length;
        if (score > 0 && (!best || score > best.score)) best = { url: p.url, score };
      }
      if (best) return best.url;
    }
    return siteRoot;
  })();

  // Prefer the saved DB slug so the embed snippet matches what's actually
  // live. Only fall back to a title-derived slug for the pre-save preview
  // state. Without this, the copied snippet points at a slug that doesn't
  // resolve on the backend whenever the DB slug differs from the title
  // (collision suffixes, user-edited slugs, AI-generated titles, etc.).
  const derivedFromTitle = (quiz?.title || 'your-quiz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'your-quiz';
  const quizSlug = (quiz as any)?.slug || derivedFromTitle;
  const publicQuizUrlValue = publicQuizUrl(quizSlug);
  const embedSnippetValue = embedSnippet(quizSlug).replace(' data-quiz=', '\n  data-quiz=');

  // Stage 4 visitor-site brand: build CSS custom properties from the scraped brand.
  // These inject into the mock visitor site inside the device frame.
  //
  // Defensive sanitisation: the scraper *should* return concrete colors, but if it
  // ever returns a broken value (empty string, an unresolved `var(--foo)` reference,
  // a pure-greyscale "primary" like #000 on a white bg, or just nonsense) we fall
  // back to a safe default so the visitor-preview CTA is always visible.
  const isUsableColor = (v: unknown): v is string => {
    if (typeof v !== 'string' || v.length < 3) return false;
    if (v.includes('var(')) return false;
    return /^#[0-9a-f]{3,8}$|^rgba?\(|^hsla?\(/i.test(v.trim());
  };
  const safeColor = (v: unknown, fallback: string): string =>
    isUsableColor(v) ? (v as string) : fallback;

  const brandBg = safeColor(brand?.colors?.background, '#ffffff');
  const brandSurface = brandBg;
  const brandText = safeColor(brand?.colors?.text, '#1a1a1a');
  // Primary: prefer scraped primary, then scraped accent, then a safe dark default.
  const rawPrimary = isUsableColor(brand?.colors?.primary) ? brand!.colors!.primary : null;
  const rawAccent = isUsableColor(brand?.colors?.accent) ? brand!.colors!.accent : null;
  const brandPrimary = rawPrimary || rawAccent || '#111111';
  const brandBorder = 'rgba(0,0,0,0.10)';
  const brandFont = brand?.font_family && brand.font_family !== 'sans-serif'
    ? `'${brand.font_family}', system-ui, sans-serif`
    : "'Inter', system-ui, sans-serif";
  const brandName = brand?.site_name || domain.replace(/\.[^.]+$/, '').replace(/^\w/, c => c.toUpperCase());
  // Real navigation links scraped from the website (falls back to generic)
  const navLinks: string[] = (brand?.business as any)?.nav_links?.length > 0
    ? (brand.business as any).nav_links.slice(0, 4)
    : ['Shop', 'About', 'Journal', 'Contact'];
  const brandFontLabel = brand?.font_family && brand.font_family !== 'sans-serif'
    ? brand.font_family
    : 'Default sans-serif';
  // Build a low-alpha tint of the primary for backgrounds/hovers.
  // Works for hex (#rrggbb), rgb(...), and hsl(...) inputs.
  const dimPrimary = (c: string): string => {
    const s = c.trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s + '1a'; // 10% alpha via hex
    const rgbM = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgbM) return `rgba(${rgbM[1]}, ${rgbM[2]}, ${rgbM[3]}, 0.1)`;
    const hslM = s.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+%)\s*,\s*([\d.]+%)/i);
    if (hslM) return `hsla(${hslM[1]}, ${hslM[2]}, ${hslM[3]}, 0.1)`;
    return 'rgba(0,0,0,0.06)';
  };

  // ── Senior-grade color system ───────────────────────────────────────────
  // Parses any CSS color input into normalized RGB so we can do real WCAG
  // contrast math instead of hand-waving. Handles #rgb, #rrggbb, rgb(), rgba()
  // and returns null for values we can't reason about.
  const parseColor = (c: string): { r: number; g: number; b: number } | null => {
    if (!c) return null;
    const s = c.trim();
    if (/^#[0-9a-f]{3}$/i.test(s)) {
      const h = s.slice(1);
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
    }
    if (/^#[0-9a-f]{6}$/i.test(s)) {
      return { r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16) };
    }
    const rgb = s.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
    return null;
  };
  // WCAG relative luminance (0..1). Darker color = lower number.
  const relLum = (c: string): number => {
    const rgb = parseColor(c);
    if (!rgb) return 0.5;
    const chan = (v: number) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * chan(rgb.r) + 0.7152 * chan(rgb.g) + 0.0722 * chan(rgb.b);
  };
  // WCAG contrast ratio between two colors (1..21).
  const contrast = (a: string, b: string): number => {
    const la = relLum(a);
    const lb = relLum(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  };
  // Mix two hex/rgb colors by ratio (0..1). Returns #rrggbb.
  const mix = (a: string, b: string, t: number): string => {
    const ca = parseColor(a) || { r: 0, g: 0, b: 0 };
    const cb = parseColor(b) || { r: 255, g: 255, b: 255 };
    const m = (x: number, y: number) => Math.round(x + (y - x) * t);
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return '#' + hex(m(ca.r, cb.r)) + hex(m(ca.g, cb.g)) + hex(m(ca.b, cb.b));
  };

  const bgIsDark = relLum(brandBg) < 0.5;
  const primaryIsDark = relLum(brandPrimary) < 0.5;
  // Button text: pick white or black for best contrast against the primary.
  const btnTextColor = primaryIsDark ? '#ffffff' : '#0a0a0a';

  // ── Surface tint ────────────────────────────────────────────────────────
  // The card is never the same color as the page (Stripe/Linear/Notion
  // pattern). On light pages the card is pure white, on dark pages it's
  // slightly lighter than the bg so it reads as an elevated surface.
  const cardBg = bgIsDark ? mix(brandBg, '#ffffff', 0.06) : '#ffffff';
  // Softer hairline border (WCAG-agnostic; visual only)
  const hairlineBorder = bgIsDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  // Subtle dual-layer ambient shadow - tight + diffuse, low alpha, no "chunk".
  // On dark surfaces the shadow is effectively invisible; the border + tint
  // do the lifting instead.
  const cardShadow = bgIsDark
    ? '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)'
    : '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)';

  // ── Typography contrast safeguards ──────────────────────────────────────
  // Seniors don't trust scraped text colors for headings. Compute a high-
  // contrast heading color against the PAGE bg and against the CARD bg; if
  // the scraped value doesn't clear WCAG AA (4.5:1) for normal text, fall
  // back to near-black or near-white.
  const aaAgainst = (target: string, scraped: string): string => {
    if (contrast(scraped, target) >= 4.5) return scraped;
    return relLum(target) > 0.5 ? '#0a0a0a' : '#ffffff';
  };
  const headingOnBg = bgIsDark ? '#ffffff' : '#0a0a0a';
  const bodyOnBg = aaAgainst(brandBg, brandText);
  const headingOnCard = bgIsDark ? '#ffffff' : '#0a0a0a';
  const bodyOnCard = aaAgainst(cardBg, brandText);
  // Secondary / muted text - 60% of the body color, keeping contrast >= 3:1.
  const mutedOnCard = bgIsDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.56)';

  const s4VisitorVars: React.CSSProperties = {
    ['--site-bg' as any]: brandBg,
    ['--site-surface' as any]: cardBg,
    ['--site-text' as any]: bodyOnBg,
    ['--site-heading' as any]: headingOnBg,
    ['--site-border' as any]: hairlineBorder,
    ['--site-primary' as any]: brandPrimary,
    ['--site-primary-dim' as any]: dimPrimary(brandPrimary),
    ['--site-btn-text' as any]: btnTextColor,
    ['--site-heading-font' as any]: brandFont,
    ['--site-body-font' as any]: brandFont,
    ['--site-radius' as any]: '16px',
    ['--site-card-bg' as any]: cardBg,
    ['--site-card-border' as any]: hairlineBorder,
    ['--site-card-shadow' as any]: cardShadow,
    ['--site-card-heading' as any]: headingOnCard,
    ['--site-card-text' as any]: bodyOnCard,
    ['--site-muted' as any]: mutedOnCard,
    // Option row uses an even subtler inset surface on the card
    ['--site-option-bg' as any]: bgIsDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
    ['--site-option-border' as any]: hairlineBorder,
    ['--site-share-bg' as any]: bgIsDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    ['--site-share-border' as any]: hairlineBorder,
  };

  const copyText = async (text: string, kind: 'copied-link' | 'copied-embed') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(kind);
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {}
  };

  const currentQ = quiz && selectedIdx >= 0 ? quiz.questions[selectedIdx] : null;

  /* ======================== Sign in -> claim flow ====================== */
  // Sign-up must happen on app.squarespell.com so Clerk session cookies land on
  // the right origin. If we push a relative /sign-up from quiz.squarespell.com
  // Clerk will set the session cookie on quiz.* and the dashboard (on app.*)
  // won't see it - user ends up stuck on quiz.*/dashboard with no sidebar.
  const goSignUp = () => {
    const claim = claimToken || (typeof window !== 'undefined' ? sessionStorage.getItem('sq_claim_token') || '' : '');
    const params = new URLSearchParams({ from: 'try', url });
    if (claim) params.set('claim', claim);
    if (typeof window !== 'undefined') {
      window.location.href = `${APP_URL}/sign-up?${params.toString()}`;
    } else {
      router.push(`/sign-up?${params.toString()}`);
    }
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const totalQs = quiz?.questions.length || 0;
  const s4Total = totalQs || 1;
  const s4Pct = Math.round(((s4Idx + 1) / s4Total) * 100);

  /* ===================================================================== */
  /* RENDER                                                                */
  /* ===================================================================== */
  return (
    <div className="flow-root">
      <style dangerouslySetInnerHTML={{ __html: FLOW_CSS }} />

      {/* ============ STAGE 1: EMBEDDABLE HOOK WIDGET (per prototype-v4) ============
          NO hero, NO nav, NO "Turn visitors into leads" headline.
          Just the URL input - same component that gets embedded on squarespell.com
          via /embed/squarespell-hook.js. */}
      <div className={`stage${stage === 1 ? ' active' : ''}`} id="stage-1">
        <div className="hook">
          <div className="embed-label"><span className="dot" />Embeddable hook widget</div>

          <div className="hook-widget">
            <form
              className="url-field"
              onSubmit={(e) => {
                e.preventDefault();
                goAnalyze(url);
              }}
            >
              <span className="url-prefix">https://</span>
              <input
                id="site-url"
                type="text"
                placeholder="yoursite.com"
                value={url.replace(/^https?:\/\//i, '')}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !url}>
                {loading ? 'Analyzing…' : 'Generate'}
              </button>
            </form>
          </div>

          {loading && slowHint && !errorMsg && (
            <div className="hook-hint">
              <span className="hook-hint-spinner" />
              Waking up the server - this can take up to 30 seconds on first load.
            </div>
          )}

          {errorMsg && (
            <div className="hook-err show">
              <div>{errorMsg}</div>
              <button
                type="button"
                className="hook-err-retry"
                onClick={() => { setErrorMsg(''); goAnalyze(url); }}
              >
                Try again
              </button>
            </div>
          )}

          <div className="hook-embed-hint">
            Drops into squarespell.com as{' '}
            <code>&lt;script src=&quot;/embed/squarespell-hook.js&quot;&gt;&lt;/script&gt;</code>
          </div>
        </div>
      </div>

      {/* ============ STAGE 2: GOAL SELECTION (OPTION C) ============ */}
      <div className={`stage${stage === 2 ? ' active' : ''}`} id="stage-2">
        <div className="topbar">
          <div className="brand"><div className="brand-dot" /> squarespell</div>
          <div className="top-right">
            <button className="btn btn-ghost" onClick={() => setStage(1)}>Start over</button>
          </div>
        </div>

        <div className="s2-wrap">
          {/* Loading skeleton state */}
          {(loading || !sessionToken) && (
            <div className="s2-skeleton">
              <div className="analysis-status">
                <div className="analysis-spinner"></div>
                <div className="analysis-text">Reading your website...</div>
                <div className="analysis-detail">Extracting brand, copy, and offers</div>
              </div>

              <div className="skel-header">
                <div className="skel-badge shimmer"></div>
                <div className="skel-title shimmer"></div>
                <div className="skel-title-2 shimmer"></div>
                <div className="skel-sub shimmer"></div>
                <div className="skel-sub-2 shimmer"></div>
              </div>

              <div className="skel-brand shimmer">
                <div className="skel-brand-icon"></div>
                <div className="skel-brand-lines">
                  <div className="skel-brand-line1"></div>
                  <div className="skel-brand-line2"></div>
                </div>
              </div>

              <div className="skel-analysis">
                <div className="skel-analysis-header">
                  <div className="skel-analysis-icon shimmer"></div>
                  <div className="skel-analysis-title shimmer"></div>
                </div>
                <div className="skel-tags">
                  <div className="skel-tag skel-tag-1 shimmer"></div>
                  <div className="skel-tag skel-tag-2 shimmer"></div>
                  <div className="skel-tag skel-tag-3 shimmer"></div>
                  <div className="skel-tag skel-tag-4 shimmer"></div>
                </div>
              </div>

              <div className="skel-goal-label shimmer"></div>
              <div className="skel-goal-title shimmer"></div>
              <div className="skel-goals">
                <div className="skel-goal shimmer"></div>
                <div className="skel-goal shimmer"></div>
                <div className="skel-goal shimmer"></div>
                <div className="skel-goal shimmer"></div>
              </div>
              <div className="skel-btn shimmer"></div>
            </div>
          )}

          {/* Loaded state */}
          {!loading && sessionToken && (
            <div className="s2-loaded">
              <div className="step-badge">
                <SvgBolt size={14} />
                SITE ANALYZED
              </div>
              <h1 className="step-title">Here's what we found.<br /><span className="step-title-acc">Pick your goal, we do the rest.</span></h1>
              <p className="step-sub">Our AI read your site in seconds. Confirm below, choose one goal, and we generate a full branded quiz.</p>

              {/* Brand card */}
              <div className="brand-card">
                <div className="brand-icon">{siteLetter}</div>
                <div className="brand-info">
                  <div className="brand-label">Brand captured</div>
                  <div className="brand-url">{domain}</div>
                </div>
                <div className="brand-check">
                  <SvgCheck size={16} />
                  Verified
                </div>
              </div>

              {/* AI Detected panel */}
              {brand && brand.business && (
                <div className="ai-panel">
                  <div className="ai-header">
                    <SvgSpark size={18} />
                    <span className="ai-header-text">AI detected from your site</span>
                  </div>
                  <div className="ai-tags">
                    {/* Business Type */}
                    <div className="ai-tag">
                      <div className="ai-tag-content">
                        <span className="ai-tag-label">Business type</span>
                        {editingTag === 'type' ? (
                          <input
                            ref={editInputRef}
                            className="ai-tag-input"
                            value={editValues['type'] || ''}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, type: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEditTag('type'); if (e.key === 'Escape') setEditingTag(null); }}
                            onBlur={() => commitEditTag('type')}
                            maxLength={80}
                          />
                        ) : (
                          <span className="ai-tag-value">{brand.business?.type || 'Unknown'}</span>
                        )}
                      </div>
                      {editingTag !== 'type' && (
                        <button type="button" className="ai-tag-edit" onClick={(e) => { e.stopPropagation(); startEditTag('type', brand.business?.type || ''); }}>edit</button>
                      )}
                    </div>
                    {/* Audience */}
                    <div className="ai-tag">
                      <div className="ai-tag-content">
                        <span className="ai-tag-label">Audience</span>
                        {editingTag === 'audience' ? (
                          <input
                            ref={editingTag === 'audience' ? editInputRef : undefined}
                            className="ai-tag-input"
                            value={editValues['audience'] || ''}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, audience: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEditTag('audience'); if (e.key === 'Escape') setEditingTag(null); }}
                            onBlur={() => commitEditTag('audience')}
                            maxLength={80}
                          />
                        ) : (
                          <span className="ai-tag-value">{brand.business?.audience || 'Unknown'}</span>
                        )}
                      </div>
                      {editingTag !== 'audience' && (
                        <button type="button" className="ai-tag-edit" onClick={(e) => { e.stopPropagation(); startEditTag('audience', brand.business?.audience || ''); }}>edit</button>
                      )}
                    </div>
                    {/* Tone */}
                    <div className="ai-tag">
                      <div className="ai-tag-content">
                        <span className="ai-tag-label">Tone</span>
                        {editingTag === 'tone' ? (
                          <input
                            ref={editingTag === 'tone' ? editInputRef : undefined}
                            className="ai-tag-input"
                            value={editValues['tone'] || ''}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, tone: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEditTag('tone'); if (e.key === 'Escape') setEditingTag(null); }}
                            onBlur={() => commitEditTag('tone')}
                            maxLength={80}
                          />
                        ) : (
                          <span className="ai-tag-value">{brand.business?.tone || 'Unknown'}</span>
                        )}
                      </div>
                      {editingTag !== 'tone' && (
                        <button type="button" className="ai-tag-edit" onClick={(e) => { e.stopPropagation(); startEditTag('tone', brand.business?.tone || ''); }}>edit</button>
                      )}
                    </div>
                    {/* Key Offer */}
                    <div className="ai-tag">
                      <div className="ai-tag-content">
                        <span className="ai-tag-label">Key offer</span>
                        {editingTag === 'key_offer' ? (
                          <input
                            ref={editingTag === 'key_offer' ? editInputRef : undefined}
                            className="ai-tag-input"
                            value={editValues['key_offer'] || ''}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, key_offer: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEditTag('key_offer'); if (e.key === 'Escape') setEditingTag(null); }}
                            onBlur={() => commitEditTag('key_offer')}
                            maxLength={80}
                          />
                        ) : (
                          <span className="ai-tag-value">{brand.business?.key_offer || 'Unknown'}</span>
                        )}
                      </div>
                      {editingTag !== 'key_offer' && (
                        <button type="button" className="ai-tag-edit" onClick={(e) => { e.stopPropagation(); startEditTag('key_offer', brand.business?.key_offer || ''); }}>edit</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Goal selection */}
              <div className="goal-intro">One last thing</div>
              <div className="goal-question">What should this quiz do for your business?</div>

              <div className="goal-grid">
                {GOAL_OPTIONS.map((goal) => (
                  <div
                    key={goal.id}
                    className={`goal-card${selectedGoal === goal.id ? ' selected' : ''}`}
                    onClick={() => setSelectedGoal(goal.id)}
                  >
                    <div className="goal-check">
                      <SvgCheck size={12} />
                    </div>
                    <div className={`goal-icon goal-icon-${goal.id.replace(/_/g, '-')}`}>
                      {goal.id === 'capture_leads' && <SvgUsers size={22} />}
                      {goal.id === 'recommend_service' && <SvgPackage size={22} />}
                      {goal.id === 'score_segment' && <SvgBarChart size={22} />}
                      {goal.id === 'grow_email' && <SvgMail size={22} />}
                    </div>
                    <div className="goal-title">{goal.label}</div>
                    <div className="goal-desc">{goal.description}</div>
                  </div>
                ))}
              </div>

              {errorMsg && (
                <div className="s2-analyze-err">
                  <div>{errorMsg}</div>
                  <button
                    type="button"
                    className="hook-err-retry"
                    onClick={() => { setErrorMsg(''); if (brand && sessionToken) buildQuiz(); else goAnalyze(url); }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {buildingQuiz ? (
                <div className="gen-loading">
                  <div className="gen-loading-spinner"></div>
                  <div className="gen-loading-title">Building your quiz</div>
                  <div className="gen-loading-sub">AI is crafting questions tailored to your website...</div>
                  <div className="gen-skeleton-cards">
                    <div className="gen-skel-card"><div className="gen-skel-line w70"></div><div className="gen-skel-line w50"></div></div>
                    <div className="gen-skel-card"><div className="gen-skel-line w60"></div><div className="gen-skel-line w80"></div></div>
                    <div className="gen-skel-card"><div className="gen-skel-line w75"></div><div className="gen-skel-line w45"></div></div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className={`btn-gen${selectedGoal ? ' ready' : ' disabled'}`}
                    disabled={!selectedGoal}
                    onClick={buildQuiz}
                    type="button"
                  >
                    <SvgBolt size={18} />
                    Generate my quiz
                  </button>
                  <div className="btn-hint">Takes about 30 seconds. You can edit everything after.</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============ STAGE 3: EDITOR ============ */}
      <div className={`stage${stage === 3 ? ' active' : ''}`} id="stage-3">
        <div className="s3-top">
          <div className="s3-top-left">
            <button
              className="icon-btn"
              onClick={() => (mode === 'authed' ? router.push('/dashboard') : setStage(2))}
              title="Back"
              type="button"
            >
              <SvgArrowLeft />
            </button>
            <div className="s3-title-wrap">
              {titleEditing ? (
                <input
                  className="s3-title-input"
                  autoFocus
                  value={quiz?.title || ''}
                  onChange={(e) => updateQuizTitle(e.target.value)}
                  onBlur={() => setTitleEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setTitleEditing(false);
                    }
                  }}
                  placeholder="Untitled quiz"
                />
              ) : (
                <button
                  className="s3-title s3-title-button"
                  type="button"
                  onClick={() => setTitleEditing(true)}
                  title="Click to rename"
                >
                  {quiz?.title || 'Your quiz'}
                  <span className="s3-title-edit"><SvgPencil /></span>
                </button>
              )}
              <div className="s3-title-meta">
                <span className="live-pill">LIVE</span>
                <span className="s3-saved" data-status={saveStatus}>
                  {saveStatus === 'saving' ? (
                    <>
                      <span className="s3-save-dot" /> Saving…
                    </>
                  ) : (
                    <>
                      <SvgCheck size={12} /> All changes saved
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="s3-top-right">
            {mode === 'authed' && (
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await copyText(publicQuizUrlValue, 'copied-link');
                  flashToast('Live link copied');
                }}
                type="button"
                title="Copy the public quiz URL"
              >
                <SvgLink /> Copy live link
              </button>
            )}
            <button className="btn btn-dark" onClick={() => { resetS4(); setStage(4); }} type="button">Preview</button>
            <button
              className="btn btn-primary"
              onClick={doPublish}
              disabled={publishingRemote}
              type="button"
            >
              {publishingRemote ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="s3-body">
          <div className="s3-main">
           <div className="s3-main-inner">
            <div className="s3-main-head">
              <h2>Your quiz</h2>
              <div className="s3-count">
                <span>{quiz?.questions.length || 0}</span> questions · {quiz?.outcomes?.length || 0} outcomes
              </div>
            </div>

            <div className="s3-shortcut-hint">
              <kbd>⌘N</kbd> new <span className="dot-sep">·</span> <kbd>⌘D</kbd> duplicate <span className="dot-sep">·</span> <kbd>⌥↑</kbd><kbd>⌥↓</kbd> reorder <span className="dot-sep">·</span> <kbd>Esc</kbd> deselect
            </div>

            <div id="qc-list">
              {quiz?.questions.map((q, i) => {
                const isSel = i === selectedIdx;
                const isFirst = i === 0;
                const isLast = quiz ? i === quiz.questions.length - 1 : true;
                return (
                  <div className="qc-wrapper" key={q.id}>
                    <div className={`qc${isSel ? ' selected' : ''}`} onClick={() => setSelectedIdx(i)}>
                      <div className="qc-head">
                        <div className="qc-num">Q{i + 1}</div>
                        <div className="qc-head-main">
                          {isSel ? (
                            <textarea
                              className="qc-q-edit"
                              value={q.text}
                              onChange={(e) => updateQuestionText(i, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              rows={2}
                              placeholder="Type your question..."
                            />
                          ) : (
                            <div className="qc-q">{q.text || 'Untitled question'}</div>
                          )}
                          <div className="qc-meta">
                            <span className="qc-type-badge">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                              {q.type === 'multiple' ? 'Multi select' : 'Single select'}
                            </span>
                            <span>{q.options.length} options</span>
                          </div>
                        </div>
                        <div className="qc-drag" title="Drag to reorder"><SvgDrag /></div>
                        <div className="qc-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="qc-action-btn" type="button" title="Move up" disabled={isFirst} onClick={(e) => { e.stopPropagation(); moveQuestion(i, -1); }}><SvgChevronUp /></button>
                          <button className="qc-action-btn" type="button" title="Move down" disabled={isLast} onClick={(e) => { e.stopPropagation(); moveQuestion(i, 1); }}><SvgChevronDown /></button>
                          <button className="qc-action-btn" type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateQuestion(i); flashToast('Question duplicated'); }}><SvgCopy /></button>
                          <button className="qc-action-btn qc-action-danger" type="button" title="Delete" disabled={!quiz || quiz.questions.length <= 1} onClick={(e) => { e.stopPropagation(); deleteQuestion(i); flashToast('Question deleted'); }}><SvgTrash /></button>
                        </div>
                      </div>
                      <div className="qc-body">
                        {q.options.map((o, oi) => (
                          <div className="qc-opt-row" key={o.id}>
                            <div className="qc-opt-letter">{LETTERS[oi]}</div>
                            {isSel ? (
                              <input
                                className="qc-opt-edit"
                                value={o.text}
                                onChange={(e) => updateOptionText(i, oi, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Option text..."
                              />
                            ) : (
                              <div className="qc-opt-text">{o.text}</div>
                            )}
                            <span className={`qc-opt-score${(o.score || 0) >= 3 ? ' high' : (o.score || 0) === 0 ? ' zero' : ''}`}>
                              +{o.score || 0}pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="add-q-btn" onClick={addQuestion} type="button">
              <SvgPlus />
              Add new question
            </button>
           </div>
          </div>

          <div className="s3-side">
            <div id="side-content">
              {currentQ ? (
                <>
                  <div className="s3-side-head">
                    <div className="s3-side-label">EDITING QUESTION {selectedIdx + 1}</div>
                    <button className="s3-side-close" title="Deselect" onClick={deselect} type="button"><SvgClose /></button>
                  </div>

                  <div className="edit-group">
                    <div className="edit-group-label">Question</div>
                    <textarea
                      className="field-textarea"
                      value={currentQ.text}
                      onChange={(e) => updateQuestionText(selectedIdx, e.target.value)}
                    />
                  </div>

                  <div className="edit-group">
                    <div className="edit-group-label">
                      <span>Answers</span>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{currentQ.options.length} / 6</span>
                    </div>
                    {currentQ.options.map((o, oi) => {
                      const isFirstAns = oi === 0;
                      const isLastAns = oi === currentQ.options.length - 1;
                      const currentBranchRule = (currentQ.next_question_rules || []).find((r: any) => r.if_answer === o.id);
                      const currentGoto = currentBranchRule?.goto;
                      return (
                        <div className="answer-block" key={o.id + oi}>
                          <div className="answer-row">
                            <div className="answer-letter">{LETTERS[oi]}</div>
                            <input
                              className="answer-input"
                              value={o.text}
                              onChange={(e) => updateOptionText(selectedIdx, oi, e.target.value)}
                              placeholder="Answer text"
                            />
                            <div className="answer-reorder">
                              <button
                                className="answer-reorder-btn"
                                type="button"
                                disabled={isFirstAns}
                                title="Move up"
                                onClick={() => moveOption(selectedIdx, oi, -1)}
                              >
                                <SvgChevronUp />
                              </button>
                              <button
                                className="answer-reorder-btn"
                                type="button"
                                disabled={isLastAns}
                                title="Move down"
                                onClick={() => moveOption(selectedIdx, oi, 1)}
                              >
                                <SvgChevronDown />
                              </button>
                            </div>
                            <button
                              className="answer-del"
                              onClick={() => deleteOption(selectedIdx, oi)}
                              title={currentQ.options.length <= 2 ? 'Questions need at least 2 answers' : 'Remove answer'}
                              type="button"
                              disabled={currentQ.options.length <= 2}
                            >
                              <SvgTrash />
                            </button>
                          </div>
                          <div className="answer-branch-row">
                            <select
                              className="answer-branch-select"
                              value={currentGoto || ''}
                              onChange={(e) => updateBranchingRule(selectedIdx, oi, e.target.value || null)}
                              title="Choose next question (branching)"
                            >
                              <option value="">&rarr; Next in order</option>
                              {quiz?.questions.map((q: any, qi: number) => {
                                if (qi === selectedIdx) return null;
                                return <option key={q.id} value={q.id}>&rarr; Jump to Q{qi + 1}: {q.text.slice(0, 25)}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="add-answer-btn"
                      onClick={() => addOption(selectedIdx)}
                      type="button"
                      disabled={currentQ.options.length >= 6}
                    >
                      <SvgPlus /> {currentQ.options.length >= 6 ? 'Max 6 answers' : 'Add answer'}
                    </button>
                  </div>

                  <div className="divider" />

                  <div className="edit-group">
                    <div className="edit-group-label">Quiz overview</div>
                    <div className="stat-row"><span className="stat-label">Total questions</span><span className="stat-value">{quiz?.questions.length || 0}</span></div>
                    <div className="stat-row"><span className="stat-label">Outcomes</span><span className="stat-value">{quiz?.outcomes?.length || 0}</span></div>
                    <div className="stat-row"><span className="stat-label">Email gate</span><span className="stat-value">On</span></div>
                    <div className="stat-row"><span className="stat-label">Brand match</span><span className="stat-value">Auto</span></div>
                  </div>

                  <div className="divider" />

                  <div className="s3-side-actions">
                    <button
                      className="side-btn"
                      onClick={() => { duplicateQuestion(selectedIdx); flashToast('Question duplicated'); }}
                      type="button"
                    >
                      <SvgCopy /> Duplicate question
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => { deleteQuestion(selectedIdx); flashToast('Question deleted'); }}
                      type="button"
                      disabled={!quiz || quiz.questions.length <= 1}
                    >
                      <SvgTrash /> Delete this question
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="s3-side-head">
                    <div className="s3-side-label">QUIZ SETTINGS</div>
                  </div>

                  <div className="edit-group">
                    <div className="edit-group-label">Overview</div>
                    <div className="stat-row"><span className="stat-label">Total questions</span><span className="stat-value">{quiz?.questions.length || 0}</span></div>
                    <div className="stat-row"><span className="stat-label">Outcomes</span><span className="stat-value">{quiz?.outcomes?.length || 0}</span></div>
                    <div className="stat-row"><span className="stat-label">Email gate</span><span className="stat-value">On</span></div>
                    <div className="stat-row"><span className="stat-label">Brand match</span><span className="stat-value">Auto</span></div>
                  </div>

                  <div className="divider" />

                  {/* Brand colors preview */}
                  {brand?.colors && (
                    <div className="edit-group">
                      <div className="edit-group-label">Brand Colors (auto-detected)</div>
                      <div className="brand-preview">
                        <div className="brand-preview-bar" style={{ background: brand.colors.primary || '#0D7377' }}>
                          <span className="brand-preview-text" style={{ color: brand.colors.background || '#F7F7F5' }}>{brand?.site_name || 'Your Site'}</span>
                        </div>
                        <div className="brand-preview-body" style={{ background: brand.colors.background || '#F7F7F5' }}>
                          <div className="brand-preview-q" style={{ color: brand.colors.text || '#1A1A1A' }}>Sample question here?</div>
                          <div className="brand-preview-opt" style={{ borderColor: brand.colors.primary || '#0D7377', color: brand.colors.text || '#1A1A1A' }}>Option A</div>
                          <div className="brand-preview-opt" style={{ borderColor: brand.colors.primary || '#0D7377', color: brand.colors.text || '#1A1A1A' }}>Option B</div>
                          <div className="brand-preview-btn" style={{ background: brand.colors.primary || '#0D7377', color: brand.colors.background || '#FFFFFF' }}>Next</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="divider" />

                  <div className="edit-group">
                    <div className="edit-group-label">Branding</div>
                    {(() => {
                      const canRemove = ['pro', 'agency'].includes(plan);
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                          <input
                            type="checkbox"
                            id="show-branding-toggle"
                            checked={quiz?.settings?.show_branding !== false}
                            disabled={!canRemove}
                            onChange={(e) => {
                              if (!canRemove) return;
                              const newSettings = { ...quiz?.settings, show_branding: e.target.checked };
                              updateQuiz({ ...quiz, settings: newSettings } as Quiz);
                              flashToast(e.target.checked ? 'Branding enabled' : 'Branding hidden');
                            }}
                            style={{ marginTop: 3, cursor: canRemove ? 'pointer' : 'not-allowed', accentColor: 'var(--accent)', opacity: canRemove ? 1 : 0.4 }}
                          />
                          <label htmlFor="show-branding-toggle" style={{ cursor: canRemove ? 'pointer' : 'default', fontSize: 13, userSelect: 'none' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Show Squarespell branding</div>
                            <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.4 }}>
                              Display &quot;Powered by Squarespell&quot; badge at bottom of quiz
                            </div>
                            {!canRemove && (
                              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6, fontWeight: 600, opacity: 0.9 }}>
                                &#x1F512; Upgrade to Pro to remove branding
                              </div>
                            )}
                          </label>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="divider" />

                  {/* Email integration hint */}
                  <div className="edit-group">
                    <div className="edit-group-label">Integrations</div>
                    <div className="integration-hint">
                      <SvgMail size={18} />
                      <div className="integration-hint-body">
                        <div className="integration-hint-title">Email auto-segmentation</div>
                        <div className="integration-hint-desc">Connect Klaviyo or Mailchimp to auto-tag leads by quiz result</div>
                      </div>
                      <span className="integration-badge">Soon</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {editorToast && (
          <div className="editor-toast" role="status" aria-live="polite">
            <SvgCheck size={14} /> {editorToast}
          </div>
        )}
      </div>

      {/* ============ STAGE 4: VISITOR PREVIEW (REBUILT per prototype-v4) ============
          Real quiz rendered inside a mock of the visitor's own Squarespace site,
          with a device switcher and auto-detected brand colors/fonts. */}
      <div className={`stage${stage === 4 ? ' active' : ''}`} id="stage-4">
        <div className="s4-top-wrap">
          <div className="s4-top">
            <div className="s4-top-left">
              <button className="icon-btn" onClick={() => setStage(3)} title="Back to editor" type="button">
                <SvgArrowLeft />
              </button>
              <div className="s4-top-center">
                <div className="s4-note-dot" />
                This is how your visitors will see the quiz
              </div>
            </div>
            <div className="s4-top-right">
              <div className="s4-device-switch">
                <button
                  className={`s4-device-btn${s4Device === 'desktop' ? ' active' : ''}`}
                  onClick={() => setS4Device('desktop')}
                  title="Desktop"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </button>
                <button
                  className={`s4-device-btn${s4Device === 'tablet' ? ' active' : ''}`}
                  onClick={() => setS4Device('tablet')}
                  title="Tablet"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </button>
                <button
                  className={`s4-device-btn${s4Device === 'mobile' ? ' active' : ''}`}
                  onClick={() => setS4Device('mobile')}
                  title="Mobile"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </button>
              </div>
              <button className="btn btn-ghost s4-exit" onClick={() => setStage(3)} type="button">Exit preview</button>
              <button
                className="btn btn-primary s4-publish"
                onClick={doPublish}
                disabled={publishingRemote}
                type="button"
              >
                {publishingRemote ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>

        <div className="s4-canvas">
          <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="s4-brand-badge">
              <strong>✓ Detected</strong> from
              <span className="bb-chip">
                <span className="bb-swatch" style={{ background: brandPrimary }} />
                <span>{domain}</span>
              </span>
              <span>{brandFontLabel}</span>
            </div>

            <div className={`s4-frame ${s4Device}`}>
              <div className="s4-frame-inner">
              <div className="s4-chrome">
                <div className="s4-dots"><span /><span /><span /></div>
                <div className="s4-addr">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="s4-addr-host">{domain}/quiz</span>
                </div>
                <div className="s4-chrome-right"><span /><span /><span /></div>
              </div>

              <div className="s4-site" style={s4VisitorVars}>
                {/* Clean mockup: actual scraped brand background color + real header, no screenshot. */}
                <div className="s4-site-nav">
                  <div className="s4-site-logo">
                    <div className="s4-site-logo-mark">{siteLetter}</div>
                    <span>{brandName}</span>
                  </div>
                  <div className="s4-site-links">
                    {navLinks.map((link, li) => <span key={li}>{link}</span>)}
                  </div>
                </div>

                <div className="s4-site-body">
                  <div className="s4-site-eyebrow">Free quiz</div>
                  <div className="s4-site-title">{quiz?.title || 'Find your perfect match'}</div>
                  <div className="s4-site-sub">{quiz?.description || 'Answer a few questions and get a personalized recommendation.'}</div>

                  <div className="s4-quiz">
                    {!s4ShowResult && !s4LeadGate ? (
                      <>
                        <div className="s4-quiz-prog">
                          <span>Question {s4Idx + 1} of {totalQs || 10}</span>
                          <span>{s4Pct}%</span>
                        </div>
                        <div className="s4-quiz-bar"><div className="s4-quiz-fill" style={{ width: `${s4Pct}%` }} /></div>
                        <div className="s4-quiz-qlabel">Question {String(s4Idx + 1).padStart(2, '0')}</div>
                        <div className="s4-quiz-q">{quiz?.questions[s4Idx]?.text || 'Loading...'}</div>
                        <div className="s4-quiz-opts">
                          {quiz?.questions[s4Idx]?.options.map((o, oi) => (
                            <button
                              key={o.id + oi}
                              className={`s4-quiz-opt${s4Answers[s4Idx] === oi ? ' picked' : ''}`}
                              onClick={() => s4Pick(oi)}
                              type="button"
                            >
                              <div className="s4-quiz-opt-letter">{LETTERS[oi]}</div>
                              <div>{o.text}</div>
                            </button>
                          ))}
                        </div>
                        {s4Idx > 0 && (
                          <span className="s4-quiz-back" onClick={s4Back}>{'\u2190'} Previous question</span>
                        )}
                      </>
                    ) : s4LeadGate ? (
                      <div className="s4-lead-gate">
                        <div className="s4-lead-gate-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M22 7l-10 7L2 7" />
                          </svg>
                        </div>
                        <div className="s4-lead-gate-title">Your personalized recommendation is ready!</div>
                        <div className="s4-lead-gate-sub">Enter your email to unlock your custom {brandName} recommendation and get exclusive tips.</div>
                        <input
                          className="s4-lead-gate-input"
                          type="email"
                          placeholder="you@example.com"
                          value={s4Email}
                          onChange={(e) => setS4Email(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && s4Email.includes('@')) s4SubmitLead(); }}
                        />
                        <button
                          className="s4-lead-gate-btn"
                          onClick={s4SubmitLead}
                          type="button"
                          disabled={!s4Email.includes('@')}
                        >
                          See my recommendation
                        </button>
                        <div className="s4-lead-gate-skip" onClick={s4SubmitLead}>Skip for now</div>
                        <div className="s4-lead-gate-privacy">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          {' '}We respect your privacy. Unsubscribe anytime.
                        </div>
                      </div>
                    ) : (
                      <div className="s4-quiz-result">
                        <div className="s4-quiz-result-badge">{'\u2728'} Your personalized result</div>
                        <div className="s4-quiz-result-title">{s4Outcome?.title || 'Your result'}</div>
                        <div className="s4-quiz-result-desc">{s4Outcome?.description || ''}</div>
                        <a
                          className="s4-quiz-result-cta"
                          href={safeCtaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { if (!safeCtaUrl || safeCtaUrl === '#') e.preventDefault(); }}
                        >
                          {s4Outcome?.ctaText || 'Get my personalized plan'} {'\u2192'}
                        </a>
                        <div className="s4-quiz-result-share">
                          <span className="s4-share-label">Share your result:</span>
                          <button className="s4-share-btn" type="button" title="Share on X" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I got "${s4Outcome?.title}" on the ${brandName} quiz!`)}&url=${encodeURIComponent(`https://${domain}`)}`, '_blank')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </button>
                          <button className="s4-share-btn" type="button" title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${domain}`)}`, '_blank')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </button>
                          <button className="s4-share-btn" type="button" title="Copy link" onClick={() => { navigator.clipboard?.writeText(`https://${domain}/quiz`); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          </button>
                        </div>
                        <div style={{ marginTop: 14 }}>
                          <span className="s4-quiz-result-restart" onClick={resetS4}>{'\u21A9'} Take the quiz again</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STAGE 5: SIGN IN ============ */}
      <div className={`stage${stage === 5 ? ' active' : ''}`} id="stage-5">
        <div className="s5">
          <div className="s5-card">
            <div className="s5-brand"><div className="brand-dot" /> squarespell</div>

            <div className="s5-banner">
              <SvgCheck size={16} />
              Your quiz is saved. Sign in to publish it.
            </div>

            <div className="s5-title">Sign in to publish</div>
            <div className="s5-sub">One more step, then your quiz goes live.</div>

            <div className="s5-social">
              <button className="s5-social-btn" onClick={goSignUp} type="button">
                <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.78-.07-1.53-.2-2.25H12v4.26h5.9a5.04 5.04 0 0 1-2.18 3.3v2.75h3.53c2.06-1.9 3.25-4.7 3.25-8.06z"/><path fill="#34A853" d="M12 23c2.94 0 5.4-.97 7.2-2.64l-3.53-2.74c-.98.65-2.23 1.04-3.67 1.04-2.82 0-5.2-1.9-6.06-4.46H2.3v2.84A10.97 10.97 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.94 14.2a6.6 6.6 0 0 1 0-4.2V7.16H2.3a11 11 0 0 0 0 9.68l3.64-2.64z"/><path fill="#EA4335" d="M12 5.38c1.6 0 3.03.55 4.15 1.62l3.12-3.12C17.4 2.1 14.93 1 12 1a10.97 10.97 0 0 0-9.7 6.16l3.64 2.84C6.8 7.28 9.18 5.38 12 5.38z"/></svg>
                Continue with Google
              </button>
              <button className="s5-social-btn" onClick={goSignUp} type="button">
                <svg viewBox="0 0 24 24" fill="#ffffff"><path d="M17.6 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1-.1-2-.8-2-3.6zM15.4 6.5c.6-.7 1-1.6.9-2.5-.9.1-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5 1-.1 2-.6 2.5-1.3z"/></svg>
                Continue with Apple
              </button>
            </div>

            <div className="s5-divider">or continue with email</div>

            <div className="s5-field">
              <label>Email</label>
              <input className="s5-input" type="email" placeholder="you@yourcompany.com" />
            </div>
            <div className="s5-field">
              <label>Password</label>
              <input className="s5-input" type="password" placeholder="••••••••••" />
            </div>

            <button className="btn btn-primary btn-block s5-submit" onClick={goSignUp} type="button">
              Sign in and publish
            </button>

            <div className="s5-foot">
              Don&apos;t have an account? <a onClick={goSignUp} style={{ cursor: 'pointer' }}>Create one</a>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STAGE 6: PUBLISH (per prototype-v4) ============
          Public link card with copy + quick actions, embed snippet card,
          and side card with quiz overview + live preview mini.
          In production this stage is reached after sign-up; in the preview
          flow we never actually reach it because sign-up redirects to the
          authed dashboard. We still render it so the component stays a 1:1
          port of prototype-v4 and can be reused from the authed dashboard. */}
      <div className={`stage${stage === 6 ? ' active' : ''}`} id="stage-6">
        <div className="topbar">
          <div className="brand"><div className="brand-dot" /> squarespell</div>
          <div className="top-right">
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>founder@{domain}</span>
            <button className="btn btn-ghost" onClick={() => setStage(3)} type="button">Back to editor</button>
          </div>
        </div>

        <div className="s6-banner">
          <div className="s6-banner-left">
            <div className="s6-banner-dot" />
            <strong>Signed in.</strong>&nbsp;Your quiz is ready to publish.
          </div>
          <button className="btn btn-ghost" onClick={() => { resetS4(); setStage(4); }} type="button">Preview again</button>
        </div>

        <div className="s6-wrap">
          <div className="s6-head">
            <div className="stage-tag">
              <span>STEP 6</span>
              <span className="tag-dot">·</span>
              <span>PUBLISH</span>
            </div>
            <h1>Your quiz is live</h1>
            <p>Share the link, embed it on your site, or add it to a landing page.</p>
          </div>

          <div>
            <div className="s6-card">
              <h3>Public link</h3>
              <div className="s6-url-row">
                <div className="s6-url">{publicQuizUrlValue}</div>
                <button className="s6-copy-btn" onClick={() => copyText(publicQuizUrlValue, 'copied-link')} type="button">
                  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  {copyState === 'copied-link' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="s6-quick-row">
                <button
                  className="s6-quick-btn"
                  onClick={() => { if (typeof window !== 'undefined') window.location.href = `mailto:?subject=${encodeURIComponent(quiz?.title || 'My quiz')}&body=${encodeURIComponent(publicQuizUrlValue)}`; }}
                  type="button"
                >
                  <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                  Share via email
                </button>
                <button
                  className="s6-quick-btn"
                  onClick={() => { if (typeof window !== 'undefined') window.open(publicQuizUrlValue, '_blank', 'noopener'); }}
                  type="button"
                >
                  <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                  Open in new tab
                </button>
              </div>
            </div>

            <div className="s6-card">
              <h3>Embed on your Squarespace site</h3>
              <div className="s6-embed-code">{embedSnippetValue}</div>
              <div className="s6-embed-foot">
                <span>Paste this in a Code block on your Squarespace page.</span>
                <button className="s6-copy-btn" onClick={() => copyText(embedSnippetValue, 'copied-embed')} type="button">
                  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  {copyState === 'copied-embed' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="s6-side-card">
            <h3>{quiz?.title || 'Your quiz'}</h3>
            <div className="s6-side-sub">
              {quiz?.questions.length || 0} questions · {quiz?.outcomes?.length || 0} outcomes
            </div>
            <div className="s6-quiz-preview-card">
              <div className="s6-preview-label">LIVE QUIZ</div>
              <div className="s6-preview-title">{quiz?.questions[0]?.text || 'Your first question'}</div>
              <div className="s6-preview-mini">
                <span /><span /><span /><span /><span />
              </div>
            </div>
            <button className="btn btn-dark btn-block" onClick={() => setStage(3)} style={{ marginBottom: 10 }} type="button">Edit quiz</button>
            <button className="btn btn-dark btn-block" onClick={() => { resetS4(); setStage(4); }} type="button">Preview again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
