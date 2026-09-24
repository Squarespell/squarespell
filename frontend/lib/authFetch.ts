'use client';

/**
 * Patches the global fetch so every request to the API origin automatically
 * carries the sq_session cookie (the app and API are different subdomains,
 * so the browser needs `credentials: 'include'` to attach it) and, for
 * mutating requests, echoes the sq_csrf cookie as a header -- the
 * double-submit pattern requireAuth expects. This lets the ~30 dashboard
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

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let patched = false;

function installAuthFetch() {
  if (patched || typeof window === 'undefined' || !API_ORIGIN) return;
  patched = true;
  const native = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' || input instanceof URL ? input.toString() : (input as Request).url;
    if (!url.startsWith(API_ORIGIN)) return native(input, init);

    const requestLike = typeof input !== 'string' && !(input instanceof URL) ? (input as Request) : null;
    const method = (init.method || requestLike?.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || requestLike?.headers || undefined);

    if (!SAFE_METHODS.has(method) && !headers.has('x-csrf-token')) {
      const csrf = readCookie('sq_csrf');
      if (csrf) headers.set('x-csrf-token', csrf);
    }

    return native(input, { ...init, credentials: init.credentials || 'include', headers });
  }) as typeof fetch;
}

installAuthFetch();

export {};
