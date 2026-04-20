'use client';

/**
 * DashboardShell - the persistent chrome (sidebar + topbar) that wraps every
 * top-level dashboard page.
 *
 * Light theme with warm off-white palette and deep teal accent.
 *
 * Rules
 * -----
 * - Sidebar is persistent across route changes (no re-mount flicker)
 * - Active state uses teal-tinted background
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

const COLORS = DASHBOARD_COLORS;

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

// Inline SVG icons - 1.5px stroke, 20x20 viewBox for refined look
const icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  quizzes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 13h6M9 17h4"/>
    </svg>
  ),
  editor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  leads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
    </svg>
  ),
  emails: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13 2 4"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-5 4 3 5-7"/>
    </svg>
  ),
  integrations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  embed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  brand: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  templates: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5"/>
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  ),
  help: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  signout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  logo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

// Sections other than the main Overview/Quizzes/Editor routes that own their own sub-route tree.
const OTHER_SECTION_PREFIXES = [
  '/dashboard/quizzes',
  '/dashboard/editor',
  '/dashboard/leads',
  '/dashboard/emails',
  '/dashboard/analytics',
  '/dashboard/integrations',
  '/dashboard/embed',
  '/dashboard/brand-kit',
  '/dashboard/billing',
  '/dashboard/settings',
];

// Overview = exact /dashboard only.
function isOverviewRoute(pathname: string): boolean {
  return pathname === '/dashboard';
}

// Quiz editor = /dashboard/editor OR any quiz detail route (e.g. /dashboard/<id>).
function isEditorRoute(pathname: string): boolean {
  if (pathname === '/dashboard/editor' || pathname.startsWith('/dashboard/editor/')) return true;
  if (pathname === '/dashboard') return false;
  if (pathname === '/dashboard/quizzes' || pathname.startsWith('/dashboard/quizzes/')) return false;
  if (OTHER_SECTION_PREFIXES.some((prefix) => prefix !== '/dashboard/editor' && (pathname === prefix || pathname.startsWith(prefix + '/')))) {
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

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: icons.overview, match: isOverviewRoute },
      { href: '/dashboard/editor', label: 'Quiz editor', icon: icons.editor, match: isEditorRoute },
      { href: '/dashboard/quizzes', label: 'Quizzes', icon: icons.quizzes, match: isQuizzesRoute },
      { href: '/dashboard/leads', label: 'Leads', icon: icons.leads },
      { href: '/dashboard/emails', label: 'Emails', icon: icons.emails, match: (p) => (p === '/dashboard/emails' || p.startsWith('/dashboard/emails/')) && !p.startsWith('/dashboard/emails/templates') },
      { href: '/dashboard/emails/templates', label: 'Templates', icon: icons.templates },
      {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: icons.analytics,
        match: (p) => p === '/dashboard/analytics' || p.startsWith('/dashboard/analytics/'),
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/dashboard/embed', label: 'Embed & install', icon: icons.embed },
      { href: '/dashboard/integrations', label: 'Integrations', icon: icons.integrations },
      { href: '/dashboard/brand-kit', label: 'Brand kit', icon: icons.brand },
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

const BOTTOM_NAV: NavItem[] = [
  { href: 'https://docs.squarespell.com', label: 'Help & docs', icon: icons.help },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + '/');
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
  contentPadding = '36px 36px 56px',
  hideTopbar = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bannerToken, setBannerToken] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getToken();
        if (!cancelled) setBannerToken(t);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const userInitial = (userEmail[0] || 'S').toUpperCase();

  const sidebarWidth = 252;

  const sidebar = (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: sidebarWidth,
        background: COLORS.SIDEBAR,
        borderRight: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (mobileOpen ? 0 : -sidebarWidth - 8) : 0,
        zIndex: 50,
        transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: '"DM Sans",system-ui,sans-serif',
        boxShadow: isMobile && mobileOpen ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Brand header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${COLORS.BORDER}` }}>
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: COLORS.ACCENT,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icons.logo}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.TEXT, letterSpacing: '-0.03em' }}>
            Squarespell
          </span>
        </Link>
      </div>

      {/* Search trigger */}
      <div style={{ padding: '10px 14px 0' }}>
        <button
          type="button"
          onClick={() => {
            // Trigger Cmd+K palette
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: COLORS.SURFACE,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: 8,
            color: COLORS.TEXT_SUBTLE,
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: '"DM Sans",system-ui,sans-serif',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.BORDER; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icons.search}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.TEXT_SUBTLE,
              background: COLORS.SIDEBAR,
              padding: '2px 6px',
              borderRadius: 4,
              border: `1px solid ${COLORS.BORDER}`,
            }}
          >
            Cmd+K
          </span>
        </button>
      </div>

      {/* Primary nav */}
      <nav aria-label="Main" style={{ flex: 1, padding: '8px 10px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label} style={{ marginTop: sectionIdx === 0 ? 0 : 10 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: COLORS.TEXT_SUBTLE,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 14px 4px',
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = isActive(item, pathname || '');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 12px',
                    margin: '1px 0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: active ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                    background: active ? COLORS.ACCENT_LIGHT : 'transparent',
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.005em',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = COLORS.SIDEBAR_HOVER;
                      e.currentTarget.style.color = COLORS.TEXT;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
                    }
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      color: active ? COLORS.ACCENT : 'currentColor',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: COLORS.TEXT_SUBTLE,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '10px 14px 4px',
          }}
        >
          Resources
        </div>

        {BOTTOM_NAV.map((item) => {
          const isExternal = item.href.startsWith('http');
          const Wrap: any = isExternal ? 'a' : Link;
          const wrapProps: any = isExternal
            ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: item.href };
          return (
            <Wrap
              key={item.href}
              {...wrapProps}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: COLORS.TEXT_SECONDARY,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.background = COLORS.SIDEBAR_HOVER;
                e.currentTarget.style.color = COLORS.TEXT;
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, flexShrink: 0 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Wrap>
          );
        })}
      </nav>

      {/* Account footer */}
      <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${COLORS.BORDER}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            background: COLORS.SURFACE,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: COLORS.ACCENT,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: COLORS.TEXT,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 600,
              }}
              title={userEmail}
            >
              {userEmail || '-'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut(() => router.push('/sign-in'))}
            title="Sign out"
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: 'transparent',
              border: `1px solid ${COLORS.BORDER}`,
              color: COLORS.TEXT_SECONDARY,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.DANGER_LIGHT;
              e.currentTarget.style.borderColor = COLORS.DANGER;
              e.currentTarget.style.color = COLORS.DANGER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = COLORS.BORDER;
              e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
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
        background: COLORS.BG,
        minHeight: '100vh',
        display: 'flex',
        fontFamily: '"DM Sans",system-ui,sans-serif',
        color: COLORS.TEXT,
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
          background: COLORS.ACCENT,
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: 14,
          borderRadius: '0 0 8px 0',
          textDecoration: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.left = '0'; }}
        onBlur={(e) => { e.currentTarget.style.left = '-9999px'; }}
      >
        Skip to main content
      </a>

      {/* Global focus-visible ring style */}
      <style>{`
        *:focus-visible {
          outline: 2px solid ${COLORS.ACCENT};
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
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileOpen(false); } }}
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
        }}
      >
        {/* Topbar */}
        {!hideTopbar && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(247,247,245,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${COLORS.BORDER}`,
            padding: '14px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            minHeight: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.BORDER}`,
                  color: COLORS.TEXT,
                  width: 36,
                  height: 36,
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
                  fontWeight: 700,
                  color: COLORS.TEXT,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title}
              </h1>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
