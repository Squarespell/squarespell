/**
 * Free-trial abuse protection, in one place (migration 037).
 *
 * 1. One free trial per website. The first account whose quiz collects a lead on a website records that website with
 *    its own trial end (site_trials). Another account's quiz on the same website gets no new trial there: once the
 *    website's trial has ended, its leads are held exactly as after any trial, until that account chooses a plan.
 *    Sign-ups are never blocked, and an honest new customer with a new website is not affected.
 * 2. One account per mailbox. canonicalEmail() treats Gmail dots, googlemail.com and "+tags" as the same address, and
 *    throwaway inbox domains cannot sign up.
 * 3. Possible duplicates are only shown to the owner (admin customer list): accounts used from the same browser (a random
 *    first-party security cookie, stored as a salted hash) or signed up from the same network within 30 days (salted
 *    hash, cleared after 90 days). Nothing is blocked automatically on these signals: shared office and family
 *    computers, agencies and mobile networks would be caught too.
 *
 * Every check fails open: a database error never loses a visitor's lead or blocks a sign-in.
 */
import crypto from 'crypto';
import { supabase } from '../db/supabaseClient';
import { log } from '../lib/logger';
import { isDisposableDomain } from './emailValidator';
import { trialEndsAt } from './upgradeOffers';

export const DEVICE_COOKIE = 'sq_device';
export const DEVICE_COOKIE_DAYS = 365;
/** Sign-ups from the same network further apart than this are not flagged. */
export const SAME_NETWORK_WINDOW_DAYS = 30;

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
/** Our own hosts and local addresses never count as a customer's website. */
const OWN_HOST = /(^|\.)(squarespellquiz\.com|squarespell\.com)$/;

/** The mailbox an address delivers to. Same rules as public.canonical_email() in migration 037. */
export function canonicalEmail(email: unknown): string {
  const v = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const at = v.indexOf('@');
  let local = at > 0 ? v.slice(0, at).split('+')[0] : '';
  let domain = at > 0 ? v.slice(at + 1).split('@')[0] : '';
  if (!local || !domain) return v;
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }
  return local + '@' + domain;
}

export function isDisposableEmail(email: string): boolean {
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
  return isDisposableDomain(domain);
}

/**
 * The website a quiz is embedded on, from the origin the embed reports ("https://www.example.com" or a full URL),
 * as a bare lower-case hostname without "www.". Null for anything that is not a public website of the customer.
 */
export function siteHostname(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return null;
  const value = raw.trim();
  // Only http(s) origins or bare hostnames: "javascript:", "mailto:" and the like are not websites.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return null;
  let host: string;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    if (u.username || u.password) return null;
    host = u.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  if (host.length < 3 || host.length > 253 || !host.includes('.')) return null;
  if (/^[\d.]+$/.test(host) || host.includes(':')) return null; // IP addresses
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.test')) return null;
  if (OWN_HOST.test(host)) return null;
  return host;
}

/**
 * Records the website for this account when it is new, and says whether the website's free trial was already used by
 * another account and has ended. Call for every lead; only unpaid accounts act on the answer.
 */
export async function siteTrialUsedElsewhere(owner: { id: string; created_at?: string | null }, host: string | null, now: Date = new Date()): Promise<boolean> {
  if (!host || !owner?.id) return false;
  try {
    const { data: row, error } = await supabase.from('site_trials').select('hostname, user_id, trial_ends_at').eq('hostname', host).maybeSingle();
    if (error) throw error;
    if (!row) {
      const ends = trialEndsAt(owner.created_at) || now;
      const ins = await supabase.from('site_trials')
        .upsert({ hostname: host, user_id: owner.id, trial_ends_at: ends.toISOString() }, { onConflict: 'hostname', ignoreDuplicates: true });
      if (ins.error) throw ins.error;
      return false;
    }
    if (row.user_id === owner.id) return false;
    return new Date(row.trial_ends_at).getTime() <= now.getTime();
  } catch (err: any) {
    log.warn('[trialGuard] site trial check failed; lead handled as usual', { err: err?.message });
    return false;
  }
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || 'squarespell-trial-guard';
}

/** Salted hash of a signal (device cookie or network address); the raw value is never stored. */
export function signalHash(kind: 'device' | 'ip', value: string): string {
  return crypto.createHmac('sha256', secret()).update(kind + ':' + value).digest('hex');
}

/** A new random value for the browser's security cookie. */
export function newDeviceId(): string {
  return crypto.randomBytes(18).toString('base64url');
}

/** Remembers that this account was used from this browser (hash only). */
export async function recordDevice(userId: string, deviceId: string): Promise<void> {
  if (!userId || !deviceId || deviceId.length > 100) return;
  const now = new Date().toISOString();
  try {
    const hash = signalHash('device', deviceId);
    const { error } = await supabase.from('account_devices').upsert({ user_id: userId, device_hash: hash, last_seen_at: now }, { onConflict: 'user_id,device_hash' });
    if (error) throw error;
  } catch (err: any) {
    log.warn('[trialGuard] could not record device', { err: err?.message });
  }
}

export interface DuplicateHint { user_id: string; email: string; reason: 'same browser' | 'same network' }

/**
 * Accounts that look like the same person, for the owner's customer list. Same browser: any shared device hash.
 * Same network: sign-up network hashes equal and sign-ups within SAME_NETWORK_WINDOW_DAYS of each other.
 */
export function duplicateHints(
  users: { id: string; email: string; created_at?: string | null; signup_ip_hash?: string | null }[],
  devices: { user_id: string; device_hash: string }[],
): Map<string, DuplicateHint[]> {
  const out = new Map<string, DuplicateHint[]>();
  const byId = new Map(users.map((u) => [u.id, u]));
  const add = (a: string, b: string, reason: DuplicateHint['reason']) => {
    if (a === b || !byId.has(b)) return;
    const list = out.get(a) || [];
    if (list.some((h) => h.user_id === b)) return;
    list.push({ user_id: b, email: byId.get(b)!.email, reason });
    out.set(a, list);
  };
  const byDevice = new Map<string, Set<string>>();
  for (const d of devices) {
    const s = byDevice.get(d.device_hash) || new Set<string>();
    s.add(d.user_id);
    byDevice.set(d.device_hash, s);
  }
  for (const ids of byDevice.values()) {
    if (ids.size < 2) continue;
    for (const a of ids) for (const b of ids) add(a, b, 'same browser');
  }
  const windowMs = SAME_NETWORK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const withIp = users.filter((u) => u.signup_ip_hash);
  for (const a of withIp) {
    for (const b of withIp) {
      if (a.id === b.id || a.signup_ip_hash !== b.signup_ip_hash) continue;
      const gap = Math.abs(new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      if (gap <= windowMs) add(a.id, b.id, 'same network');
    }
  }
  return out;
}
