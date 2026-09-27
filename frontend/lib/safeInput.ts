/**
 * Values chosen by quiz owners (branding colours and font, redirect and call-to-action links) are rendered on
 * public quiz pages that run on the app origin. These allow-lists stop them from breaking out of a <style>
 * block or turning into javascript: URLs, which would run the owner's script for every visitor.
 */

/** Hex, rgb(a), hsl(a) or a plain colour keyword. Anything else returns the fallback. */
export function safeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const s = value.trim();
  if (!s || s.length > 64) return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s\/-]+\)$/i.test(s)) return s;
  if (/^[a-zA-Z]{3,30}$/.test(s)) return s;
  return fallback;
}

/** A single font family name (letters, digits, space, underscore, hyphen). Anything else returns the fallback. */
export function safeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const s = value.trim();
  return /^[A-Za-z0-9 _-]{1,60}$/.test(s) ? s : fallback;
}

/** http(s), mailto, tel, an in-page anchor or a site-relative path. Anything else (javascript:, data:, //host) returns ''. */
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';
  if (/^(mailto:|tel:|#)/i.test(s)) return s;
  if (/^\/(?![\/\\])/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? s : '';
  } catch {
    return '';
  }
}
