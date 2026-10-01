'use client';

/** Squarespell Quiz logo, identical to the squarespellquiz.com landing page. Shared by the dashboard shell, auth and onboarding screens. */

import { DASHBOARD_COLORS as C } from './dashboardColors';

/** Four-tile mark on a blue rounded square. Pass color to change the tile background. */
export function BrandMark({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill={color || C.ACCENT} />
      <rect x="10" y="10" width="12.5" height="12.5" rx="3" fill="#fff" fillOpacity=".5" />
      <rect x="25.5" y="10" width="12.5" height="12.5" rx="6.25" fill="#fff" fillOpacity=".5" />
      <rect x="10" y="25.5" width="12.5" height="12.5" rx="3" fill="#fff" fillOpacity=".5" />
      <rect x="25.5" y="25.5" width="12.5" height="12.5" rx="3" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ compact, size = 26 }: { compact?: boolean; size?: number }) {
  var fs = Math.round(size * 0.66);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BrandMark size={size} />
      {!compact && (
        <span style={{ fontFamily: C.DISPLAY_FONT, fontWeight: 600, fontSize: fs, letterSpacing: '-0.035em', color: C.INK, lineHeight: 1 }}>
          squarespell
          <i style={{ fontFamily: C.SERIF_FONT, fontStyle: 'italic', fontWeight: 400, letterSpacing: 0, color: C.ACCENT, fontSize: '1.14em', marginLeft: 1 }}>quiz</i>
        </span>
      )}
    </span>
  );
}
