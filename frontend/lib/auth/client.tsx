'use client';
/**
 * Our own sign-in on the browser side (replaces Clerk).
 *
 * The API keeps an HttpOnly session cookie (path /api/auth on the API host). This module asks
 * GET {API}/api/auth/session, with credentials, for the signed-in user and a 15-minute access token, caches the
 * token until a minute before it expires, and hands it to every API call as "Authorization: Bearer".
 *
 * The hooks keep the shape the app already used: useAuth() → { isLoaded, isSignedIn, userId, getToken, signOut },
 * useUser() → { isLoaded, isSignedIn, user } and useClerk() → { signOut }.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type AuthUser = { id: string; email: string; firstName: string; emailVerified: boolean };

type SessionState = { status: 'loading' | 'signed-in' | 'signed-out'; user: AuthUser | null };

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<{ user: AuthUser | null; token: string | null } | null> | null = null;
const listeners = new Set<(s: SessionState) => void>();
let lastState: SessionState = { status: 'loading', user: null };

function publish(s: SessionState) {
  lastState = s;
  listeners.forEach(function (l) { l(s); });
}

/** Calls the session endpoint. Returns null on a network or server error (state unknown, keep what we had). */
async function fetchSession(): Promise<{ user: AuthUser | null; token: string | null } | null> {
  if (inflight) return inflight;
  inflight = (async function () {
    try {
      const res = await fetch(API_URL + '/api/auth/session', { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        cached = null;
        publish({ status: 'signed-out', user: null });
        return { user: null, token: null };
      }
      if (!res.ok) return null;
      const data = await res.json();
      cached = { token: data.token, expiresAt: data.expiresAt };
      publish({ status: 'signed-in', user: data.user });
      return { user: data.user as AuthUser, token: data.token as string };
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** A valid access token for the signed-in user, or '' when signed out. Safe to call from anywhere. */
export async function getAuthToken(opts?: { skipCache?: boolean }): Promise<string> {
  if (typeof window === 'undefined') return '';
  if (!opts?.skipCache && cached && cached.expiresAt - Date.now() > 60000) return cached.token;
  const s = await fetchSession();
  return (s && s.token) || '';
}

async function post(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(API_URL + '/api/auth' + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    let data: any = {};
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection and try again.' } };
  }
}

/** Sign-in actions used by the sign-in, sign-up and password pages. Each resolves to { ok, status, data }. */
export const authApi = {
  async signUp(email: string, password: string, firstName?: string) {
    const r = await post('/signup', { email, password, firstName });
    if (r.ok) { cached = null; await fetchSession(); }
    return r;
  },
  async signIn(email: string, password: string) {
    const r = await post('/login', { email, password });
    if (r.ok) { cached = null; await fetchSession(); }
    return r;
  },
  forgotPassword(email: string) { return post('/forgot-password', { email }); },
  async resetPassword(token: string, password: string) {
    const r = await post('/reset-password', { token, password });
    if (r.ok) { cached = null; await fetchSession(); }
    return r;
  },
  verifyEmail(token: string) { return post('/verify-email', { token }); },
  resendVerification() { return post('/resend-verification'); },
  async config(): Promise<{ google: boolean }> {
    try {
      const res = await fetch(API_URL + '/api/auth/config', { credentials: 'include' });
      if (res.ok) return await res.json();
    } catch {}
    return { google: false };
  },
  googleUrl(next?: string) {
    return API_URL + '/api/auth/google/start?next=' + encodeURIComponent(next || '/dashboard');
  },
};

export async function signOut(after?: () => void): Promise<void> {
  await post('/logout');
  cached = null;
  publish({ status: 'signed-out', user: null });
  try { sessionStorage.removeItem('sq_auth_ok'); } catch {}
  if (after) after();
}

const AuthContext = createContext<SessionState>({ status: 'loading', user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(lastState);
  useEffect(function () {
    listeners.add(setState);
    if (lastState.status === 'loading') fetchSession().then(function (s) {
      // A network error on first load: treat as signed out so pages do not spin forever; they retry on demand.
      if (!s && lastState.status === 'loading') publish({ status: 'signed-out', user: null });
    });
    else setState(lastState);
    return function () { listeners.delete(setState); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const s = useContext(AuthContext);
  const getToken = useCallback(function (opts?: { skipCache?: boolean }) {
    return getAuthToken(opts).then(function (t) { return t || null; });
  }, []);
  return useMemo(function () {
    return {
      isLoaded: s.status !== 'loading',
      isSignedIn: s.status === 'signed-in',
      userId: s.user ? s.user.id : null,
      getToken,
      signOut,
    };
  }, [s, getToken]);
}

export function useUser() {
  const s = useContext(AuthContext);
  return useMemo(function () {
    const u = s.user;
    return {
      isLoaded: s.status !== 'loading',
      isSignedIn: s.status === 'signed-in',
      user: u ? {
        id: u.id,
        firstName: u.firstName || null,
        fullName: u.firstName || null,
        emailVerified: u.emailVerified,
        primaryEmailAddress: { emailAddress: u.email },
        emailAddresses: [{ emailAddress: u.email }],
      } : null,
    };
  }, [s]);
}

export function useClerk() {
  return { signOut };
}
