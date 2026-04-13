'use client';

/**
 * /dashboard/[quizId] - quiz editor for a specific quiz.
 *
 * Thin wrapper over QuizEditorView which handles the fetch + DashboardShell
 * mounting. Both this route (quiz cards → editor) and /dashboard/editor
 * (sidebar nav) share the same underlying view so the experience is
 * identical regardless of how the user got there.
 */

import { Suspense } from 'react';
import { QuizEditorView } from '../_components/QuizEditorView';

export default function QuizEditorPage({ params }: { params: { quizId: string } }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <QuizEditorView quizId={params.quizId} />
    </Suspense>
  );
}
