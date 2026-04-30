'use client';

/**
 * /dashboard/editor - sidebar "Quiz editor" entry point.
 *
 * Opens the user's most recently updated quiz inside DashboardShell. If the
 * user has no quizzes yet, QuizEditorView renders an empty state with a CTA
 * to /try. This is the destination for the "Quiz editor" sidebar nav item.
 *
 * Also handles ?template=<id> — creates a new quiz from a template catalog
 * entry, then opens it for editing.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuizEditorView } from '../_components/QuizEditorView';

function EditorInner() {
  var searchParams = useSearchParams();
  var templateId = searchParams.get('template') || undefined;
  return <QuizEditorView templateId={templateId} />;
}

export default function DashboardEditorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}>
      <EditorInner />
    </Suspense>
  );
}
