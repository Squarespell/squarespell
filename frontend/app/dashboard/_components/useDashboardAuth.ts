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
    // just refreshed), isSignedIn can briefly flip to false in this tab
    // before the new token lands. Without a grace delay we bounce the user
    // to /sign-in mid-session. Wait before redirecting and re-check.
    if (!isSignedIn) {
      const graceMs = started.current ? 3000 : 500;
      const timer = setTimeout(() => {
        (async () => {
          try {
            const maybe = await getToken();
            if (maybe) {
              setToken(maybe);
              setStatus('ready');
              return;
            }
          } catch {}
          setStatus('unauthed');
          router.replace('/sign-in');
        })();
      }, graceMs);
      return () => clearTimeout(timer);
    }
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      let t: string | null = null;
      for (let i = 0; i < 6 && !cancelled && !t; i++) {
        try {
          t = await getToken();
        } catch {}
        if (!t) await new Promise((r) => setTimeout(r, 1200));
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
