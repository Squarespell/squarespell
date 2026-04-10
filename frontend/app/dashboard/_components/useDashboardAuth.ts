'use client';

/**
 * useDashboardAuth — shared auth gate for every page that lives inside
 * DashboardShell. Returns a token once Clerk is ready, otherwise drives the
 * user back to /sign-in. Mirrors the retry logic that the original
 * /dashboard/page.tsx used, so we never lose tokens to the Clerk→app hand-off.
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
    if (!isSignedIn) {
      setStatus('unauthed');
      router.replace('/sign-in');
      return;
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
