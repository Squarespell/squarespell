'use client';

/**
 * Root route on app.squarespell.com.
 *
 * Signed-in users go to the dashboard. Everyone else goes to the quiz-funnel
 * marketing landing page (the de-facto home of the app subdomain), where the
 * hero URL input drops them into the no-login quiz builder.
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? '/dashboard' : '/tools/quiz-funnel');
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
