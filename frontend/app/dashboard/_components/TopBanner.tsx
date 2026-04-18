'use client';

/**
 * TopBanner - persistent, full-width banner slot that sits between the
 * DashboardShell topbar and the page content. Supports three banner types:
 *
 *   trial    - amber countdown when the user's free trial is running
 *   billing  - red alert for payment failures or plan downgrades
 *   info     - neutral announcement (feature launches, maintenance windows)
 *
 * Banners are rendered in priority order (billing > trial > info) and only
 * the highest-priority active banner is shown. Each banner is individually
 * dismissible; the dismiss state is stored in localStorage so it persists
 * across page navigations but resets on new sessions.
 *
 * The component fetches /api/user/plan once on mount and derives banner
 * state from the response. External announcements can be injected via the
 * `announcement` prop (e.g. from a feature-flag or config endpoint).
 */

import { useEffect, useState } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type BannerVariant = 'trial' | 'billing' | 'info';

interface BannerConfig {
  variant: BannerVariant;
  message: string;
  /** Optional CTA label - if omitted, no button is rendered. */
  ctaLabel?: string;
  /** Optional CTA URL - uses router.push for internal, window.open for external */
  ctaHref?: string;
  /** Unique key for dismissal tracking */
  dismissKey: string;
}

// -----------------------------------------------------------------------
// Styling
// -----------------------------------------------------------------------

const VARIANT_STYLES: Record<BannerVariant, { bg: string; border: string; accent: string; text: string }> = {
  trial: {
    bg: C.WARNING_LIGHT,
    border: 'rgba(180, 83, 9, 0.2)',
    accent: C.WARNING,
    text: '#92400E',
  },
  billing: {
    bg: C.DANGER_LIGHT,
    border: 'rgba(197, 48, 48, 0.2)',
    accent: C.DANGER,
    text: '#9B2C2C',
  },
  info: {
    bg: C.ACCENT_LIGHT,
    border: 'rgba(13, 115, 119, 0.15)',
    accent: C.ACCENT,
    text: C.TEXT,
  },
};

const closeIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

interface TopBannerProps {
  /** Auth token from Clerk for API calls */
  token: string | null;
  /** Optional static announcement to show (lowest priority) */
  announcement?: { message: string; ctaLabel?: string; ctaHref?: string; dismissKey: string } | null;
}

export function TopBanner({ token, announcement }: TopBannerProps) {
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismiss state from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sq_banner_dismissed');
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  // Fetch plan data to determine trial/billing banners
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/user/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();

        const banners: BannerConfig[] = [];

        // Billing alert (highest priority)
        if (data.billing_alert) {
          banners.push({
            variant: 'billing',
            message: data.billing_alert,
            ctaLabel: 'Update payment',
            ctaHref: '/dashboard/billing',
            dismissKey: 'billing_' + (data.billing_alert_id || 'default'),
          });
        }

        // Trial countdown
        if (data.plan === 'trial' && data.trial_ends_at) {
          const trialEnds = new Date(data.trial_ends_at);
          const now = new Date();
          const daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000));
          if (daysLeft <= 14) {
            const urgent = daysLeft <= 3;
            banners.push({
              variant: 'trial',
              message: urgent
                ? `Your free trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to keep your quizzes live.`
                : `You're on a free trial - ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`,
              ctaLabel: 'Upgrade',
              ctaHref: '/dashboard/billing',
              dismissKey: `trial_${daysLeft <= 3 ? 'urgent' : 'normal'}`,
            });
          }
        }

        // Static announcement (lowest priority)
        if (announcement) {
          banners.push({
            variant: 'info',
            message: announcement.message,
            ctaLabel: announcement.ctaLabel,
            ctaHref: announcement.ctaHref,
            dismissKey: announcement.dismissKey,
          });
        }

        // Pick the highest-priority non-dismissed banner
        const active = banners.find((b) => !dismissed.has(b.dismissKey));
        if (!cancelled) setBanner(active || null);
      } catch { /* network error - no banner is fine */ }
    })();

    return () => { cancelled = true; };
  }, [token, announcement, dismissed]);

  function handleDismiss() {
    if (!banner) return;
    const next = new Set(dismissed);
    next.add(banner.dismissKey);
    setDismissed(next);
    setBanner(null);
    try {
      localStorage.setItem('sq_banner_dismissed', JSON.stringify(Array.from(next)));
    } catch { /* ignore */ }
  }

  if (!banner) return null;

  const s = VARIANT_STYLES[banner.variant];

  return (
    <div
      style={{
        background: s.bg,
        borderBottom: `1px solid ${s.border}`,
        padding: '10px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        fontFamily: '"DM Sans",system-ui,sans-serif',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: s.text,
        minHeight: 44,
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.accent,
          flexShrink: 0,
          boxShadow: `0 0 8px ${s.accent}`,
        }}
      />

      {/* Message */}
      <span style={{ flex: 1, textAlign: 'center' }}>
        {banner.message}
      </span>

      {/* CTA button */}
      {banner.ctaLabel && banner.ctaHref && (
        <a
          href={banner.ctaHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 14px',
            borderRadius: 7,
            background: s.accent,
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {banner.ctaLabel}
        </a>
      )}

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        style={{
          background: 'transparent',
          border: 'none',
          color: s.text,
          cursor: 'pointer',
          opacity: 0.6,
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
      >
        {closeIcon}
      </button>
    </div>
  );
}
