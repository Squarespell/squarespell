'use client';

/**
 * Authed quiz editor page.
 *
 * Per the prototype-v4 restoration decision (Q3: "post-signup editor reuses
 * Stage 3 pattern"), this page is a thin wrapper around TryFlowInner from
 * /app/try/page.tsx. It fetches the quiz from the API, derives the brand
 * snapshot stored on the quiz record, and mounts TryFlowInner in authed mode
 * starting at Stage 3 (editor).
 *
 * This guarantees the authed editor and the preview editor stay byte-for-byte
 * identical in look and feel — there's exactly one editor implementation.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TryFlowInner } from '@/app/try/TryFlowInner';

interface DbQuiz {
  id: string;
  title?: string;
  description?: string;
  questions?: any[];
  outcomes?: any[];
  settings?: any;
  leadGate?: any;
  branding?: {
    colors?: Record<string, string>;
    font_family?: string;
    site_name?: string;
    favicon_url?: string;
    site_url?: string;
    auto_detected?: boolean;
  };
  source_url?: string;
}

function normalizeQuiz(raw: DbQuiz) {
  return {
    title: raw.title || 'Your quiz',
    description: raw.description || '',
    questions: raw.questions || [],
    outcomes: raw.outcomes || [],
    leadGate: raw.leadGate,
    settings: raw.settings,
  };
}

function brandFromQuiz(raw: DbQuiz) {
  if (!raw.branding) return null;
  return {
    detected: !!raw.branding.auto_detected,
    colors: raw.branding.colors || {},
    font_family: raw.branding.font_family,
    site_name: raw.branding.site_name,
    favicon_url: raw.branding.favicon_url,
  };
}

function EditorInner({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<DbQuiz | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getQuiz(quizId)
      .then((q: DbQuiz) => { if (!cancelled) setQuiz(q); })
      .catch((err: any) => { if (!cancelled) setErrorMsg(err?.message || 'Failed to load quiz'); });
    return () => { cancelled = true; };
  }, [quizId]);

  if (errorMsg) {
    return (
      <div style={{ minHeight: '100vh', background: '#07090c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ color: '#ff6b6b', fontSize: 15 }}>{errorMsg}</div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 18px', background: '#D2FF1D', color: '#07090c', border: 0, borderRadius: 100, fontWeight: 700, cursor: 'pointer' }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ minHeight: '100vh', background: '#07090c', color: '#8891a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14 }}>
        Loading editor…
      </div>
    );
  }

  return (
    <TryFlowInner
      mode="authed"
      authedQuizId={quizId}
      initialQuiz={normalizeQuiz(quiz)}
      initialBrand={brandFromQuiz(quiz)}
      initialUrl={quiz.branding?.site_url || quiz.source_url || ''}
      initialStage={3}
    />
  );
}

export default function QuizEditorPage({ params }: { params: { quizId: string } }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <EditorInner quizId={params.quizId} />
    </Suspense>
  );
}
