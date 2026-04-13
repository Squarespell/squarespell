'use client';

/**
 * NewQuizModal — in-dashboard "+ New quiz" modal (replaces the href that
 * used to bounce authed users out to /tools/quiz-funnel/build).
 *
 * Two paths:
 *   1. Paste a URL → AI generates a quiz (scrape + analyze + build)
 *      Calls POST /api/quizzes/from-url (new authed endpoint; see
 *      backend/src/routes/quiz.ts). Writes directly to Supabase with
 *      the signed-in user's user_id. No claim-token dance.
 *
 *   2. "Start blank" → POST /api/quizzes with defaults. Lands in editor.
 *
 * On success: router.push(`/dashboard/quizzes/${id}/builder`)
 *
 * Self-contained Sheet primitive (does not import from _components/Modals.tsx)
 * so this file is orthogonal to the safety-nets PR and can be reviewed
 * independently. Visual language matches DashboardShell palette.
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { DASHBOARD_COLORS as C } from '../../_components/DashboardShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

/* ------------------------------------------------------------------ */
/* Internal Sheet (kept standalone to decouple from Modals.tsx)        */
/* ------------------------------------------------------------------ */
function Sheet({
  onClose,
  children,
  width = 560,
  labelledBy,
}: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
  labelledBy?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '24px 16px',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.ELEVATED,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 18,
          width: '100%',
          maxWidth: width,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* URL normalization + validation                                      */
/* ------------------------------------------------------------------ */

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject obvious garbage early
  if (/^(javascript|data|file|about):/i.test(trimmed)) return null;
  if (/^(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.)/i.test(trimmed)) return null;

  // Prepend https:// if no scheme
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const u = new URL(candidate);
    // Require a dot in hostname (rejects "foo", "bar")
    if (!u.hostname.includes('.')) return null;
    // Strip trailing slash on path for visual cleanliness
    const cleanPath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return `${u.protocol}//${u.hostname}${cleanPath}${u.search}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Progress stages                                                     */
/* ------------------------------------------------------------------ */

type Stage = 'idle' | 'scraping' | 'analyzing' | 'building' | 'success' | 'error';

const STAGE_LABELS: Record<Exclude<Stage, 'idle' | 'success' | 'error'>, string> = {
  scraping: 'Scraping your site',
  analyzing: 'Analyzing your brand',
  building: 'Building your quiz',
};

function ProgressRow({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const tint = done ? '#22c55e' : active ? C.ACCENT : C.MUTED;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          border: `2px solid ${tint}`,
          background: done ? tint : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 5l2.5 2.5L9 2" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {active && !done && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: tint,
              animation: 'squarespell-pulse 1.2s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <span style={{ color: done || active ? C.TEXT : C.MUTED, fontSize: 14 }}>{label}</span>
      <style jsx>{`
        @keyframes squarespell-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function NewQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [creatingBlank, setCreatingBlank] = useState(false);

  // Autofocus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // reset state on close
      setUrl('');
      setStage('idle');
      setError(null);
      setCreatingBlank(false);
    }
  }, [open]);

  if (!open) return null;

  const isGenerating = stage !== 'idle' && stage !== 'error' && stage !== 'success';
  const canSubmit = !isGenerating && !creatingBlank && normalizeUrl(url) !== null;

  async function handleGenerate() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('That doesn\'t look like a valid URL. Try something like "squarespell.com".');
      return;
    }
    setError(null);
    setStage('scraping');

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');

      // Heuristic progress: we can't know exact backend timing, so tick through
      // the stages on a reasonable schedule. Real handshake would use SSE.
      const ticker = setTimeout(() => setStage('analyzing'), 2500);
      const ticker2 = setTimeout(() => setStage('building'), 7000);

      const res = await fetch(`${API}/api/quizzes/from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: normalized }),
      });

      clearTimeout(ticker);
      clearTimeout(ticker2);

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error(
            j.error || 'You\'ve hit your daily generation limit. Try again tomorrow or upgrade your plan.',
          );
        }
        if (res.status === 422 && j.code === 'NOT_SQUARESPACE') {
          throw new Error(
            `That URL (${j.hostname}) doesn't appear to be a Squarespace site. We only generate quizzes for Squarespace-hosted sites right now.`,
          );
        }
        throw new Error(j.error || `Generation failed (${res.status}).`);
      }

      const data = await res.json();
      if (!data.quiz?.id) throw new Error('Generation succeeded but no quiz ID returned.');

      setStage('success');
      // Short delay so the user sees the success state
      setTimeout(() => {
        router.push(`/dashboard/quizzes/${data.quiz.id}/builder`);
      }, 400);
    } catch (e: any) {
      setStage('error');
      setError(e.message || 'Something went wrong. Try again.');
    }
  }

  async function handleStartBlank() {
    setError(null);
    setCreatingBlank(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');

      const res = await fetch(`${API}/api/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Untitled Quiz',
          questions: [],
          outcomes: [],
          branding: {},
          settings: {},
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Couldn't create a blank quiz (${res.status}).`);
      }

      const quiz = await res.json();
      if (!quiz.id) throw new Error('Blank quiz created but no ID returned.');
      router.push(`/dashboard/quizzes/${quiz.id}/builder`);
    } catch (e: any) {
      setCreatingBlank(false);
      setError(e.message || 'Couldn\'t create a blank quiz.');
    }
  }

  return (
    <Sheet onClose={isGenerating ? () => {} : onClose} labelledBy="new-quiz-title">
      <div style={{ padding: '28px 28px 24px' }}>
        <h2
          id="new-quiz-title"
          style={{
            color: C.TEXT,
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          New quiz
        </h2>
        <p style={{ color: C.MUTED, fontSize: 14, margin: '6px 0 0' }}>
          Paste your site URL and we'll generate a personalized quiz, or start from a blank canvas.
        </p>
      </div>

      <div style={{ padding: '0 28px 20px', borderBottom: `1px solid ${C.BORDER}` }}>
        <label
          htmlFor="new-quiz-url"
          style={{ display: 'block', color: C.TEXT, fontSize: 13, fontWeight: 500, marginBottom: 8 }}
        >
          Website URL
        </label>
        <input
          ref={inputRef}
          id="new-quiz-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://your-site.com"
          value={url}
          disabled={isGenerating || creatingBlank}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) handleGenerate();
          }}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${error ? '#ef4444' : C.BORDER}`,
            background: C.SURFACE,
            color: C.TEXT,
            fontSize: 15,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {isGenerating && (
          <div style={{ marginTop: 18, padding: '12px 0' }}>
            <ProgressRow
              active={stage === 'scraping'}
              done={stage === 'analyzing' || stage === 'building' || stage === 'success'}
              label={STAGE_LABELS.scraping}
            />
            <ProgressRow
              active={stage === 'analyzing'}
              done={stage === 'building' || stage === 'success'}
              label={STAGE_LABELS.analyzing}
            />
            <ProgressRow
              active={stage === 'building'}
              done={stage === 'success'}
              label={STAGE_LABELS.building}
            />
          </div>
        )}

        {stage === 'success' && (
          <div style={{ marginTop: 14, color: '#22c55e', fontSize: 13 }}>
            Done — opening the editor…
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canSubmit}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 10,
              border: 'none',
              background: canSubmit ? C.ACCENT : C.BORDER,
              color: canSubmit ? '#0a0a0a' : C.MUTED,
              fontSize: 14,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background 120ms',
              fontFamily: 'inherit',
            }}
          >
            {isGenerating ? 'Generating…' : 'Generate quiz'}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '18px 28px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ color: C.MUTED, fontSize: 13 }}>Prefer to start from scratch?</span>
        <button
          type="button"
          onClick={handleStartBlank}
          disabled={isGenerating || creatingBlank}
          style={{
            padding: '9px 14px',
            borderRadius: 9,
            border: `1px solid ${C.BORDER}`,
            background: 'transparent',
            color: C.TEXT,
            fontSize: 13,
            fontWeight: 500,
            cursor: isGenerating || creatingBlank ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {creatingBlank ? 'Creating…' : 'Start blank'}
        </button>
      </div>
    </Sheet>
  );
}
