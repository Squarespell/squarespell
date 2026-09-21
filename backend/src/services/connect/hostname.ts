import { isIP } from 'net';

/**
 * Hostname handling for connected sites. A site is bound to ONE canonical hostname; heartbeats and verification
 * are accepted only from that hostname (or its www / apex twin).
 */
export type HostResult = { ok: true; hostname: string } | { ok: false; reason: string };

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa', '.lan', '.intranet', '.corp'];

/**
 * Normalise what a customer types (a full URL or a bare host) to a canonical hostname:
 * lower-case, punycode (IDNA), no scheme, port, path, query or credentials, no trailing dot, no leading "www.".
 * Rejects IP addresses, single-label and internal-looking names.
 */
export function normalizeHostname(input: unknown): HostResult {
  if (typeof input !== 'string') return { ok: false, reason: 'A domain is required.' };
  const raw = input.trim();
  if (!raw || raw.length > 300) return { ok: false, reason: 'Enter your website address, for example yourbusiness.com.' };
  if (/[\s<>"'`\\]/.test(raw)) return { ok: false, reason: 'That address contains characters a domain cannot have.' };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch {
    return { ok: false, reason: 'That does not look like a website address.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'Use a normal website address (http or https).' };
  if (url.username || url.password) return { ok: false, reason: 'Remove the username or password from the address.' };
  let host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || isIP(host) !== 0) return { ok: false, reason: 'Use your domain name, not an IP address.' };
  if (host === 'localhost' || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return { ok: false, reason: 'That address is not a public website.' };
  host = host.replace(/^www\./, '');
  const labels = host.split('.');
  if (labels.length < 2 || host.length > 253 || !labels.every((l) => LABEL.test(l))) return { ok: false, reason: 'That does not look like a complete domain name.' };
  if (/^\d+$/.test(labels[labels.length - 1])) return { ok: false, reason: 'Use your domain name, not an IP address.' };
  return { ok: true, hostname: host };
}

/** Hostname carried by an Origin or Referer header value, canonicalised the same way. Null when absent or unusable. */
export function hostnameFromHeader(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const r = normalizeHostname(value);
  return r.ok ? r.hostname : null;
}

/** True when a request really comes from the connected site's hostname. */
export function hostMatchesSite(siteHostname: string, requestHostname: string | null): boolean {
  return !!requestHostname && requestHostname === siteHostname;
}
