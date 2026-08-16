/**
 * Small thin-line icon set for the reference-design sections (trust-logo
 * marks and the "60+ checks" grid). The original reference file used
 * plain unicode glyphs as placeholders (◎ ◉ ♧ ♢ ▤ ⌁) rather than real
 * icons, and generic shapes (a ring, a square) for three of the six trust
 * logos. The reference design *image* shows purpose-built pictograms for
 * every one of these, so these are hand-drawn to match that intent: same
 * thin-stroke, single-color style, sized to drop into the existing
 * `.check-icon` / `.logo` treatment without any CSS changes beyond color.
 */

type IconProps = { className?: string };

const base = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconSeo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" />
      <circle cx="9" cy="9" r="2.4" />
      <line x1="13.6" y1="13.6" x2="18" y2="18" />
    </svg>
  );
}

export function IconPerformance({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M2.5 14.5a7.5 7.5 0 0 1 15 0" />
      <line x1="10" y1="14.5" x2="13.2" y2="9.6" />
      <line x1="5.2" y1="14.5" x2="5.2" y2="14.5" />
      <line x1="14.8" y1="14.5" x2="14.8" y2="14.5" />
    </svg>
  );
}

export function IconAccessibility({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <circle cx="10" cy="4.3" r="1.6" />
      <path d="M4 7.6c2-1 4-1.5 6-1.5s4 .5 6 1.5" />
      <line x1="10" y1="6.6" x2="10" y2="17.2" />
      <line x1="5.4" y1="12.4" x2="14.6" y2="12.4" />
      <line x1="10" y1="10.6" x2="6.6" y2="17.2" />
      <line x1="10" y1="10.6" x2="13.4" y2="17.2" />
    </svg>
  );
}

export function IconBestPractices({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M10 2.4 16.5 5v5.1c0 4-2.7 6.6-6.5 7.5-3.8-.9-6.5-3.5-6.5-7.5V5Z" />
      <path d="M7.2 9.8 9.2 11.8 12.9 8" />
    </svg>
  );
}

export function IconContentReview({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M5 2.6h7l3 3v11.4a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3.1a.5.5 0 0 1 .5-.5Z" />
      <path d="M12 2.6v3h3" />
      <line x1="6.6" y1="10.4" x2="13.4" y2="10.4" />
      <line x1="6.6" y1="13" x2="11.6" y2="13" />
    </svg>
  );
}

export function IconActionableInsights({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M3 6.4 6 9.4 12.4 3" />
      <path d="M8 13.4 10.4 15.8 17 9.2" />
    </svg>
  );
}

export const CHECK_ICONS = [
  IconSeo,
  IconPerformance,
  IconAccessibility,
  IconBestPractices,
  IconContentReview,
  IconActionableInsights,
];

/** Trust-row marks — one per logo, matching the reference's pictogram for each. */

export function MarkSquarespace({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...base} aria-hidden="true">
      <path d="M5.4 12.6a3.3 3.3 0 0 1 0-4.7l2.3-2.3a3.3 3.3 0 0 1 4.7 0" />
      <path d="M12.6 5.4a3.3 3.3 0 0 1 0 4.7l-2.3 2.3a3.3 3.3 0 0 1-4.7 0" />
    </svg>
  );
}

export function MarkCircle({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...base} aria-hidden="true">
      <circle cx="9" cy="9" r="6.2" />
      <circle cx="9" cy="9" r="2.6" />
    </svg>
  );
}

export function MarkStudiopress({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...base} aria-hidden="true">
      <line x1="6" y1="4" x2="6" y2="14" strokeWidth={2.4} />
      <line x1="12" y1="8" x2="12" y2="14" strokeWidth={2.4} />
    </svg>
  );
}

export function MarkBigcartel({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...base} aria-hidden="true">
      <path d="M9 2.6 14.5 4.8v4c0 3.4-2.3 5.7-5.5 6.6-3.2-.9-5.5-3.2-5.5-6.6v-4Z" />
    </svg>
  );
}

export function MarkFrahm({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...base} aria-hidden="true">
      <rect x="2.6" y="2.6" width="12.8" height="12.8" rx="2.4" />
      <circle cx="9" cy="7.4" r="2" />
      <path d="M4.8 14c.7-2 2.3-3.1 4.2-3.1s3.5 1.1 4.2 3.1" />
    </svg>
  );
}

/**
 * A generic avatar mark for the "trusted by" rows. The reference design
 * uses photographs there; standing in fabricated headshots for an
 * unaffiliated tool's "customers" would misrepresent real people, so this
 * is an abstract person silhouette instead, kept in the same overlapping,
 * gradient-filled circle treatment the layout already used.
 */
export function IconPersonAvatar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="9.2" r="4.2" />
      <path d="M3.6 21c1.3-4.8 5-7.4 8.4-7.4s7.1 2.6 8.4 7.4c.2.6-.3 1-.9 1H4.5c-.6 0-1.1-.4-.9-1Z" />
    </svg>
  );
}
