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
import { track } from '@/lib/analytics';
import { checkoutHref, daysUntil, isUnpaid, planName } from '@/lib/billing';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type BannerVariant = 'trial' | 'billing' | 'info';

export interface BannerConfig {
  variant: BannerVariant;
  message: string;
  /** Optional CTA label - if omitted, no button is rendered. */
  ctaLabel?: string;
  /** Optional CTA URL - uses router.push for internal, window.open for external */
  ctaHref?: string;
  /** Unique key for dismissal tracking */
  dismissKey: string;
  /** Upgrade prompts report views and clicks under this name. */
  placement?: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Banners for a /api/user/plan response, highest priority first. New sign-ups are stored as plan 'free' during their
 * trial (older accounts as 'trial'); both count as unpaid. `upgraded` is the ?upgraded=true return from Stripe checkout.
 */
export function computeBanners(data: any, opts: { now?: number; upgraded?: string | null; upgradedPlan?: string | null } = {}): BannerConfig[] {
  const now = opts.now ?? Date.now();
  const banners: BannerConfig[] = [];
  const unpaid = isUnpaid(data.plan);

  if (data.billing_alert) {
    banners.push({ variant: 'billing', message: data.billing_alert, ctaLabel: 'Update payment', ctaHref: '/dashboard/billing', dismissKey: 'billing_' + (data.billing_alert_id || 'default') });
  }

  if (opts.upgraded) {
    banners.push(unpaid
      ? { variant: 'info', message: 'Payment received. Your plan is being activated; this can take a minute. Refresh to see it.', dismissKey: 'upgraded_pending_' + now }
      : { variant: 'info', message: 'Payment received. You\u2019re on ' + planName(String(data.plan)) + '. Thank you! Every quiz keeps collecting leads into your dashboard.', ctaLabel: 'See leads', ctaHref: '/dashboard/leads', dismissKey: 'upgraded_' + now });
  }

  if (unpaid && data.trial_ends_at) {
    const daysLeft = daysUntil(data.trial_ends_at, now);
    const ended = data.trial_active === false || new Date(data.trial_ends_at).getTime() <= now;
    const held = (data.held_leads && data.held_leads.count) || 0;
    const total = data.total_leads || 0;
    if (ended) {
      const offer = data.offer === 'winback';
      banners.push({
        variant: 'trial',
        message: (held > 0
          ? 'Your trial has ended. ' + held + plural(held, ' new lead is', ' new leads are') + ' waiting, kept for 30 days.'
          : 'Your trial has ended. Your quizzes are still live, but new leads are held until you choose a plan.')
          + (offer ? ' Come back with 20% off your first 3 months.' : ''),
        ctaLabel: offer ? 'Get 20% off' : (held > 0 ? 'Unlock my leads' : 'Choose a plan'),
        ctaHref: offer ? checkoutHref({ plan: 'pro', billing: 'monthly', offer: 'winback', from: 'banner' }) : '/dashboard/billing?tab=plans&plan=pro&billing=yearly',
        dismissKey: 'trial_ended_' + held,
        placement: 'banner_trial_ended',
      });
    } else if (daysLeft <= 14) {
      const urgent = daysLeft <= 3;
      const days = daysLeft + plural(daysLeft, ' day', ' days');
      banners.push({
        variant: 'trial',
        message: total > 0
          ? days + ' left in your trial. Your quizzes have collected ' + total + plural(total, ' lead', ' leads') + ' so far. Choose a plan to keep them coming.'
          : (urgent ? days + ' left in your trial. Choose a plan and your quizzes keep collecting leads.' : days + ' left in your free trial. Plans start at $9/mo.'),
        ctaLabel: 'Choose a plan',
        ctaHref: '/dashboard/billing?tab=plans&plan=pro&billing=yearly',
        dismissKey: 'trial_' + (urgent ? 'urgent' : 'normal'),
        placement: urgent ? 'banner_trial_urgent' : 'banner_trial',
      });
    }
  }

  // Paying accounts close to their monthly lead allowance (80%).
  const limit = data.limits && data.limits.leads;
  const used = data.leads_this_month || 0;
  if (!unpaid && typeof limit === 'number' && isFinite(limit) && limit > 0 && used >= 0.8 * limit) {
    const month = new Date(now).toISOString().slice(0, 7);
    banners.push({
      variant: 'trial',
      message: used >= limit
        ? 'You have used all ' + limit.toLocaleString('en-US') + ' leads in your plan this month. Add more leads or upgrade so new ones keep arriving.'
        : 'You have used ' + used.toLocaleString('en-US') + ' of ' + limit.toLocaleString('en-US') + ' leads this month.',
      ctaLabel: 'Add leads or upgrade',
      ctaHref: '/dashboard/billing?tab=addons',
      dismissKey: 'usage_' + month + (used >= limit ? '_full' : '_80'),
      placement: 'banner_usage',
    });
  }
  return banners;
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
    border: 'rgba(49, 84, 255, 0.15)',
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
  /** Access token for API calls */
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

        const params = new URLSearchParams(window.location.search);
        const upgraded = params.get('upgraded');
        if (upgraded) {
          track('purchase', { plan: params.get('plan') || String(data.plan || '') });
          params.delete('upgraded'); params.delete('plan');
          try { window.history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : '')); } catch { /* ignore */ }
        }
        const banners: BannerConfig[] = computeBanners(data, { upgraded });

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
        if (!cancelled) {
          setBanner(active || null);
          if (active && active.placement) track('upgrade_prompt_view', { placement: active.placement });
        }
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
        fontFamily: '"Inter",system-ui,sans-serif',
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
          onClick={() => { if (banner.placement) track('upgrade_click', { placement: banner.placement }); }}
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
