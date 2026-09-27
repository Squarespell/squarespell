'use client';

/** Squarespell brand mark and wordmark (2026 redesign). Shared by the dashboard shell, auth and onboarding screens. */

import { DASHBOARD_COLORS as C } from './dashboardColors';

/** Geometric Squarespell symbol: a block "S" with two fine slits. */
export function BrandMark({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 4h20v8H14v2h12v14H6v-8h12v-2H6z" fill={color || C.INK} />
    </svg>
  );
}

export function Wordmark({ compact, size = 26 }: { compact?: boolean; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BrandMark size={size} />
      {!compact && (
        <span style={{ fontFamily: C.DISPLAY_FONT, fontWeight: 800, fontSize: Math.round(size * 0.7), letterSpacing: '0.02em', color: C.INK }}>
          SQUARESPELL
        </span>
      )}
    </span>
  );
}

