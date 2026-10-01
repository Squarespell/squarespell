/**
 * Links and redirects that come from quiz content (written by quiz authors) must never run script in our pages.
 * A "javascript:", "data:" or "vbscript:" URL in href or location.href would execute on the app origin, so only
 * absolute http(s) URLs (and, for links, same-site paths, mailto: and tel:) are passed through. Anything else becomes ''.
 */
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export function safeLinkUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (/^(mailto|tel):/i.test(v)) return v;
  // A same-site path ("/book", "/contact#form") or fragment carries no scheme, so it cannot run script.
  if ((v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\')) || v.startsWith('#')) return v;
  return safeHttpUrl(v);
}
