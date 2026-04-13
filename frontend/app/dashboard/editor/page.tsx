'use client';

/**
 * /dashboard/editor - sidebar "Quiz editor" entry point.
 *
 * Opens the user's most recently updated quiz inside DashboardShell. If the
 * user has no quizzes yet, QuizEditorView renders an empty state with a CTA
 * to /try. This is the destination for the "Quiz editor" sidebar nav item.
 */

import { Suspense } from 'react';
import { QuizEditorView } from '../_components/QuizEditorView';

export default function DashboardEditorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <QuizEditorView />
    </Suspense>
  );
}
