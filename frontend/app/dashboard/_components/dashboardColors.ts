/**
 * Shared color tokens for the Squarespell Quiz dashboard theme (2026 redesign).
 *
 * Cobalt-and-ivory direction: electric cobalt #3154FF on warm ivory #F4F3ED, near-black #161719 ink,
 * pale periwinkle surfaces and tiny acid-yellow details. Precise 6-8px corners, hairline dividers, no heavy shadows.
 * Extracted to its own module so any component can import without creating a circular dependency through DashboardShell.
 * Key names are kept from the previous theme so every existing page picks up the new palette.
 */
export var DASHBOARD_COLORS = {
  // Fonts
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  DISPLAY_FONT: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  SERIF_FONT: "'Instrument Serif', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  MONO_FONT: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",

  // Backgrounds
  BG: '#F4F3ED',
  CANVAS: '#F4F3ED',
  SURFACE: '#FFFFFF',
  ELEVATED: '#FFFFFF',
  SIDEBAR: '#FFFFFF',
  SIDEBAR_HOVER: '#F7F6F1',
  SIDEBAR_ACTIVE: '#EEF1FF',

  // Warm neutral scale (key names kept for compatibility)
  GRAY_25: '#FBFBF8',
  GRAY_50: '#F7F6F1',
  GRAY_100: '#EFEEE7',
  GRAY_200: '#E4E2DA',
  GRAY_300: '#CFCDC4',
  GRAY_400: '#9B9A93',
  GRAY_500: '#6E6D68',
  GRAY_600: '#4F4E4A',
  GRAY_700: '#35352F',
  GRAY_800: '#232420',
  GRAY_900: '#161719',

  // Borders
  BORDER: '#E4E2DA',
  BORDER_LIGHT: '#EFEEE7',
  HAIRLINE: '#E4E2DA',

  // Text
  INK: '#161719',
  TEXT: '#161719',
  TEXT_SECONDARY: '#35352F',
  TEXT_MUTED: '#4F4E4A',
  TEXT_SUBTLE: '#6E6D68',

  // Accent: electric cobalt
  ACCENT: '#3154FF',
  ACCENT_LIGHT: '#EEF1FF',
  ACCENT_HOVER: '#2442E6',
  BRAND_25: '#F5F7FF',
  BRAND_50: '#EEF1FF',
  BRAND_100: '#DDE3FF',
  BRAND_300: '#8FA2FF',
  BRAND_500: '#3154FF',
  BRAND_600: '#2442E6',
  BRAND_700: '#1B33B8',

  // Pale periwinkle and acid-yellow details
  PERIWINKLE: '#DDE3FF',
  PERIWINKLE_SOFT: '#EEF1FF',
  ACID: '#E4F75A',
  ACID_SOFT: '#F6FBD0',

  // Semantic
  SUCCESS: '#0E7A3F',
  SUCCESS_LIGHT: '#EAF6EE',
  SUCCESS_500: '#1F9D57',
  SUCCESS_700: '#0E7A3F',
  WARNING: '#9A5B00',
  WARNING_LIGHT: '#FFF6E0',
  WARNING_500: '#E09B1A',
  DANGER: '#C0271B',
  DANGER_LIGHT: '#FDF0EE',
  ERROR_500: '#E5484D',
  ERROR_700: '#C0271B',

  // Secondary chart tones (periwinkle family instead of purple)
  PURPLE_500: '#8FA2FF',
  PURPLE_300: '#BFCAFF',
  PURPLE_100: '#EEF1FF',

  // Shadows: hairline-first, very soft
  SHADOW_XS: '0 1px 0 rgba(22, 23, 25, 0.03)',
  SHADOW_SM: '0 1px 2px rgba(22, 23, 25, 0.05)',
  SHADOW_MD: '0 6px 16px -8px rgba(22, 23, 25, 0.14)',
  SHADOW_LG: '0 16px 40px -16px rgba(22, 23, 25, 0.22)',

  // Radii
  RADIUS: 8,
  RADIUS_SM: 6,

  // Focus ring
  FOCUS_RING: '0 0 0 3px rgba(49, 84, 255, 0.22)',
};
