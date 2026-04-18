'use client';

/**
 * /try - the public preview funnel.
 *
 * Thin wrapper around the reusable <TryFlowInner /> component (in
 * ./TryFlowInner.tsx). Next.js App Router doesn't allow extra named exports
 * from a page file, so the shared component lives in its own module and is
 * imported here AND by /app/dashboard/[quizId]/page.tsx for the authed
 * editor.
 */

import { Suspense } from 'react';
import { TryFlowInner } from './TryFlowInner';

export default function TryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}>
      <TryFlowInner />
    </Suspense>
  );
}
