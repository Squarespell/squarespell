/**
 * POST /api/preview-analyze client (lib/quiz/analyzeSite.ts): one automatic retry after a network-level failure only,
 * clear messages for 429 and the Squarespace-only case, and privacy-safe error reporting.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  client: null as any,
  captured: [] as any[],
  processors: [] as Array<(e: any) => any>,
  tags: {} as Record<string, string>,
  contexts: {} as Record<string, any>,
}));
vi.mock('@sentry/nextjs', () => ({
  getClient: () => sentry.client,
  withScope: (fn: (scope: any) => void) => fn({
    addEventProcessor: (p: (e: any) => any) => { sentry.processors.push(p); },
    setTag: (k: string, v: string) => { sentry.tags[k] = v; },
    setContext: (k: string, v: any) => { sentry.contexts[k] = v; },
  }),
  captureMessage: (msg: string, level: string) => { sentry.captured.push({ msg, level }); },
}));

import {
  ANALYZE_RETRY_DELAY_MS,
  BUILD_FAILED_MESSAGE,
  NOT_SQUARESPACE_MESSAGE,
  SERVER_PROBLEM_MESSAGE,
  UNREADABLE_SITE_MESSAGE,
  analyzeErrorEvent,
  analyzeFailureLabel,
  analyzeFailureMessage,
  analyzeFailureTitle,
  analyzeSite,
  buildFailureMessage,
  rateLimitMessage,
  reportAnalyzeFailure,
} from '../analyzeSite';

const SITE = 'https://private-bakery.example';
const OPTS = { apiBase: 'https://api.test', timeoutMs: 75_000 };

function json(status: number, body: any, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null },
    json: async () => body,
  };
}
const OK = { session_token: 'sess-1', brand: { site_name: 'Bakery' } };
const failedToFetch = () => Promise.reject(new TypeError('Failed to fetch'));

beforeEach(() => {
  sentry.client = null;
  sentry.captured = [];
  sentry.processors = [];
  sentry.tags = {};
  sentry.contexts = {};
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  delete (window as any).gtag;
});

describe('analyzeSite(): automatic retry', () => {
  it('retries once, about 1.5 s after a "Failed to fetch", and succeeds', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockImplementationOnce(failedToFetch).mockResolvedValueOnce(json(200, OK));
    const p = analyzeSite(SITE, { ...OPTS, fetchImpl: fetchImpl as any });
    await vi.advanceTimersByTimeAsync(ANALYZE_RETRY_DELAY_MS - 100);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // not yet
    await vi.advanceTimersByTimeAsync(200);
    const r = await p;
    expect(ANALYZE_RETRY_DELAY_MS).toBe(1500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(true);
    expect(r.retried).toBe(true);
    expect(r.data.session_token).toBe('sess-1');
    // Same request both times.
    expect(fetchImpl.mock.calls[1][0]).toBe('https://api.test/api/preview-analyze');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ url: SITE });
  });

  it('retries only once: two network failures end in network_error with retried=true', async () => {
    const fetchImpl = vi.fn(failedToFetch);
    const r = await analyzeSite(SITE, { ...OPTS, retryDelayMs: 1, fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
    expect(r.failure).toMatchObject({ errorName: 'network_error', retried: true });
    expect(r.failure!.httpStatus).toBeUndefined();
  });

  it('a timed-out attempt is aborted and retried once', async () => {
    vi.useFakeTimers();
    const hang = (_u: string, init: any) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); });
    });
    const fetchImpl = vi.fn(hang);
    const p = analyzeSite(SITE, { ...OPTS, timeoutMs: 1000, fetchImpl: fetchImpl as any });
    await vi.advanceTimersByTimeAsync(1000 + ANALYZE_RETRY_DELAY_MS + 1000 + 10);
    const r = await p;
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.failure).toMatchObject({ errorName: 'timeout', retried: true });
    expect(r.failure!.elapsedMs).toBeGreaterThanOrEqual(3500);
  });

  it.each([
    [400, { error: 'Invalid URL' }, 'invalid_url'],
    [404, { error: 'nope' }, 'http_error'],
    [422, { error: 'x is not a Squarespace site.', code: 'NOT_SQUARESPACE', hostname: 'x' }, 'not_squarespace'],
    [422, { error: 'We could not read that website.', code: 'SITE_UNREADABLE' }, 'site_unreadable'],
    [429, { error: 'Rate limit exceeded', code: 'rate_limited', retryAfterSeconds: 300 }, 'rate_limited'],
    [500, { error: 'Analyze failed', code: 'analyze_failed' }, 'server_error'],
    [502, { error: 'The AI service is temporarily unavailable. Please try again shortly.', code: 'ai_unavailable' }, 'ai_unavailable'],
  ])('never retries an HTTP %s answer', async (status, body, errorName) => {
    const fetchImpl = vi.fn().mockResolvedValue(json(status as number, body));
    const r = await analyzeSite(SITE, { ...OPTS, retryDelayMs: 1, fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r.failure).toMatchObject({ errorName, httpStatus: status, retried: false });
  });

  it('a 2xx without a session token is invalid_response (not retried)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { brand: {} }));
    const r = await analyzeSite(SITE, { ...OPTS, retryDelayMs: 1, fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r.failure).toMatchObject({ errorName: 'invalid_response', httpStatus: 200 });
  });
});

describe('messages', () => {
  it('429 uses retryAfterSeconds from the body, else the Retry-After header', async () => {
    const body = await analyzeSite(SITE, { ...OPTS, fetchImpl: vi.fn().mockResolvedValue(json(429, { retryAfterSeconds: 1140 })) as any });
    expect(body.failure!.retryAfterSeconds).toBe(1140);
    expect(analyzeFailureMessage(body.failure!)).toBe('You have reached the limit for new drafts for now. Try again in about 19 minutes, or start from a template now.');
    expect(analyzeFailureTitle(body.failure!)).toBe('Draft limit reached');

    const header = await analyzeSite(SITE, { ...OPTS, fetchImpl: vi.fn().mockResolvedValue(json(429, {}, { 'Retry-After': '90' })) as any });
    expect(header.failure!.retryAfterSeconds).toBe(90);
    expect(analyzeFailureMessage(header.failure!)).toBe('You have reached the limit for new drafts for now. Try again in about 2 minutes, or start from a template now.');
  });

  it('rateLimitMessage rounds up to whole minutes, singular for one, and copes with no estimate', () => {
    const wait = (time: string) => `You have reached the limit for new drafts for now. Try again ${time}, or start from a template now.`;
    expect(rateLimitMessage(30)).toBe(wait('in about 1 minute'));
    expect(rateLimitMessage(60)).toBe(wait('in about 1 minute'));
    expect(rateLimitMessage(61)).toBe(wait('in about 2 minutes'));
    expect(rateLimitMessage(3600)).toBe(wait('in about 60 minutes'));
    expect(rateLimitMessage(undefined)).toBe(wait('a little later'));
  });

  it('the Squarespace-only case gets its own heading and a clear, friendly message (not the raw server text)', () => {
    const f = { errorName: 'not_squarespace' as const, httpStatus: 422, serverMessage: 'x is not a Squarespace site.', elapsedMs: 10, retried: false };
    expect(analyzeFailureTitle(f)).toBe('This builder is for Squarespace sites');
    expect(analyzeFailureMessage(f)).toBe(NOT_SQUARESPACE_MESSAGE);
    expect(NOT_SQUARESPACE_MESSAGE).toMatch(/Squarespace websites only/);
  });

  it('a network failure no longer surfaces the browser\'s bare "Failed to fetch"', () => {
    const msg = analyzeFailureMessage({ errorName: 'network_error', elapsedMs: 5000, retried: true });
    expect(msg).not.toMatch(/failed to fetch/i);
    expect(msg).toMatch(/could not reach our servers/i);
    expect(msg).toContain('info@squarespell.com');
  });

  it('an address that cannot be read says so and points to templates', () => {
    const f = { errorName: 'site_unreadable' as const, httpStatus: 422, elapsedMs: 10, retried: false };
    expect(analyzeFailureTitle(f)).toBe('We could not read that website');
    expect(analyzeFailureMessage(f)).toBe(UNREADABLE_SITE_MESSAGE);
    expect(UNREADABLE_SITE_MESSAGE).toMatch(/start from a template/);
  });

  it('server problems never show the status code or the server text', () => {
    for (const errorName of ['server_error', 'http_error', 'invalid_response'] as const) {
      const msg = analyzeFailureMessage({ errorName, httpStatus: 500, serverMessage: 'TypeError: x is undefined', elapsedMs: 10, retried: false });
      expect(msg).toBe(SERVER_PROBLEM_MESSAGE);
      expect(msg).not.toMatch(/500|TypeError/);
    }
  });

  it('every failure has a short side-panel label', () => {
    expect(analyzeFailureLabel('not_squarespace')).toBe('Not a Squarespace site');
    expect(analyzeFailureLabel('rate_limited')).toBe('Limit reached');
    expect(analyzeFailureLabel('network_error')).toBe('Connection problem');
    expect(analyzeFailureLabel('site_unreadable')).toBe('Site not readable');
    expect(analyzeFailureLabel('server_error')).toBe('Server problem');
  });

  it('a failed quiz build gets a next step, not the server text', () => {
    expect(buildFailureMessage(500, { error: 'Quiz build failed', code: 'build_failed' })).toBe(BUILD_FAILED_MESSAGE);
    expect(buildFailureMessage(404, { error: 'Session not found or expired. Please start again.' })).toMatch(/Enter your website again/);
    expect(buildFailureMessage(429, { retryAfterSeconds: 600 })).toMatch(/in about 10 minutes/);
    const ai = 'The AI service is temporarily unavailable. Please try again shortly.';
    expect(buildFailureMessage(503, { error: ai, code: 'ai_unavailable' })).toBe(ai);
  });
});

describe('error reporting', () => {
  const failure = {
    errorName: 'not_squarespace' as const,
    httpStatus: 422,
    serverMessage: 'private-bakery.example is not a Squarespace site.',
    elapsedMs: 1234.6,
    retried: false,
  };

  it('the payload is exactly { error_name, http_status, elapsed_ms, retried }', () => {
    expect(analyzeErrorEvent(failure)).toEqual({ error_name: 'not_squarespace', http_status: 422, elapsed_ms: 1235, retried: false });
    expect(analyzeErrorEvent({ errorName: 'network_error', elapsedMs: 6000, retried: true })).toEqual({ error_name: 'network_error', elapsed_ms: 6000, retried: true });
  });

  it('calls window.gtag only when it exists, without the website address (page_location has no query string)', () => {
    expect(() => reportAnalyzeFailure(failure)).not.toThrow(); // no gtag on the page: nothing happens
    const gtag = vi.fn();
    (window as any).gtag = gtag;
    window.history.replaceState({}, '', '/tools/quiz-funnel/build?url=private-bakery.example');
    reportAnalyzeFailure(failure);
    expect(gtag).toHaveBeenCalledTimes(1);
    const [kind, name, params] = gtag.mock.calls[0];
    expect(kind).toBe('event');
    expect(name).toBe('builder_analyze_error');
    expect(params).toEqual({
      error_name: 'not_squarespace',
      http_status: 422,
      elapsed_ms: 1235,
      retried: false,
      page_location: window.location.origin + '/tools/quiz-funnel/build',
    });
    expect(JSON.stringify(params)).not.toMatch(/private-bakery/);
  });

  it('does not load or call Sentry when no DSN is configured', async () => {
    sentry.client = {};
    reportAnalyzeFailure(failure);
    await new Promise((r) => setTimeout(r, 0));
    expect(sentry.captured).toEqual([]);
  });

  it('reports to Sentry when it is configured and initialised, with the page address and breadcrumbs stripped', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.example/1');
    sentry.client = {};
    reportAnalyzeFailure(failure);
    await vi.waitFor(() => expect(sentry.captured).toHaveLength(1));
    expect(sentry.captured[0]).toEqual({ msg: 'builder_analyze_error', level: 'warning' });
    expect(sentry.tags).toEqual({ error_name: 'not_squarespace', retried: 'false', http_status: '422' });
    expect(sentry.contexts.builder_analyze_error).toEqual({ error_name: 'not_squarespace', http_status: 422, elapsed_ms: 1235, retried: false });
    const stripped = sentry.processors[0]({
      message: 'builder_analyze_error',
      request: { url: 'https://app.example/tools/quiz-funnel/build?url=private-bakery.example' },
      breadcrumbs: [{ category: 'console', message: 'private-bakery.example' }],
    });
    expect(JSON.stringify(stripped)).not.toMatch(/private-bakery/);
  });

  it('skips Sentry when the SDK is present but not initialised', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.example/1');
    sentry.client = undefined;
    reportAnalyzeFailure(failure);
    await new Promise((r) => setTimeout(r, 10));
    expect(sentry.captured).toEqual([]);
  });
});
