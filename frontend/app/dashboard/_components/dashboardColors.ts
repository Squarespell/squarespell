/**
 * Shared color tokens for the Squarespell dashboard theme.
 *
 * Light, warm off-white palette with deep teal accent.
 * Extracted to its own module so any component can import without
 * creating a circular dependency through DashboardShell.
 */
export const DASHBOARD_COLORS = {
  // Backgrounds
  BG: '#F7F7F5',
  SURFACE: '#FFFFFF',
  ELEVATED: '#FFFFFF',
  SIDEBAR: '#F0EFED',
  SIDEBAR_HOVER: '#E8E7E4',
  SIDEBAR_ACTIVE: '#E2E1DE',

  // Borders
  BORDER: '#E4E3E0',
  BORDER_LIGHT: '#EEEDE9',
  HAIRLINE: '#EEEDE9',

  // Text
  TEXT: '#1A1A1A',
  TEXT_SECONDARY: '#6B6B6B',
  TEXT_MUTED: '#6B6B6B',
  TEXT_SUBTLE: '#9B9B9B',

  // Accent (deep teal)
  ACCENT: '#0D7377',
  ACCENT_LIGHT: '#E8F4F4',
  ACCENT_HOVER: '#0B6165',

  // Semantic
  SUCCESS: '#2D6A4F',
  SUCCESS_LIGHT: '#ECF5F0',
  WARNING: '#B45309',
  WARNING_LIGHT: '#FEF6E7',
  DANGER: '#C53030',
  DANGER_LIGHT: '#FEF0F0',
};
