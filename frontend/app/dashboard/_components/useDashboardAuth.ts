'use client';

/**
 * useDashboardAuth - shared auth gate for every page that lives inside
 * DashboardShell. Confirms the sq_session cookie is valid via GET
 * /api/auth/session, otherwise sends the user to /sign-in.
 *
 * Keeps the same { token, status } shape the ~30 call sites already expect
 * (many of them do raw `fetch(API + '/path', { headers: { Authorization:
 * 'Bearer ' + token } } )` and gate on `if (!token) return`), so none of
 * those pages need to change: `token` is just a truthy sentinel now (the
 * in-memory CSRF token) — the Authorization header they send is
 * inert, and lib/authFetch.ts's global fetch patch is what actually
 * authenticates the request via the session cookie.
 *
 * Unlike the old Clerk version there is no token rotation to race against
 * (the session is a fixed 30-day cookie), so this is a one-time check plus
 * a periodic liveness re-check (catches server-side revocation, e.g.
 * logout-all from another device, without requiring a page reload).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { authApi, getCsrfToken } from '@/lib/authApi';

export type AuthStatus = 'loading' | 'ready' | 'unauthed';

function markSessionEstablished() {
  try { sessionStorage.setItem('sq_auth_ok', '1'); } catch {}
}

function clearSessionFlag() {
  try { sessionStorage.removeItem('sq_auth_ok'); } catch {}
}

const LIVENESS_INTERVAL_MS = 60_000;

export function useDashboardAuth(): { token: string | null; status: AuthStatus } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;

    (async () => {
      // A few retries with backoff covers a transient network blip or a
      // cold Hostinger backend, without leaving the user stuck on a
      // spinner forever if there is genuinely no session.
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        const { status: httpStatus } = await authApi.getSession();
        if (cancelled) return;
        if (httpStatus === 200) {
          markSessionEstablished();
          setToken(getCsrfToken() || 'session');
          setStatus('ready');
          return;
        }
        if (httpStatus === 401) break; // definitively signed out, no point retrying
        if (attempt < 4) await new Promise((r) => setTimeout(r, 1000));
      }
      if (cancelled) return;
      clearSessionFlag();
      setStatus('unauthed');
      const dest = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
      router.replace('/sign-in?redirect=' + encodeURIComponent(dest));
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const interval = setInterval(async () => {
      const { status: httpStatus } = await authApi.getSession();
      if (httpStatus === 401) {
        clearSessionFlag();
        setStatus('unauthed');
        const dest = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
        router.replace('/sign-in?redirect=' + encodeURIComponent(dest));
      }
    }, LIVENESS_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { token, status };
}
