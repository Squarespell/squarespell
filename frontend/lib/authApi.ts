/**
 * Typed client for the first-party passwordless email-code auth endpoints
 * (backend routes/authEmail.ts). Unlike lib/api.ts's `req()`, these return
 * the raw status code and body instead of throwing on non-2xx, because the
 * UI needs to branch on specific outcomes (cooldown vs. rate limit vs.
 * invalid code) rather than show one generic failure.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

export interface AuthApiResult<T = any> {
  status: number;
  data: T | null;
}

async function call<T = any>(path: string, method: string, body?: any): Promise<AuthApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie('sq_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
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

export const authApi = {
  requestCode: (email: string) => call<{ ok: boolean; message?: string; code?: string; retryAfterMs?: number }>('/api/auth/request-code', 'POST', { email }),
  verifyCode: (email: string, code: string) => call<{ ok: boolean; isNewUser?: boolean; code?: string }>('/api/auth/verify-code', 'POST', { email, code }),
  getSession: () => call<{ authenticated: boolean }>('/api/auth/session', 'GET'),
  logout: () => call<{ ok: boolean }>('/api/auth/logout', 'POST'),
  logoutAll: () => call<{ ok: boolean }>('/api/auth/logout-all', 'POST'),
};
