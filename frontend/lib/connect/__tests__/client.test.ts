/** The connect API client: a long-open dashboard page must never send an expired token. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { connectApi, ConnectApiError, freshToken } from '../client';

afterEach(() => { vi.unstubAllGlobals(); delete (globalThis as any).Clerk; });

const okFetch = () => { const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ sites: [] }) }); vi.stubGlobal('fetch', f); return f; };
const sent = (f: ReturnType<typeof vi.fn>) => (f.mock.calls[0][1] as any).headers.Authorization as string;

describe('token freshness', () => {
  it('asks the live Clerk session for a new token on every call, not the one captured at page load', async () => {
    let n = 0;
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async () => 'fresh-' + ++n) } };
    const f = okFetch();
    const api = connectApi('captured-at-page-load');
    await api.listSites();
    await api.listSites();
    expect((f.mock.calls[0][1] as any).headers.Authorization).toBe('Bearer fresh-1');
    expect((f.mock.calls[1][1] as any).headers.Authorization).toBe('Bearer fresh-2');
  });
  it('falls back to the given token without Clerk, or when Clerk cannot answer', async () => {
    const f = okFetch();
    await connectApi('given').listSites();
    expect(sent(f)).toBe('Bearer given');
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async () => { throw new Error('offline'); }) } };
    const g = okFetch();
    await connectApi('given').listSites();
    expect(sent(g)).toBe('Bearer given');
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async () => null) } };
    expect(await freshToken('given')).toBe('given');
    (globalThis as any).Clerk = {};
    expect(await freshToken('given')).toBe('given');
  });
});

describe('a stale token from a backgrounded tab', () => {
  it('retries once with a forced refresh on a 401, and the caller never sees it', async () => {
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async (opts?: { skipCache?: boolean }) => (opts?.skipCache ? 'forced-fresh' : 'stale')) } };
    const f = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ code: 'token_expired' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ sites: [] }) });
    vi.stubGlobal('fetch', f);
    const result = await connectApi('given').listSites();
    expect(result).toEqual({ sites: [] });
    expect(f).toHaveBeenCalledTimes(2);
    expect((f.mock.calls[0][1] as any).headers.Authorization).toBe('Bearer stale');
    expect((f.mock.calls[1][1] as any).headers.Authorization).toBe('Bearer forced-fresh');
  });
  it('still fails cleanly when the retry is also rejected', async () => {
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async () => 'still-stale') } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: 'token_expired' }) }));
    await expect(connectApi('given').listSites()).rejects.toMatchObject({ status: 401, code: 'token_expired' });
  });
  it('does not retry a non-401 failure', async () => {
    (globalThis as any).Clerk = { session: { getToken: vi.fn(async () => 'tok') } };
    const f = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ code: 'error' }) });
    vi.stubGlobal('fetch', f);
    await expect(connectApi('given').listSites()).rejects.toMatchObject({ status: 500 });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('errors', () => {
  it('turns an API error into a typed error with its code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'This website is already connected to your account.', code: 'site_exists' }) }));
    await expect(connectApi('t').createSite('html', 'shop.example')).rejects.toMatchObject({ name: 'ConnectApiError', status: 409, code: 'site_exists' });
  });
  it('reports an unreachable API as a network error, never a crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await connectApi('t').listSites().catch((e) => e);
    expect(err).toBeInstanceOf(ConnectApiError);
    expect(err.code).toBe('network');
  });
  it('a response without a JSON body still fails cleanly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('no body'); } }));
    const err = await connectApi('t').listSites().catch((e) => e);
    expect(err.status).toBe(502);
    expect(err.code).toBe('error');
  });
});
