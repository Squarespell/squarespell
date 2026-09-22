import express, { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import { log } from '../lib/logger';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { safeLimit, getClientIp, connectManifestLimiter, connectHeartbeatLimiter, connectVerifyLimiter, connectPublishLimiter, RateLimiter } from '../services/rateLimiter';
import {
  ConnectError, connectEnabled, getConnectConfig, createSite, listSites, getSiteDetail, verifyNow, reportAttention, setSitePaused, disconnectSite,
  listEvents, publishInstallation, updateInstallation, pauseInstallation, resumeInstallation, removeInstallation, getPublicManifest, recordHeartbeat, newRequestId,
} from '../services/connect/service';

/**
 * One-button connect API. Everything here is behind the CONNECT_ENABLED feature flag (off by default).
 *   /api/connect/*          authenticated, tenant-scoped (every query filters on the caller's database user id)
 *   /api/public/connect/*   manifest and heartbeat for the site loader (public, rate-limited, display data only)
 */
export const connectRouter = Router();
export const publicConnectRouter = Router();

const handle = (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
  try {
    await fn(req as AuthenticatedRequest, res);
  } catch (e: any) {
    if (e instanceof ConnectError) return res.status(e.status).json({ error: e.message, code: e.code });
    log.error('[connect] unexpected error', { path: req.path, err: e?.message });
    return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'internal_error' });
  }
};

const requireFlag = (_req: Request, res: Response, next: NextFunction) => (connectEnabled() ? next() : res.status(404).json({ error: 'Not found', code: 'not_found' }));

async function limited(limiter: RateLimiter, key: string, res: Response): Promise<boolean> {
  const { success } = await safeLimit(limiter, key);
  if (success) return false;
  res.setHeader('Retry-After', '60');
  res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.', code: 'rate_limited' });
  return true;
}

const uid = (req: AuthenticatedRequest): string => {
  if (!req.dbUserId) throw new ConnectError(401, 'auth_required', 'Please sign in again.');
  return req.dbUserId;
};
const ctxOf = (req: Request, requestId: string) => ({
  requestId,
  // Test-only fault injection for the staging fixture: needs CONNECT_TEST_FAULTS=true on the server AND the header.
  faultAfterManifest: process.env.CONNECT_TEST_FAULTS === 'true' && req.headers['x-connect-fault'] === 'after_manifest',
});

// ── Authenticated ───────────────────────────────────────────────────────────────────────────────

// The dashboard asks this to decide whether to show Sites at all; it answers even when the feature is off.
connectRouter.get('/config', requireAuth, (_req, res) => { res.json(getConnectConfig()); });

// Authentication first: a request without a valid token is 401 whether or not the feature is on (nothing about the flag leaks).
// A signed-in caller gets 404 while the flag is off.
connectRouter.use(requireAuth, requireFlag, attachUser);

connectRouter.get('/sites', handle(async (req, res) => { res.json({ sites: await listSites(uid(req)) }); }));

connectRouter.post('/sites', handle(async (req, res) => {
  const site = await createSite(uid(req), { platform: req.body?.platform, domain: req.body?.domain, displayName: req.body?.displayName }, newRequestId());
  res.status(201).json({ site, loaderUrl: getConnectConfig().loaderUrl });
}));

connectRouter.get('/sites/:id', handle(async (req, res) => { res.json({ ...(await getSiteDetail(uid(req), req.params.id)), loaderUrl: getConnectConfig().loaderUrl }); }));

connectRouter.post('/sites/:id/verify', handle(async (req, res) => {
  if (await limited(connectVerifyLimiter, 'u:' + uid(req), res)) return;
  res.json(await verifyNow(uid(req), req.params.id, { requestId: newRequestId() }));
}));

connectRouter.post('/sites/:id/attention', handle(async (req, res) => { res.json({ site: await reportAttention(uid(req), req.params.id, req.body?.reason, newRequestId()) }); }));
connectRouter.post('/sites/:id/pause', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ site: await setSitePaused(uid(req), req.params.id, true, newRequestId()) });
}));
connectRouter.post('/sites/:id/resume', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ site: await setSitePaused(uid(req), req.params.id, false, newRequestId()) });
}));
connectRouter.post('/sites/:id/disconnect', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ site: await disconnectSite(uid(req), req.params.id, newRequestId()) });
}));
connectRouter.get('/sites/:id/events', handle(async (req, res) => { res.json({ events: await listEvents(uid(req), req.params.id, Number(req.query.limit) || 100) }); }));

connectRouter.post('/sites/:id/installations', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  const out = await publishInstallation(uid(req), req.params.id, req.body || {}, ctxOf(req, newRequestId()));
  res.status(out.created ? 201 : 200).json(out);
}));

connectRouter.patch('/installations/:id', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ installation: await updateInstallation(uid(req), req.params.id, req.body || {}, 'update', ctxOf(req, newRequestId())) });
}));
connectRouter.post('/installations/:id/move', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ installation: await updateInstallation(uid(req), req.params.id, req.body || {}, 'move', ctxOf(req, newRequestId())) });
}));
connectRouter.post('/installations/:id/pause', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ installation: await pauseInstallation(uid(req), req.params.id, ctxOf(req, newRequestId())) });
}));
connectRouter.post('/installations/:id/resume', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ installation: await resumeInstallation(uid(req), req.params.id, ctxOf(req, newRequestId())) });
}));
connectRouter.delete('/installations/:id', handle(async (req, res) => {
  if (await limited(connectPublishLimiter, 'u:' + uid(req), res)) return;
  res.json({ installation: await removeInstallation(uid(req), req.params.id, ctxOf(req, newRequestId())) });
}));

// ── Public (site loader) ────────────────────────────────────────────────────────────────────────

publicConnectRouter.use(requireFlag);

publicConnectRouter.get('/manifest', handle(async (req, res) => {
  const site = String(req.query.site || '');
  if (await limited(connectManifestLimiter, getClientIp(req) + ':' + site.slice(0, 40), res)) return;
  try {
    const manifest = await getPublicManifest(site);
    const etag = '"' + manifest.version + '-' + crypto.createHash('sha1').update(JSON.stringify(manifest.installations) + manifest.paused).digest('hex').slice(0, 12) + '"';
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.json(manifest);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    throw e;
  }
}));

// The loader posts JSON as text/plain (a "simple" request, so browsers send no preflight); application/json is accepted too.
publicConnectRouter.post('/heartbeat', express.text({ type: '*/*', limit: '2kb' }), handle(async (req, res) => {
  const site = String(req.query.site || (req.body && typeof req.body === 'object' ? (req.body as any).site : '') || '');
  if (await limited(connectHeartbeatLimiter, getClientIp(req) + ':' + site.slice(0, 40), res)) return;
  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const siteKey = site || body?.site;
  res.setHeader('Cache-Control', 'no-store');
  res.json(await recordHeartbeat({ siteKey, origin: req.headers.origin, referer: req.headers.referer, body }));
}));
