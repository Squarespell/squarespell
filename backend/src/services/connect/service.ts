import crypto from 'crypto';
import { supabase } from '../../db/supabaseClient';
import { log } from '../../lib/logger';
import { isUuid } from '../../utils/ownership';
import { normalizeHostname, hostnameFromHeader } from './hostname';
import { verifySite } from './verify';
import type { SafeFetchOptions } from './urlSafety';
import {
  InstallMode, INSTALL_MODES, ReasonCode, USER_REPORTABLE_REASONS, HEARTBEAT_GRACE_MS, ManifestInstallation, Manifest,
  generateSiteKey, isValidSiteKey, isValidSlot, normalizePathRules, sanitizeOptions, buildManifestBody,
} from './rules';

export class ConnectError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ConnectError'; }
}

/** Feature flag: the whole connect surface (APIs, loader, manifest) is off unless CONNECT_ENABLED is exactly "true". */
export const connectEnabled = (): boolean => process.env.CONNECT_ENABLED === 'true';

/** Limits are configurable and UNSET by default (no limit). They are enforced only when the owner sets a positive integer. */
const limitFrom = (name: string): number | null => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function getConnectConfig() {
  const base = (process.env.FRONTEND_URL || process.env.APP_URL || 'https://squarespellquiz.com').replace(/\/+$/, '');
  return {
    enabled: connectEnabled(),
    loaderUrl: base + '/connect/loader.js',
    platforms: { available: ['squarespace', 'html'], planned: ['wordpress', 'shopify'], later: ['wix', 'webflow', 'framer'] },
    limits: { maxSites: limitFrom('CONNECT_MAX_SITES'), maxInstallationsPerSite: limitFrom('CONNECT_MAX_INSTALLATIONS_PER_SITE') },
  };
}

const SITE_COLS = 'id,platform,display_name,hostname,site_key,state,attention_reason,loader_version_seen,slots_seen,last_heartbeat_at,last_verified_at,created_at,updated_at,disconnected_at';
const INST_COLS = 'id,site_id,quiz_id,mode,placement_ref,path_include,path_exclude,options,status,published_version,failure_reason,created_at,updated_at,paused_at,removed_at';
const TRANSITIONAL = ['publishing', 'updating', 'moving', 'removing'];

export interface EventInput {
  siteId: string | null; userId: string; installationId?: string | null; actor?: 'user' | 'system' | 'loader';
  action: string; before?: unknown; after?: unknown; errorCode?: string | null; requestId?: string | null;
}

/** Every connection, verification, publish, update, pause, move, removal, failure and rollback leaves an event. */
export async function recordEvent(e: EventInput): Promise<void> {
  const { error } = await supabase.from('installation_events').insert({
    site_id: e.siteId, installation_id: e.installationId ?? null, user_id: e.userId, actor: e.actor ?? 'user', action: e.action,
    before_state: e.before ?? null, after_state: e.after ?? null, error_code: e.errorCode ?? null, request_id: e.requestId ?? null,
  });
  if (error) log.error('[connect] could not record event', { action: e.action, err: error.message });
}

// One change at a time per site inside this process: each change builds the whole manifest from the database rows.
const siteLocks = new Map<string, Promise<unknown>>();
async function withSiteLock<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
  const prev = siteLocks.get(siteId) || Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  siteLocks.set(siteId, run);
  try { return await run; } finally { if (siteLocks.get(siteId) === run) siteLocks.delete(siteId); }
}

async function loadSite(userId: string, siteId: string): Promise<any> {
  if (!isUuid(siteId)) throw new ConnectError(404, 'site_not_found', 'Website not found.');
  const { data } = await supabase.from('connected_sites').select(SITE_COLS).eq('id', siteId).eq('user_id', userId).maybeSingle();
  if (!data) throw new ConnectError(404, 'site_not_found', 'Website not found.');
  return data;
}

async function loadInstallation(userId: string, id: string): Promise<any> {
  if (!isUuid(id)) throw new ConnectError(404, 'installation_not_found', 'Installation not found.');
  const { data } = await supabase.from('quiz_installations').select(INST_COLS).eq('id', id).eq('user_id', userId).maybeSingle();
  if (!data) throw new ConnectError(404, 'installation_not_found', 'Installation not found.');
  return data;
}

// ── Sites ───────────────────────────────────────────────────────────────────────────────────────

export async function createSite(userId: string, input: { platform: unknown; domain: unknown; displayName?: unknown }, requestId?: string) {
  if (input.platform !== 'squarespace' && input.platform !== 'html') throw new ConnectError(400, 'platform_not_available', 'That platform is not available yet.');
  const host = normalizeHostname(input.domain);
  if (!host.ok) throw new ConnectError(400, 'invalid_domain', host.reason);
  const maxSites = limitFrom('CONNECT_MAX_SITES');
  if (maxSites) {
    const { count } = await supabase.from('connected_sites').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('state', 'disconnected');
    if ((count ?? 0) >= maxSites) throw new ConnectError(409, 'site_limit_reached', 'You have reached the number of websites your plan allows.');
  }
  const displayName = typeof input.displayName === 'string' ? input.displayName.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) : '';
  const { data, error } = await supabase.from('connected_sites')
    .insert({ user_id: userId, platform: input.platform, hostname: host.hostname, display_name: displayName || host.hostname, site_key: generateSiteKey(), state: 'draft' })
    .select(SITE_COLS).single();
  if (error) {
    if ((error as any).code === '23505') throw new ConnectError(409, 'site_exists', 'This website is already connected to your account.');
    throw new ConnectError(500, 'site_create_failed', 'We could not create the connection. Please try again.');
  }
  await recordEvent({ siteId: data.id, userId, action: 'site_created', after: { hostname: data.hostname, platform: data.platform }, requestId });
  return data;
}

export async function listSites(userId: string) {
  const { data: sites } = await supabase.from('connected_sites').select(SITE_COLS).eq('user_id', userId).neq('state', 'disconnected').order('created_at', { ascending: false });
  const list = sites || [];
  const counts: Record<string, { live: number; paused: number }> = {};
  if (list.length) {
    const { data: insts } = await supabase.from('quiz_installations').select('site_id,status').eq('user_id', userId).in('site_id', list.map((s: any) => s.id)).in('status', ['live', 'paused', 'updating', 'moving']);
    for (const i of insts || []) {
      const c = (counts[i.site_id] ||= { live: 0, paused: 0 });
      if (i.status === 'paused') c.paused++; else c.live++;
    }
  }
  return list.map((s: any) => ({ ...s, installations: counts[s.id] || { live: 0, paused: 0 }, health: healthOf(s) }));
}

/** Connection health shown in the dashboard. Derived, never stored. */
export function healthOf(site: { state: string; last_heartbeat_at: string | null; last_verified_at: string | null }): 'healthy' | 'awaiting_heartbeat' | 'stale' | 'not_verified' {
  if (site.state !== 'verified') return 'not_verified';
  const now = Date.now();
  if (!site.last_heartbeat_at) return site.last_verified_at && now - Date.parse(site.last_verified_at) > HEARTBEAT_GRACE_MS ? 'stale' : 'awaiting_heartbeat';
  return now - Date.parse(site.last_heartbeat_at) > 7 * 86_400_000 ? 'stale' : 'healthy';
}

export async function getSiteDetail(userId: string, siteId: string) {
  const site = await loadSite(userId, siteId);
  const { data: insts } = await supabase.from('quiz_installations').select(INST_COLS).eq('site_id', siteId).eq('user_id', userId).neq('status', 'removed').order('created_at', { ascending: false });
  const quizIds = Array.from(new Set((insts || []).map((i: any) => i.quiz_id)));
  const quizzes: Record<string, any> = {};
  if (quizIds.length) {
    const { data: qs } = await supabase.from('quizzes').select('id,title,slug,status').eq('user_id', userId).in('id', quizIds);
    for (const q of qs || []) quizzes[q.id] = q;
  }
  const { data: events } = await supabase.from('installation_events').select('id,installation_id,actor,action,error_code,created_at,after_state').eq('site_id', siteId).eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  const { data: checks } = await supabase.from('verification_checks').select('id,method,url_checked,result,reason_code,checked_at').eq('site_id', siteId).eq('user_id', userId).order('checked_at', { ascending: false }).limit(10);
  return {
    site: { ...site, health: healthOf(site) },
    installations: (insts || []).map((i: any) => ({ ...i, quiz: quizzes[i.quiz_id] ? { id: quizzes[i.quiz_id].id, title: quizzes[i.quiz_id].title, slug: quizzes[i.quiz_id].slug, status: quizzes[i.quiz_id].status } : null })),
    events: events || [], checks: checks || [],
  };
}

export async function verifyNow(userId: string, siteId: string, opts: { fetchOptions?: SafeFetchOptions; scheme?: 'https' | 'http'; requestId?: string } = {}) {
  const site = await loadSite(userId, siteId);
  if (site.state === 'disconnected') throw new ConnectError(409, 'site_disconnected', 'This website is disconnected.');
  const result = await verifySite({ hostname: site.hostname, siteKey: site.site_key, fetchOptions: opts.fetchOptions, scheme: opts.scheme });
  await supabase.from('verification_checks').insert({ site_id: site.id, user_id: userId, method: 'page_fetch', url_checked: result.url, result: result.ok ? 'ok' : 'failed', reason_code: result.reason });
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;
  if (result.ok) {
    const suspectBlocked = !site.last_heartbeat_at && site.last_verified_at && Date.now() - Date.parse(site.last_verified_at) > HEARTBEAT_GRACE_MS;
    const slots = Array.from(new Set([...(site.slots_seen || []), ...result.slots])).slice(0, 20);
    patch = suspectBlocked
      ? { state: 'needs_attention', attention_reason: 'blocked_by_csp_or_consent_manager', slots_seen: slots }
      : { state: site.state === 'paused' ? 'paused' : 'verified', attention_reason: null, last_verified_at: site.last_verified_at || now, slots_seen: slots };
    if (!suspectBlocked && site.state !== 'verified') patch.last_verified_at = now;
  } else {
    const wasVerified = site.state === 'verified' || (site.state === 'needs_attention' && !!site.last_verified_at);
    const reason: ReasonCode = wasVerified && result.reason === 'loader_not_found' ? 'verification_lost' : (result.reason as ReasonCode);
    patch = wasVerified ? { state: 'needs_attention', attention_reason: reason } : { state: 'verifying', attention_reason: reason };
  }
  const { data: updated } = await supabase.from('connected_sites').update({ ...patch, updated_at: now }).eq('id', site.id).eq('user_id', userId).select(SITE_COLS).single();
  await recordEvent({ siteId: site.id, userId, action: result.ok ? 'verify_ok' : 'verify_failed', errorCode: result.reason, before: { state: site.state }, after: { state: (updated as any)?.state, url: result.url }, requestId: opts.requestId });
  return { site: { ...(updated as any), health: healthOf(updated as any) }, result };
}

export async function reportAttention(userId: string, siteId: string, reason: unknown, requestId?: string) {
  if (!USER_REPORTABLE_REASONS.includes(reason as ReasonCode)) throw new ConnectError(400, 'invalid_reason', 'That reason cannot be reported.');
  const site = await loadSite(userId, siteId);
  const state = site.state === 'verified' ? 'needs_attention' : site.state === 'draft' ? 'verifying' : site.state;
  const { data } = await supabase.from('connected_sites').update({ state, attention_reason: reason, updated_at: new Date().toISOString() }).eq('id', site.id).eq('user_id', userId).select(SITE_COLS).single();
  await recordEvent({ siteId: site.id, userId, action: 'attention_reported', errorCode: reason as string, requestId });
  return data;
}

// ── Public: manifest and heartbeat ──────────────────────────────────────────────────────────────

export async function getPublicManifest(siteKey: unknown): Promise<Manifest> {
  if (!isValidSiteKey(siteKey)) throw new ConnectError(404, 'not_found', 'Not found.');
  const { data: site } = await supabase.from('connected_sites').select('id,hostname,site_key,state').eq('site_key', siteKey).maybeSingle();
  if (!site || site.state === 'disconnected') throw new ConnectError(404, 'not_found', 'Not found.');
  if (site.state === 'paused') return { ...buildManifestBody(site, [], true), version: 0 } as Manifest;
  const { data: row } = await supabase.from('manifest_versions').select('version,body').eq('site_id', site.id).eq('is_current', true).maybeSingle();
  if (!row) return { ...buildManifestBody(site, []), version: 0 } as Manifest;
  return row.body as Manifest;
}

export async function recordHeartbeat(input: { siteKey: unknown; origin?: unknown; referer?: unknown; body?: any }) {
  if (!isValidSiteKey(input.siteKey)) throw new ConnectError(404, 'not_found', 'Not found.');
  const { data: site } = await supabase.from('connected_sites').select('id,user_id,hostname,state,last_heartbeat_at,last_verified_at,slots_seen,loader_version_seen').eq('site_key', input.siteKey).maybeSingle();
  if (!site || site.state === 'disconnected') throw new ConnectError(404, 'not_found', 'Not found.');
  const from = hostnameFromHeader(input.origin) || hostnameFromHeader(input.referer);
  if (!from) throw new ConnectError(400, 'origin_required', 'The request must come from a web page.');
  if (from !== site.hostname) {
    // Wrong hostname: refused, and recorded at most once every ten minutes per site so the log cannot be flooded.
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabase.from('verification_checks').select('id', { count: 'exact', head: true }).eq('site_id', site.id).eq('method', 'heartbeat').eq('result', 'failed').gte('checked_at', since);
    if (!count) {
      await supabase.from('verification_checks').insert({ site_id: site.id, user_id: site.user_id, method: 'heartbeat', url_checked: null, result: 'failed', reason_code: 'wrong_domain' });
      await recordEvent({ siteId: site.id, userId: site.user_id, actor: 'loader', action: 'heartbeat_rejected', errorCode: 'wrong_domain' });
    }
    throw new ConnectError(403, 'wrong_domain', 'This site key belongs to a different website.');
  }
  const body = input.body && typeof input.body === 'object' ? input.body : {};
  const version = typeof body.version === 'string' && /^[0-9a-z.-]{1,20}$/i.test(body.version) ? body.version : null;
  const incoming = Array.isArray(body.slots) ? body.slots.filter(isValidSlot).slice(0, 20) : [];
  const slots = Array.from(new Set([...(site.slots_seen || []), ...incoming])).slice(0, 20);
  const slotsChanged = slots.length !== (site.slots_seen || []).length;
  const recent = site.last_heartbeat_at && Date.now() - Date.parse(site.last_heartbeat_at) < 60_000;
  const needsState = site.state === 'draft' || site.state === 'verifying' || site.state === 'needs_attention';
  if (recent && !slotsChanged && !needsState && (!version || version === site.loader_version_seen)) return { ok: true, recorded: false };
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { last_heartbeat_at: now, slots_seen: slots, updated_at: now };
  if (version) patch.loader_version_seen = version;
  if (needsState) Object.assign(patch, { state: 'verified', attention_reason: null, last_verified_at: now });
  await supabase.from('connected_sites').update(patch).eq('id', site.id);
  if (needsState) {
    await supabase.from('verification_checks').insert({ site_id: site.id, user_id: site.user_id, method: 'heartbeat', result: 'ok', reason_code: null });
    await recordEvent({ siteId: site.id, userId: site.user_id, actor: 'loader', action: 'verify_ok', before: { state: site.state }, after: { state: 'verified', via: 'heartbeat' } });
  }
  return { ok: true, recorded: true };
}

// ── Installations ───────────────────────────────────────────────────────────────────────────────

async function liveManifestInstallations(siteId: string, userId: string, override?: { row: any }): Promise<ManifestInstallation[]> {
  const { data: rows } = await supabase.from('quiz_installations').select(INST_COLS).eq('site_id', siteId).eq('user_id', userId).in('status', ['live', 'updating', 'moving', 'removing', 'publishing']);
  const byId: Record<string, any> = {};
  for (const r of rows || []) byId[r.id] = r;
  // The row being changed is represented by its TARGET values; every other row by its stored (still live) values.
  if (override) { if (override.row.status === 'live') byId[override.row.id] = override.row; else delete byId[override.row.id]; }
  else { for (const id of Object.keys(byId)) if (byId[id].status !== 'live') delete byId[id]; }
  for (const id of Object.keys(byId)) if (byId[id].status !== 'live' && !override) delete byId[id];
  const live = Object.values(byId).filter((r: any) => (override && r.id === override.row.id) ? r.status === 'live' : ['live', 'updating', 'moving', 'removing'].includes(r.status) && r.status !== 'publishing');
  const quizIds = Array.from(new Set(live.map((r: any) => r.quiz_id)));
  const slugs: Record<string, string> = {};
  if (quizIds.length) {
    const { data: qs } = await supabase.from('quizzes').select('id,slug,status').eq('user_id', userId).in('id', quizIds);
    for (const q of qs || []) if (q.status === 'live') slugs[q.id] = q.slug;
  }
  return live.filter((r: any) => slugs[r.quiz_id]).map((r: any) => ({
    id: r.id, quiz: slugs[r.quiz_id], mode: r.mode, slot: r.placement_ref || null, include: r.path_include || [], exclude: r.path_exclude || [], options: r.options || {},
  }));
}

async function publishManifestRow(site: any, userId: string, installations: ManifestInstallation[], actor = 'user'): Promise<number> {
  const body = buildManifestBody(site, installations, site.state === 'paused');
  const { data, error } = await supabase.rpc('connect_publish_manifest', { p_site: site.id, p_user: userId, p_body: body, p_actor: actor });
  if (error || typeof data !== 'number') throw new Error('manifest_publish_failed: ' + (error?.message || 'no version returned'));
  return data;
}

interface Change { userId: string; site: any; before: any | null; target: any; action: string; requestId?: string; faultAfterManifest?: boolean }

/**
 * Applies one change safely: publish the new manifest atomically, then record the installation. If anything fails after the
 * manifest was written, the previous manifest is restored (or an empty one published when there was none) and the installation row is
 * put back. A failed change therefore never alters what visitors see.
 */
async function commitChange(c: Change) {
  return withSiteLock(c.site.id, async () => {
    let version: number | null = null;
    try {
      const list = await liveManifestInstallations(c.site.id, c.userId, { row: c.target });
      version = await publishManifestRow(c.site, c.userId, list);
      if (c.faultAfterManifest) throw new Error('simulated failure after manifest publish');
      const patch: Record<string, unknown> = {
        placement_ref: c.target.placement_ref ?? null, path_include: c.target.path_include, path_exclude: c.target.path_exclude, options: c.target.options,
        status: c.target.status, published_version: version, failure_reason: null, updated_at: new Date().toISOString(),
        paused_at: c.target.status === 'paused' ? new Date().toISOString() : null, removed_at: c.target.status === 'removed' ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase.from('quiz_installations').update(patch).eq('id', c.target.id).eq('user_id', c.userId).select(INST_COLS).single();
      if (error) throw new Error('installation_update_failed: ' + error.message);
      await recordEvent({ siteId: c.site.id, userId: c.userId, installationId: c.target.id, action: c.action, before: c.before && pick(c.before), after: pick(data), requestId: c.requestId });
      return data;
    } catch (e: any) {
      log.error('[connect] change failed, restoring previous state', { action: c.action, err: e?.message });
      if (version !== null) {
        const { data: restored } = await supabase.rpc('connect_rollback_manifest', { p_site: c.site.id, p_user: c.userId });
        if (typeof restored !== 'number') await publishManifestRow(c.site, c.userId, await liveManifestInstallations(c.site.id, c.userId), 'system').catch(() => undefined);
        await recordEvent({ siteId: c.site.id, userId: c.userId, installationId: c.target.id, actor: 'system', action: 'rollback', after: { restoredVersion: typeof restored === 'number' ? restored : null }, requestId: c.requestId });
      }
      if (c.before) {
        await supabase.from('quiz_installations').update({ status: c.before.status, updated_at: new Date().toISOString() }).eq('id', c.target.id).eq('user_id', c.userId);
      } else {
        await supabase.from('quiz_installations').update({ status: 'failed', failure_reason: 'publish_failed', updated_at: new Date().toISOString() }).eq('id', c.target.id).eq('user_id', c.userId);
      }
      await recordEvent({ siteId: c.site.id, userId: c.userId, installationId: c.target.id, actor: 'system', action: c.action + '_failed', errorCode: 'publish_failed', requestId: c.requestId });
      throw new ConnectError(502, 'publish_failed', 'We could not publish this change. Your previous version is still live.');
    }
  });
}

const pick = (r: any) => r && ({ status: r.status, mode: r.mode, slot: r.placement_ref, include: r.path_include, exclude: r.path_exclude, options: r.options, version: r.published_version });

async function markTransitional(id: string, userId: string, status: string) {
  await supabase.from('quiz_installations').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
}

async function requireUsableSite(userId: string, siteId: string) {
  const site = await loadSite(userId, siteId);
  if (site.state === 'disconnected') throw new ConnectError(409, 'site_disconnected', 'This website is disconnected.');
  if (site.state === 'paused') throw new ConnectError(409, 'site_paused', 'Resume this website before publishing.');
  if (site.state !== 'verified') throw new ConnectError(409, 'site_not_verified', 'Verify the site loader before publishing a quiz.');
  return site;
}

async function ensureSlotPresent(site: any, slot: string, includeRules: string[], fetchOptions?: SafeFetchOptions, scheme?: 'https' | 'http') {
  if ((site.slots_seen || []).includes(slot)) return;
  const exact = includeRules.find((r) => !r.includes('*'));
  const r = await verifySite({ hostname: site.hostname, siteKey: site.site_key, path: exact || '/', fetchOptions, scheme });
  if (!r.slots.includes(slot)) throw new ConnectError(409, 'slot_missing', 'We could not find that slot on your page yet. Add the slot in a Code Block, save, then try again.');
  const slots = Array.from(new Set([...(site.slots_seen || []), ...r.slots])).slice(0, 20);
  await supabase.from('connected_sites').update({ slots_seen: slots }).eq('id', site.id);
}

export interface PublishInput { quizId: unknown; mode: unknown; slot?: unknown; include?: unknown; exclude?: unknown; options?: unknown }
export interface OpContext { requestId?: string; faultAfterManifest?: boolean; fetchOptions?: SafeFetchOptions; scheme?: 'https' | 'http' }

function parseTarget(input: { mode?: unknown; slot?: unknown; include?: unknown; exclude?: unknown; options?: unknown }, fallback?: any) {
  const mode = (input.mode ?? fallback?.mode) as InstallMode;
  if (!INSTALL_MODES.includes(mode)) throw new ConnectError(400, 'invalid_mode', 'Choose inline, popup or floating tab.');
  const inc = normalizePathRules(input.include !== undefined ? input.include : fallback?.path_include);
  const exc = normalizePathRules(input.exclude !== undefined ? input.exclude : fallback?.path_exclude);
  if (!inc.ok || !exc.ok) throw new ConnectError(400, 'invalid_page_rules', 'A page rule must look like /pricing, /services/* or *.');
  let slot: string | null = null;
  if (mode === 'inline') {
    const s = input.slot !== undefined ? input.slot : fallback?.placement_ref;
    if (!isValidSlot(s)) throw new ConnectError(400, 'invalid_slot', 'Slot names use lower-case letters, numbers and dashes, up to 40 characters.');
    slot = s;
  }
  const options = sanitizeOptions(mode, input.options !== undefined ? input.options : fallback?.options);
  return { mode, slot, include: inc.rules, exclude: exc.rules, options };
}

export async function publishInstallation(userId: string, siteId: string, input: PublishInput, ctx: OpContext = {}) {
  const site = await requireUsableSite(userId, siteId);
  if (!isUuid(input.quizId)) throw new ConnectError(404, 'quiz_not_found', 'Quiz not found.');
  const { data: quiz } = await supabase.from('quizzes').select('id,slug,status').eq('id', input.quizId).eq('user_id', userId).maybeSingle();
  if (!quiz) throw new ConnectError(404, 'quiz_not_found', 'Quiz not found.');
  if (quiz.status !== 'live') throw new ConnectError(409, 'quiz_not_live', 'Publish the quiz first, then add it to your website.');
  const t = parseTarget(input);
  if (t.mode === 'inline') await ensureSlotPresent(site, t.slot as string, t.include, ctx.fetchOptions, ctx.scheme);

  // Duplicate requests for the same quiz, mode and slot address ONE installation.
  let q = supabase.from('quiz_installations').select(INST_COLS).eq('site_id', site.id).eq('quiz_id', quiz.id).eq('mode', t.mode).neq('status', 'removed');
  q = t.slot ? q.eq('placement_ref', t.slot) : q.is('placement_ref', null);
  const { data: existing } = await q.maybeSingle();
  if (existing) {
    if (TRANSITIONAL.includes(existing.status)) throw new ConnectError(409, 'busy', 'A change to this installation is already in progress.');
    const same = existing.status === 'live' && JSON.stringify([existing.path_include, existing.path_exclude, existing.options]) === JSON.stringify([t.include, t.exclude, t.options]);
    if (same) return { installation: existing, created: false, changed: false };
    const target = { ...existing, placement_ref: t.slot, path_include: t.include, path_exclude: t.exclude, options: t.options, status: 'live' };
    await markTransitional(existing.id, userId, 'updating');
    const inst = await commitChange({ userId, site, before: existing, target, action: 'install_updated', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
    return { installation: inst, created: false, changed: true };
  }
  const maxPer = limitFrom('CONNECT_MAX_INSTALLATIONS_PER_SITE');
  if (maxPer) {
    const { count } = await supabase.from('quiz_installations').select('id', { count: 'exact', head: true }).eq('site_id', site.id).neq('status', 'removed');
    if ((count ?? 0) >= maxPer) throw new ConnectError(409, 'installation_limit_reached', 'This website has reached the number of quizzes your plan allows.');
  }
  const { data: created, error } = await supabase.from('quiz_installations')
    .insert({ site_id: site.id, user_id: userId, quiz_id: quiz.id, mode: t.mode, placement_ref: t.slot, path_include: t.include, path_exclude: t.exclude, options: t.options, status: 'publishing' })
    .select(INST_COLS).single();
  if (error) {
    if ((error as any).code === '23505') throw new ConnectError(409, 'busy', 'This quiz is already being added here.');
    throw new ConnectError(500, 'install_create_failed', 'We could not start publishing. Please try again.');
  }
  const inst = await commitChange({ userId, site, before: null, target: { ...created, status: 'live' }, action: 'published', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
  return { installation: inst, created: true, changed: true };
}

export async function updateInstallation(userId: string, id: string, input: { include?: unknown; exclude?: unknown; slot?: unknown; options?: unknown }, kind: 'update' | 'move', ctx: OpContext = {}) {
  const cur = await loadInstallation(userId, id);
  const site = await requireUsableSite(userId, cur.site_id);
  if (TRANSITIONAL.includes(cur.status)) throw new ConnectError(409, 'busy', 'A change to this installation is already in progress.');
  if (cur.status === 'removed') throw new ConnectError(404, 'installation_not_found', 'Installation not found.');
  const t = parseTarget({ mode: cur.mode, slot: input.slot, include: input.include, exclude: input.exclude, options: input.options }, cur);
  if (t.mode === 'inline' && t.slot !== cur.placement_ref) await ensureSlotPresent(site, t.slot as string, t.include, ctx.fetchOptions, ctx.scheme);
  const target = { ...cur, placement_ref: t.slot, path_include: t.include, path_exclude: t.exclude, options: t.options, status: cur.status === 'paused' ? 'paused' : 'live' };
  if (cur.status === 'paused') {
    // Not in the manifest: store the new settings without publishing anything.
    const { data } = await supabase.from('quiz_installations').update({ placement_ref: t.slot, path_include: t.include, path_exclude: t.exclude, options: t.options, updated_at: new Date().toISOString() }).eq('id', cur.id).eq('user_id', userId).select(INST_COLS).single();
    await recordEvent({ siteId: site.id, userId, installationId: cur.id, action: kind === 'move' ? 'moved' : 'updated', before: pick(cur), after: pick(data), requestId: ctx.requestId });
    return data;
  }
  await markTransitional(cur.id, userId, kind === 'move' ? 'moving' : 'updating');
  return commitChange({ userId, site, before: cur, target, action: kind === 'move' ? 'moved' : 'updated', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
}

export async function pauseInstallation(userId: string, id: string, ctx: OpContext = {}) {
  const cur = await loadInstallation(userId, id);
  const site = await requireUsableSite(userId, cur.site_id);
  if (cur.status === 'paused') return cur;
  if (cur.status !== 'live') throw new ConnectError(409, 'not_live', 'Only a live installation can be paused.');
  return commitChange({ userId, site, before: cur, target: { ...cur, status: 'paused' }, action: 'paused', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
}

export async function resumeInstallation(userId: string, id: string, ctx: OpContext = {}) {
  const cur = await loadInstallation(userId, id);
  const site = await requireUsableSite(userId, cur.site_id);
  if (cur.status === 'live') return cur;
  if (cur.status !== 'paused') throw new ConnectError(409, 'not_paused', 'Only a paused installation can be resumed.');
  return commitChange({ userId, site, before: cur, target: { ...cur, status: 'live' }, action: 'resumed', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
}

export async function removeInstallation(userId: string, id: string, ctx: OpContext = {}) {
  const cur = await loadInstallation(userId, id);
  const site = await loadSite(userId, cur.site_id);
  if (cur.status === 'removed') return cur;
  if (TRANSITIONAL.includes(cur.status)) throw new ConnectError(409, 'busy', 'A change to this installation is already in progress.');
  await markTransitional(cur.id, userId, 'removing');
  return commitChange({ userId, site, before: cur, target: { ...cur, status: 'removed' }, action: 'removed', requestId: ctx.requestId, faultAfterManifest: ctx.faultAfterManifest });
}

/** Pause or resume the whole website. A paused site serves an empty, paused manifest; installations keep their own state. */
export async function setSitePaused(userId: string, siteId: string, paused: boolean, requestId?: string) {
  const site = await loadSite(userId, siteId);
  if (site.state === 'disconnected') throw new ConnectError(409, 'site_disconnected', 'This website is disconnected.');
  if (paused && site.state === 'paused') return site;
  if (!paused && site.state !== 'paused') return site;
  const nextState = paused ? 'paused' : (site.last_verified_at ? 'verified' : 'verifying');
  return withSiteLock(site.id, async () => {
    const next = { ...site, state: nextState };
    const list = await liveManifestInstallations(site.id, userId);
    await publishManifestRow(next, userId, list);
    const { data } = await supabase.from('connected_sites').update({ state: nextState, updated_at: new Date().toISOString() }).eq('id', site.id).eq('user_id', userId).select(SITE_COLS).single();
    await recordEvent({ siteId: site.id, userId, action: paused ? 'site_paused' : 'site_resumed', before: { state: site.state }, after: { state: nextState }, requestId });
    return data;
  });
}

/** Disconnect: the manifest is emptied FIRST (quizzes leave the live site at once), then tokens are deleted and the site is closed. */
export async function disconnectSite(userId: string, siteId: string, requestId?: string) {
  const site = await loadSite(userId, siteId);
  if (site.state === 'disconnected') return site;
  return withSiteLock(site.id, async () => {
    try {
      await publishManifestRow(site, userId, [], 'user');
    } catch (e: any) {
      await recordEvent({ siteId: site.id, userId, actor: 'system', action: 'disconnect_failed', errorCode: 'publish_failed', requestId });
      throw new ConnectError(502, 'publish_failed', 'We could not disconnect this website yet. Nothing was changed. Please try again.');
    }
    const now = new Date().toISOString();
    await supabase.from('quiz_installations').update({ status: 'removed', removed_at: now, updated_at: now }).eq('site_id', site.id).eq('user_id', userId).neq('status', 'removed');
    await supabase.from('site_authorizations').delete().eq('site_id', site.id).eq('user_id', userId);
    const { data } = await supabase.from('connected_sites').update({ state: 'disconnected', disconnected_at: now, updated_at: now }).eq('id', site.id).eq('user_id', userId).select(SITE_COLS).single();
    await recordEvent({ siteId: site.id, userId, action: 'site_disconnected', before: { state: site.state }, after: { state: 'disconnected' }, requestId });
    return data;
  });
}

export async function listEvents(userId: string, siteId: string, limit = 100) {
  await loadSite(userId, siteId);
  const { data } = await supabase.from('installation_events').select('id,installation_id,actor,action,error_code,created_at,before_state,after_state').eq('site_id', siteId).eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 200));
  return data || [];
}

export const newRequestId = () => crypto.randomUUID();
