/**
 * Typed client for the first-party passwordless email-code auth endpoints
 * (backend routes/authEmail.ts). Unlike lib/api.ts's `req()`, these return
 * the raw status code and body instead of throwing on non-2xx, because the
 * UI needs to branch on specific outcomes (cooldown vs. rate limit vs.
 * invalid code) rather than show one generic failure.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

// The CSRF token lives in module memory only (never localStorage/sessionStorage/cookies): the API
// returns it from verify-code and GET /api/auth/session, so a page refresh restores it via getSession().
let csrfToken: string | null = null;
let restoring: Promise<string | null> | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export interface AuthApiResult<T = any> {
  status: number;
  data: T | null;
}

async function call<T = any>(path: string, method: string, body?: any): Promise<AuthApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { status: 0, data: null };
  }
  let data: T | null = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

type SessionBody = { authenticated: boolean; csrfToken?: string };

async function getSession(): Promise<AuthApiResult<SessionBody>> {
  const r = await call<SessionBody>('/api/auth/session', 'GET');
  if (r.status === 200 && r.data?.csrfToken) csrfToken = r.data.csrfToken;
  else if (r.status === 401) csrfToken = null;
  return r;
}

/** Returns the in-memory CSRF token, restoring it from the server session first if this page load doesn't have it yet. */
export async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  restoring ||= getSession().then(() => csrfToken).finally(() => { restoring = null; });
  return restoring;
}

async function verifyCode(email: string, code: string) {
  const r = await call<{ ok: boolean; isNewUser?: boolean; code?: string; csrfToken?: string }>('/api/auth/verify-code', 'POST', { email, code });
  if (r.status === 200 && r.data?.csrfToken) csrfToken = r.data.csrfToken;
  return r;
}

async function endSession(path: string) {
  await ensureCsrfToken();
  const r = await call<{ ok: boolean }>(path, 'POST');
  if (r.status === 200 || r.status === 401) csrfToken = null;
  return r;
}

export const authApi = {
  requestCode: (email: string) => call<{ ok: boolean; message?: string; code?: string; retryAfterMs?: number }>('/api/auth/request-code', 'POST', { email }),
  verifyCode,
  getSession,
  logout: () => endSession('/api/auth/logout'),
  logoutAll: () => endSession('/api/auth/logout-all'),
};
