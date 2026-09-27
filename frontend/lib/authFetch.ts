'use client';

/**
 * Patches the global fetch so every request to the API origin automatically
 * carries the sq_session cookie (the app and API are different subdomains,
 * so the browser needs `credentials: 'include'` to attach it) and, for
 * mutating requests, sends the in-memory CSRF token (from verify-code /
 * GET /api/auth/session, see lib/authApi.ts) as the x-csrf-token header. This lets the ~30 dashboard
 * pages that already do `fetch(API + '/path', { headers: { Authorization:
 * 'Bearer ' + token } } )` keep working unmodified: the Authorization
 * header is now inert (requireAuth reads the session cookie, not that
 * header), and this patch supplies what it actually needs.
 *
 * Imported once, for its side effect, at the top of the root layout -- so
 * it installs before any page's data-fetching effects can run.
 */

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com').origin;
  } catch {
    return '';
  }
})();

import { getCsrfToken, ensureCsrfToken } from './authApi';

// Sign-in requests happen before any session exists, so they have no CSRF token to attach.
const PRE_SESSION_PATHS = new Set(['/api/auth/request-code', '/api/auth/verify-code']);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let patched = false;

function installAuthFetch() {
  if (patched || typeof window === 'undefined' || !API_ORIGIN) return;
  patched = true;
  const native = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' || input instanceof URL ? input.toString() : (input as Request).url;
    if (!url.startsWith(API_ORIGIN)) return native(input, init);

    const requestLike = typeof input !== 'string' && !(input instanceof URL) ? (input as Request) : null;
    const method = (init.method || requestLike?.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || requestLike?.headers || undefined);

    if (!SAFE_METHODS.has(method) && !headers.has('x-csrf-token')) {
      let pathname = '';
      try { pathname = new URL(url).pathname; } catch {}
      if (!PRE_SESSION_PATHS.has(pathname)) {
        const csrf = getCsrfToken() || (await ensureCsrfToken());
        if (csrf) headers.set('x-csrf-token', csrf);
      }
    }

    return native(input, { ...init, credentials: init.credentials || 'include', headers });
  }) as typeof fetch;
}

installAuthFetch();

export {};
