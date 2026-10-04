/**
 * The colors and font a quiz is shown with, in one place for the embed, the hosted quiz page and the renderer.
 *
 * Sources, strongest first:
 * - "Custom" look chosen in the editor (settings.style, mode 'custom');
 * - the look of the website the quiz sits on, measured by the site loader and passed to the embed (mode 'site', the default);
 * - the saved look: the theme color chosen in the editor (settings.primary_color) over the colors detected when the quiz was made.
 *
 * Whatever the source, the result is readable: text reaches 4.5:1 against the background and the surface, buttons reach 3:1
 * against the background, and button labels use whichever of near-black or white reads best on the button.
 * Every value still passes through safeColor / safeFontName because it ends up inside a <style> block.
 */
import { safeColor, safeFontName } from './safeCss';

export type StyleMode = 'site' | 'custom';
export interface QuizStyle { mode?: StyleMode; background?: string; text?: string; primary?: string; font?: string }
/** The website's look as the site loader measured it (query parameters of the embed URL). */
export interface SiteLook { bg?: string | null; fg?: string | null; accent?: string | null; font?: string | null }
export interface QuizTheme {
  mode: StyleMode;
  source: 'custom' | 'site' | 'saved';
  bg: string;
  surface: string;
  text: string;
  primary: string;
  onPrimary: string;
  font: string;
  fontStack: string;
  /** Google Fonts stylesheet for the chosen font, or null when the font needs no download (default or a system font). */
  fontHref: string | null;
}

const DEFAULT_BG = '#ffffff';
const DEFAULT_TEXT = '#1a1a1a';
const DEFAULT_PRIMARY = '#0a0a0a';
const DEFAULT_FONT = 'Inter';
const DARK = '#111827';
const LIGHT = '#ffffff';

/** Fonts offered in the editor. Any other Google Fonts family name also works. */
export const FONT_CHOICES = ['Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Lato', 'Work Sans', 'Playfair Display', 'Lora', 'Merriweather', 'Roboto'];

const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080', navy: '#000080', teal: '#008080', orange: '#ffa500', purple: '#800080' };

type RGB = [number, number, number];

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() and a few color names. Fully transparent colors and anything else give null. */
export function parseColor(value: unknown): RGB | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return parseColor(NAMED[v]);
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as RGB;
  m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) {
    if (m[2] && parseInt(m[2], 16) < 128) return null;
    return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as RGB;
  }
  m = v.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    if (m[4] !== undefined) {
      const a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (!(a >= 0.5)) return null;
    }
    const rgb = [m[1], m[2], m[3]].map(Number);
    return rgb.every((n) => n <= 255) ? (rgb as RGB) : null;
  }
  return null;
}

export function toHex(rgb: RGB): string {
  return '#' + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}

function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((n) => { const c = n / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1 to 21). Unparseable colors count as 1 so callers fix them. */
export function contrast(a: string, b: string): number {
  const x = parseColor(a), y = parseColor(b);
  if (!x || !y) return 1;
  const l1 = luminance(x), l2 = luminance(y);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Near-black or white, whichever reads better on the given background. */
export function readableOn(bg: string): string {
  return contrast(DARK, bg) >= contrast(LIGHT, bg) ? DARK : LIGHT;
}

/** Keeps the color when it already reaches the ratio, else moves it toward black or white (keeping its hue) until it does. */
export function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrast(fg, bg) >= min) return fg;
  const rgb = parseColor(fg);
  const target = parseColor(readableOn(bg))!;
  if (rgb) {
    for (let t = 0.1; t <= 1.0001; t += 0.1) {
      const mixed = toHex(rgb.map((c, i) => c + (target[i] - c) * t) as RGB);
      if (contrast(mixed, bg) >= min) return mixed;
    }
  }
  return readableOn(bg);
}

/** A color usable in a <style> block and for contrast math, as #rrggbb. */
function cleanColor(value: unknown): string | null {
  const safe = safeColor(value, '');
  const rgb = safe ? parseColor(safe) : null;
  return rgb ? toHex(rgb) : null;
}

const GENERIC_FONT = /^(inherit|initial|unset|revert|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont)$/i;
const SYSTEM_FONT = /^(arial|helvetica|helvetica neue|georgia|times|times new roman|verdana|tahoma|trebuchet ms|segoe ui|courier new|garamond|palatino|sf pro text|sf pro display)$/i;

/** The first family of a CSS font-family list, without quotes. */
export function firstFontFamily(value: unknown): string {
  if (typeof value !== 'string') return '';
  const first = value.split(',')[0] || '';
  return first.trim().replace(/^["']|["']$/g, '').trim();
}

export function fontFor(value: unknown): { name: string; stack: string; href: string | null } {
  const name = safeFontName(firstFontFamily(value));
  if (!name || GENERIC_FONT.test(name) || name === DEFAULT_FONT) return { name: DEFAULT_FONT, stack: "'Inter', system-ui, sans-serif", href: null };
  const stack = "'" + name + "', system-ui, sans-serif";
  if (SYSTEM_FONT.test(name) || name === 'DM Sans') return { name, stack, href: null };
  return { name, stack, href: 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap' };
}

/** Reads the website look from embed query parameters (bg, fg, accent, font). Anything unusable is dropped. */
export function siteLookFromParams(params: Record<string, string | string[] | undefined> | null | undefined): SiteLook | null {
  if (!params) return null;
  const one = (k: string) => { const v = params[k]; return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined; };
  const look: SiteLook = { bg: cleanColor(one('bg')), fg: cleanColor(one('fg')), accent: cleanColor(one('accent')), font: safeFontName(firstFontFamily(one('font'))) || null };
  return look.bg || look.fg || look.accent || look.font ? look : null;
}

export function resolveQuizTheme(input: { branding?: any; settings?: any; site?: SiteLook | null }): QuizTheme {
  const colors = (input.branding && input.branding.colors) || {};
  const settings = input.settings || {};
  const style: QuizStyle = settings.style && typeof settings.style === 'object' ? settings.style : {};
  const mode: StyleMode = style.mode === 'custom' ? 'custom' : 'site';

  let bg = cleanColor(colors.background) || DEFAULT_BG;
  let text = cleanColor(colors.text) || DEFAULT_TEXT;
  // A theme color picked in the editor beats the one detected when the quiz was made.
  let primary = cleanColor(settings.primary_color) || cleanColor(settings.primaryColor) || cleanColor(colors.primary) || DEFAULT_PRIMARY;
  let surface: string | null = cleanColor(colors.surface);
  let font: unknown = input.branding && input.branding.font_family;
  let source: QuizTheme['source'] = 'saved';

  if (mode === 'custom') {
    bg = cleanColor(style.background) || bg;
    text = cleanColor(style.text) || text;
    primary = cleanColor(style.primary) || primary;
    if (style.font) font = style.font;
    surface = null;
    source = 'custom';
  } else if (input.site) {
    const s = input.site;
    if (s.bg) { bg = s.bg; surface = null; }
    if (s.fg) text = s.fg;
    if (s.accent) primary = s.accent;
    if (s.font) font = s.font;
    source = 'site';
  }

  text = ensureContrast(text, bg, 4.5);
  if (!surface || contrast(text, surface) < 4.5) surface = bg;
  primary = ensureContrast(primary, bg, 3);
  const f = fontFor(font);
  return { mode, source, bg, surface, text, primary, onPrimary: readableOn(primary), font: f.name, fontStack: f.stack, fontHref: f.href };
}
