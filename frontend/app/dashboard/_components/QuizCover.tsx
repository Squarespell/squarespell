'use client';

/**
 * QuizCover - art-directed cover for a quiz project card (2026 redesign).
 *
 * Six editorial compositions (periwinkle line art, cobalt sweep, acid-yellow browser tiles, warm taupe, pale-blue
 * grid, ink geometry). Callers can pass `variant` (e.g. the quiz's position in creation order, so neighbours differ);
 * otherwise it is picked from a hash of the quiz id. Either way a quiz keeps the same cover whatever the sort order. The only text is the quiz's own title plus a tiny "Quiz" label: no invented taglines or claims.
 */

import { DASHBOARD_COLORS as C } from './dashboardColors';

export var COVER_VARIANTS = 6;

export function coverVariantFor(id: string): number {
  var h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % COVER_VARIANTS;
}

var PALETTES = [
  { bg: '#DCE3FF', fg: '#0B1233', serif: true },
  { bg: '#3154FF', fg: '#FFFFFF', serif: false },
  { bg: 'linear-gradient(90deg, #DCE3FF 0%, #EBEFFF 58%, #F5F7FF 100%)', fg: '#0B1233', serif: true },
  { bg: 'linear-gradient(120deg, #1A34C8 0%, #3154FF 60%, #6B84FF 100%)', fg: '#FFFFFF', serif: true },
  { bg: '#E6ECFD', fg: '#1A34C8', serif: true },
  { bg: '#0B1233', fg: '#FFFFFF', serif: false },
];

function Art({ variant }: { variant: number }) {
  var common = { position: 'absolute' as const, right: 0, top: 0, height: '100%', pointerEvents: 'none' as const };
  switch (variant) {
    case 0:
      // Fine ink line art: overlapping contour arcs.
      return (
        <svg viewBox="0 0 220 180" preserveAspectRatio="xMaxYMid meet" style={{ ...common, width: '52%' }} aria-hidden="true">
          <g fill="none" stroke="#0B1233" strokeWidth="1.1" strokeLinecap="round">
            <path d="M40 170 C 60 110, 90 60, 150 48 C 185 42, 205 60, 212 84" />
            <path d="M70 176 C 88 128, 116 92, 160 84 C 188 80, 204 94, 208 112" />
            <circle cx="150" cy="70" r="3" fill="#0B1233" />
            <path d="M118 40 C 130 24, 152 18, 170 24" />
            <path d="M100 176 C 112 150, 132 132, 160 126" />
          </g>
        </svg>
      );
    case 1:
      // White sweeping growth line ending in a dot.
      return (
        <svg viewBox="0 0 240 180" preserveAspectRatio="xMaxYMid meet" style={{ ...common, width: '56%' }} aria-hidden="true">
          <g fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 150 L 70 150 C 120 150, 140 60, 216 58" />
          </g>
          <circle cx="220" cy="58" r="5" fill="#FFFFFF" />
        </svg>
      );
    case 2:
      // Modular browser tiles.
      return (
        <svg viewBox="0 0 220 180" preserveAspectRatio="xMaxYMid meet" style={{ ...common, width: '50%' }} aria-hidden="true">
          <rect x="18" y="44" width="76" height="116" rx="4" fill="#FFFFFF" stroke="#E2E7FF" />
          <circle cx="28" cy="54" r="2.5" fill="#0B1233" /><circle cx="36" cy="54" r="2.5" fill="#0B1233" /><circle cx="44" cy="54" r="2.5" fill="#CDD6FF" />
          <rect x="26" y="64" width="60" height="84" rx="2" fill="#8FA2FF" />
          <rect x="84" y="18" width="104" height="142" rx="4" fill="#FFFFFF" stroke="#E2E7FF" />
          <circle cx="94" cy="28" r="2.5" fill="#0B1233" /><circle cx="102" cy="28" r="2.5" fill="#0B1233" /><circle cx="110" cy="28" r="2.5" fill="#0B1233" />
          <rect x="94" y="40" width="64" height="40" fill="#1C2447" />
          <rect x="104" y="72" width="46" height="46" fill="#FFFFFF" stroke="#E2E7FF" />
          <rect x="152" y="80" width="46" height="46" rx="3" fill="#0B1233" />
          <circle cx="175" cy="103" r="9" fill="#3154FF" />
        </svg>
      );
    case 3:
      // Warm abstract landscape panel with soft circles.
      return (
        <svg viewBox="0 0 240 180" preserveAspectRatio="xMaxYMid slice" style={{ ...common, width: '60%' }} aria-hidden="true">
          <circle cx="210" cy="30" r="110" fill="#EBEFFF" opacity="0.8" />
          <circle cx="60" cy="210" r="120" fill="#CDD6FF" opacity="0.55" />
          <rect x="80" y="42" width="120" height="96" fill="#8FA2FF" />
          <path d="M80 110 C 110 90, 140 120, 200 88 L 200 138 L 80 138 Z" fill="#E2E7FF" />
          <path d="M80 70 L 200 58 L 200 72 L 80 90 Z" fill="#BFCAFF" />
        </svg>
      );
    case 4:
      // Grid of cobalt and periwinkle modules.
      return (
        <svg viewBox="0 0 200 180" preserveAspectRatio="xMaxYMid slice" style={{ ...common, width: '48%' }} aria-hidden="true">
          <rect x="0" y="0" width="200" height="180" fill="#E6ECFD" />
          <g stroke="#FFFFFF" strokeWidth="1">
            <line x1="0" y1="60" x2="200" y2="60" /><line x1="0" y1="120" x2="200" y2="120" />
            <line x1="66" y1="0" x2="66" y2="180" /><line x1="132" y1="0" x2="132" y2="180" />
          </g>
          <path d="M66 60 A 60 60 0 0 1 126 0 L 126 60 Z" fill="#8FA2FF" />
          <path d="M132 0 A 60 60 0 0 1 192 60 L 132 60 Z" fill="#BFCAFF" />
          <rect x="132" y="60" width="60" height="60" fill="#3154FF" />
          <path d="M66 60 L 126 60 L 126 120 A 60 60 0 0 1 66 60 Z" fill="#BFCAFF" />
          <circle cx="160" cy="118" r="34" fill="#8FA2FF" opacity="0.85" />
          <rect x="66" y="120" width="60" height="60" fill="#8FA2FF" opacity="0.55" />
        </svg>
      );
    default:
      // Ink geometry: white and periwinkle triangles.
      return (
        <svg viewBox="0 0 220 180" preserveAspectRatio="xMaxYMid slice" style={{ ...common, width: '50%' }} aria-hidden="true">
          <path d="M20 0 L 110 0 L 20 90 Z" fill="#FFFFFF" />
          <path d="M20 90 L 110 180 L 20 180 Z" fill="#FFFFFF" opacity="0.9" />
          <path d="M20 90 L 130 30 L 130 150 Z" fill="#BFCAFF" />
          <rect x="120" y="60" width="30" height="30" fill="#FFFFFF" />
          <line x1="200" y1="96" x2="200" y2="170" stroke="#FFFFFF" strokeWidth="1.2" />
        </svg>
      );
  }
}

/**
 * Cover art. `compact` renders the tiny thumbnail used by list rows (no text, just the palette and geometry).
 */
export function QuizCover({ id, title, height = 172, compact = false, variant: forced }: { id: string; title: string; height?: number; compact?: boolean; variant?: number }) {
  var variant = typeof forced === 'number' ? ((forced % COVER_VARIANTS) + COVER_VARIANTS) % COVER_VARIANTS : coverVariantFor(id || title || 'quiz');
  var p = PALETTES[variant];
  var len = (title || '').length;
  var fontSize = p.serif ? (len > 34 ? 26 : len > 22 ? 30 : 36) : (len > 34 ? 22 : len > 22 ? 26 : 32);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        height: height,
        background: p.bg,
        overflow: 'hidden',
      }}
    >
      <Art variant={variant} />
      {!compact && (
        <div style={{ position: 'absolute', left: 32, top: 40, right: '44%', bottom: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div
            style={{
              fontFamily: p.serif ? C.SERIF_FONT : C.DISPLAY_FONT,
              fontWeight: p.serif ? 400 : 800,
              fontSize: fontSize,
              lineHeight: p.serif ? 0.98 : 0.98,
              letterSpacing: p.serif ? '-0.01em' : '-0.04em',
              color: p.fg,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title || 'Untitled quiz'}
            {!p.serif && !/[.?!]$/.test((title || '').trim()) && <span style={{ color: variant === 5 ? C.ACCENT : p.fg }}>.</span>}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: p.fg, opacity: 0.75, fontFamily: C.FONT }}>
            Quiz
          </div>
        </div>
      )}
    </div>
  );
}
