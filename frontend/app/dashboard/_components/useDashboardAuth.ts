'use client';

/**
 * useDashboardAuth - shared auth gate for every page that lives inside
 * DashboardShell. Returns a token once Clerk is ready, otherwise drives the
 * user back to /sign-in.
 *
 * WHY MODULE-LEVEL SINGLETON:
 * This hook is called in 30+ individual page components, not a shared layout.
 * useRef resets to false on every component mount (i.e. every page navigation),
 * so the hook would always treat navigations as "first load" and use the short
 * grace window — causing false logouts during Clerk token rotation.
 *
 * A module-level variable persists for the entire browser session across all
 * component mounts and navigations. Once a session is confirmed, every
 * subsequent page uses the long grace window.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export type AuthStatus = 'loading' | 'ready' | 'unauthed';

// Persists across page navigations (component remounts). True once we've
// confirmed at least one successful Clerk session this browser session.
let _sessionEverEstablished = false;

// Try to restore from sessionStorage so a hard refresh also gets the
// longer grace window (user was clearly logged in if the tab had the flag).
if (typeof window !== 'undefined') {
  try {
    if (sessionStorage.getItem('sq_auth_ok') === '1') {
      _sessionEverEstablished = true;
    }
  } catch {}
}

function markSessionEstablished() {
  _sessionEverEstablished = true;
  try { sessionStorage.setItem('sq_auth_ok', '1'); } catch {}
}

function clearSessionFlag() {
  _sessionEverEstablished = false;
  try { sessionStorage.removeItem('sq_auth_ok'); } catch {}
}

export function useDashboardAuth(): { token: string | null; status: AuthStatus } {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  // Per-instance flag: true once this hook instance has run the initial fetch.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    // Grace window: Clerk rotates the session JWT (default every 60s). During
    // rotation, isSignedIn can briefly flip to false before the new token
    // arrives. Without a grace delay we would incorrectly bounce the user.
    //
    // - _sessionEverEstablished === true  → user was logged in this session,
    //   give Clerk 12 s to recover (token rotation + cold Render backend).
    // - _sessionEverEstablished === false → genuinely unknown, wait 5 s before
    //   concluding there's no session (Clerk hydration can take 3-4 s).
    if (!isSignedIn) {
      const graceMs = _sessionEverEstablished ? 12000 : 5000;
      const timer = setTimeout(() => {
        (async () => {
          // Retry with backoff — covers transient network blips.
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              const maybe = await getToken();
              if (maybe) {
                markSessionEstablished();
                setToken(maybe);
                setStatus('ready');
                return;
              }
            } catch {}
            if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
          }
          // Truly unauthenticated after all retries.
          clearSessionFlag();
          setStatus('unauthed');
          router.replace('/sign-in');
        })();
      }, graceMs);
      return () => clearTimeout(timer);
    }

    if (initializedRef.current) {
      // Already initialized this instance — silently refresh the token in case
      // Clerk just rotated it (isSignedIn flipped back to true).
      (async () => {
        try {
          const t = await getToken();
          if (t) {
            markSessionEstablished();
            setToken(t);
          }
        } catch {}
      })();
      return;
    }
    initializedRef.current = true;

    let cancelled = false;

    (async () => {
      let t: string | null = null;
      // Up to 10 attempts × 1 s = 10 s max wait for the initial token.
      for (let i = 0; i < 10 && !cancelled && !t; i++) {
        try {
          t = await getToken();
        } catch {}
        if (!t) await new Promise((r) => setTimeout(r, 1000));
      }
      if (cancelled) return;
      if (!t) {
        clearSessionFlag();
        setStatus('unauthed');
        router.replace('/sign-in');
        return;
      }
      markSessionEstablished();
      setToken(t);
      setStatus('ready');
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, router]);

  // Proactively refresh the token every 50 s to stay ahead of Clerk's ~60 s
  // rotation. Without this, the stored `token` state goes stale and every
  // downstream API call (quizzes, notifications, etc.) gets a 401.
  useEffect(() => {
    if (status !== 'ready') return;
    const interval = setInterval(async () => {
      try {
        const t = await getToken();
        if (t) setToken(t);
      } catch {}
    }, 50_000);
    return () => clearInterval(interval);
  }, [status, getToken]);

  return { token, status };
}
