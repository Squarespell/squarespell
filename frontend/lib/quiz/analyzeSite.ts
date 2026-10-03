/**
 * Client for POST /api/preview-analyze, the first step of the public builder (/tools/quiz-funnel/build?url=...).
 *
 * - One automatic retry, ~1.5 s later, after a network-level failure only: fetch rejected ("Failed to fetch", a
 *   dropped connection, or a proxy error page without CORS headers, which the browser reports the same way), or the
 *   request was aborted / timed out. Never after an HTTP answer (4xx, 429, 5xx): those are definite.
 * - Every final failure comes back as an AnalyzeFailure with a stable `errorName`, used for the on-page message
 *   (analyzeFailureMessage) and for error reporting (reportAnalyzeFailure). Error reports carry only
 *   { error_name, http_status, elapsed_ms, retried }: never the website address or anything else the visitor typed.
 */

export const ANALYZE_RETRY_DELAY_MS = 1500;

export type AnalyzeErrorName =
  | 'network_error' // fetch rejected (offline, connection reset, DNS, CORS-blocked proxy error)
  | 'timeout' // no answer within the time limit (our own abort)
  | 'rate_limited' // 429
  | 'not_squarespace' // 422 NOT_SQUARESPACE: the builder only accepts Squarespace sites
  | 'invalid_url' // 400
  | 'site_unreadable' // 422 SITE_UNREADABLE: the address could not be fetched (unknown domain, site down or too slow)
  | 'ai_timeout'
  | 'ai_unavailable'
  | 'ai_rate_limited'
  | 'ai_bad_response'
  | 'server_error' // any other 5xx
  | 'http_error' // any other non-2xx
  | 'invalid_response'; // 2xx without a usable body

export interface AnalyzeFailure {
  errorName: AnalyzeErrorName;
  httpStatus?: number;
  /** From the 429 body (retryAfterSeconds) or the Retry-After header. */
  retryAfterSeconds?: number;
  /** The server's own message, for display only. Never reported. */
  serverMessage?: string;
  elapsedMs: number;
  retried: boolean;
}

/** ok=true: `data` is the server's JSON (has session_token). ok=false: `failure` says why. (Not a discriminated union:
 *  this project compiles with strict off, where TypeScript does not narrow on a boolean `ok`.) */
export interface AnalyzeResult { ok: boolean; data?: any; failure?: AnalyzeFailure; retried: boolean }

export interface AnalyzeOptions {
  apiBase: string;
  /** Per attempt. */
  timeoutMs: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

const AI_CODES: AnalyzeErrorName[] = ['ai_timeout', 'ai_unavailable', 'ai_rate_limited', 'ai_bad_response'];

type Attempt =
  | { kind: 'ok'; data: any }
  | { kind: 'network'; errorName: 'network_error' | 'timeout' }
  | { kind: 'http'; failure: Omit<AnalyzeFailure, 'elapsedMs' | 'retried'> };

function parseRetryAfter(body: any, res: any): number | undefined {
  const fromBody = Number(body && body.retryAfterSeconds);
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody);
  const header = res && res.headers && typeof res.headers.get === 'function' ? res.headers.get('Retry-After') : null;
  const fromHeader = header != null ? Number(header) : NaN;
  if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.ceil(fromHeader);
  return undefined;
}

async function attemptOnce(url: string, opts: AnalyzeOptions): Promise<Attempt> {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ac.abort(); }, opts.timeoutMs);
  let res: any;
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: ac.signal,
    };
    const endpoint = `${opts.apiBase}/api/preview-analyze`;
    res = await (opts.fetchImpl ? opts.fetchImpl(endpoint, init) : fetch(endpoint, init));
  } catch {
    clearTimeout(timer);
    return { kind: 'network', errorName: timedOut ? 'timeout' : 'network_error' };
  }
  try {
    const status: number = res.status;
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // Our time limit hit while the body was arriving: treat like any other timeout. Otherwise the body simply was
      // not JSON (e.g. a proxy error page) and the status code decides.
      if (timedOut) return { kind: 'network', errorName: 'timeout' };
      body = null;
    }
    if (res.ok) {
      if (!body || !body.session_token) return { kind: 'http', failure: { errorName: 'invalid_response', httpStatus: status } };
      return { kind: 'ok', data: body };
    }
    const serverMessage = body && typeof body.error === 'string' ? body.error : undefined;
    const code = body && typeof body.code === 'string' ? body.code : '';
    let errorName: AnalyzeErrorName;
    if (status === 429) errorName = 'rate_limited';
    else if (code === 'NOT_SQUARESPACE') errorName = 'not_squarespace';
    else if (code === 'SITE_UNREADABLE') errorName = 'site_unreadable';
    else if (status === 400) errorName = 'invalid_url';
    else if ((AI_CODES as string[]).indexOf(code) !== -1) errorName = code as AnalyzeErrorName;
    else if (status >= 500) errorName = 'server_error';
    else errorName = 'http_error';
    return {
      kind: 'http',
      failure: {
        errorName,
        httpStatus: status,
        retryAfterSeconds: status === 429 ? parseRetryAfter(body, res) : undefined,
        serverMessage,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeSite(url: string, opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const started = Date.now();
  const retryDelay = opts.retryDelayMs != null ? opts.retryDelayMs : ANALYZE_RETRY_DELAY_MS;
  let retried = false;
  for (;;) {
    const attempt = await attemptOnce(url, opts);
    if (attempt.kind === 'ok') return { ok: true, data: attempt.data, retried };
    if (attempt.kind === 'network' && !retried) {
      retried = true;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      continue;
    }
    const failure: Omit<AnalyzeFailure, 'elapsedMs' | 'retried'> =
      attempt.kind === 'network' ? { errorName: attempt.errorName } : attempt.failure;
    return { ok: false, failure: { ...failure, elapsedMs: Date.now() - started, retried }, retried };
  }
}

/* ------------------------------------------------------------------ */
/* Messages shown on the page                                          */
/* ------------------------------------------------------------------ */

/** Where visitors can write when trying again does not help. */
export const SUPPORT_EMAIL = 'info@squarespell.com';

export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return 'You have reached the limit for new drafts for now. Try again a little later, or start from a template now.';
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `You have reached the limit for new drafts for now. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or start from a template now.`;
}

export const NOT_SQUARESPACE_MESSAGE =
  "Squarespell Quiz works with Squarespace websites only, and this address doesn't look like a Squarespace site. " +
  'If your site is built with Squarespace, check the address (or use your yoursite.squarespace.com address) and try again.';

// SEO plan Segment 3, task 3.9: every message says what to do next, and none shows a status code or exception text.
export const UNREACHABLE_MESSAGE =
  `We could not reach our servers. Check your connection and try again. If it keeps happening, email ${SUPPORT_EMAIL}.`;
export const TIMEOUT_MESSAGE =
  `Our servers took too long to answer. Try again in a moment. If it keeps happening, email ${SUPPORT_EMAIL}.`;
export const UNREADABLE_SITE_MESSAGE = 'We could not read that website. Check the address, or start from a template instead.';
export const SERVER_PROBLEM_MESSAGE =
  `Something went wrong on our side. Try again in a moment. If it keeps happening, email ${SUPPORT_EMAIL}.`;
export const BUILD_FAILED_MESSAGE =
  `We could not build your quiz this time. Try again, or choose "Start from a template" above. If it keeps happening, email ${SUPPORT_EMAIL}.`;

export function analyzeFailureTitle(f: AnalyzeFailure): string {
  switch (f.errorName) {
    case 'not_squarespace':
      return 'This builder is for Squarespace sites';
    case 'rate_limited':
      return 'Draft limit reached';
    case 'network_error':
    case 'timeout':
      return 'We could not reach our servers';
    case 'invalid_url':
    case 'site_unreadable':
      return 'We could not read that website';
    default:
      return 'Something went wrong on our side';
  }
}

/** Short label for the chip in the builder's side panel. */
export function analyzeFailureLabel(errorName: AnalyzeErrorName): string {
  switch (errorName) {
    case 'not_squarespace':
      return 'Not a Squarespace site';
    case 'rate_limited':
      return 'Limit reached';
    case 'network_error':
    case 'timeout':
      return 'Connection problem';
    case 'invalid_url':
    case 'site_unreadable':
      return 'Site not readable';
    default:
      return 'Server problem';
  }
}

export function analyzeFailureMessage(f: AnalyzeFailure): string {
  switch (f.errorName) {
    case 'rate_limited':
      return rateLimitMessage(f.retryAfterSeconds);
    case 'not_squarespace':
      return NOT_SQUARESPACE_MESSAGE;
    case 'network_error':
      return UNREACHABLE_MESSAGE;
    case 'timeout':
      return TIMEOUT_MESSAGE;
    case 'invalid_url':
      return "That doesn't look like a website address. Check it and try again, or start from a template instead.";
    case 'site_unreadable':
      return UNREADABLE_SITE_MESSAGE;
    case 'ai_timeout':
    case 'ai_unavailable':
    case 'ai_rate_limited':
    case 'ai_bad_response':
      // Our own wording (backend/src/lib/aiErrors.ts), not an exception message.
      return f.serverMessage || 'Our AI is busy right now. Please try again in a minute.';
    default:
      // server_error, http_error, invalid_response
      return SERVER_PROBLEM_MESSAGE;
  }
}

/** Message for a failed POST /api/preview-build-quiz ("Generate my quiz"), shown on the screen with the template picker. */
export function buildFailureMessage(status: number, body: any): string {
  const code = body && typeof body.code === 'string' ? body.code : '';
  if (status === 404) return 'This draft has expired. Enter your website again, or choose "Start from a template" above.';
  if (status === 429) return rateLimitMessage(parseRetryAfter(body, null));
  if ((AI_CODES as string[]).indexOf(code) !== -1 && typeof body.error === 'string') return body.error;
  return BUILD_FAILED_MESSAGE;
}

/* ------------------------------------------------------------------ */
/* Error reporting                                                     */
/* ------------------------------------------------------------------ */

export const ANALYZE_ERROR_EVENT = 'builder_analyze_error';

export interface AnalyzeErrorEvent {
  error_name: AnalyzeErrorName;
  http_status?: number;
  elapsed_ms: number;
  retried: boolean;
}

/** The only fields ever reported. Built from scratch, so nothing else (URL, server message) can leak in. */
export function analyzeErrorEvent(f: AnalyzeFailure): AnalyzeErrorEvent {
  const event: AnalyzeErrorEvent = { error_name: f.errorName, elapsed_ms: Math.max(0, Math.round(f.elapsedMs)), retried: !!f.retried };
  if (typeof f.httpStatus === 'number') event.http_status = f.httpStatus;
  return event;
}

/** The page address without its query string: the builder's ?url= holds the visitor's website address. */
function pageLocationWithoutQuery(): string | undefined {
  try { return window.location.origin + window.location.pathname; } catch { return undefined; }
}

function sendToGtag(event: AnalyzeErrorEvent) {
  const w: any = typeof window !== 'undefined' ? window : null;
  if (!w || typeof w.gtag !== 'function') return; // no analytics tag on this page: nothing to do (we never add one here)
  const params: Record<string, unknown> = { ...event };
  // GA attaches the full page address to every event; override it so ?url=<website> is not sent.
  const pageLocation = pageLocationWithoutQuery();
  if (pageLocation) params.page_location = pageLocation;
  try { w.gtag('event', ANALYZE_ERROR_EVENT, params); } catch { /* reporting must never break the page */ }
}

async function sendToSentry(event: AnalyzeErrorEvent) {
  // Sentry is only set up when a DSN is configured at build time; otherwise the SDK is not even loaded.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  // Browser only. Next.js compiles `typeof window` to a constant, so this block (and the SDK's server build, with its
  // OpenTelemetry instrumentation) is left out of the server bundle entirely.
  if (typeof window !== 'undefined') {
    try {
      const Sentry: any = await import('@sentry/nextjs');
      if (!Sentry.getClient || !Sentry.getClient()) return; // SDK present but not initialised on this page
      Sentry.withScope((scope: any) => {
        // Strip the page address (its ?url= is the visitor's website) and breadcrumbs (console/navigation entries
        // can contain it too) from this event.
        scope.addEventProcessor((e: any) => {
          delete e.request;
          e.breadcrumbs = [];
          return e;
        });
        scope.setTag('error_name', event.error_name);
        scope.setTag('retried', String(event.retried));
        if (event.http_status != null) scope.setTag('http_status', String(event.http_status));
        scope.setContext(ANALYZE_ERROR_EVENT, { ...event });
        Sentry.captureMessage(ANALYZE_ERROR_EVENT, 'warning');
      });
    } catch { /* reporting must never break the page */ }
  }
}

/** Record one final analyze failure. Returns the reported payload. */
export function reportAnalyzeFailure(f: AnalyzeFailure): AnalyzeErrorEvent {
  const event = analyzeErrorEvent(f);
  sendToGtag(event);
  void sendToSentry(event);
  return event;
}
