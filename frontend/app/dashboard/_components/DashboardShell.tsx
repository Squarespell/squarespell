'use client';

/**
 * DashboardShell - the persistent chrome (sidebar + topbar) that wraps every
 * top-level dashboard page: /dashboard, /dashboard/leads, /dashboard/analytics,
 * /dashboard/integrations, /dashboard/brand-kit, /dashboard/embed, and
 * /dashboard/billing.
 *
 * Rules
 * -----
 * - Sidebar is persistent across route changes (no re-mount flicker)
 * - Active state uses a 3px lime left border + subtle lime-tinted background
 * - Collapses to a drawer on mobile (<768px)
 * - Matches the /try dark + lime aesthetic 1:1
 * - Full-screen pages (like /dashboard/[quizId] editor) deliberately opt out
 *   by NOT rendering inside this shell
 */

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { TopBanner } from './TopBanner';
import { CommandPalette } from './CommandPalette';
import { DASHBOARD_COLORS } from './dashboardColors';

const COLORS = DASHBOARD_COLORS;

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

// Inline primitive icons - keeps us free of an icon library dep
// All nav icons are decorative (adjacent text label) so they carry aria-hidden.
const icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  quizzes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  editor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  leads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  integrations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  embed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  brand: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  help: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  templates: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  signout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  logo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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
// Both surfaces open the same editor chrome, so we highlight the same sidebar
// item whether the user clicked the sidebar link or clicked a quiz card.
function isEditorRoute(pathname: string): boolean {
  if (pathname === '/dashboard/editor' || pathname.startsWith('/dashboard/editor/')) return true;
  if (pathname === '/dashboard') return false;
  if (pathname === '/dashboard/quizzes' || pathname.startsWith('/dashboard/quizzes/')) return false;
  if (OTHER_SECTION_PREFIXES.some((prefix) => prefix !== '/dashboard/editor' && (pathname === prefix || pathname.startsWith(prefix + '/')))) {
    return false;
  }
  // Any other /dashboard/<something> is a quiz detail route
  return pathname.startsWith('/dashboard/');
}

// Quizzes list = /dashboard/quizzes only (the management grid).
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
      { href: '/dashboard/emails', label: 'Emails', icon: icons.leads, match: (p) => (p === '/dashboard/emails' || p.startsWith('/dashboard/emails/')) && !p.startsWith('/dashboard/emails/templates') },
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
  /** Optional page title shown in the topbar */
  title?: string;
  /** Optional right-side topbar content (e.g. page-level actions) */
  topbarRight?: ReactNode;
  /** Override the default 36px main-column padding. Useful for full-bleed
   *  pages (e.g. the quiz editor) that render their own internal chrome.
   *  Accepts any valid CSS padding value - e.g. "0" or "0 0 36px". */
  contentPadding?: string;
  /** Hide the sticky topbar entirely (quiz editor has its own topbar). */
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

  // Fetch auth token for the TopBanner
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

  // Close drawer on route change
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
        background: COLORS.SURFACE,
        borderRight: `1px solid ${COLORS.HAIRLINE}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (mobileOpen ? 0 : -sidebarWidth - 8) : 0,
        zIndex: 50,
        transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: '"DM Sans",system-ui,sans-serif',
        boxShadow: isMobile && mobileOpen ? '0 24px 64px rgba(0,0,0,0.5)' : 'inset -1px 0 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* Brand wordmark - the "New quiz" button used to live here but was
          removed: it duplicated the one on the /dashboard overview page and
          made the sidebar feel top-heavy. The dedicated "Quiz editor" nav
          item below handles opening the current editor. */}
      <div style={{ padding: '24px 20px 18px', borderBottom: `1px solid ${COLORS.HAIRLINE}` }}>
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
              width: 32,
              height: 32,
              background: COLORS.ACCENT,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 22px rgba(210,255,29,0.22)',
            }}
          >
            {icons.logo}
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.TEXT, letterSpacing: '-0.035em' }}>
            Squarespell
          </span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav aria-label="Main" style={{ flex: 1, padding: '16px 12px 14px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label} style={{ marginTop: sectionIdx === 0 ? 0 : 14 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: COLORS.TEXT_SUBTLE,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                padding: '4px 14px 8px',
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
                    gap: 12,
                    padding: '9px 14px',
                    margin: '1px 0',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: active ? COLORS.TEXT : COLORS.TEXT_MUTED,
                    background: active ? 'rgba(210,255,29,0.09)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(210,255,29,0.18)' : 'none',
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.005em',
                    transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                      e.currentTarget.style.color = COLORS.TEXT;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = COLORS.TEXT_MUTED;
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
            fontWeight: 700,
            color: COLORS.TEXT_SUBTLE,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            padding: '20px 14px 8px',
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
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                color: COLORS.TEXT_MUTED,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                e.currentTarget.style.color = COLORS.TEXT;
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = COLORS.TEXT_MUTED;
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
      <div style={{ padding: '14px 14px 18px', borderTop: `1px solid ${COLORS.HAIRLINE}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 12px',
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${COLORS.HAIRLINE}`,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(210,255,29,0.9), rgba(210,255,29,0.5))',
              color: COLORS.BG,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginBottom: 2 }}>Signed in as</div>
            <div
              style={{
                fontSize: 12.5,
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
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${COLORS.BORDER}`,
              color: COLORS.TEXT_MUTED,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(210,255,29,0.08)';
              e.currentTarget.style.borderColor = 'rgba(210,255,29,0.3)';
              e.currentTarget.style.color = COLORS.ACCENT;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = COLORS.BORDER;
              e.currentTarget.style.color = COLORS.TEXT_MUTED;
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
          color: COLORS.BG,
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
            background: 'rgba(0,0,0,0.55)',
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
            background: 'rgba(7,9,12,0.78)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${COLORS.HAIRLINE}`,
            padding: '16px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            minHeight: 68,
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
                  width: 38,
                  height: 38,
                  borderRadius: 10,
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
                  fontSize: 19,
                  fontWeight: 700,
                  color: COLORS.TEXT,
                  letterSpacing: '-0.025em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title}
              </h1>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{topbarRight}</div>
        </header>
        )}

        {/* Persistent banner slot (trial countdown, billing alerts, announcements) */}
        <TopBanner token={bannerToken} />

        {/* Page content */}
        <main id="sq-main" style={{ flex: 1, padding: contentPadding, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

// Re-export for backward compatibility - prefer importing from dashboardColors.ts directly
export { DASHBOARD_COLORS } from './dashboardColors';
