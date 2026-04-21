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

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { TopBanner } from './TopBanner';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
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

var OTHER_SECTION_PREFIXES = [
  '/dashboard/quizzes',
  '/dashboard/editor',
  '/dashboard/leads',
  '/dashboard/emails',
  '/dashboard/analytics',
  '/dashboard/integrations',
  '/dashboard/embed',
  '/dashboard/brand-kit',
  '/dashboard/billing',
  '/dashboard/referrals',
  '/dashboard/settings',
];

function isOverviewRoute(pathname: string): boolean {
  return pathname === '/dashboard';
}

function isEditorRoute(pathname: string): boolean {
  if (pathname === '/dashboard/editor' || pathname.startsWith('/dashboard/editor/')) return true;
  if (pathname === '/dashboard') return false;
  if (pathname === '/dashboard/quizzes' || pathname.startsWith('/dashboard/quizzes/')) return false;
  if (OTHER_SECTION_PREFIXES.some(function(prefix) { return prefix !== '/dashboard/editor' && (pathname === prefix || pathname.startsWith(prefix + '/')); })) {
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
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: icons.overview, match: isOverviewRoute },
      { href: '/dashboard/editor', label: 'Quiz editor', icon: icons.editor, match: isEditorRoute },
      { href: '/dashboard/quizzes', label: 'Quizzes', icon: icons.quizzes, match: isQuizzesRoute },
      { href: '/dashboard/leads', label: 'Leads', icon: icons.leads },
      { href: '/dashboard/emails', label: 'Emails', icon: icons.emails, match: function(p) { return (p === '/dashboard/emails' || p.startsWith('/dashboard/emails/')) && !p.startsWith('/dashboard/emails/templates'); } },
      { href: '/dashboard/emails/templates', label: 'Templates', icon: icons.templates },
      {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: icons.analytics,
        match: function(p) { return p === '/dashboard/analytics' || p.startsWith('/dashboard/analytics/'); },
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/dashboard/embed', label: 'Embed & install', icon: icons.embed },
      { href: '/dashboard/integrations', label: 'Integrations', icon: icons.integrations },
      { href: '/dashboard/brand-kit', label: 'Brand kit', icon: icons.brand },
      { href: '/dashboard/referrals', label: 'Referrals', icon: icons.referrals },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/billing', label: 'Billing & plan', icon: icons.billing },
      { href: '/dashboard/trash', label: 'Trash', icon: icons.trash },
    ],
  },
];

var BOTTOM_NAV: NavItem[] = [
  { href: 'https://docs.squarespell.com', label: 'Help & docs', icon: icons.help },
  { href: '/dashboard/settings', label: 'Settings', icon: icons.settings },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

/* "New features" sidebar card */
function NewFeaturesCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        margin: '0 16px 12px',
        padding: '16px',
        background: C.GRAY_50,
        border: '1px solid ' + C.GRAY_200,
        borderRadius: 12,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.GRAY_400,
          borderRadius: 6,
          padding: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div style={{ fontFamily: C.FONT, fontSize: 14, fontWeight: 600, color: C.GRAY_900, marginBottom: 4, paddingRight: 20 }}>
        New features available!
      </div>
      <div style={{ fontFamily: C.FONT, fontSize: 13, color: C.GRAY_500, lineHeight: 1.5, marginBottom: 12 }}>
        Check out the new dashboard view. Pages now load faster.
      </div>
      <div
        style={{
          width: '100%',
          height: 120,
          borderRadius: 8,
          background: 'linear-gradient(135deg, ' + C.BRAND_50 + ' 0%, ' + C.BRAND_100 + ' 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          border: '1px solid ' + C.GRAY_200,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: C.SHADOW_SM,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={C.GRAY_700} stroke="none">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            fontFamily: C.FONT,
            fontSize: 14,
            fontWeight: 600,
            color: C.GRAY_500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Dismiss
        </button>
        <a
          href="/changelog"
          style={{
            fontFamily: C.FONT,
            fontSize: 14,
            fontWeight: 600,
            color: C.ACCENT,
            textDecoration: 'none',
          }}
        >
          What&apos;s new?
        </a>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  children: ReactNode;
  title?: string;
  topbarRight?: ReactNode;
  contentPadding?: string;
  hideTopbar?: boolean;
}

export function DashboardShell({
  children,
  title,
  topbarRight,
  contentPadding = '32px 32px 56px',
  hideTopbar = false,
}: DashboardShellProps) {
  var pathname = usePathname();
  var router = useRouter();
  var { signOut } = useClerk();
  var { user } = useUser();
  var { getToken } = useAuth();
  var [mobileOpen, setMobileOpen] = useState(false);
  var [isMobile, setIsMobile] = useState(false);
  var [bannerToken, setBannerToken] = useState<string | null>(null);
  var [showNewFeatures, setShowNewFeatures] = useState(true);

  useEffect(function() {
    try {
      if (localStorage.getItem('sq_new_features_dismissed') === '1') {
        setShowNewFeatures(false);
      }
    } catch {}
  }, []);

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

  useEffect(function() {
    setMobileOpen(false);
  }, [pathname]);

  var userEmail = user?.primaryEmailAddress?.emailAddress || '';
  var userName = user?.firstName || userEmail.split('@')[0] || 'User';
  var userInitial = (userName[0] || 'S').toUpperCase();

  var sidebarWidth = 280;

  function dismissNewFeatures() {
    setShowNewFeatures(false);
    try { localStorage.setItem('sq_new_features_dismissed', '1'); } catch {}
  }

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
              background: 'linear-gradient(135deg, #0D7377 0%, #0fa3a8 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(13,115,119,0.3)',
            }}
          >
            {icons.logo}
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.02em' }}>
            Squarespell
          </span>
        </Link>
      </div>

      {/* Search trigger */}
      <div style={{ padding: '4px 16px 8px' }}>
        <button
          type="button"
          onClick={function() {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: C.SURFACE,
            border: '1px solid ' + C.GRAY_300,
            borderRadius: 8,
            color: C.GRAY_500,
            fontSize: 14,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: C.FONT,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={function(e: any) { e.currentTarget.style.borderColor = C.GRAY_400; }}
          onMouseLeave={function(e: any) { e.currentTarget.style.borderColor = C.GRAY_300; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icons.search}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          <kbd style={{
            fontFamily: C.FONT,
            fontSize: 12,
            fontWeight: 500,
            color: C.GRAY_400,
          }}>
            Cmd+K
          </kbd>
        </button>
      </div>

      {/* Primary nav */}
      <nav aria-label="Main" style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {NAV_SECTIONS.map(function(section, sectionIdx) {
          return (
            <div key={section.label} style={{ marginTop: sectionIdx === 0 ? 0 : 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.GRAY_500,
                  padding: '8px 12px 4px',
                  letterSpacing: '-0.01em',
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
                        color: active ? C.GRAY_900 : C.GRAY_500,
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

        <div style={{ height: 1, background: C.GRAY_200, margin: '12px 12px' }} />

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.GRAY_500,
            padding: '8px 12px 4px',
            letterSpacing: '-0.01em',
            fontFamily: C.FONT,
          }}
        >
          Resources
        </div>

        {BOTTOM_NAV.map(function(item) {
          var isExternal = item.href.startsWith('http');
          var active = !isExternal && isActive(item, pathname || '');
          var Wrap: any = isExternal ? 'a' : Link;
          var wrapProps: any = isExternal
            ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: item.href };
          return (
            <Wrap
              key={item.href}
              {...wrapProps}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
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
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0, color: active ? C.GRAY_900 : C.GRAY_500 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Wrap>
          );
        })}
      </nav>

      {/* New features card */}
      {showNewFeatures && <NewFeaturesCard onDismiss={dismissNewFeatures} />}

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
              background: 'linear-gradient(135deg, #0D7377, #0fa3a8)',
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

      {sidebar}
      <CommandPalette />

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
        {!hideTopbar && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid ' + C.GRAY_200,
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            minHeight: 64,
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
            {title && (
              <h1
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.GRAY_900,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: C.FONT,
                }}
              >
                {title}
              </h1>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            {topbarRight}
          </div>
        </header>
        )}

        {/* Persistent banner slot */}
        <TopBanner token={bannerToken} />

        {/* Page content */}
        <main id="sq-main" style={{ flex: 1, padding: contentPadding, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { DASHBOARD_COLORS } from './dashboardColors';
