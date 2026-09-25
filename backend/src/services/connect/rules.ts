import crypto from 'crypto';

/** Shared rules for connected sites: keys, slot names, page rules, display options. Pure functions, no I/O. */

export type InstallMode = 'inline' | 'popup' | 'floating_tab';
export const INSTALL_MODES: InstallMode[] = ['inline', 'popup', 'floating_tab'];

export const REASON_CODES = [
  'loader_not_found', 'wrong_domain', 'page_requires_login', 'plan_does_not_allow_custom_code', 'blocked_by_csp_or_consent_manager',
  'site_private', 'slot_missing', 'token_expired', 'token_revoked', 'timeout', 'verification_lost', 'unreachable',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];
/** Reasons the customer can report themselves (we cannot detect them from outside the site). */
export const USER_REPORTABLE_REASONS: ReasonCode[] = ['plan_does_not_allow_custom_code'];

/** After a page fetch finds the loader, a heartbeat must arrive within this window, otherwise a blocker is suspected. */
export const HEARTBEAT_GRACE_MS = 120_000;

/** Public, high-entropy site identifier. 192 bits of randomness; it identifies a site and grants no account access. */
export function generateSiteKey(): string {
  return 'ssq_' + crypto.randomBytes(24).toString('base64url');
}
export const isValidSiteKey = (v: unknown): v is string => typeof v === 'string' && /^ssq_[A-Za-z0-9_-]{32}$/.test(v);

const SLOT = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const isValidSlot = (v: unknown): v is string => typeof v === 'string' && SLOT.test(v);

/** Canonical path: no query or hash, lower-case, no trailing slash (except the root). */
export function canonicalPath(p: string): string {
  let s = String(p || '/').split('#')[0].split('?')[0].toLowerCase();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

/**
 * A page rule is an exact path ("/pricing"), a section ("/services/*", which also matches "/services"), or "*" for every page.
 * Returns the normalised rule, or null when it is not valid.
 */
export function normalizePathRule(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (s === '*' || s === '/*') return '*';
  if (!s.startsWith('/') || s.length > 200 || /[\s<>"'`\\?#]/.test(s)) return null;
  const star = s.indexOf('*');
  if (star !== -1 && !(star === s.length - 1 && s.endsWith('/*'))) return null;
  return star === -1 ? canonicalPath(s) : s;
}

export function normalizePathRules(raw: unknown, max = 20): { ok: true; rules: string[] } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, rules: [] };
  if (!Array.isArray(raw) || raw.length > max) return { ok: false };
  const out: string[] = [];
  for (const r of raw) {
    const n = normalizePathRule(r);
    if (n === null) return { ok: false };
    if (!out.includes(n)) out.push(n);
  }
  return { ok: true, rules: out };
}

export function ruleMatches(rule: string, path: string): boolean {
  if (rule === '*') return true;
  if (rule.endsWith('/*')) {
    const base = rule.slice(0, -2);
    return path === base || path.startsWith(base + '/');
  }
  return rule === path;
}

/** Exclusions win. No include rules means every page. The loader implements the same algorithm (see frontend/lib/connect/loaderSource.ts). */
export function matchesPath(path: string, include: string[], exclude: string[]): boolean {
  const p = canonicalPath(path);
  if (exclude.some((r) => ruleMatches(r, p))) return false;
  return include.length === 0 || include.some((r) => ruleMatches(r, p));
}

export interface DisplayOptions {
  buttonText?: string;
  accentColor?: string;
  height?: number;
  trigger?: 'delay' | 'scroll' | 'exit';
  delaySeconds?: number;
  scrollPercent?: number;
  hideOnMobile?: true;
  dismissDays?: number;
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');

/** Only these display fields ever reach a public manifest. Anything else the client sends is dropped. */
export function sanitizeOptions(mode: InstallMode, raw: unknown): DisplayOptions {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: DisplayOptions = {};
  const text = clean(o.buttonText, 40);
  if (text && mode !== 'inline') out.buttonText = text;
  if (typeof o.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(o.accentColor)) out.accentColor = o.accentColor.toLowerCase();
  if (mode === 'inline' && Number.isInteger(o.height) && (o.height as number) >= 200 && (o.height as number) <= 2000) out.height = o.height as number;
  if (mode !== 'inline' && o.hideOnMobile === true) out.hideOnMobile = true;
  if (mode === 'popup') {
    if (Number.isInteger(o.dismissDays) && (o.dismissDays as number) >= 1 && (o.dismissDays as number) <= 30) out.dismissDays = o.dismissDays as number;
    const t = o.trigger;
    out.trigger = t === 'scroll' || t === 'exit' ? t : 'delay';
    if (out.trigger === 'delay') out.delaySeconds = Number.isInteger(o.delaySeconds) && (o.delaySeconds as number) >= 0 && (o.delaySeconds as number) <= 120 ? (o.delaySeconds as number) : 8;
    if (out.trigger === 'scroll') out.scrollPercent = Number.isInteger(o.scrollPercent) && (o.scrollPercent as number) >= 10 && (o.scrollPercent as number) <= 90 ? (o.scrollPercent as number) : 50;
  }
  return out;
}

/** The public manifest served to the loader. Display configuration only: no ids of people, no emails, no secrets. */
export interface ManifestInstallation {
  id: string; quiz: string; mode: InstallMode; slot: string | null; include: string[]; exclude: string[]; options: DisplayOptions;
}
export interface Manifest { v: 1; site: string; hostname: string; version: number; paused: boolean; generatedAt: string; installations: ManifestInstallation[] }

export function buildManifestBody(site: { site_key: string; hostname: string }, installations: ManifestInstallation[], paused = false): Omit<Manifest, 'version'> & { version: number } {
  return { v: 1, site: site.site_key, hostname: site.hostname, version: 0, paused, generatedAt: new Date().toISOString(), installations: paused ? [] : installations };
}
