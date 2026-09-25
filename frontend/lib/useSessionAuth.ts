'use client';

/**
 * Minimal stand-in for Clerk's old useAuth() shape (isLoaded/isSignedIn/
 * getToken), for the handful of pages outside DashboardShell (admin,
 * pricing, pricing-embed, the quiz embed-code page) that used to call it
 * directly instead of going through useDashboardAuth. Keeping this shape
 * means those pages' existing `if (!isLoaded) return; if (!isSignedIn)
 * ...; var token = await getToken();` logic doesn't need to change --
 * `token` is now just a truthy sentinel, since the session cookie (sent
 * automatically by lib/authFetch.ts's global fetch patch) is what actually
 * authenticates the request, not this value.
 */

import { useEffect, useState } from 'react';
import { authApi } from './authApi';

export function useSessionAuth() {
  const [state, setState] = useState({ isLoaded: false, isSignedIn: false });

  useEffect(() => {
    let cancelled = false;
    authApi.getSession().then((r) => {
      if (!cancelled) setState({ isLoaded: true, isSignedIn: r.status === 200 });
    });
    return () => { cancelled = true; };
  }, []);

  async function getToken(): Promise<string> {
    return 'session';
  }

  return { isLoaded: state.isLoaded, isSignedIn: state.isSignedIn, getToken };
}
