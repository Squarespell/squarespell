/**
 * Shared color tokens for the Squarespell Quiz dashboard theme.
 *
 * Untitled UI-inspired clean white/gray palette with teal brand accent.
 * Extracted to its own module so any component can import without
 * creating a circular dependency through DashboardShell.
 */
export var DASHBOARD_COLORS = {
  // Font
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",

  // Backgrounds - Untitled UI gray scale
  BG: '#FFFFFF',
  SURFACE: '#FFFFFF',
  ELEVATED: '#FFFFFF',
  SIDEBAR: '#FFFFFF',
  SIDEBAR_HOVER: '#F9FAFB',
  SIDEBAR_ACTIVE: '#F9FAFB',

  // Gray scale
  GRAY_25: '#FCFCFD',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F2F4F7',
  GRAY_200: '#EAECF0',
  GRAY_300: '#D0D5DD',
  GRAY_400: '#98A2B3',
  GRAY_500: '#667085',
  GRAY_600: '#475467',
  GRAY_700: '#344054',
  GRAY_800: '#182230',
  GRAY_900: '#101828',

  // Borders
  BORDER: '#EAECF0',
  BORDER_LIGHT: '#F2F4F7',
  HAIRLINE: '#EAECF0',

  // Text
  TEXT: '#101828',
  TEXT_SECONDARY: '#344054',
  TEXT_MUTED: '#475467',
  TEXT_SUBTLE: '#667085',

  // Accent (deep teal - Squarespell Quiz brand)
  ACCENT: '#0f7377',
  ACCENT_LIGHT: '#F0FAFB',
  ACCENT_HOVER: '#0d6569',
  BRAND_25: '#F0FAFB',
  BRAND_50: '#E0F5F6',
  BRAND_100: '#B3E6E8',
  BRAND_300: '#4DC2C6',
  BRAND_500: '#0f7377',
  BRAND_600: '#0d6569',
  BRAND_700: '#0b545a',

  // Semantic
  SUCCESS: '#027A48',
  SUCCESS_LIGHT: '#ECFDF3',
  SUCCESS_500: '#12B76A',
  SUCCESS_700: '#027A48',
  WARNING: '#B54708',
  WARNING_LIGHT: '#FFFAEB',
  WARNING_500: '#F79009',
  DANGER: '#B42318',
  DANGER_LIGHT: '#FEF3F2',
  ERROR_500: '#F04438',
  ERROR_700: '#B42318',

  // Purple (for chart bars)
  PURPLE_500: '#7F56D9',
  PURPLE_300: '#B692F6',
  PURPLE_100: '#F4EBFF',

  // Shadows - Untitled UI style
  SHADOW_XS: '0px 1px 2px rgba(16, 24, 40, 0.05)',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
  SHADOW_MD: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  SHADOW_LG: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',

  // Focus ring
  FOCUS_RING: '0px 0px 0px 4px rgba(13, 115, 119, 0.15)',
};
