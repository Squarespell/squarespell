'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FLOW_CSS from './flow-css';
import { api } from '@/lib/api';
import { publicQuizUrl, embedSnippet, APP_URL } from '@/lib/urls';

type Device = 'desktop' | 'tablet' | 'mobile';
export type TryFlowMode = 'preview' | 'authed';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

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
interface OnboardingQ {
  id: string;
  text: string;
  options: string[];
}

/* ========================================================================= */
/* Stage 2: five static onboarding questions (byte-faithful prototype-v4)    */
/* ========================================================================= */
const STATIC_ONBOARDING: OnboardingQ[] = [
  {
    id: 'business_type',
    text: 'What kind of business do you run?',
    options: ['Wellness or coaching', 'E-commerce or product', 'Service business', 'SaaS or software', 'Agency or studio', 'Something else'],
  },
  {
    id: 'audience',
    text: 'Who are your typical visitors?',
    options: ['Small business owners', 'Consumers', 'Creators and freelancers', 'Enterprise teams'],
  },
  {
    id: 'goal',
    text: 'What is the main goal of this quiz?',
    options: ['Capture qualified leads', 'Recommend the right product', 'Grow my email list', 'Segment by intent'],
  },
  {
    id: 'outcome',
    text: 'What will visitors get at the end?',
    options: ['A personalized recommendation', 'A free resource or download', 'A tailored plan', 'A discount or offer'],
  },
  {
    id: 'tone',
    text: 'What tone best matches your brand?',
    options: ['Warm and friendly', 'Confident and expert', 'Playful and casual', 'Minimal and direct'],
  },
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
}

export function TryFlowInner({
  mode = 'preview',
  authedQuizId,
  initialQuiz,
  initialBrand = null,
  initialUrl = '',
  initialStage,
}: TryFlowInnerProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlParam = mode === 'preview' ? (searchParams.get('url') || '') : '';

  const defaultStage: 1 | 2 | 3 | 4 | 5 | 6 = initialStage ?? (mode === 'authed' ? 3 : 1);
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(defaultStage);

  // Stage 1
  const [url, setUrl] = useState(initialUrl || urlParam);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Brand + session
  const [brand, setBrand] = useState<Brand | null>(initialBrand);
  const [sessionToken, setSessionToken] = useState('');
  const [claimToken, setClaimToken] = useState('');

  // Stage 2 — questions are static (prototype-v4), only answers are stateful
  const onboardingQs = STATIC_ONBOARDING;
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, number>>({});
  const [buildingQuiz, setBuildingQuiz] = useState(false);

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

  const hasAutoStarted = useRef(false);

  /* ======================== STAGE 1 -> STAGE 2 ======================== */
  const goAnalyze = useCallback(async (siteUrl: string) => {
    if (!siteUrl) return;
    setLoading(true);
    setErrorMsg('');
    let normalized = siteUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    try {
      const res = await fetch(`${API}/api/preview-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analyze failed (${res.status})`);
      }
      const data = await res.json();
      setBrand(data.brand);
      setSessionToken(data.session_token);
      setOnboardingAnswers({});
      setUrl(normalized);
      setStage(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
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
  const onboardingCount = Object.keys(onboardingAnswers).length;
  const buildQuiz = useCallback(async () => {
    if (onboardingCount < 5 || !sessionToken) return;
    setBuildingQuiz(true);
    setErrorMsg('');
    try {
      const payload: Record<string, string> = {};
      for (const q of onboardingQs) {
        if (onboardingAnswers[q.id] !== undefined) payload[q.id] = String(onboardingAnswers[q.id]);
      }
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
  }, [onboardingAnswers, onboardingQs, sessionToken, brand, url, onboardingCount]);

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
  const deselect = () => setSelectedIdx(-1);

  /* ======================== STAGE 4 helpers =========================== */
  const resetS4 = () => {
    setS4Idx(0);
    setS4Answers({});
    setS4ShowResult(false);
  };
  const s4Pick = (oi: number) => {
    if (!quiz) return;
    setS4Answers((prev) => ({ ...prev, [s4Idx]: oi }));
    if (s4Idx < quiz.questions.length - 1) {
      setS4Idx(s4Idx + 1);
    } else {
      setS4ShowResult(true);
    }
    // Scroll only the inner visitor preview to top — never the outer editor page.
    if (typeof document !== 'undefined') {
      const chrome = document.querySelector('.s4-chrome') as HTMLElement | null;
      if (chrome) chrome.scrollTop = 0;
    }
  };
  const s4Back = () => {
    if (s4Idx > 0) setS4Idx(s4Idx - 1);
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

  // Slug derived from quiz title — used in Stage 6 public URL and embed snippet
  const quizSlug = (quiz?.title || 'your-quiz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'your-quiz';
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
  const s4VisitorVars: React.CSSProperties = {
    ['--site-bg' as any]: brandBg,
    ['--site-surface' as any]: brandSurface,
    ['--site-text' as any]: brandText,
    ['--site-border' as any]: brandBorder,
    ['--site-primary' as any]: brandPrimary,
    ['--site-primary-dim' as any]: dimPrimary(brandPrimary),
    ['--site-heading-font' as any]: brandFont,
    ['--site-body-font' as any]: brandFont,
    ['--site-radius' as any]: '16px',
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
  // won't see it — user ends up stuck on quiz.*/dashboard with no sidebar.
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
          Just the URL input — same component that gets embedded on squarespell.com
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

          {errorMsg && <div className="hook-err show">{errorMsg}</div>}

          <div className="hook-embed-hint">
            Drops into squarespell.com as{' '}
            <code>&lt;script src=&quot;/embed/squarespell-hook.js&quot;&gt;&lt;/script&gt;</code>
          </div>
        </div>
      </div>

      {/* ============ STAGE 2: FIVE QUESTIONS FOR OWNER ============ */}
      <div className={`stage${stage === 2 ? ' active' : ''}`} id="stage-2">
        <div className="topbar">
          <div className="brand"><div className="brand-dot" /> squarespell</div>
          <div className="top-right">
            <button className="btn btn-ghost" onClick={() => setStage(1)}>Start over</button>
          </div>
        </div>

        <div className="s2-wrap">
          <div className="s2-head">
            <div className="stage-tag">
              <span>STEP 2</span>
              <span className="tag-dot">·</span>
              <span>TELL US ABOUT YOUR BUSINESS</span>
            </div>
            <h1>5 quick questions,<br />then we build your quiz</h1>
            <p>Your answers shape the tone, flow, and outcomes of the 10 question quiz we generate for your visitors.</p>
          </div>

          <div className="s2-site-card">
            <div className="s2-site-icon">{siteLetter}</div>
            <div className="s2-site-info">
              <div className="s2-site-label">Analyzing</div>
              <div className="s2-site-domain">{domain}</div>
            </div>
            <div className="s2-site-check">
              <SvgCheck size={16} />
              Brand captured
            </div>
          </div>

          <div id="s2-list">
            {onboardingQs.map((q, qi) => {
              const answered = onboardingAnswers[q.id] !== undefined;
              return (
                <div className={`s2-question${answered ? ' answered' : ''}`} key={q.id}>
                  <div className="s2-q-head">
                    <div className="s2-q-num">{qi + 1}</div>
                    <div className="s2-q-text">{q.text}</div>
                  </div>
                  <div className="s2-opts">
                    {q.options.map((opt, oi) => {
                      const selected = onboardingAnswers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          className={`s2-opt${selected ? ' selected' : ''}`}
                          onClick={() => setOnboardingAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                          type="button"
                        >
                          <div className="s2-opt-radio" />
                          <div>{opt}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="s2-foot">
            <div className="s2-progress">
              <span>{onboardingCount} of 5 answered</span>
              <div className="s2-progress-bar">
                <div
                  className="s2-progress-fill"
                  style={{ width: `${(onboardingCount / 5) * 100}%` }}
                />
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={onboardingCount < 5 || buildingQuiz}
              onClick={buildQuiz}
              type="button"
            >
              {buildingQuiz ? 'Building your quiz...' : 'Build my quiz'}
              {!buildingQuiz && <SvgArrowRight size={16} />}
            </button>
          </div>
          {errorMsg && <div style={{ marginTop: 12, color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{errorMsg}</div>}
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
              <div className="s3-title">{quiz?.title || 'Your quiz'}</div>
              <div className="s3-title-meta">
                <span className="live-pill">LIVE</span>
                <span className="s3-saved">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : 'All changes saved'}
                </span>
              </div>
            </div>
          </div>
          <div className="s3-top-right">
            <button className="btn btn-dark" onClick={() => { resetS4(); setStage(4); }} type="button">Preview my quiz</button>
            <button
              className="btn btn-primary"
              onClick={() => setStage(mode === 'authed' ? 6 : 5)}
              type="button"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="s3-body">
          <div className="s3-main">
            <div className="s3-main-head">
              <h2>Your quiz</h2>
              <div className="s3-count">
                <span>{quiz?.questions.length || 0}</span> questions · {quiz?.outcomes?.length || 0} outcomes
              </div>
            </div>

            <div id="qc-list">
              {quiz?.questions.map((q, i) => {
                const isSel = i === selectedIdx;
                return (
                  <div key={q.id} className={`qc${isSel ? ' selected' : ''}`} onClick={() => setSelectedIdx(i)}>
                    <div className="qc-head">
                      <div className="qc-num">{i + 1}</div>
                      <div className="qc-head-main">
                        <div className="qc-q">{q.text}</div>
                        <div className="qc-meta">{q.options.length} answers · single select</div>
                      </div>
                      <div className="qc-drag" onClick={(e) => e.stopPropagation()}><SvgDrag /></div>
                    </div>
                    <div className="qc-body">
                      {q.options.map((o, oi) => (
                        <div className="qc-opt-row" key={o.id}>
                          <div className="qc-opt-letter">{LETTERS[oi]}</div>
                          <div className="qc-opt-text">{o.text}</div>
                        </div>
                      ))}
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
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{currentQ.options.length}</span>
                    </div>
                    {currentQ.options.map((o, oi) => (
                      <div className="answer-row" key={o.id + oi}>
                        <div className="answer-letter">{LETTERS[oi]}</div>
                        <input
                          className="answer-input"
                          value={o.text}
                          onChange={(e) => updateOptionText(selectedIdx, oi, e.target.value)}
                        />
                        <button className="answer-del" onClick={() => deleteOption(selectedIdx, oi)} title="Remove answer" type="button">
                          <SvgTrash />
                        </button>
                      </div>
                    ))}
                    <button className="add-answer-btn" onClick={() => addOption(selectedIdx)} type="button">
                      <SvgPlus /> Add answer
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

                  <button className="danger-btn" onClick={() => deleteQuestion(selectedIdx)} type="button">
                    <SvgTrash /> Delete this question
                  </button>
                </>
              ) : (
                <>
                  <div className="s3-side-head">
                    <div className="s3-side-label">QUIZ OVERVIEW</div>
                  </div>
                  <div className="empty-panel">
                    <h4>No question selected</h4>
                    <p>Click any question on the left to edit it.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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
                onClick={() => setStage(mode === 'authed' ? 6 : 5)}
                type="button"
              >
                Publish
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
                <div className="s4-site-nav">
                  <div className="s4-site-logo">
                    <div className="s4-site-logo-mark">{siteLetter}</div>
                    <span>{brandName}</span>
                  </div>
                  <div className="s4-site-links">
                    <span>Shop</span>
                    <span>About</span>
                    <span>Journal</span>
                    <span>Contact</span>
                  </div>
                </div>

                <div className="s4-site-body">
                  <div className="s4-site-eyebrow">Free quiz</div>
                  <div className="s4-site-title">{quiz?.title || 'Find your perfect match'}</div>
                  <div className="s4-site-sub">{quiz?.description || 'Answer a few questions and get a personalized recommendation.'}</div>

                  <div className="s4-quiz">
                    {!s4ShowResult ? (
                      <>
                        <div className="s4-quiz-prog">
                          <span>Question {s4Idx + 1} of {totalQs || 10}</span>
                          <span>{s4Pct}%</span>
                        </div>
                        <div className="s4-quiz-bar"><div className="s4-quiz-fill" style={{ width: `${s4Pct}%` }} /></div>
                        <div className="s4-quiz-qlabel">Question {String(s4Idx + 1).padStart(2, '0')}</div>
                        <div className="s4-quiz-q">{quiz?.questions[s4Idx]?.text || 'Loading…'}</div>
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
                          <span className="s4-quiz-back" onClick={s4Back}>← Previous question</span>
                        )}
                      </>
                    ) : (
                      <div className="s4-quiz-result">
                        <div className="s4-quiz-result-badge">Your result</div>
                        <div className="s4-quiz-result-title">{s4Outcome?.title || 'Your result'}</div>
                        <div className="s4-quiz-result-desc">{s4Outcome?.description || ''}</div>
                        <div className="s4-quiz-result-cta">{s4Outcome?.ctaText || 'Get my personalized plan'} →</div>
                        <div style={{ marginTop: 14 }}>
                          <span className="s4-quiz-result-restart" onClick={resetS4}>↺ Take the quiz again</span>
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
