'use client';

/**
 * Root route.
 *
 * Per the prototype-v4 restoration decision: the legacy landing page is gone.
 * Squarespell has no hero — the Stage 1 embeddable hook widget IS the entry
 * point. Signed-in users go to the dashboard; everyone else goes to /try.
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? '/dashboard' : '/try');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07090c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: 'rgba(240,242,245,0.35)',
        fontSize: 13,
      }}
    >
      Redirecting…
    </div>
  );
}
