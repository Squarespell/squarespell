/**
 * Shared color tokens for the Squarespell Quiz dashboard theme.
 *
 * Matches the squarespellquiz.com landing page: blue #3154FF and white, navy #0B1233 ink, cool blue-grey text,
 * soft blue tints for surfaces, Inter Tight 500 headings with Instrument Serif italic accents, 12-16px corners.
 * ACID keys are kept for compatibility and now map to blue tints, so the app stays blue and white.
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
  BG: '#F5F7FF',
  CANVAS: '#F5F7FF',
  SURFACE: '#FFFFFF',
  ELEVATED: '#FFFFFF',
  SIDEBAR: '#FFFFFF',
  SIDEBAR_HOVER: '#F5F7FF',
  SIDEBAR_ACTIVE: '#EBEFFF',

  // Warm neutral scale (key names kept for compatibility)
  GRAY_25: '#FAFBFF',
  GRAY_50: '#F5F7FF',
  GRAY_100: '#EBEFFF',
  GRAY_200: '#E2E7FF',
  GRAY_300: '#CDD6FF',
  GRAY_400: '#8B93B5',
  GRAY_500: '#646D8F',
  GRAY_600: '#4A5275',
  GRAY_700: '#3B4466',
  GRAY_800: '#1C2447',
  GRAY_900: '#0B1233',

  // Borders
  BORDER: '#E2E7FF',
  BORDER_LIGHT: '#EBEFFF',
  HAIRLINE: '#E2E7FF',

  // Text
  INK: '#0B1233',
  TEXT: '#0B1233',
  TEXT_SECONDARY: '#3B4466',
  TEXT_MUTED: '#4A5275',
  TEXT_SUBTLE: '#646D8F',

  // Accent: electric cobalt
  ACCENT: '#3154FF',
  ACCENT_LIGHT: '#EBEFFF',
  ACCENT_HOVER: '#2443E0',
  BRAND_25: '#F5F7FF',
  BRAND_50: '#EBEFFF',
  BRAND_100: '#DCE3FF',
  BRAND_300: '#8FA2FF',
  BRAND_500: '#3154FF',
  BRAND_600: '#2443E0',
  BRAND_700: '#1A34C8',

  // Pale periwinkle and acid-yellow details
  PERIWINKLE: '#DCE3FF',
  PERIWINKLE_SOFT: '#EBEFFF',
  ACID: '#DCE3FF',
  ACID_SOFT: '#EBEFFF',

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
  PURPLE_100: '#EBEFFF',

  // Shadows: hairline-first, very soft
  SHADOW_XS: '0 1px 0 rgba(11, 18, 51, 0.03)',
  SHADOW_SM: '0 1px 2px rgba(11, 18, 51, 0.05)',
  SHADOW_MD: '0 20px 40px -26px rgba(11, 18, 51, 0.28)',
  SHADOW_LG: '0 40px 70px -40px rgba(49, 84, 255, 0.45)',

  // Radii
  RADIUS: 16,
  RADIUS_SM: 12,

  // Focus ring
  FOCUS_RING: '0 0 0 3px rgba(49, 84, 255, 0.22)',
};
