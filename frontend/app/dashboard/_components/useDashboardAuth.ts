'use client';

/**
 * useDashboardAuth - shared auth gate for every page that lives inside DashboardShell. Returns an access token once
 * the session is known, otherwise sends the visitor to /sign-in.
 *
 * The token comes from our own sign-in (lib/auth/client): it lasts 15 minutes and getToken() renews it shortly
 * before expiry, so the state here is refreshed every 5 minutes to keep downstream API calls current.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export type AuthStatus = 'loading' | 'ready' | 'unauthed';

const REFRESH_MS = 5 * 60 * 1000;

export function useDashboardAuth(): { token: string | null; status: AuthStatus } {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setToken(null);
      setStatus('unauthed');
      const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      router.replace(next && next !== '/dashboard' ? '/sign-in?next=' + encodeURIComponent(next) : '/sign-in');
      return;
    }
    let cancelled = false;
    getToken().then((t) => {
      if (cancelled) return;
      if (t) { setToken(t); setStatus('ready'); }
      else { setStatus('unauthed'); router.replace('/sign-in'); }
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, router]);

  useEffect(() => {
    if (status !== 'ready') return;
    const interval = setInterval(async () => {
      const t = await getToken();
      if (t) setToken(t);
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [status, getToken]);

  return { token, status };
}
