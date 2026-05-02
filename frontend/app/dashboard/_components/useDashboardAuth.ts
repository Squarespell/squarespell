'use client';

/**
 * useDashboardAuth - shared auth gate for every page that lives inside
 * DashboardShell. Returns a token once Clerk is ready, otherwise drives the
 * user back to /sign-in. Mirrors the retry logic that the original
 * /dashboard/page.tsx used, so we never lose tokens to the Clerk-app hand-off.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export type AuthStatus = 'loading' | 'ready' | 'unauthed';

export function useDashboardAuth(): { token: string | null; status: AuthStatus } {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    // Grace window: when Clerk rotates the session token (e.g. another tab
    // just refreshed, or tab regained focus), isSignedIn can briefly flip
    // to false before the new token lands. Without a grace delay we bounce
    // the user to /sign-in mid-session.
    //
    // If we already had a session (started.current === true), give Clerk
    // a generous 8 seconds to recover — token rotation should take <2s but
    // cold Render backends or slow connections need more room.
    // On initial load, wait 2s before giving up.
    if (!isSignedIn) {
      const graceMs = started.current ? 8000 : 2000;
      const timer = setTimeout(() => {
        (async () => {
          // Try multiple times with backoff before giving up
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const maybe = await getToken();
              if (maybe) {
                setToken(maybe);
                setStatus('ready');
                return;
              }
            } catch {}
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
          }
          // Only redirect if we're truly not signed in after all retries
          setStatus('unauthed');
          router.replace('/sign-in');
        })();
      }, graceMs);
      return () => clearTimeout(timer);
    }
    if (started.current) {
      // Already initialized — just refresh the token silently
      (async () => {
        try {
          const t = await getToken();
          if (t) setToken(t);
        } catch {}
      })();
      return;
    }
    started.current = true;

    let cancelled = false;

    (async () => {
      let t: string | null = null;
      for (let i = 0; i < 8 && !cancelled && !t; i++) {
        try {
          t = await getToken();
        } catch {}
        if (!t) await new Promise((r) => setTimeout(r, 1000));
      }
      if (cancelled) return;
      if (!t) {
        setStatus('unauthed');
        router.replace('/sign-in');
        return;
      }
      setToken(t);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  return { token, status };
}
