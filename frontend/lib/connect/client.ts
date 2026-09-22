/** Typed client for the one-button connect API. Every call needs the signed-in user's token; nothing here holds a secret. */
export type Platform = 'squarespace' | 'html';
export type SiteState = 'draft' | 'verifying' | 'verified' | 'needs_attention' | 'paused' | 'disconnected';
export type Health = 'healthy' | 'awaiting_heartbeat' | 'stale' | 'not_verified';
export type InstallMode = 'inline' | 'popup' | 'floating_tab';
export type InstallStatus = 'draft' | 'publishing' | 'live' | 'updating' | 'paused' | 'moving' | 'removing' | 'removed' | 'failed';

export interface Site {
  id: string; platform: Platform; display_name: string | null; hostname: string; site_key: string; state: SiteState; attention_reason: string | null;
  loader_version_seen: string | null; slots_seen: string[]; last_heartbeat_at: string | null; last_verified_at: string | null;
  created_at: string; updated_at: string; disconnected_at: string | null; health: Health; installations?: { live: number; paused: number };
}
export interface DisplayOptions { buttonText?: string; accentColor?: string; height?: number; trigger?: 'delay' | 'scroll' | 'exit'; delaySeconds?: number; scrollPercent?: number; hideOnMobile?: boolean; dismissDays?: number }
export interface Installation {
  id: string; site_id: string; quiz_id: string; mode: InstallMode; placement_ref: string | null; path_include: string[]; path_exclude: string[];
  options: DisplayOptions; status: InstallStatus; published_version: number | null; failure_reason: string | null; created_at: string; updated_at: string;
  paused_at: string | null; removed_at: string | null; quiz?: { id: string; title: string; slug: string; status: string } | null;
}
export interface SiteEvent { id: string; installation_id: string | null; actor: 'user' | 'system' | 'loader'; action: string; error_code: string | null; created_at: string }
export interface VerificationCheck { id: string; method: 'page_fetch' | 'heartbeat'; url_checked: string | null; result: 'ok' | 'failed'; reason_code: string | null; checked_at: string }
export interface VerifyResult { ok: boolean; reason: string | null; url: string; status: number | null; loaderFound: boolean; slots: string[] }
export interface ConnectConfig { enabled: boolean; loaderUrl: string; platforms: { available: string[]; planned: string[]; later: string[] }; limits: { maxSites: number | null; maxInstallationsPerSite: number | null } }
export interface QuizSummary { id: string; title: string; slug: string; status: string }

export class ConnectApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ConnectApiError'; }
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

/**
 * Clerk session tokens live about a minute, but a dashboard page can stay open for hours. Every call therefore asks the live Clerk session
 * for a fresh token and only falls back to the one the page was given (tests, or a page without Clerk).
 */
export async function freshToken(fallback: string): Promise<string> {
  try {
    const clerk = (globalThis as any).Clerk;
    const t = clerk && clerk.session ? await clerk.session.getToken() : null;
    return t || fallback;
  } catch {
    return fallback;
  }
}

async function doFetch(bearer: string, method: string, path: string, body?: unknown): Promise<{ res: Response; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(API + path, {
      method, signal: controller.signal,
      headers: { Authorization: 'Bearer ' + bearer, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { res, data };
  } finally { clearTimeout(timer); }
}

/**
 * A dashboard tab can sit backgrounded for a long time, and Clerk's own refresh timer is throttled while it is hidden.
 * The token freshToken() hands back can therefore still be the one that just expired. One 401 gets one retry with a
 * forced refresh (skipCache) before we give up and surface an error, so coming back to an old tab does not show
 * empty data or a false failure.
 */
async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  try {
    const bearer = await freshToken(token);
    let { res, data } = await doFetch(bearer, method, path, body);
    if (res.status === 401) {
      const clerk = (globalThis as any).Clerk;
      const retried: string | null = clerk?.session ? await clerk.session.getToken({ skipCache: true }).catch(() => null) : null;
      if (retried && retried !== bearer) ({ res, data } = await doFetch(retried, method, path, body));
    }
    if (!res.ok) throw new ConnectApiError(res.status, (data && data.code) || 'error', (data && data.error) || 'Something went wrong. Please try again.');
    return data as T;
  } catch (e: any) {
    if (e instanceof ConnectApiError) throw e;
    if (e?.name === 'AbortError') throw new ConnectApiError(0, 'timeout', 'That took too long. Please check your connection and try again.');
    throw new ConnectApiError(0, 'network', 'We could not reach Squarespell. Please check your connection and try again.');
  }
}

export function connectApi(token: string) {
  return {
    config: () => call<ConnectConfig>(token, 'GET', '/api/connect/config'),
    listSites: () => call<{ sites: Site[] }>(token, 'GET', '/api/connect/sites'),
    createSite: (platform: Platform, domain: string) => call<{ site: Site; loaderUrl: string }>(token, 'POST', '/api/connect/sites', { platform, domain }),
    getSite: (id: string) => call<{ site: Site; installations: Installation[]; events: SiteEvent[]; checks: VerificationCheck[]; loaderUrl: string }>(token, 'GET', '/api/connect/sites/' + id),
    verify: (id: string) => call<{ site: Site; result: VerifyResult }>(token, 'POST', '/api/connect/sites/' + id + '/verify'),
    reportAttention: (id: string, reason: string) => call<{ site: Site }>(token, 'POST', '/api/connect/sites/' + id + '/attention', { reason }),
    pauseSite: (id: string) => call<{ site: Site }>(token, 'POST', '/api/connect/sites/' + id + '/pause'),
    resumeSite: (id: string) => call<{ site: Site }>(token, 'POST', '/api/connect/sites/' + id + '/resume'),
    disconnect: (id: string) => call<{ site: Site }>(token, 'POST', '/api/connect/sites/' + id + '/disconnect'),
    publish: (siteId: string, body: { quizId: string; mode: InstallMode; slot?: string; include?: string[]; exclude?: string[]; options?: DisplayOptions }) =>
      call<{ installation: Installation; created: boolean; changed: boolean }>(token, 'POST', '/api/connect/sites/' + siteId + '/installations', body),
    update: (id: string, body: { include?: string[]; exclude?: string[]; options?: DisplayOptions }) => call<{ installation: Installation }>(token, 'PATCH', '/api/connect/installations/' + id, body),
    move: (id: string, body: { include?: string[]; exclude?: string[]; slot?: string }) => call<{ installation: Installation }>(token, 'POST', '/api/connect/installations/' + id + '/move', body),
    pause: (id: string) => call<{ installation: Installation }>(token, 'POST', '/api/connect/installations/' + id + '/pause'),
    resume: (id: string) => call<{ installation: Installation }>(token, 'POST', '/api/connect/installations/' + id + '/resume'),
    remove: (id: string) => call<{ installation: Installation }>(token, 'DELETE', '/api/connect/installations/' + id),
    quizzes: () => call<QuizSummary[]>(token, 'GET', '/api/quizzes'),
    /** Reads the PUBLIC manifest exactly as the loader does; used to confirm a publish reached the live manifest. */
    publicManifest: async (siteKey: string): Promise<{ version: number; installations: Array<{ id: string }> } | null> => {
      try {
        const r = await fetch(API + '/api/public/connect/manifest?site=' + encodeURIComponent(siteKey), { cache: 'no-store' });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    },
  };
}

export const loaderSnippet = (loaderUrl: string, siteKey: string) => '<script async src="' + loaderUrl + '" data-site="' + siteKey + '"></script>';
export const slotSnippet = (slot: string) => '<div data-squarespell-slot="' + slot + '"></div>';
