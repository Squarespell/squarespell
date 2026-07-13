'use client';

/**
 * DashboardShell - the persistent chrome (sidebar + topbar) that wraps every
 * top-level dashboard page.
 *
 * Untitled UI-inspired clean white design with Inter font.
 *
 * Rules
 * -----
 * - Sidebar is persistent across route changes (no re-mount flicker)
 * - Active state uses gray-50 background
 * - Collapses to a drawer on mobile (<768px)
 * - Full-screen pages (like /dashboard/[quizId] editor) deliberately opt out
 *   by NOT rendering inside this shell
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { TopBanner } from './TopBanner';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { OnboardingTour } from './OnboardingTour';
import { DASHBOARD_COLORS } from './dashboardColors';

var C = DASHBOARD_COLORS;

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

// Inline SVG icons - 1.75px stroke, 20x20 viewBox for Untitled UI feel
var icons = {
  overview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  quizzes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 13h6M9 17h4"/>
    </svg>
  ),
  editor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  leads: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
    </svg>
  ),
  emails: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13 2 4"/>
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-5 4 3 5-7"/>
    </svg>
  ),
  integrations: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  embed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  brand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  billing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  templates: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5"/>
    </svg>
  ),
  trash: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  signout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  logo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4" r="2" fill="#FFFFFF"/>
      <line x1="12" y1="6" x2="12" y2="11"/>
      <line x1="12" y1="11" x2="7" y2="16"/>
      <line x1="12" y1="11" x2="17" y2="16"/>
      <circle cx="7" cy="18" r="2" fill="#FFFFFF"/>
      <circle cx="17" cy="18" r="2" fill="#FFFFFF"/>
    </svg>
  ),
  referrals: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4"/>
      <path d="M5 20c0-2 2-4 4-4s4 2 4 4"/>
      <path d="M19 5l-3 3m0-3l3 3"/>
      <path d="M19 5c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4"/>
    </svg>
  ),
};

function isOverviewRoute(pathname: string): boolean {
  return pathname === '/dashboard';
}

function isEditorRoute(pathname: string): boolean {
  if (pathname === '/dashboard/editor' || pathname.startsWith('/dashboard/editor/')) return true;
  if (pathname === '/dashboard') return false;
  var knownPrefixes = [
    '/dashboard/quizzes', '/dashboard/quiz', '/dashboard/leads', '/dashboard/analytics',
    '/dashboard/integrations', '/dashboard/billing', '/dashboard/settings',
    '/dashboard/team', '/dashboard/emails', '/dashboard/segmentation',
    '/dashboard/automations', '/dashboard/commerce', '/dashboard/templates',
    '/dashboard/brand-kit', '/dashboard/referrals', '/dashboard/embed',
    '/dashboard/admin', '/dashboard/trash',
  ];
  if (knownPrefixes.some(function(prefix) { return pathname === prefix || pathname.startsWith(prefix + '/'); })) {
    return false;
  }
  return pathname.startsWith('/dashboard/');
}

function isQuizzesRoute(pathname: string): boolean {
  return pathname === '/dashboard/quizzes' || pathname.startsWith('/dashboard/quizzes/');
}

type NavSection = {
  label: string;
  items: NavItem[];
};

var NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: icons.overview, match: isOverviewRoute },
      {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: icons.analytics,
        match: function(p) { return p === '/dashboard/analytics' || p.startsWith('/dashboard/analytics/'); },
      },
    ],
  },
  {
    label: 'Quizzes',
    items: [
      { href: '/dashboard/quizzes', label: 'All quizzes', icon: icons.quizzes, match: isQuizzesRoute },
      { href: '/dashboard/templates', label: 'Templates', icon: icons.templates },
      { href: '/dashboard/editor', label: 'Quiz editor', icon: icons.editor, match: isEditorRoute },
    ],
  },
  {
    label: 'Leads',
    items: [
      { href: '/dashboard/leads', label: 'All leads', icon: icons.leads },
      { href: '/dashboard/segmentation', label: 'Segmentation', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
      ) },
    ],
  },
  {
    label: 'Engage',
    items: [
      { href: '/dashboard/emails', label: 'Email Campaigns', icon: icons.emails },
      { href: '/dashboard/automations', label: 'Automations', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ) },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/dashboard/commerce', label: 'Products', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
      ) },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/dashboard/settings', label: 'General', icon: icons.settings },
      { href: '/dashboard/billing', label: 'Billing & plan', icon: icons.billing },
      { href: '/dashboard/integrations', label: 'Integrations', icon: icons.integrations },
      { href: '/dashboard/brand-kit', label: 'Brand kit', icon: icons.brand },
      { href: '/dashboard/team', label: 'Team', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ) },
      { href: '/dashboard/referrals', label: 'Referrals', icon: icons.referrals },
    ],
  },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

/* Sidebar plan usage card */
type PlanCardData = {
  name: string;
  renewsAt: string;
  isTrial: boolean;
  trialDaysLeft: number;
  leadsUsed: number;
  leadsLimit: number;
  quizzesUsed: number;
  quizzesLimit: number;
};

function usageBarColor(pct: number): string {
  if (pct >= 90) return C.DANGER;
  if (pct >= 70) return C.WARNING;
  return C.ACCENT;
}

function UsageBar({ label, used, limit, unlimited }: { label: string; used: number; limit: number; unlimited?: boolean }) {
  var pct = (!unlimited && limit > 0) ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  var color = usageBarColor(pct);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_600 }}>{label}</span>
        <span style={{ fontSize: 11, color: unlimited ? C.SUCCESS : (pct >= 90 ? C.DANGER : C.GRAY_500) }}>
          {unlimited ? 'Unlimited' : used.toLocaleString() + ' / ' + limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 5, background: C.GRAY_200, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

function SidebarPlanCard({ plan }: { plan: PlanCardData }) {
  var isTopTier = plan.name.toLowerCase().includes('business') || plan.name.toLowerCase().includes('agency');
  var leadsUnlimited = plan.leadsLimit <= 0 || plan.leadsLimit === Infinity || plan.leadsLimit >= 999999;
  var quizzesUnlimited = plan.quizzesLimit <= 0 || plan.quizzesLimit === Infinity || plan.quizzesLimit >= 999999;
  var trialUrgent = plan.isTrial && plan.trialDaysLeft <= 3;
  return (
    <div
      style={{
        margin: '0 16px 12px',
        padding: '14px 16px',
        background: C.GRAY_50,
        border: '1px solid ' + (trialUrgent ? C.WARNING : C.GRAY_200),
        borderRadius: 12,
        fontFamily: C.FONT,
      }}
    >
      {/* Plan name + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>{plan.name}</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: trialUrgent ? C.WARNING : C.SUCCESS_500, flexShrink: 0 }} />
      </div>
      {/* Subline: trial days or renewal date */}
      {plan.isTrial ? (
        <div style={{ fontSize: 11, color: trialUrgent ? C.WARNING : C.GRAY_500, fontWeight: trialUrgent ? 600 : 400, marginBottom: 12 }}>
          {plan.trialDaysLeft > 0 ? plan.trialDaysLeft + ' days left in trial' : 'Trial ended'}
        </div>
      ) : plan.renewsAt ? (
        <div style={{ fontSize: 11, color: C.GRAY_500, marginBottom: 12 }}>Renews {plan.renewsAt}</div>
      ) : (
        <div style={{ fontSize: 11, color: C.GRAY_500, marginBottom: 12 }}>Active</div>
      )}

      {/* Usage bars */}
      <UsageBar label="Leads" used={plan.leadsUsed} limit={plan.leadsLimit} unlimited={leadsUnlimited} />
      <UsageBar label="Quizzes" used={plan.quizzesUsed} limit={plan.quizzesLimit} unlimited={quizzesUnlimited} />

      <Link
        href="/dashboard/billing"
        style={{
          display: 'block',
          width: '100%',
          padding: '7px 0',
          marginTop: 4,
          background: plan.isTrial ? C.ACCENT : C.SURFACE,
          border: '1px solid ' + (plan.isTrial ? C.ACCENT : C.GRAY_300),
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          color: plan.isTrial ? '#fff' : C.GRAY_700,
          textAlign: 'center',
          textDecoration: 'none',
          fontFamily: C.FONT,
          transition: 'opacity 0.12s',
        }}
        onMouseEnter={function(e) { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={function(e) { e.currentTarget.style.opacity = '1'; }}
      >
        {plan.isTrial ? 'Choose a plan' : isTopTier ? 'Manage plan' : 'Upgrade plan'}
      </Link>
    </div>
  );
}

/* Sidebar help section */
function SidebarHelpCard() {
  return (
    <a
      href="https://docs.squarespell.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 16px 12px',
        padding: '12px 16px',
        borderRadius: 10,
        background: C.ACCENT_LIGHT,
        textDecoration: 'none',
        transition: 'all 0.12s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: C.ACCENT, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>Need help?</div>
        <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>Visit our help center or contact support</div>
      </div>
      <span style={{ color: C.GRAY_400, fontSize: 16 }}>&rarr;</span>
    </a>
  );
}

interface DashboardShellProps {
  children: ReactNode;
  title?: string;
  topbarRight?: ReactNode;
  contentPadding?: string;
  hideTopbar?: boolean;
  hideSidebar?: boolean;
}

export function DashboardShell({
  children,
  title,
  topbarRight,
  contentPadding = '32px 32px 56px',
  hideTopbar = false,
  hideSidebar,
}: DashboardShellProps) {
  var pathname = usePathname();
  // Auto-hide sidebar on editor routes to give maximum canvas space
  var isOnEditor = isEditorRoute(pathname);
  var shouldHideSidebar = hideSidebar !== undefined ? hideSidebar : isOnEditor;
  var router = useRouter();
  var { signOut } = useClerk();
  var { user } = useUser();
  var { getToken } = useAuth();
  var [mobileOpen, setMobileOpen] = useState(false);
  var [isMobile, setIsMobile] = useState(false);
  var [bannerToken, setBannerToken] = useState<string | null>(null);
  var sidebarScrollRef = useRef<HTMLDivElement>(null);
  var sidebarScrollPos = useRef(0);
  var [planData, setPlanData] = useState<PlanCardData>({
    name: 'Loading...', renewsAt: '', isTrial: false, trialDaysLeft: 0,
    leadsUsed: 0, leadsLimit: 0, quizzesUsed: 0, quizzesLimit: 0,
  });

  useEffect(function() {
    var check = function() { setIsMobile(window.innerWidth < 768); };
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);

  useEffect(function() {
    var cancelled = false;
    (async function() {
      try {
        var t = await getToken();
        if (!cancelled) setBannerToken(t);
      } catch { /* ignore */ }
    })();
    return function() { cancelled = true; };
  }, [getToken]);

  // Restore sidebar scroll position on mount (survives re-mount across routes)
  useEffect(function() {
    var el = sidebarScrollRef.current;
    if (el) {
      try {
        var saved = sessionStorage.getItem('sq-sidebar-scroll');
        if (saved) el.scrollTop = Number(saved);
      } catch {}
    }
  }, []);

  useEffect(function() {
    setMobileOpen(false);
  }, [pathname]);

  var userEmail = user?.primaryEmailAddress?.emailAddress || '';
  var userName = user?.firstName || userEmail.split('@')[0] || 'User';
  var userInitial = (userName[0] || 'S').toUpperCase();

  var sidebarWidth = 280;

  // Fetch plan data for sidebar card
  useEffect(function() {
    if (!bannerToken) return;
    var cancelled = false;
    var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
    (async function() {
      try {
        var res = await fetch(apiBase + '/api/user/plan', { headers: { Authorization: 'Bearer ' + bannerToken } });
        if (res.ok) {
          var data = await res.json();
          if (!cancelled) {
            var renewDate = data.current_period_end ? new Date(data.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            var PLAN_NAMES: Record<string, string> = {
              free: 'Free Plan', trial: 'Free Trial', core: 'Core Plan', pro: 'Pro Plan',
              business: 'Business Plan', agency: 'Business Plan',
              starter: 'Core Plan', growth: 'Pro Plan', scale: 'Business Plan',
            };
            var rawPlan = (data.plan || 'free').toLowerCase();
            var planDisplayName = PLAN_NAMES[rawPlan] || (rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1) + ' Plan');
            var isTrial = rawPlan === 'free' || rawPlan === 'trial';
            var trialDaysLeft = 0;
            if (isTrial && data.trial_ends_at) {
              trialDaysLeft = Math.max(0, Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86400000));
            }
            setPlanData({
              name: planDisplayName,
              renewsAt: renewDate,
              isTrial,
              trialDaysLeft,
              leadsUsed: data.leads_this_month ?? data.usage?.leads ?? 0,
              leadsLimit: data.limits?.leads ?? 0,
              quizzesUsed: data.quiz_count ?? 0,
              quizzesLimit: data.limits?.quizzes ?? 0,
            });
          }
        }
      } catch {}
    })();
    return function() { cancelled = true; };
  }, [bannerToken]);

  var sidebar = (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: sidebarWidth,
        background: C.SIDEBAR,
        borderRight: '1px solid ' + C.GRAY_200,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (mobileOpen ? 0 : -sidebarWidth - 8) : 0,
        zIndex: 50,
        transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: C.FONT,
        boxShadow: isMobile && mobileOpen ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
        flexShrink: 0,
      }}
    >
      {/* Brand header */}
      <div style={{ padding: '24px 16px 16px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: '#0f7377',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(15,115,119,0.3)',
            }}
          >
            {icons.logo}
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.03em' }}>
            Squarespell Quiz
          </span>
        </Link>
      </div>

      {/* Scrollable area: nav + plan card scroll together */}
      <div
        ref={sidebarScrollRef}
        onScroll={function(e: any) {
          var pos = e.currentTarget.scrollTop;
          sidebarScrollPos.current = pos;
          try { sessionStorage.setItem('sq-sidebar-scroll', String(pos)); } catch {}
        }}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        <nav aria-label="Main" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV_SECTIONS.map(function(section, sectionIdx) {
            return (
              <div key={section.label} style={{ marginTop: sectionIdx === 0 ? 0 : 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.GRAY_400,
                    padding: '8px 8px 4px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    fontFamily: C.FONT,
                  }}
                >
                  {section.label}
                </div>
                {section.items.map(function(item) {
                  var active = isActive(item, pathname || '');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={
                        item.href === '/dashboard' ? 'dashboard' :
                        item.href === '/dashboard/quizzes' ? 'quizzes' :
                        item.href === '/dashboard/editor' ? 'editor' :
                        item.href === '/dashboard/leads' ? 'leads' :
                        item.href === '/dashboard/analytics' ? 'analytics' :
                        item.href === '/dashboard/integrations' ? 'integrations' :
                        item.href === '/dashboard/embed' ? 'embed' :
                        item.href === '/dashboard/emails' ? 'emails' :
                        item.href === '/dashboard/billing' ? 'billing' :
                        undefined
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                        margin: '1px 0',
                        borderRadius: 6,
                        textDecoration: 'none',
                        color: active ? C.GRAY_900 : C.GRAY_700,
                        background: active ? C.GRAY_50 : 'transparent',
                        fontSize: 14,
                        fontWeight: active ? 600 : 500,
                        fontFamily: C.FONT,
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={function(e: any) {
                        if (!active) {
                          e.currentTarget.style.background = C.GRAY_50;
                          e.currentTarget.style.color = C.GRAY_900;
                        }
                      }}
                      onMouseLeave={function(e: any) {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = C.GRAY_700;
                        }
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                          color: active ? C.ACCENT : C.GRAY_500,
                          transition: 'color 0.12s ease',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Plan card — scrolls with nav */}
        <div style={{ padding: '16px 0 8px' }}>
          <SidebarPlanCard plan={planData} />
        </div>
      </div>

      {/* Account footer */}
      <div style={{ padding: '16px', borderTop: '1px solid ' + C.GRAY_200 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0f7377, #0fa3a8)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {userInitial}
            <span style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: C.SUCCESS_500,
              border: '2px solid ' + C.SURFACE,
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.GRAY_700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: C.FONT,
            }}>
              {userName}
            </div>
            <div style={{
              fontSize: 12,
              color: C.GRAY_500,
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: C.FONT,
            }}>
              {userEmail || '-'}
            </div>
          </div>
          <button
            type="button"
            onClick={function() { signOut(function() { router.push('/sign-in'); }); }}
            title="Sign out"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: C.GRAY_400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease',
              flexShrink: 0,
            }}
            onMouseEnter={function(e: any) {
              e.currentTarget.style.background = C.DANGER_LIGHT;
              e.currentTarget.style.color = C.DANGER;
            }}
            onMouseLeave={function(e: any) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = C.GRAY_400;
            }}
          >
            {icons.signout}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div
      style={{
        background: C.BG,
        minHeight: '100vh',
        display: 'flex',
        fontFamily: C.FONT,
        color: C.TEXT,
      }}
    >
      {/* Skip-to-content link for keyboard users (WCAG 2.4.1) */}
      <a
        href="#sq-main"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          zIndex: 100,
          padding: '12px 24px',
          background: C.ACCENT,
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: 14,
          borderRadius: '0 0 8px 0',
          textDecoration: 'none',
        }}
        onFocus={function(e: any) { e.currentTarget.style.left = '0'; }}
        onBlur={function(e: any) { e.currentTarget.style.left = '-9999px'; }}
      >
        Skip to main content
      </a>

      {/* Global focus-visible ring style */}
      <style>{`
        *:focus-visible {
          outline: 2px solid ${C.ACCENT};
          outline-offset: 2px;
        }
      `}</style>

      {!shouldHideSidebar && sidebar}
      <CommandPalette />
      {!shouldHideSidebar && <OnboardingTour />}

      {/* Scrim for mobile drawer */}
      {isMobile && mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          onClick={function() { setMobileOpen(false); }}
          onKeyDown={function(e: any) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileOpen(false); } }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.18)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Main column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: C.BG,
        }}
      >
        {/* Topbar */}
        {!hideTopbar && !shouldHideSidebar && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid ' + C.GRAY_200,
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            height: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            {isMobile && (
              <button
                type="button"
                onClick={function() { setMobileOpen(function(v) { return !v; }); }}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                style={{
                  background: 'transparent',
                  border: '1px solid ' + C.GRAY_300,
                  color: C.GRAY_700,
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {mobileOpen ? icons.close : icons.menu}
              </button>
            )}
            {/* Topbar search */}
            <button
              type="button"
              onClick={function() {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                border: '1px solid ' + C.GRAY_200,
                borderRadius: 8,
                color: C.GRAY_400,
                fontSize: 14,
                minWidth: 320,
                cursor: 'pointer',
                background: C.SURFACE,
                fontFamily: C.FONT,
                transition: 'all 0.15s',
              }}
              onMouseEnter={function(e: any) { e.currentTarget.style.borderColor = C.GRAY_300; }}
              onMouseLeave={function(e: any) { e.currentTarget.style.borderColor = C.GRAY_200; }}
            >
              {icons.search}
              <span style={{ flex: 1, textAlign: 'left', color: C.GRAY_500, fontSize: 14 }}>Search anything...</span>
              <kbd style={{ padding: '2px 6px', border: '1px solid ' + C.GRAY_200, borderRadius: 4, fontSize: 11, color: C.GRAY_400, background: C.GRAY_50, fontWeight: 500, fontFamily: C.FONT }}>&#8984; K</kbd>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            {topbarRight}
          </div>
        </header>
        )}

        {/* Persistent banner slot */}
        {!shouldHideSidebar && <TopBanner token={bannerToken} />}

        {/* Page content */}
        <main id="sq-main" style={{ flex: 1, padding: shouldHideSidebar ? 0 : contentPadding, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { DASHBOARD_COLORS } from './dashboardColors';
