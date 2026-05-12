'use client';

/**
 * /dashboard/[quizId] - quiz editor for a specific quiz.
 *
 * Thin wrapper over QuizEditorView which handles the fetch + DashboardShell
 * mounting. Both this route (quiz cards → editor) and /dashboard/editor
 * (sidebar nav) share the same underlying view so the experience is
 * identical regardless of how the user got there.
 *
 * UUID validation: only valid UUIDs are treated as quiz IDs.
 * Any other path (e.g. /dashboard/white-label) shows a proper
 * "page not found" instead of a confusing "Quiz not found" error.
 */

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { QuizEditorView } from '../_components/QuizEditorView';
import { DashboardShell } from '../_components/DashboardShell';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function NotFoundFallback() {
  const router = useRouter();
  return (
    <DashboardShell>
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Page not found</h2>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: '#0f7377',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to dashboard
        </button>
      </div>
    </DashboardShell>
  );
}

export default function QuizEditorPage({ params }: { params: { quizId: string } }) {
  /* Only valid UUIDs should reach the quiz editor.
     Anything else (e.g. "white-label", "email-sequences") is a wrong URL. */
  if (!UUID_RE.test(params.quizId)) {
    return <NotFoundFallback />;
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}>
      <QuizEditorView quizId={params.quizId} />
    </Suspense>
  );
}
