/**
 * Brand colors, fonts and custom CSS come from quiz authors and are written into <style> blocks. A value such as
 * `x</style><script>…` would end the style element and run script for every visitor, so:
 * - colors must be a hex, rgb()/rgba()/hsl()/hsla() or a plain color name, else the fallback is used;
 * - font names may only contain letters, digits, spaces, hyphens, underscores and dots;
 * - free-form CSS has every "<" escaped as the CSS escape \3c, which can never close the style element.
 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\(\s*[0-9.%,\s/+-]+\)|[a-zA-Z]{3,30})$/;

export function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return COLOR_RE.test(v) ? v : fallback;
}

export function safeFontName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  return /^[\w .-]{1,60}$/.test(v) ? v : '';
}

export function brandFontStack(fontName: unknown): string {
  const name = safeFontName(fontName);
  return name && name !== 'sans-serif' ? "'" + name + "', system-ui, sans-serif" : "'Inter', system-ui, sans-serif";
}

export function safeStyleText(css: unknown): string {
  return typeof css === 'string' ? css.replace(/</g, '\\3c ') : '';
}
